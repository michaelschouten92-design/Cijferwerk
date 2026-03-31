import { NextRequest, NextResponse } from 'next/server';
import { genereerBtwAangifte } from '@/lib/btw';
import { generateBtwAangifteHTML } from '@/lib/export';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jaar = parseInt(searchParams.get('jaar') || new Date().getFullYear().toString());
  const kwartaal = parseInt(searchParams.get('kwartaal') || '1');

  const aangifte = await genereerBtwAangifte(jaar, kwartaal);
  const html = generateBtwAangifteHTML(aangifte, kwartaal, jaar);

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="btw-aangifte-Q${kwartaal}-${jaar}.html"`,
    },
  });
}
