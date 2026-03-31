import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'prisma/dev.db');

/**
 * GET /api/backup — Download database back-up
 */
export async function GET() {
  try {
    const buffer = fs.readFileSync(DB_PATH);
    const datum = new Date().toISOString().split('T')[0];

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="boekhouding-backup-${datum}.db"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/backup — Herstel database vanuit back-up
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Geen bestand geüpload' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Controleer of het een geldig SQLite bestand is
    const header = buffer.toString('ascii', 0, 15);
    if (header !== 'SQLite format 3') {
      return NextResponse.json({ error: 'Ongeldig bestand — dit is geen SQLite database' }, { status: 400 });
    }

    // Maak eerst een back-up van de huidige database
    const backupPath = DB_PATH + '.bak';
    fs.copyFileSync(DB_PATH, backupPath);

    // Overschrijf de database
    fs.writeFileSync(DB_PATH, buffer);

    return NextResponse.json({ success: true, message: 'Database hersteld. Herlaad de pagina.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
