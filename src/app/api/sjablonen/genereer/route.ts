import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * POST /api/sjablonen/genereer — Genereer factuur vanuit sjabloon
 * Body: { sjabloonId: number }
 */
export async function POST(req: NextRequest) {
  try {
    const { sjabloonId } = await req.json();
    if (!sjabloonId) return NextResponse.json({ error: 'sjabloonId is verplicht' }, { status: 400 });

    const sjabloon = await prisma.factuurSjabloon.findUnique({
      where: { id: sjabloonId },
      include: { relatie: true },
    });

    if (!sjabloon) return NextResponse.json({ error: 'Sjabloon niet gevonden' }, { status: 404 });

    let regels: { aantal: number; beschrijving: string; stuksprijs: number; btwPercentage: number }[];
    try { regels = JSON.parse(sjabloon.regels); } catch { return NextResponse.json({ error: 'Sjabloon bevat ongeldige regels' }, { status: 500 }); }

    // Factuurnummer auto-ophogen
    const jaar = new Date().getFullYear();
    const prefix = `${jaar}-`;
    const bestaande = await prisma.factuur.findMany({
      where: { nummer: { startsWith: prefix } },
      select: { nummer: true },
    });
    const nummers = bestaande.map(f => parseInt(f.nummer.replace(prefix, '')) || 0);
    const volgende = nummers.length > 0 ? Math.max(...nummers) + 1 : 1;
    const nummer = `${prefix}${String(volgende).padStart(2, '0')}`;

    // Volgende datum berekenen
    const volgendeDate = new Date(sjabloon.volgendeDatum);
    if (sjabloon.interval === 'maandelijks') volgendeDate.setMonth(volgendeDate.getMonth() + 1);
    else if (sjabloon.interval === 'kwartaal') volgendeDate.setMonth(volgendeDate.getMonth() + 3);
    else if (sjabloon.interval === 'jaarlijks') volgendeDate.setFullYear(volgendeDate.getFullYear() + 1);

    // Factuur aanmaken + sjabloon bijwerken in één transactie
    const [factuur] = await prisma.$transaction([
      prisma.factuur.create({
        data: {
          nummer,
          datum: new Date(),
          vervaldatum: new Date(Date.now() + 14 * 86400000),
          relatieId: sjabloon.relatieId,
          regels: { create: regels.map(r => ({ aantal: r.aantal, beschrijving: r.beschrijving, stuksprijs: r.stuksprijs, btwPercentage: r.btwPercentage })) },
        },
        include: { relatie: true, regels: true },
      }),
      prisma.factuurSjabloon.update({
        where: { id: sjabloonId },
        data: { volgendeDatum: volgendeDate },
      }),
    ]);

    return NextResponse.json({ success: true, factuur });
  } catch (e: any) { return NextResponse.json({ error: e.message || 'Fout bij genereren' }, { status: 500 }); }
}
