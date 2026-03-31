import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const regel = await prisma.categorieRegel.create({
    data: {
      zoekterm: body.zoekterm,
      zoekVeld: body.zoekVeld || 'tegenpartij',
      categorieCode: body.categorieCode,
      relatieNaam: body.relatieNaam || null,
      btwTarief: body.btwTarief ?? null,
      prioriteit: body.prioriteit ?? 0,
    },
  });
  return NextResponse.json(regel);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;
  const regel = await prisma.categorieRegel.update({
    where: { id },
    data,
  });
  return NextResponse.json(regel);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get('id') || '0');
  await prisma.categorieRegel.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
