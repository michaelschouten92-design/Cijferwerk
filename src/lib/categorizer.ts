/**
 * Auto-categorisatie engine
 *
 * Matcht transacties tegen CategorieRegel entries op basis van:
 * 1. Tegenpartij naam (case-insensitive contains)
 * 2. Omschrijving (case-insensitive contains)
 * 3. Prioriteit (hogere prioriteit wint)
 *
 * Berekent automatisch BTW op basis van het matched tarief.
 */

import { prisma } from './db';
import type { ParsedTransaction } from './bank-import';

interface CategorisatieResultaat {
  categorieCode: string;
  categorieNaam: string;
  relatieNaam: string | null;
  relatieId: number | null;
  btwTarief: number;
  btwBedrag: number;
  bedragExclBtw: number;
  gecategoriseerd: boolean;
}

/**
 * Categoriseer een transactie op basis van de regelset
 *
 * @param tegenpartij - naam van de tegenpartij (uit Revolut)
 * @param omschrijving - omschrijving van de transactie
 * @param brutoBedrag - het totaalbedrag inclusief BTW
 * @param richting - 'inkoop' of 'verkoop'
 */
export async function categoriseer(
  tegenpartij: string,
  omschrijving: string,
  brutoBedrag: number,
  richting: 'inkoop' | 'verkoop'
): Promise<CategorisatieResultaat> {
  const regels = await prisma.categorieRegel.findMany({
    orderBy: { prioriteit: 'desc' },
  });

  const tegenpartijLower = tegenpartij.toLowerCase();
  const omschrijvingLower = omschrijving.toLowerCase();

  // Zoek de best matchende regel
  let matchedRegel = null;
  for (const regel of regels) {
    const zoekLower = regel.zoekterm.toLowerCase();
    const veld = regel.zoekVeld === 'tegenpartij' ? tegenpartijLower : omschrijvingLower;

    if (veld.includes(zoekLower)) {
      matchedRegel = regel;
      break; // Regels zijn gesorteerd op prioriteit, eerste match wint
    }
  }

  if (!matchedRegel) {
    // Geen match gevonden - markeer als ongecategoriseerd
    // Standaard: gebruik categorie op basis van richting
    const defaultCode = richting === 'verkoop' ? '8000' : '4590';
    const defaultCat = await prisma.categorie.findUnique({ where: { code: defaultCode } });

    return {
      categorieCode: defaultCode,
      categorieNaam: defaultCat?.naam || 'Onbekend',
      relatieNaam: null,
      relatieId: null,
      btwTarief: 0,
      btwBedrag: 0,
      bedragExclBtw: brutoBedrag,
      gecategoriseerd: false,
    };
  }

  // Haal categorie op
  const categorie = await prisma.categorie.findUnique({
    where: { code: matchedRegel.categorieCode },
  });

  const btwTarief = matchedRegel.btwTarief ?? categorie?.btwTarief ?? 0.21;
  const isVrijgesteld = btwTarief === 0;

  // Bereken bedragen
  // Revolut geeft bruto bedragen - we berekenen excl. BTW terug
  const bedragExclBtw = isVrijgesteld ? brutoBedrag : round2(brutoBedrag / (1 + btwTarief));
  const btwBedrag = isVrijgesteld ? 0 : round2(brutoBedrag - bedragExclBtw);

  // Zoek relatie
  let relatieId: number | null = null;
  if (matchedRegel.relatieNaam) {
    const relatie = await prisma.relatie.findFirst({
      where: { naam: matchedRegel.relatieNaam },
    });
    relatieId = relatie?.id ?? null;
  }

  return {
    categorieCode: matchedRegel.categorieCode,
    categorieNaam: categorie?.naam || matchedRegel.categorieCode,
    relatieNaam: matchedRegel.relatieNaam,
    relatieId,
    btwTarief,
    btwBedrag,
    bedragExclBtw,
    gecategoriseerd: true,
  };
}

/**
 * Categoriseer en sla een batch transacties op
 */
export async function categoriseerEnSlaOp(transacties: ParsedTransaction[]) {
  // Stap 1: Bulk deduplicatie check (efficiënt, één query)
  const txIds = transacties.map(tx => tx.revolutTransId).filter(Boolean) as string[];
  const bestaande = txIds.length > 0
    ? new Set((await prisma.transactie.findMany({
        where: { revolutTransId: { in: txIds } },
        select: { revolutTransId: true },
      })).map(t => t.revolutTransId))
    : new Set<string>();

  // Stap 2: Bereid alle data voor (categoriseer, sla duplicaten over)
  const creates: any[] = [];

  for (const tx of transacties) {
    if (tx.revolutTransId && bestaande.has(tx.revolutTransId)) continue;

    const cat = await categoriseer(tx.tegenpartij, tx.omschrijving, tx.bedrag, tx.richting);
    const categorie = await prisma.categorie.findUnique({ where: { code: cat.categorieCode } });

    creates.push({
      data: {
        datum: tx.datum,
        omschrijving: tx.omschrijving,
        bedragExclBtw: cat.bedragExclBtw,
        btwPercentage: cat.btwTarief,
        btwBedrag: cat.btwBedrag,
        richting: tx.richting,
        gecategoriseerd: cat.gecategoriseerd,
        revolutTransId: tx.revolutTransId,
        relatieId: cat.relatieId,
        categorieId: categorie?.id,
        status: 'Betaald via Bank',
        soort: 'Overig',
      },
      meta: { categorieNaam: cat.categorieNaam, relatieNaam: cat.relatieNaam },
    });
  }

  // Stap 3: Schrijf per transactie, vang unique constraint violations op
  const resultaten: any[] = [];
  for (const c of creates) {
    try {
      const saved = await prisma.transactie.create({ data: c.data });
      resultaten.push({ ...saved, categorieNaam: c.meta.categorieNaam, relatieNaam: c.meta.relatieNaam });
    } catch (e: any) {
      if (e.code === 'P2002') continue; // Unique constraint: duplicaat, overslaan
      throw e;
    }
  }

  return resultaten;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
