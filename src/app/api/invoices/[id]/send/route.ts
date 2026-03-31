import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { genereerFactuurHTML } from '@/lib/invoice-pdf';
import * as nodemailer from 'nodemailer';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  const body = await req.json();
  const { to, bericht } = body;

  if (!to) return NextResponse.json({ error: 'E-mailadres is verplicht' }, { status: 400 });

  const settings = await prisma.appSettings.findFirst({ where: { id: 1 } });
  if (!settings?.smtpHost || !settings?.smtpUser || !settings?.smtpPass) {
    return NextResponse.json({ error: 'SMTP is niet geconfigureerd. Ga naar Instellingen.' }, { status: 400 });
  }

  const factuur = await prisma.factuur.findUnique({
    where: { id },
    include: { relatie: true, regels: true },
  });
  if (!factuur) return NextResponse.json({ error: 'Factuur niet gevonden' }, { status: 404 });

  const bedrijfNaam = settings.bedrijfNaam || process.env.COMPANY_NAME || 'Algo Studio';

  const html = genereerFactuurHTML({
    nummer: factuur.nummer,
    datum: factuur.datum.toLocaleDateString('nl-NL'),
    vervaldatum: factuur.vervaldatum.toLocaleDateString('nl-NL'),
    klant: {
      naam: factuur.relatie.naam,
      adres: factuur.relatie.adres || undefined,
      postcode: factuur.relatie.postcode || undefined,
      plaats: factuur.relatie.plaats || undefined,
    },
    bedrijf: {
      naam: bedrijfNaam,
      contactpersoon: settings.bedrijfContact || process.env.COMPANY_CONTACT || '',
      adres: settings.bedrijfAdres || process.env.COMPANY_ADDRESS || '',
      postcode: settings.bedrijfPostcode || process.env.COMPANY_POSTAL || '',
      telefoon: settings.bedrijfTelefoon || '',
      email: settings.bedrijfEmail || '',
      kvk: settings.bedrijfKvk || process.env.COMPANY_KVK || '',
      btw: settings.bedrijfBtw || process.env.COMPANY_BTW || '',
      iban: settings.bedrijfIban || process.env.COMPANY_IBAN || '',
    },
    regels: factuur.regels.map(r => ({
      aantal: r.aantal,
      beschrijving: r.beschrijving,
      stuksprijs: r.stuksprijs,
      btwPercentage: r.btwPercentage,
    })),
    logo: settings.factuurLogo,
    kleur: settings.factuurKleur,
  });

  const totaal = factuur.regels.reduce((s, r) => s + r.aantal * r.stuksprijs * (1 + r.btwPercentage), 0);

  try {
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: settings.smtpPort === 465,
      auth: { user: settings.smtpUser, pass: settings.smtpPass },
    });

    await transporter.sendMail({
      from: settings.smtpFrom || settings.smtpUser,
      to,
      subject: `Factuur ${factuur.nummer} — ${bedrijfNaam}`,
      text: bericht || `Beste ${factuur.relatie.naam},\n\nBijgaand treft u factuur ${factuur.nummer} aan ter waarde van \u20AC ${totaal.toFixed(2)}.\n\nMet vriendelijke groet,\n${bedrijfNaam}`,
      html,
    });

    return NextResponse.json({ success: true, message: `Factuur verzonden naar ${to}` });
  } catch (error: any) {
    return NextResponse.json({ error: `Verzenden mislukt: ${error.message}` }, { status: 500 });
  }
}
