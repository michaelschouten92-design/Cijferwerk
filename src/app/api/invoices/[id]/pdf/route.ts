import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { genereerFactuurHTML } from '@/lib/invoice-pdf';

async function getBedrijfsgegevens() {
  const s = await prisma.appSettings.findFirst({ where: { id: 1 } });
  return {
    naam: s?.bedrijfNaam || process.env.COMPANY_NAME || 'Mijn Bedrijf',
    contactpersoon: s?.bedrijfContact || process.env.COMPANY_CONTACT || '',
    adres: s?.bedrijfAdres || process.env.COMPANY_ADDRESS || '',
    postcode: s?.bedrijfPostcode || process.env.COMPANY_POSTAL || '',
    telefoon: s?.bedrijfTelefoon || process.env.COMPANY_PHONE || '',
    email: s?.bedrijfEmail || process.env.COMPANY_EMAIL || '',
    kvk: s?.bedrijfKvk || process.env.COMPANY_KVK || '',
    btw: s?.bedrijfBtw || process.env.COMPANY_BTW || '',
    iban: s?.bedrijfIban || process.env.COMPANY_IBAN || '',
    logo: s?.factuurLogo || null,
    kleur: s?.factuurKleur || '#2563eb',
  };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);

  const factuur = await prisma.factuur.findUnique({
    where: { id },
    include: { relatie: true, regels: true },
  });

  if (!factuur) return NextResponse.json({ error: 'Factuur niet gevonden' }, { status: 404 });

  const bedrijf = await getBedrijfsgegevens();

  // Bij creditnota: origineel factuurnummer ophalen
  let creditVanNummer: string | null = null;
  if (factuur.creditVanId) {
    const origineel = await prisma.factuur.findUnique({ where: { id: factuur.creditVanId } });
    creditVanNummer = origineel?.nummer ?? null;
  }

  const html = genereerFactuurHTML({
    nummer: factuur.nummer,
    datum: factuur.datum.toLocaleDateString('nl-NL'),
    vervaldatum: factuur.vervaldatum.toLocaleDateString('nl-NL'),
    creditVanNummer,
    klant: {
      naam: factuur.relatie.naam,
      adres: factuur.relatie.adres || undefined,
      postcode: factuur.relatie.postcode || undefined,
      plaats: factuur.relatie.plaats || undefined,
      btwNummer: factuur.relatie.btwNummer || undefined,
    },
    bedrijf,
    regels: factuur.regels.map(r => ({
      aantal: r.aantal,
      beschrijving: r.beschrijving,
      stuksprijs: r.stuksprijs,
      btwPercentage: r.btwPercentage,
    })),
    logo: bedrijf.logo,
    kleur: bedrijf.kleur,
  });

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
