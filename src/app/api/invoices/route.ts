import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { genereerFactuurHTML } from '@/lib/invoice-pdf';

/**
 * GET /api/invoices - Lijst alle facturen
 */
export async function GET() {
  const facturen = await prisma.factuur.findMany({
    include: { relatie: true, regels: true, transacties: { select: { id: true, datum: true, omschrijving: true, bedragExclBtw: true, btwBedrag: true } } },
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
      creditVanId: body.creditVanId ?? null,
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

  // Audit trail: log factuurdata vóór verwijdering
  const factuur = await prisma.factuur.findUnique({ where: { id }, include: { regels: true } });
  if (factuur) {
    await prisma.wijzigingLog.create({
      data: {
        transactieId: 0, // geen transactie, maar factuur
        veld: 'FACTUUR_VERWIJDERD',
        oudeWaarde: JSON.stringify(factuur),
        nieuweWaarde: null,
      },
    });
  }

  await prisma.factuur.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

/**
 * PUT /api/invoices — Factuur bijwerken (status, etc.)
 * Betaalde facturen zijn vergrendeld: alleen statuswijziging is toegestaan.
 */
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...data } = body;

  // Haal huidige factuur op voor lock-check en audit trail
  const huidig = await prisma.factuur.findUnique({
    where: { id },
    include: { regels: true },
  });

  if (!huidig) {
    return NextResponse.json({ error: 'Factuur niet gevonden' }, { status: 404 });
  }

  // Betaalde facturen: alleen statuswijziging toegestaan (bijv. heropenen)
  if (huidig.status === 'betaald') {
    const toegestaneVelden = ['status'];
    const ongeoorloofdeVelden = Object.keys(data).filter(k => !toegestaneVelden.includes(k));
    if (ongeoorloofdeVelden.length > 0) {
      return NextResponse.json(
        { error: 'Deze factuur is betaald en kan niet meer gewijzigd worden. Maak een creditnota aan.' },
        { status: 400 }
      );
    }
  }

  // Audit trail: log gewijzigde velden
  const velden = ['status', 'datum', 'vervaldatum', 'relatieId'] as const;
  for (const veld of velden) {
    const oud = (huidig as any)[veld];
    const nieuw = data[veld];
    if (nieuw !== undefined && oud?.toString() !== nieuw?.toString()) {
      await prisma.wijzigingLog.create({
        data: {
          transactieId: 0, // factuurwijziging, geen transactie
          veld: `FACTUUR_${veld.toUpperCase()}`,
          oudeWaarde: oud?.toString() ?? null,
          nieuweWaarde: nieuw?.toString() ?? null,
        },
      });
    }
  }

  const factuur = await prisma.factuur.update({
    where: { id },
    data,
    include: { relatie: true, regels: true },
  });

  return NextResponse.json(factuur);
}
