import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const relaties = await prisma.relatie.findMany({
    orderBy: { naam: 'asc' },
    select: { id: true, naam: true, type: true },
  });
  return NextResponse.json(relaties);
}
