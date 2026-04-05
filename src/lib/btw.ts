/**
 * BTW-aangifte berekeningen
 *
 * Genereert overzichten per maand, kwartaal en jaar
 * conform de BTW-aangifte rubrieken van de Belastingdienst.
 */

import { prisma } from './db';

interface BtwRegel {
  label: string;
  verkoopBedrag: number;
  verkoopBtw: number;
  inkoopBedrag: number;
  inkoopBtw: number;
}

interface BtwPeriode {
  periode: string;
  regels: BtwRegel[];
  totaalVerkoopBtw: number;
  totaalInkoopBtw: number;
  teBetalen: number;
}

interface BtwAangifte {
  // Rubriek 1a: Leveringen/diensten belast met hoog tarief
  rubriek1a_omzet: number;
  rubriek1a_btw: number;
  // Rubriek 1b: Leveringen/diensten belast met laag tarief
  rubriek1b_omzet: number;
  rubriek1b_btw: number;
  // Rubriek 1e: Leveringen/diensten belast met 0% of niet bij u belast
  rubriek1e_omzet: number;
  // Rubriek 3b: Diensten verleend aan ondernemers in andere EU-landen
  rubriek3b_omzet: number;
  // Rubriek 4a: Leveringen naar landen buiten de EU
  rubriek4a_omzet: number;
  // Rubriek 4b: Diensten verleend buiten de EU
  rubriek4b_omzet: number;
  // Rubriek 5b: Voorbelasting
  rubriek5b: number;
  // Saldo
  teBetalen: number;
}

/**
 * Bereken BTW-overzicht voor een periode
 */
export async function berekenBtwPeriode(
  van: Date,
  tot: Date,
  periodeLabel: string
): Promise<BtwPeriode> {
  const transacties = await prisma.transactie.findMany({
    where: { datum: { gte: van, lt: tot } },
    include: { categorie: true },
  });

  const tarieven = [
    { tarief: 0.21, label: 'Leveringen/diensten 21%' },
    { tarief: 0.09, label: 'Leveringen/diensten 9%' },
    { tarief: 0, label: 'Leveringen/diensten 0% btw' },
  ];

  const regels: BtwRegel[] = tarieven.map(({ tarief, label }) => {
    const verkoop = transacties.filter(t => t.richting === 'verkoop' && Math.abs(t.btwPercentage - tarief) < 0.001);
    const inkoop = transacties.filter(t => t.richting === 'inkoop' && Math.abs(t.btwPercentage - tarief) < 0.001);

    return {
      label,
      verkoopBedrag: round2(verkoop.reduce((sum, t) => sum + t.bedragExclBtw, 0)),
      verkoopBtw: round2(verkoop.reduce((sum, t) => sum + t.btwBedrag, 0)),
      inkoopBedrag: round2(inkoop.reduce((sum, t) => sum + t.bedragExclBtw, 0)),
      inkoopBtw: round2(inkoop.reduce((sum, t) => sum + t.btwBedrag, 0)),
    };
  });

  const totaalVerkoopBtw = round2(regels.reduce((sum, r) => sum + r.verkoopBtw, 0));
  const totaalInkoopBtw = round2(regels.reduce((sum, r) => sum + r.inkoopBtw, 0));

  return {
    periode: periodeLabel,
    regels,
    totaalVerkoopBtw,
    totaalInkoopBtw,
    teBetalen: round2(totaalVerkoopBtw - totaalInkoopBtw),
  };
}

/**
 * Genereer BTW-aangifte data voor een kwartaal
 * Conform het aangifteformulier van de Belastingdienst
 */
export async function genereerBtwAangifte(jaar: number, kwartaal: number): Promise<BtwAangifte> {
  const maandStart = (kwartaal - 1) * 3;
  const van = new Date(jaar, maandStart, 1);
  const tot = new Date(jaar, maandStart + 3, 1);

  const transacties = await prisma.transactie.findMany({
    where: { datum: { gte: van, lt: tot } },
    include: { categorie: true },
  });

  // Privé en ongecategoriseerde transacties uitsluiten uit BTW
  // Ongecategoriseerde transacties hebben btwTarief=0 en geen betrouwbare classificatie
  const zakelijk = transacties.filter(t => t.categorie && t.categorie.type !== 'prive');
  const verkoop = zakelijk.filter(t => t.richting === 'verkoop');
  const inkoop = zakelijk.filter(t => t.richting === 'inkoop');

  // Scheid NL/EU/buiten-EU omzet op basis van categoriecode
  const verkoopNL = verkoop.filter(t => !t.categorie || !['8100', '8200'].includes(t.categorie.code));
  const verkoopEU = verkoop.filter(t => t.categorie?.code === '8100');
  const verkoopBuitenEU = verkoop.filter(t => t.categorie?.code === '8200');

  // Rubriek 1a: NL verkoop 21%
  const nl21 = verkoopNL.filter(t => t.btwPercentage === 0.21);
  const rubriek1a_omzet = round2(nl21.reduce((s, t) => s + t.bedragExclBtw, 0));
  const rubriek1a_btw = round2(nl21.reduce((s, t) => s + t.btwBedrag, 0));

  // Rubriek 1b: NL verkoop 9%
  const nl9 = verkoopNL.filter(t => t.btwPercentage === 0.09);
  const rubriek1b_omzet = round2(nl9.reduce((s, t) => s + t.bedragExclBtw, 0));
  const rubriek1b_btw = round2(nl9.reduce((s, t) => s + t.btwBedrag, 0));

  // Rubriek 1e: NL verkoop 0%
  const nl0 = verkoopNL.filter(t => t.btwPercentage === 0);
  const rubriek1e_omzet = round2(nl0.reduce((s, t) => s + t.bedragExclBtw, 0));

  // Rubriek 3b: Diensten aan EU-ondernemers (verlegde BTW)
  const rubriek3b_omzet = round2(verkoopEU.reduce((s, t) => s + t.bedragExclBtw, 0));

  // Rubriek 4a/4b: Buiten EU
  const rubriek4a_omzet = 0; // Leveringen buiten EU — apart als nodig
  const rubriek4b_omzet = round2(verkoopBuitenEU.reduce((s, t) => s + t.bedragExclBtw, 0));

  // Rubriek 5b: Voorbelasting (BTW op inkoop)
  const rubriek5b = round2(inkoop.reduce((s, t) => s + t.btwBedrag, 0));

  const teBetalen = round2(rubriek1a_btw + rubriek1b_btw - rubriek5b);

  return {
    rubriek1a_omzet, rubriek1a_btw,
    rubriek1b_omzet, rubriek1b_btw,
    rubriek1e_omzet,
    rubriek3b_omzet,
    rubriek4a_omzet,
    rubriek4b_omzet,
    rubriek5b,
    teBetalen,
  };
}

/**
 * Bereken BTW-overzicht per kwartaal voor een heel jaar
 */
export async function berekenJaarOverzicht(jaar: number): Promise<BtwPeriode[]> {
  const kwartalen = [];
  for (let q = 1; q <= 4; q++) {
    const maandStart = (q - 1) * 3;
    const van = new Date(jaar, maandStart, 1);
    const tot = new Date(jaar, maandStart + 3, 1);
    kwartalen.push(await berekenBtwPeriode(van, tot, `Kwartaal ${q}`));
  }
  return kwartalen;
}

/**
 * Bereken BTW-overzicht per maand voor een heel jaar
 */
export async function berekenMaandOverzicht(jaar: number): Promise<BtwPeriode[]> {
  const maandNamen = [
    'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
    'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December',
  ];

  const maanden = [];
  for (let m = 0; m < 12; m++) {
    const van = new Date(jaar, m, 1);
    const tot = new Date(jaar, m + 1, 1);
    maanden.push(await berekenBtwPeriode(van, tot, maandNamen[m]));
  }
  return maanden;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
