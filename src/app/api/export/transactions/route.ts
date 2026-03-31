import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateTransactieCSV } from '@/lib/export';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jaar = parseInt(searchParams.get('jaar') || new Date().getFullYear().toString());
  const richting = searchParams.get('richting');

  const where: any = {};
  if (richting) where.richting = richting;
  const van = new Date(jaar, 0, 1);
  const tot = new Date(jaar + 1, 0, 1);
  where.datum = { gte: van, lt: tot };

  const transacties = await prisma.transactie.findMany({
    where,
    include: { relatie: true, categorie: true },
    orderBy: { datum: 'asc' },
  });

  const exportData = transacties.map(t => ({
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

  const csv = generateTransactieCSV(exportData);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="transacties-${jaar}.csv"`,
    },
  });
}
