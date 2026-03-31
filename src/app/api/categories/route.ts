import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const [categorieen, regels] = await Promise.all([
    prisma.categorie.findMany({ orderBy: { code: 'asc' } }),
    prisma.categorieRegel.findMany({ orderBy: { prioriteit: 'desc' } }),
  ]);
  return NextResponse.json({ categorieen, regels });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const categorie = await prisma.categorie.create({
    data: {
      code: body.code,
      naam: body.naam,
      type: body.type,
      btwTarief: body.btwTarief ?? 0.21,
      btwVrijgesteld: body.btwVrijgesteld ?? false,
    },
  });
  return NextResponse.json(categorie);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;
  const categorie = await prisma.categorie.update({
    where: { id },
    data,
  });
  return NextResponse.json(categorie);
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
