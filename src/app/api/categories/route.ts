import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [categorieen, regels] = await Promise.all([
    prisma.categorie.findMany({ orderBy: { code: 'asc' } }),
    prisma.categorieRegel.findMany({ orderBy: { prioriteit: 'desc' } }),
  ]);
  return NextResponse.json({ categorieen, regels });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.code?.trim() || !body.naam?.trim()) return NextResponse.json({ error: 'Code en naam zijn verplicht' }, { status: 400 });
    const categorie = await prisma.categorie.create({
      data: {
        code: body.code.trim(),
        naam: body.naam.trim(),
        type: body.type || 'kosten',
        btwTarief: body.btwTarief ?? 0.21,
        btwVrijgesteld: body.btwVrijgesteld ?? false,
      },
    });
    return NextResponse.json(categorie);
  } catch (e: any) { return NextResponse.json({ error: e.message || 'Fout bij opslaan' }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    const categorie = await prisma.categorie.update({ where: { id }, data });
    return NextResponse.json(categorie);
  } catch (e: any) { return NextResponse.json({ error: e.message || 'Fout bij bijwerken' }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get('id') || '0');

  // Check of er transacties aan gekoppeld zijn
  const count = await prisma.transactie.count({ where: { categorieId: id } });
  if (count > 0) {
    return NextResponse.json(
      { error: `Kan niet verwijderen: ${count} transactie(s) gebruiken deze categorie` },
      { status: 400 }
    );
  }

  await prisma.categorie.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
