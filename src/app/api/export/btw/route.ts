import { NextRequest, NextResponse } from 'next/server';
import { genereerBtwAangifte } from '@/lib/btw';
import { generateBtwAangifteHTML } from '@/lib/export';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jaar = parseInt(searchParams.get('jaar') || new Date().getFullYear().toString());
  const kwartaal = parseInt(searchParams.get('kwartaal') || '1');

  const [aangifte, settings] = await Promise.all([
    genereerBtwAangifte(jaar, kwartaal),
    prisma.appSettings.findFirst({ where: { id: 1 } }),
  ]);

  const bedrijf = settings ? { naam: settings.bedrijfNaam || '', kvk: settings.bedrijfKvk || '' } : undefined;
  const html = generateBtwAangifteHTML(aangifte, kwartaal, jaar, bedrijf);

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="btw-aangifte-Q${kwartaal}-${jaar}.html"`,
    },
  });
}
