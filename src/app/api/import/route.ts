import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseBankBestand } from '@/lib/bank-import';
import { categoriseerEnSlaOp } from '@/lib/categorizer';

/**
 * GET /api/import — Sync-geschiedenis ophalen
 */
export async function GET() {
  const logs = await prisma.syncLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 20,
  });
  return NextResponse.json(logs);
}

/**
 * POST /api/import — Importeer transacties vanuit Revolut CSV
 * Body: FormData met 'file' veld (CSV-bestand)
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Geen bestand geüpload' }, { status: 400 });
    }

    const content = await file.text();
    const { transacties: parsed, balans } = parseBankBestand(content, file.name);

    if (parsed.length === 0) {
      return NextResponse.json({ success: false, error: 'Geen transacties gevonden in het bestand' }, { status: 400 });
    }

    // Categoriseer en sla op
    const saved = await categoriseerEnSlaOp(parsed);

    // Balans opslaan als die in de CSV zat
    if (balans !== null) {
      await prisma.appSettings.upsert({
        where: { id: 1 },
        create: { rekeningBalans: balans, balansUpdatedAt: new Date() },
        update: { rekeningBalans: balans, balansUpdatedAt: new Date() },
      });
    }

    // Log de import
    await prisma.syncLog.create({
      data: {
        aantalNieuw: saved.length,
        aantalOvergeslagen: parsed.length - saved.length,
        status: 'success',
        melding: `${saved.length} nieuwe transacties geïmporteerd uit CSV`,
      },
    });

    return NextResponse.json({
      success: true,
      nieuw: saved.length,
      overgeslagen: parsed.length - saved.length,
      totaal: parsed.length,
    });
  } catch (error: any) {
    await prisma.syncLog.create({
      data: {
        aantalNieuw: 0,
        aantalOvergeslagen: 0,
        status: 'error',
        melding: error.message,
      },
    });

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
