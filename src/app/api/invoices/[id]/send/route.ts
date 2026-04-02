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

  const bedrijfNaam = settings.bedrijfNaam || process.env.COMPANY_NAME || 'Mijn Bedrijf';

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
    logoGrootte: settings.factuurLogoGrootte || 60,
    kleur: settings.factuurKleur,
  });

  const totaal = factuur.regels.reduce((s, r) => {
    const regelExcl = Math.round(r.aantal * r.stuksprijs * 100) / 100;
    const regelBtw = Math.round(regelExcl * r.btwPercentage * 100) / 100;
    return s + regelExcl + regelBtw;
  }, 0);

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
    const msg = error.message || 'Onbekende fout';
    let hint = '';
    if (msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT')) {
      hint = ' Controleer de SMTP host en poort in Instellingen.';
    } else if (msg.includes('auth') || msg.includes('credentials') || msg.includes('535')) {
      hint = ' Controleer je SMTP gebruikersnaam en wachtwoord in Instellingen.';
    } else if (msg.includes('ENOTFOUND')) {
      hint = ' De SMTP server is niet bereikbaar. Controleer de hostnaam.';
    }
    console.error(`Email verzenden mislukt voor factuur ${id}:`, msg);
    return NextResponse.json({ error: `Verzenden mislukt: ${msg}${hint}` }, { status: 500 });
  }
}
