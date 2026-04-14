import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';
import { UPLOADS_DIR } from '@/lib/paths';

export const dynamic = 'force-dynamic';

/**
 * GET /api/transactions/bijlage?id=123 — Download bijlage
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get('id') || '0');

  const tx = await prisma.transactie.findUnique({ where: { id } });
  if (!tx?.bijlagePad) return NextResponse.json({ error: 'Geen bijlage' }, { status: 404 });

  const safeName = path.basename(tx.bijlagePad);
  const filePath = path.resolve(UPLOADS_DIR, safeName);
  if (!filePath.startsWith(path.resolve(UPLOADS_DIR))) return NextResponse.json({ error: 'Ongeldig pad' }, { status: 400 });
  if (!fs.existsSync(filePath)) return NextResponse.json({ error: 'Bestand niet gevonden' }, { status: 404 });

  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(tx.bijlageNaam || '').toLowerCase();

  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${tx.bijlageNaam}"`,
    },
  });
}

/**
 * POST /api/transactions/bijlage — Upload bijlage
 * FormData: file + transactieId
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const transactieId = parseInt(formData.get('transactieId') as string || '0');

  if (!file || !transactieId) {
    return NextResponse.json({ error: 'Bestand en transactieId zijn verplicht' }, { status: 400 });
  }

  // Bestand opslaan
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const ext = path.extname(file.name);
  const filename = `tx-${transactieId}-${Date.now()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);

  // Oude bijlage verwijderen als die er was
  const bestaande = await prisma.transactie.findUnique({ where: { id: transactieId } });
  if (bestaande?.bijlagePad) {
    const oudPad = path.resolve(UPLOADS_DIR, path.basename(bestaande.bijlagePad));
    if (oudPad.startsWith(path.resolve(UPLOADS_DIR)) && fs.existsSync(oudPad)) fs.unlinkSync(oudPad);
  }

  // Database updaten
  await prisma.transactie.update({
    where: { id: transactieId },
    data: { bijlageNaam: file.name, bijlagePad: filename },
  });

  return NextResponse.json({ success: true, naam: file.name });
}

/**
 * DELETE /api/transactions/bijlage?id=123 — Verwijder bijlage
 */
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get('id') || '0');

  const tx = await prisma.transactie.findUnique({ where: { id } });
  if (tx?.bijlagePad) {
    const filePath = path.resolve(UPLOADS_DIR, path.basename(tx.bijlagePad));
    if (filePath.startsWith(path.resolve(UPLOADS_DIR)) && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  await prisma.transactie.update({
    where: { id },
    data: { bijlageNaam: null, bijlagePad: null },
  });

  return NextResponse.json({ success: true });
}
