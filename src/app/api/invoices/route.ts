import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { genereerFactuurHTML } from '@/lib/invoice-pdf';

/**
 * GET /api/invoices - Lijst alle facturen
 */
export async function GET() {
  const facturen = await prisma.factuur.findMany({
    include: { relatie: true, regels: true },
    orderBy: { datum: 'desc' },
  });
  return NextResponse.json(facturen);
}

/**
 * POST /api/invoices - Maak nieuwe factuur
 */
export async function POST(req: NextRequest) {
  const body = await req.json();

  const factuur = await prisma.factuur.create({
    data: {
      nummer: body.nummer,
      datum: new Date(body.datum),
      vervaldatum: new Date(body.vervaldatum),
      relatieId: body.relatieId,
      regels: {
        create: body.regels.map((r: any) => ({
          aantal: r.aantal,
          beschrijving: r.beschrijving,
          stuksprijs: r.stuksprijs,
          btwPercentage: r.btwPercentage ?? 0.21,
        })),
      },
    },
    include: { relatie: true, regels: true },
  });

  return NextResponse.json(factuur);
}

/**
 * DELETE /api/invoices — Factuur verwijderen
 */
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get('id') || '0');
  if (!id) return NextResponse.json({ error: 'ID is verplicht' }, { status: 400 });
  await prisma.factuur.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

/**
 * PUT /api/invoices — Factuur bijwerken (status, etc.)
 */
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;

  const factuur = await prisma.factuur.update({
    where: { id },
    data,
    include: { relatie: true, regels: true },
  });

  return NextResponse.json(factuur);
}
