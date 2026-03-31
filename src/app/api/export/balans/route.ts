import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateBalansHTML } from '@/lib/export';
import { genereerBtwAangifte } from '@/lib/btw';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jaar = parseInt(searchParams.get('jaar') || new Date().getFullYear().toString());

  // Rekeningsaldo
  const settings = await prisma.appSettings.findFirst({ where: { id: 1 } });
  const liquidMiddelen = settings?.rekeningBalans ?? 0;
  const beginVermogen = settings?.beginVermogen ?? 0;

  // Debiteuren: openstaande verkoopfacturen
  const openstaand = await prisma.factuur.findMany({
    where: { status: 'openstaand' },
    include: { regels: true },
  });
  const debiteuren = openstaand.reduce((sum, f) => {
    const factuurTotaal = f.regels.reduce((s, r) => {
      const regelTotaal = r.aantal * r.stuksprijs;
      return s + regelTotaal + regelTotaal * r.btwPercentage;
    }, 0);
    return sum + factuurTotaal;
  }, 0);

  // BTW-positie: som van alle kwartalen
  let btwPositie = 0;
  for (let q = 1; q <= 4; q++) {
    const aangifte = await genereerBtwAangifte(jaar, q);
    btwPositie += aangifte.teBetalen;
  }
  btwPositie = Math.round(btwPositie * 100) / 100;

  // Vaste activa boekwaarde
  const vasteActiva = await prisma.vastActief.findMany();
  const nu = new Date();
  const totaalBoekwaarde = vasteActiva.reduce((s, a) => {
    const afschrijfbaar = a.aanschafWaarde - a.restwaarde;
    const jaarAfschrijving = afschrijfbaar / a.levensduurJaren;
    const maanden = (nu.getFullYear() - a.aanschafDatum.getFullYear()) * 12 + (nu.getMonth() - a.aanschafDatum.getMonth());
    const afgeschreven = Math.min(Math.max(0, (jaarAfschrijving / 12) * maanden), afschrijfbaar);
    return s + a.aanschafWaarde - afgeschreven;
  }, 0);
  const boekwaardeActiva = Math.round(totaalBoekwaarde * 100) / 100;

  // Winst berekenen (incl. afschrijvingen)
  const van = new Date(jaar, 0, 1);
  const tot = new Date(jaar + 1, 0, 1);
  const transacties = await prisma.transactie.findMany({
    where: { datum: { gte: van, lt: tot } },
    include: { categorie: true },
  });
  const zakelijk = transacties.filter(t => !t.categorie || t.categorie.type !== 'prive');
  const omzet = zakelijk.filter(t => t.richting === 'verkoop').reduce((s, t) => s + t.bedragExclBtw, 0);
  const kosten = zakelijk.filter(t => t.richting === 'inkoop').reduce((s, t) => s + t.bedragExclBtw, 0);
  const afschrijvingen = Math.round(vasteActiva.reduce((s, a) => s + (a.aanschafWaarde - a.restwaarde) / a.levensduurJaren, 0) * 100) / 100;
  const winst = Math.round((omzet - kosten - afschrijvingen) * 100) / 100;

  const html = generateBalansHTML({
    jaar,
    vasteActiva: boekwaardeActiva,
    liquidMiddelen,
    debiteuren: Math.round(debiteuren * 100) / 100,
    btwPositie,
    beginVermogen,
    winst,
  });

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="balans-${jaar}.html"`,
    },
  });
}
