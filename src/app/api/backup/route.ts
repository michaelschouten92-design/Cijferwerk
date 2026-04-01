import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import { DB_PATH, UPLOADS_DIR } from '@/lib/paths';

/**
 * GET /api/backup — Download volledige back-up (database + bijlagen) als ZIP
 */
export async function GET() {
  try {
    const datum = new Date().toISOString().split('T')[0];
    const archive = archiver('zip', { zlib: { level: 9 } });
    const passthrough = new PassThrough();
    archive.pipe(passthrough);

    // Database
    archive.file(DB_PATH, { name: 'dev.db' });

    // Uploads map (als die bestaat en bestanden bevat)
    if (fs.existsSync(UPLOADS_DIR)) {
      const files = fs.readdirSync(UPLOADS_DIR);
      for (const file of files) {
        const filePath = path.join(UPLOADS_DIR, file);
        if (fs.statSync(filePath).isFile()) {
          archive.file(filePath, { name: `uploads/${file}` });
        }
      }
    }

    archive.finalize();

    const chunks: Buffer[] = [];
    for await (const chunk of passthrough) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="cijferwerk-backup-${datum}.zip"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/backup — Herstel back-up vanuit ZIP of .db bestand
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Geen bestand geüpload' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name.toLowerCase();

    // Maak eerst een back-up van de huidige database
    const backupPath = DB_PATH + '.bak';
    fs.copyFileSync(DB_PATH, backupPath);

    if (fileName.endsWith('.db')) {
      // Oud formaat: los .db bestand
      const header = buffer.toString('ascii', 0, 15);
      if (header !== 'SQLite format 3') {
        return NextResponse.json({ error: 'Ongeldig bestand — dit is geen SQLite database' }, { status: 400 });
      }
      fs.writeFileSync(DB_PATH, buffer);
      return NextResponse.json({ success: true, message: 'Database hersteld. Herlaad de pagina.' });
    }

    if (fileName.endsWith('.zip')) {
      // Nieuw formaat: ZIP met database + uploads
      const AdmZip = (await import('adm-zip')).default;
      const zip = new AdmZip(buffer);
      const entries = zip.getEntries();

      for (const entry of entries) {
        if (entry.entryName === 'dev.db') {
          const dbData = entry.getData();
          const header = dbData.toString('ascii', 0, 15);
          if (header !== 'SQLite format 3') {
            return NextResponse.json({ error: 'ZIP bevat geen geldige database' }, { status: 400 });
          }
          fs.writeFileSync(DB_PATH, dbData);
        } else if (entry.entryName.startsWith('uploads/') && !entry.isDirectory) {
          if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
          const targetPath = path.join(UPLOADS_DIR, path.basename(entry.entryName));
          fs.writeFileSync(targetPath, entry.getData());
        }
      }

      return NextResponse.json({ success: true, message: 'Database en bijlagen hersteld. Herlaad de pagina.' });
    }

    return NextResponse.json({ error: 'Upload een .zip of .db bestand' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
