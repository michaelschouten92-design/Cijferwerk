import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/transactions - Haal transacties op met filters
 * Query params: richting, jaar, maand, gecategoriseerd
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const richting = searchParams.get('richting');
  const jaar = searchParams.get('jaar');
  const maand = searchParams.get('maand');
  const gecategoriseerd = searchParams.get('gecategoriseerd');

  const where: any = {};
  if (richting) where.richting = richting;
  if (gecategoriseerd !== null) where.gecategoriseerd = gecategoriseerd === 'true';

  if (jaar) {
    const y = parseInt(jaar);
    const m = maand ? parseInt(maand) - 1 : 0;
    const van = maand ? new Date(y, m, 1) : new Date(y, 0, 1);
    const tot = maand ? new Date(y, m + 1, 1) : new Date(y + 1, 0, 1);
    where.datum = { gte: van, lt: tot };
  }

  const transacties = await prisma.transactie.findMany({
    where,
    include: { relatie: true, categorie: true, factuur: { select: { id: true, nummer: true } } },
    orderBy: { datum: 'desc' },
  });

  return NextResponse.json(transacties);
}

/**
 * POST /api/transactions - Handmatig transactie toevoegen
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validatie
    if (!body.omschrijving?.trim()) return NextResponse.json({ error: 'Omschrijving is verplicht' }, { status: 400 });
    if (!body.richting || !['inkoop', 'verkoop'].includes(body.richting)) return NextResponse.json({ error: 'Richting moet inkoop of verkoop zijn' }, { status: 400 });
    const datum = new Date(body.datum);
    if (isNaN(datum.getTime())) return NextResponse.json({ error: 'Ongeldige datum' }, { status: 400 });
    if (body.bedragExclBtw === undefined || isNaN(body.bedragExclBtw)) return NextResponse.json({ error: 'Bedrag is verplicht' }, { status: 400 });

    // BTW altijd server-side berekenen, nooit client-waarde vertrouwen
    const bedragExclBtw = Math.abs(body.bedragExclBtw);
    const btwPercentage = body.btwPercentage ?? 0.21;
    const btwBedrag = Math.round(bedragExclBtw * btwPercentage * 100) / 100;

    const transactie = await prisma.transactie.create({
      data: {
        datum,
        soort: body.soort || 'Overig',
        factuurnummer: body.factuurnummer,
        omschrijving: body.omschrijving.trim(),
        bedragExclBtw,
        btwPercentage,
        btwBedrag,
        status: body.status || 'Betaald via Bank',
        richting: body.richting,
        gecategoriseerd: true,
        relatieId: body.relatieId,
        categorieId: body.categorieId,
      },
      include: { relatie: true, categorie: true },
    });

    return NextResponse.json(transactie);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Fout bij opslaan' }, { status: 500 });
  }
}

/**
 * PUT /api/transactions - Update transactie (voor hercategorisatie)
 */
export async function PUT(req: NextRequest) {
  try {
  const body = await req.json();
  const { id, ...data } = body;

  // Haal huidige waarden op voor audit trail
  const huidig = await prisma.transactie.findUnique({ where: { id } });

  if (data.datum) data.datum = new Date(data.datum);

  // BTW server-side herberekenen als percentage wijzigt
  if (data.btwPercentage !== undefined && huidig) {
    const bedrag = data.bedragExclBtw ?? huidig.bedragExclBtw;
    data.btwBedrag = Math.round(bedrag * data.btwPercentage * 100) / 100;
  }

  const transactie = await prisma.transactie.update({
    where: { id },
    data: { ...data, gecategoriseerd: true },
    include: { relatie: true, categorie: true },
  });

  // Audit trail: log gewijzigde velden
  if (huidig) {
    const velden = ['omschrijving', 'btwPercentage', 'btwBedrag', 'bedragExclBtw', 'categorieId', 'relatieId', 'richting'] as const;
    for (const veld of velden) {
      const oud = (huidig as any)[veld];
      const nieuw = (transactie as any)[veld];
      if (oud !== nieuw && (data[veld] !== undefined)) {
        await prisma.wijzigingLog.create({
          data: {
            transactieId: id,
            veld,
            oudeWaarde: oud?.toString() ?? null,
            nieuweWaarde: nieuw?.toString() ?? null,
          },
        });
      }
    }
  }

  return NextResponse.json(transactie);
  } catch (e: any) { return NextResponse.json({ error: e.message || 'Fout bij bijwerken' }, { status: 500 }); }
}

/**
 * DELETE /api/transactions - Verwijder transactie
 */
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get('id') || '0');

  if (!id) {
    return NextResponse.json({ error: 'ID is verplicht' }, { status: 400 });
  }

  // Audit trail: log volledige transactiedata vóór verwijdering
  const tx = await prisma.transactie.findUnique({ where: { id } });
  if (tx) {
    await prisma.wijzigingLog.create({
      data: {
        transactieId: id,
        veld: 'VERWIJDERD',
        oudeWaarde: JSON.stringify(tx),
        nieuweWaarde: null,
      },
    });
  }

  await prisma.transactie.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
