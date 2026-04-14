import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const relaties = await prisma.relatie.findMany({
    orderBy: { naam: 'asc' },
  });
  return NextResponse.json(relaties);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.naam?.trim()) return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 });
    const relatie = await prisma.relatie.create({
      data: {
        naam: body.naam.trim(),
        adres: body.adres || null,
        postcode: body.postcode || null,
        plaats: body.plaats || null,
        land: body.land || 'NL',
        telefoon: body.telefoon || null,
        email: body.email || null,
        btwNummer: body.btwNummer || null,
        type: body.type || 'leverancier',
      },
    });
    return NextResponse.json(relatie);
  } catch (e: any) { return NextResponse.json({ error: e.message || 'Fout bij opslaan' }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    const relatie = await prisma.relatie.update({ where: { id }, data });
    return NextResponse.json(relatie);
  } catch (e: any) { return NextResponse.json({ error: e.message || 'Fout bij bijwerken' }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get('id') || '0');

  // Check of er transacties of facturen gekoppeld zijn
  const txCount = await prisma.transactie.count({ where: { relatieId: id } });
  const fCount = await prisma.factuur.count({ where: { relatieId: id } });
  if (txCount > 0 || fCount > 0) {
    return NextResponse.json(
      { error: `Kan niet verwijderen: ${txCount} transactie(s) en ${fCount} factuur/facturen gekoppeld` },
      { status: 400 }
    );
  }

  await prisma.relatie.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
