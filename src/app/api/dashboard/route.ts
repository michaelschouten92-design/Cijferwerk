import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { genereerBtwAangifte } from '@/lib/btw';
import { berekenAfschrijvingen, round2 as sharedRound2 } from '@/lib/calculations';

/**
 * GET /api/dashboard?jaar=2026 - Dashboard overzichtsdata
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jaar = parseInt(searchParams.get('jaar') || new Date().getFullYear().toString());

  const van = new Date(jaar, 0, 1);
  const tot = new Date(jaar + 1, 0, 1);

  const transacties = await prisma.transactie.findMany({
    where: { datum: { gte: van, lt: tot } },
    include: { categorie: true },
  });

  // Privétransacties uitsluiten van omzet/kosten
  const zakelijk = transacties.filter(t => !t.categorie || t.categorie.type !== 'prive');
  const verkoop = zakelijk.filter(t => t.richting === 'verkoop');
  const inkoop = zakelijk.filter(t => t.richting === 'inkoop');
  const ongecategoriseerd = transacties.filter(t => !t.gecategoriseerd);

  const omzet = round2(verkoop.reduce((s, t) => s + t.bedragExclBtw, 0));
  const kosten = round2(inkoop.reduce((s, t) => s + t.bedragExclBtw, 0));

  // Afschrijvingen — gedeelde berekening voor consistentie
  const activa = await prisma.vastActief.findMany();
  const afschrijvingen = berekenAfschrijvingen(activa, jaar);
  const winst = round2(omzet - kosten - afschrijvingen);

  // Kosten per categorie
  const kostenPerCategorie: Record<string, number> = {};
  for (const t of inkoop) {
    const naam = t.categorie?.naam || 'Ongecategoriseerd';
    kostenPerCategorie[naam] = round2((kostenPerCategorie[naam] || 0) + t.bedragExclBtw);
  }

  // Omzet per maand
  const omzetPerMaand = Array.from({ length: 12 }, (_, m) => {
    const maandTx = verkoop.filter(t => new Date(t.datum).getMonth() === m);
    return round2(maandTx.reduce((s, t) => s + t.bedragExclBtw, 0));
  });

  // Parallelle queries voor onafhankelijke data
  const huidigKwartaal = Math.floor(new Date().getMonth() / 3) + 1;
  const [btwAangifte, laatsteSync, settings, openstaandeFacturen] = await Promise.all([
    genereerBtwAangifte(jaar, huidigKwartaal),
    prisma.syncLog.findFirst({ orderBy: { timestamp: 'desc' } }),
    prisma.appSettings.findFirst({ where: { id: 1 } }),
    prisma.factuur.findMany({ where: { status: 'openstaand' }, include: { relatie: true, regels: true } }),
  ]);
  const openstaand = openstaandeFacturen.map(f => {
    const totaal = f.regels.reduce((s, r) => s + r.aantal * r.stuksprijs * (1 + r.btwPercentage), 0);
    const dagenOver = Math.floor((Date.now() - new Date(f.vervaldatum).getTime()) / 86400000);
    return {
      id: f.id,
      nummer: f.nummer,
      klant: f.relatie.naam,
      totaal: round2(totaal),
      vervaldatum: f.vervaldatum,
      dagenOver: Math.max(0, dagenOver),
    };
  });

  // BTW deadline
  const btwDeadlines = [
    { kwartaal: 1, deadline: new Date(jaar, 3, 30) },  // 30 april
    { kwartaal: 2, deadline: new Date(jaar, 6, 31) },  // 31 juli
    { kwartaal: 3, deadline: new Date(jaar, 9, 31) },  // 31 oktober
    { kwartaal: 4, deadline: new Date(jaar + 1, 0, 31) }, // 31 januari
  ];
  const btwDeadline = btwDeadlines.find(d => d.kwartaal === huidigKwartaal);
  const dagenTotDeadline = btwDeadline ? Math.ceil((btwDeadline.deadline.getTime() - Date.now()) / 86400000) : null;

  // Inkomsten/uitgaven deze maand
  const huidigeMaand = new Date().getMonth();
  const inkomstenDezeMaand = round2(verkoop.filter(t => new Date(t.datum).getMonth() === huidigeMaand).reduce((s, t) => s + t.bedragExclBtw, 0));
  const uitgavenDezeMaand = round2(inkoop.filter(t => new Date(t.datum).getMonth() === huidigeMaand).reduce((s, t) => s + t.bedragExclBtw, 0));

  return NextResponse.json({
    jaar,
    omzet,
    kosten,
    winst,
    rekeningBalans: settings?.rekeningBalans ?? null,
    balansUpdatedAt: settings?.balansUpdatedAt ?? null,
    aantalTransacties: transacties.length,
    ongecategoriseerd: ongecategoriseerd.length,
    kostenPerCategorie,
    omzetPerMaand,
    btwAangifte: { kwartaal: huidigKwartaal, ...btwAangifte },
    inkomstenDezeMaand,
    uitgavenDezeMaand,
    openstaandeFacturen: openstaand,
    klaarstaandeSjablonen: await getKlaarstaandeSjablonen(),
    btwDeadline: btwDeadline ? {
      kwartaal: huidigKwartaal,
      deadline: btwDeadline.deadline,
      dagenTot: dagenTotDeadline,
    } : null,
    laatsteSync: laatsteSync ? {
      timestamp: laatsteSync.timestamp,
      status: laatsteSync.status,
      melding: laatsteSync.melding,
    } : null,
  });
}

async function getKlaarstaandeSjablonen() {
  const sjablonen = await prisma.factuurSjabloon.findMany({
    where: { actief: true, volgendeDatum: { lte: new Date() } },
    include: { relatie: true },
  });
  return sjablonen.map(s => ({
    id: s.id,
    naam: s.naam,
    klant: s.relatie.naam,
    interval: s.interval,
    volgendeDatum: s.volgendeDatum,
  }));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
