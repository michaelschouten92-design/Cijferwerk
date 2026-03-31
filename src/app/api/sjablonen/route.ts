import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/sjablonen — Alle sjablonen ophalen
 */
export async function GET() {
  const sjablonen = await prisma.factuurSjabloon.findMany({
    include: { relatie: true },
    orderBy: { volgendeDatum: 'asc' },
  });
  return NextResponse.json(sjablonen);
}

/**
 * POST /api/sjablonen — Nieuw sjabloon aanmaken
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const sjabloon = await prisma.factuurSjabloon.create({
    data: {
      naam: body.naam,
      relatieId: body.relatieId,
      interval: body.interval || 'maandelijks',
      volgendeDatum: new Date(body.volgendeDatum),
      regels: JSON.stringify(body.regels),
      actief: body.actief ?? true,
    },
    include: { relatie: true },
  });
  return NextResponse.json(sjabloon);
}

/**
 * PUT /api/sjablonen — Sjabloon bijwerken
 */
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;
  if (data.volgendeDatum) data.volgendeDatum = new Date(data.volgendeDatum);
  if (data.regels && typeof data.regels !== 'string') data.regels = JSON.stringify(data.regels);
  const sjabloon = await prisma.factuurSjabloon.update({
    where: { id },
    data,
    include: { relatie: true },
  });
  return NextResponse.json(sjabloon);
}

/**
 * DELETE /api/sjablonen — Sjabloon verwijderen
 */
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get('id') || '0');
  await prisma.factuurSjabloon.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
