import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
  const restwaarde = Math.max(0, body.restwaarde ?? 0);
  const levensduur = body.levensduurJaren ?? 5;
  const aanschafWaarde = Math.abs(body.aanschafWaarde || 0);

  // Validaties
  if (!body.naam || body.naam.trim().length === 0) {
    return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 });
  }
  if (aanschafWaarde <= 0) {
    return NextResponse.json({ error: 'Aanschafwaarde moet groter dan 0 zijn' }, { status: 400 });
  }
  if (restwaarde >= aanschafWaarde) {
    return NextResponse.json({ error: 'Restwaarde moet lager zijn dan aanschafwaarde' }, { status: 400 });
  }
  if (levensduur < 1) {
    return NextResponse.json({ error: 'Levensduur moet minimaal 1 jaar zijn' }, { status: 400 });
  }
  const aanschafDatum = new Date(body.aanschafDatum);
  if (isNaN(aanschafDatum.getTime())) {
    return NextResponse.json({ error: 'Ongeldige aanschafdatum' }, { status: 400 });
  }

  const actief = await prisma.vastActief.create({
    data: {
      naam: body.naam.trim(),
      aanschafDatum,
      aanschafWaarde,
      restwaarde,
      levensduurJaren: levensduur,
      notitie: body.notitie || null,
    },
  });
  return NextResponse.json(actief);
}

/**
 * PUT /api/activa — Vast actief bewerken
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    if (data.aanschafDatum) {
      data.aanschafDatum = new Date(data.aanschafDatum);
      if (isNaN(data.aanschafDatum.getTime())) return NextResponse.json({ error: 'Ongeldige datum' }, { status: 400 });
    }
    if (data.levensduurJaren !== undefined && data.levensduurJaren < 1) return NextResponse.json({ error: 'Levensduur moet minimaal 1 jaar zijn' }, { status: 400 });
    if (data.restwaarde !== undefined && data.aanschafWaarde !== undefined && data.restwaarde >= data.aanschafWaarde) {
      return NextResponse.json({ error: 'Restwaarde moet lager zijn dan aanschafwaarde' }, { status: 400 });
    }
    const actief = await prisma.vastActief.update({ where: { id }, data });
    return NextResponse.json(actief);
  } catch (e: any) { return NextResponse.json({ error: e.message || 'Fout bij bijwerken' }, { status: 500 }); }
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
