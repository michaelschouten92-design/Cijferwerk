import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { genereerBtwAangifte } from '@/lib/btw';
import { generateTransactieCSV, generateBtwAangifteHTML, generateWinstVerliesHTML, generateBalansHTML } from '@/lib/export';
import { genereerFactuurHTML } from '@/lib/invoice-pdf';
import { berekenAfschrijvingen } from '@/lib/calculations';
import archiver from 'archiver';
import { PassThrough } from 'stream';

/**
 * GET /api/export/jaarafsluiting?jaar=2026
 * Genereert een ZIP met alle boekhoudbestanden voor de boekhouder
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jaar = parseInt(searchParams.get('jaar') || new Date().getFullYear().toString());

  const van = new Date(jaar, 0, 1);
  const tot = new Date(jaar + 1, 0, 1);

  // --- Data ophalen ---
  const transacties = await prisma.transactie.findMany({
    where: { datum: { gte: van, lt: tot } },
    include: { relatie: true, categorie: true },
    orderBy: { datum: 'asc' },
  });

  const settings = await prisma.appSettings.findFirst({ where: { id: 1 } });
  const vasteActiva = await prisma.vastActief.findMany();

  const facturen = await prisma.factuur.findMany({
    where: { datum: { gte: van, lt: tot } },
    include: { relatie: true, regels: true },
  });

  // --- Berekeningen ---
  const zakelijk = transacties.filter(t => !t.categorie || t.categorie.type !== 'prive');
  const verkoop = zakelijk.filter(t => t.richting === 'verkoop');
  const inkoop = zakelijk.filter(t => t.richting === 'inkoop');
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const omzet = round2(verkoop.reduce((s, t) => s + t.bedragExclBtw, 0));
  const kosten = round2(inkoop.reduce((s, t) => s + t.bedragExclBtw, 0));
  const afschrijvingen = berekenAfschrijvingen(vasteActiva, jaar);
  const winst = round2(omzet - kosten - afschrijvingen);

  const omzetPerMaand = Array.from({ length: 12 }, (_, m) =>
    round2(verkoop.filter(t => new Date(t.datum).getMonth() === m).reduce((s, t) => s + t.bedragExclBtw, 0))
  );

  const kostenPerCategorie: Record<string, number> = {};
  for (const t of inkoop) {
    const naam = t.categorie?.naam || 'Ongecategoriseerd';
    kostenPerCategorie[naam] = round2((kostenPerCategorie[naam] || 0) + t.bedragExclBtw);
  }

  // --- ZIP maken ---
  const archive = archiver('zip', { zlib: { level: 9 } });
  const passthrough = new PassThrough();
  archive.pipe(passthrough);

  // 1. Winst & Verlies
  const bedrijf = settings ? { naam: settings.bedrijfNaam || '', kvk: settings.bedrijfKvk || '' } : undefined;
  const wvHtml = generateWinstVerliesHTML({ jaar, omzet, kosten, afschrijvingen, winst, kostenPerCategorie, omzetPerMaand }, bedrijf);
  archive.append(wvHtml, { name: `Winst-Verlies-${jaar}.html` });

  // 2. Balans
  const jaareinde = new Date(jaar, 11, 31);
  const totaalBoekwaarde = vasteActiva.reduce((s, a) => {
    const afschrijfbaar = a.aanschafWaarde - a.restwaarde;
    const jaarAfschr = afschrijfbaar / a.levensduurJaren;
    const maanden = (jaareinde.getFullYear() - a.aanschafDatum.getFullYear()) * 12 + (jaareinde.getMonth() - a.aanschafDatum.getMonth());
    return s + a.aanschafWaarde - Math.min(Math.max(0, (jaarAfschr / 12) * maanden), afschrijfbaar);
  }, 0);

  // Debiteuren: openstaande verkoopfacturen
  const openstaand = await prisma.factuur.findMany({
    where: { status: 'openstaand' },
    include: { regels: true },
  });
  const debiteuren = round2(openstaand.reduce((sum, f) => {
    return sum + f.regels.reduce((s, r) => s + r.aantal * r.stuksprijs * (1 + r.btwPercentage), 0);
  }, 0));

  let btwPositie = 0;
  for (let q = 1; q <= 4; q++) {
    const a = await genereerBtwAangifte(jaar, q);
    btwPositie += a.teBetalen;
  }

  const balansHtml = generateBalansHTML({
    jaar,
    vasteActiva: round2(totaalBoekwaarde),
    liquidMiddelen: settings?.rekeningBalans ?? 0,
    debiteuren,
    btwPositie: round2(btwPositie),
    beginVermogen: settings?.beginVermogen ?? 0,
    winst,
  }, bedrijf);
  archive.append(balansHtml, { name: `Balans-${jaar}.html` });

  // 3. BTW per kwartaal
  for (let q = 1; q <= 4; q++) {
    const aangifte = await genereerBtwAangifte(jaar, q);
    const btwHtml = generateBtwAangifteHTML(aangifte, q, jaar, bedrijf);
    archive.append(btwHtml, { name: `BTW-Q${q}-${jaar}.html` });
  }

  // 4. Transactie-overzicht CSV
  const csvData = transacties.map(t => ({
    datum: new Date(t.datum).toLocaleDateString('nl-NL'),
    omschrijving: t.omschrijving,
    relatie: t.relatie?.naam || '',
    categorie: t.categorie ? `${t.categorie.code} ${t.categorie.naam}` : '',
    bedragExclBtw: t.bedragExclBtw,
    btwPercentage: t.btwPercentage,
    btwBedrag: t.btwBedrag,
    richting: t.richting,
    status: t.status,
  }));
  archive.append(generateTransactieCSV(csvData), { name: `Transacties-${jaar}.csv` });

  // 5. Vaste activa overzicht
  if (vasteActiva.length > 0) {
    const activaHtml = generateActivaHTML(vasteActiva, jaar);
    archive.append(activaHtml, { name: `Vaste-Activa-${jaar}.html` });
  }

  // 6. Alle facturen als HTML
  const bedrijfVolledig = {
    naam: settings?.bedrijfNaam || process.env.COMPANY_NAME || 'Mijn Bedrijf',
    contactpersoon: settings?.bedrijfContact || '',
    adres: settings?.bedrijfAdres || '',
    postcode: settings?.bedrijfPostcode || '',
    telefoon: settings?.bedrijfTelefoon || '',
    email: settings?.bedrijfEmail || '',
    kvk: settings?.bedrijfKvk || '',
    btw: settings?.bedrijfBtw || '',
    iban: settings?.bedrijfIban || '',
  };

  for (const f of facturen) {
    const fHtml = genereerFactuurHTML({
      nummer: f.nummer,
      datum: f.datum.toLocaleDateString('nl-NL'),
      vervaldatum: f.vervaldatum.toLocaleDateString('nl-NL'),
      klant: { naam: f.relatie.naam, adres: f.relatie.adres || undefined, postcode: f.relatie.postcode || undefined, plaats: f.relatie.plaats || undefined },
      bedrijf: bedrijfVolledig,
      regels: f.regels.map(r => ({ aantal: r.aantal, beschrijving: r.beschrijving, stuksprijs: r.stuksprijs, btwPercentage: r.btwPercentage })),
      logo: settings?.factuurLogo,
      kleur: settings?.factuurKleur,
    });
    archive.append(fHtml, { name: `Facturen/Factuur-${f.nummer}.html` });
  }

  archive.finalize();

  // Stream naar response
  const chunks: Buffer[] = [];
  for await (const chunk of passthrough) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="Jaarafsluiting-${jaar}-Algo-Studio.zip"`,
    },
  });
}

function generateActivaHTML(activa: any[], jaar: number): string {
  const f = (n: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n);
  const nu = new Date();

  const rijen = activa.map(a => {
    const afschrijfbaar = a.aanschafWaarde - a.restwaarde;
    const jaarAfschr = afschrijfbaar / a.levensduurJaren;
    const maanden = (nu.getFullYear() - a.aanschafDatum.getFullYear()) * 12 + (nu.getMonth() - a.aanschafDatum.getMonth());
    const totAfgeschreven = Math.min(Math.max(0, (jaarAfschr / 12) * maanden), afschrijfbaar);
    const boekwaarde = a.aanschafWaarde - totAfgeschreven;
    return `<tr>
      <td>${a.naam}</td>
      <td>${new Date(a.aanschafDatum).toLocaleDateString('nl-NL')}</td>
      <td class="right">${f(a.aanschafWaarde)}</td>
      <td class="right">${f(Math.round(jaarAfschr * 100) / 100)}</td>
      <td class="right">${f(Math.round(totAfgeschreven * 100) / 100)}</td>
      <td class="right">${f(Math.round(boekwaarde * 100) / 100)}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><title>Vaste Activa ${jaar}</title>
<style>body{font-family:'Segoe UI',sans-serif;max-width:700px;margin:40px auto;color:#1a1a1a}
h1{font-size:24px;border-bottom:2px solid #2563eb;padding-bottom:8px}h2{font-size:16px;color:#666;margin-top:0}
table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #e5e7eb}
th{background:#f8fafc;font-size:12px;text-transform:uppercase;color:#6b7280}.right{text-align:right}
.footer{margin-top:40px;font-size:12px;color:#9ca3af}</style></head><body>
<h1>Vaste Activa Register</h1><h2>${jaar} | Mijn Bedrijf | KVK 96041420</h2>
<table><thead><tr><th>Naam</th><th>Aanschaf</th><th class="right">Waarde</th><th class="right">Afschr./jaar</th><th class="right">Cum. afschr.</th><th class="right">Boekwaarde</th></tr></thead>
<tbody>${rijen}</tbody></table>
<div class="footer">Gegenereerd op ${new Date().toLocaleDateString('nl-NL')} — Mijn Bedrijf</div></body></html>`;
}
