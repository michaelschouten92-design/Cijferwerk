import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateWinstVerliesHTML } from '@/lib/export';
import type { WinstVerliesData } from '@/lib/export';
import { berekenAfschrijvingen } from '@/lib/calculations';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jaar = parseInt(searchParams.get('jaar') || new Date().getFullYear().toString());

  const van = new Date(jaar, 0, 1);
  const tot = new Date(jaar + 1, 0, 1);

  const transacties = await prisma.transactie.findMany({
    where: { datum: { gte: van, lt: tot } },
    include: { categorie: true },
  });

  // Privétransacties uitsluiten
  const zakelijk = transacties.filter(t => !t.categorie || t.categorie.type !== 'prive');
  const verkoop = zakelijk.filter(t => t.richting === 'verkoop');
  const inkoop = zakelijk.filter(t => t.richting === 'inkoop');

  const omzet = Math.round(verkoop.reduce((s, t) => s + t.bedragExclBtw, 0) * 100) / 100;
  const kosten = Math.round(inkoop.reduce((s, t) => s + t.bedragExclBtw, 0) * 100) / 100;

  const kostenPerCategorie: Record<string, number> = {};
  for (const t of inkoop) {
    const naam = t.categorie?.naam || 'Ongecategoriseerd';
    kostenPerCategorie[naam] = Math.round(((kostenPerCategorie[naam] || 0) + t.bedragExclBtw) * 100) / 100;
  }

  const omzetPerMaand = Array.from({ length: 12 }, (_, m) => {
    const maandTx = verkoop.filter(t => new Date(t.datum).getMonth() === m);
    return Math.round(maandTx.reduce((s, t) => s + t.bedragExclBtw, 0) * 100) / 100;
  });

  // Afschrijvingen — gedeelde berekening voor consistentie
  const activa = await prisma.vastActief.findMany();
  const afschrijvingen = berekenAfschrijvingen(activa, jaar);

  const winst = Math.round((omzet - kosten - afschrijvingen) * 100) / 100;

  const settings = await prisma.appSettings.findFirst({ where: { id: 1 } });
  const bedrijf = settings ? { naam: settings.bedrijfNaam || '', kvk: settings.bedrijfKvk || '' } : undefined;
  const html = generateWinstVerliesHTML({
    jaar, omzet, kosten, afschrijvingen, winst, kostenPerCategorie, omzetPerMaand,
  }, bedrijf);

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="winst-verlies-${jaar}.html"`,
    },
  });
}
