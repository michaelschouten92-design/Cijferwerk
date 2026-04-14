import { NextRequest, NextResponse } from 'next/server';
import { berekenJaarOverzicht, berekenMaandOverzicht, genereerBtwAangifte } from '@/lib/btw';

export const dynamic = 'force-dynamic';

/**
 * GET /api/btw?jaar=2026&weergave=kwartaal
 * weergave: maand | kwartaal | aangifte
 * kwartaal: 1-4 (alleen voor weergave=aangifte)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jaar = parseInt(searchParams.get('jaar') || new Date().getFullYear().toString());
  const weergave = searchParams.get('weergave') || 'kwartaal';

  if (weergave === 'maand') {
    const overzicht = await berekenMaandOverzicht(jaar);
    return NextResponse.json(overzicht);
  }

  if (weergave === 'aangifte') {
    const kwartaal = parseInt(searchParams.get('kwartaal') || '1');
    const aangifte = await genereerBtwAangifte(jaar, kwartaal);
    return NextResponse.json(aangifte);
  }

  // Default: kwartaal
  const overzicht = await berekenJaarOverzicht(jaar);
  return NextResponse.json(overzicht);
}
