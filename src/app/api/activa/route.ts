import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/activa — Alle vaste activa ophalen met berekende afschrijvingen
 */
export async function GET() {
  const activa = await prisma.vastActief.findMany({
    orderBy: { aanschafDatum: 'desc' },
  });

  const nu = new Date();
  const result = activa.map(a => {
    const afschrijfbaar = a.aanschafWaarde - a.restwaarde;
    const jaarAfschrijving = afschrijfbaar / a.levensduurJaren;

    // Hoeveel maanden sinds aanschaf
    const startJaar = a.aanschafDatum.getFullYear();
    const startMaand = a.aanschafDatum.getMonth();
    const maandenGebruikt = (nu.getFullYear() - startJaar) * 12 + (nu.getMonth() - startMaand);
    const totaalAfgeschreven = Math.min(
      Math.max(0, (jaarAfschrijving / 12) * maandenGebruikt),
      afschrijfbaar
    );
    const boekwaarde = a.aanschafWaarde - Math.round(totaalAfgeschreven * 100) / 100;

    return {
      ...a,
      jaarAfschrijving: Math.round(jaarAfschrijving * 100) / 100,
      totaalAfgeschreven: Math.round(totaalAfgeschreven * 100) / 100,
      boekwaarde: Math.round(boekwaarde * 100) / 100,
    };
  });

  return NextResponse.json(result);
}

/**
 * POST /api/activa — Nieuw vast actief toevoegen
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const actief = await prisma.vastActief.create({
    data: {
      naam: body.naam,
      aanschafDatum: new Date(body.aanschafDatum),
      aanschafWaarde: body.aanschafWaarde,
      restwaarde: body.restwaarde ?? 0,
      levensduurJaren: body.levensduurJaren ?? 5,
      notitie: body.notitie || null,
    },
  });
  return NextResponse.json(actief);
}

/**
 * PUT /api/activa — Vast actief bewerken
 */
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;
  if (data.aanschafDatum) data.aanschafDatum = new Date(data.aanschafDatum);
  const actief = await prisma.vastActief.update({ where: { id }, data });
  return NextResponse.json(actief);
}

/**
 * DELETE /api/activa — Vast actief verwijderen
 */
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get('id') || '0');
  await prisma.vastActief.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
