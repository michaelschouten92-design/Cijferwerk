/**
 * Export functies voor CSV en PDF generatie
 */

interface TransactieExport {
  datum: string;
  omschrijving: string;
  relatie: string;
  categorie: string;
  bedragExclBtw: number;
  btwPercentage: number;
  btwBedrag: number;
  richting: string;
  status: string;
}

/**
 * Genereer CSV-string van transacties
 */
export function generateTransactieCSV(transacties: TransactieExport[]): string {
  const headers = ['Datum', 'Omschrijving', 'Relatie', 'Categorie', 'Bedrag excl. BTW', 'BTW%', 'BTW bedrag', 'Richting', 'Status'];
  const rows = transacties.map(t => [
    t.datum,
    `"${t.omschrijving.replace(/"/g, '""')}"`,
    `"${t.relatie.replace(/"/g, '""')}"`,
    `"${t.categorie.replace(/"/g, '""')}"`,
    t.bedragExclBtw.toFixed(2),
    (t.btwPercentage * 100).toFixed(0) + '%',
    t.btwBedrag.toFixed(2),
    t.richting === 'verkoop' ? 'Inkomst' : 'Uitgave',
    t.status,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

interface BtwAangifteData {
  rubriek1a_omzet: number;
  rubriek1a_btw: number;
  rubriek1b_omzet: number;
  rubriek1b_btw: number;
  rubriek1e_omzet: number;
  rubriek3b_omzet: number;
  rubriek4a_omzet: number;
  rubriek4b_omzet: number;
  rubriek5b: number;
  teBetalen: number;
}

/**
 * Genereer BTW-aangifte als printbare HTML
 */
export function generateBtwAangifteHTML(aangifte: BtwAangifteData, kwartaal: number, jaar: number): string {
  const f = (n: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n);

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <title>BTW Aangifte Q${kwartaal} ${jaar} - Mijn Bedrijf</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; max-width: 700px; margin: 40px auto; color: #1a1a1a; }
    h1 { font-size: 24px; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
    h2 { font-size: 16px; color: #666; margin-top: 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f8fafc; font-size: 12px; text-transform: uppercase; color: #6b7280; }
    .right { text-align: right; }
    .total { font-weight: bold; border-top: 2px solid #1a1a1a; font-size: 16px; }
    .total td { padding-top: 12px; }
    .positive { color: #dc2626; }
    .negative { color: #16a34a; }
    .footer { margin-top: 40px; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <h1>BTW Aangifte</h1>
  <h2>Kwartaal ${kwartaal} — ${jaar} | Mijn Bedrijf | KVK 96041420</h2>

  <table>
    <thead>
      <tr><th>Rubriek</th><th class="right">Omzet</th><th class="right">BTW</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>1a. Leveringen/diensten belast met hoog tarief (21%)</td>
        <td class="right">${f(aangifte.rubriek1a_omzet)}</td>
        <td class="right">${f(aangifte.rubriek1a_btw)}</td>
      </tr>
      <tr>
        <td>1b. Leveringen/diensten belast met laag tarief (9%)</td>
        <td class="right">${f(aangifte.rubriek1b_omzet)}</td>
        <td class="right">${f(aangifte.rubriek1b_btw)}</td>
      </tr>
      <tr>
        <td>1e. Leveringen/diensten belast met 0%</td>
        <td class="right">${f(aangifte.rubriek1e_omzet)}</td>
        <td class="right">—</td>
      </tr>
      ${aangifte.rubriek3b_omzet > 0 ? `<tr>
        <td>3b. Diensten aan EU-ondernemers (verlegde BTW)</td>
        <td class="right">${f(aangifte.rubriek3b_omzet)}</td>
        <td class="right">—</td>
      </tr>` : ''}
      ${aangifte.rubriek4b_omzet > 0 ? `<tr>
        <td>4b. Diensten aan ondernemers buiten de EU</td>
        <td class="right">${f(aangifte.rubriek4b_omzet)}</td>
        <td class="right">—</td>
      </tr>` : ''}
      <tr>
        <td>5b. Voorbelasting</td>
        <td class="right">—</td>
        <td class="right">${f(aangifte.rubriek5b)}</td>
      </tr>
      <tr class="total">
        <td>${aangifte.teBetalen >= 0 ? 'Te betalen' : 'Terug te ontvangen'}</td>
        <td></td>
        <td class="right ${aangifte.teBetalen >= 0 ? 'positive' : 'negative'}">${f(Math.abs(aangifte.teBetalen))}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    Gegenereerd op ${new Date().toLocaleDateString('nl-NL')} — Mijn Bedrijf
  </div>
</body>
</html>`;
}

interface BalansData {
  jaar: number;
  vasteActiva: number;
  liquidMiddelen: number;
  debiteuren: number;
  btwPositie: number; // positief = schuld, negatief = vordering
  beginVermogen: number;
  winst: number;
}

/**
 * Genereer Balansrapport als printbare HTML
 */
export function generateBalansHTML(data: BalansData): string {
  const f = (n: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n);

  const btwVordering = data.btwPositie < 0 ? Math.abs(data.btwPositie) : 0;
  const btwSchuld = data.btwPositie > 0 ? data.btwPositie : 0;

  const totaalActiva = data.vasteActiva + data.liquidMiddelen + data.debiteuren + btwVordering;
  const eigenVermogen = data.beginVermogen + data.winst;
  const totaalPassiva = eigenVermogen + btwSchuld;

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <title>Balans per 31-12-${data.jaar} - Mijn Bedrijf</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; color: #1a1a1a; }
    h1 { font-size: 24px; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
    h2 { font-size: 16px; color: #666; margin-top: 0; }
    h3 { font-size: 14px; margin: 24px 0 8px; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; }
    .right { text-align: right; }
    .indent { padding-left: 24px; }
    .indent2 { padding-left: 40px; font-size: 13px; color: #6b7280; }
    .subtotal { font-weight: 600; background: #f8fafc; }
    .total { font-weight: bold; border-top: 2px solid #1a1a1a; font-size: 16px; }
    .total td { padding: 12px; }
    .section { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
    .footer { margin-top: 40px; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <h1>Balans</h1>
  <h2>Per 31 december ${data.jaar} | Mijn Bedrijf | KVK 96041420</h2>

  <div class="section">
    <div>
      <h3>Activa</h3>
      <table>
        ${data.vasteActiva > 0 ? `<tr><td class="indent">Vaste activa (boekwaarde)</td><td class="right">${f(data.vasteActiva)}</td></tr>` : ''}
        <tr><td class="indent">Liquide middelen (bank)</td><td class="right">${f(data.liquidMiddelen)}</td></tr>
        <tr><td class="indent">Debiteuren</td><td class="right">${f(data.debiteuren)}</td></tr>
        ${btwVordering > 0 ? `<tr><td class="indent">BTW-vordering</td><td class="right">${f(btwVordering)}</td></tr>` : ''}
        <tr class="total"><td>Totaal activa</td><td class="right">${f(totaalActiva)}</td></tr>
      </table>
    </div>

    <div>
      <h3>Passiva</h3>
      <table>
        <tr><td class="indent">Eigen vermogen</td><td class="right">${f(eigenVermogen)}</td></tr>
        <tr><td class="indent2">Beginvermogen</td><td class="right">${f(data.beginVermogen)}</td></tr>
        <tr><td class="indent2">Resultaat boekjaar</td><td class="right">${f(data.winst)}</td></tr>
        ${btwSchuld > 0 ? `<tr><td class="indent">BTW-schuld</td><td class="right">${f(btwSchuld)}</td></tr>` : ''}
        <tr class="total"><td>Totaal passiva</td><td class="right">${f(totaalPassiva)}</td></tr>
      </table>
    </div>
  </div>

  <div class="footer">
    Gegenereerd op ${new Date().toLocaleDateString('nl-NL')} — Mijn Bedrijf
  </div>
</body>
</html>`;
}

export interface WinstVerliesData {
  jaar: number;
  omzet: number;
  kosten: number;
  afschrijvingen: number;
  winst: number;
  kostenPerCategorie: Record<string, number>;
  omzetPerMaand: number[];
}

/**
 * Genereer Winst & Verlies overzicht als printbare HTML
 */
export function generateWinstVerliesHTML(data: WinstVerliesData): string {
  const f = (n: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n);
  const maandNamen = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

  const kostenRijen = Object.entries(data.kostenPerCategorie)
    .sort(([, a], [, b]) => b - a)
    .map(([naam, bedrag]) => `<tr><td style="padding-left:24px">${naam}</td><td class="right">${f(bedrag)}</td></tr>`)
    .join('\n');

  const omzetRijen = data.omzetPerMaand
    .map((val, i) => val > 0 ? `<tr><td style="padding-left:24px">${maandNamen[i]}</td><td class="right">${f(val)}</td></tr>` : '')
    .filter(Boolean)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <title>Winst & Verlies ${data.jaar} - Mijn Bedrijf</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; max-width: 700px; margin: 40px auto; color: #1a1a1a; }
    h1 { font-size: 24px; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
    h2 { font-size: 16px; color: #666; margin-top: 0; }
    h3 { font-size: 14px; margin: 24px 0 8px; color: #374151; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    td { padding: 6px 12px; border-bottom: 1px solid #f3f4f6; }
    .right { text-align: right; }
    .subtotal { font-weight: 600; background: #f8fafc; }
    .total { font-weight: bold; border-top: 2px solid #1a1a1a; font-size: 18px; }
    .total td { padding: 12px; }
    .positive { color: #16a34a; }
    .negative { color: #dc2626; }
    .footer { margin-top: 40px; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <h1>Winst & Verlies Overzicht</h1>
  <h2>${data.jaar} | Mijn Bedrijf | KVK 96041420</h2>

  <h3>Omzet</h3>
  <table>
    ${omzetRijen}
    <tr class="subtotal"><td>Totaal omzet</td><td class="right">${f(data.omzet)}</td></tr>
  </table>

  <h3>Kosten</h3>
  <table>
    ${kostenRijen}
    <tr class="subtotal"><td>Totaal kosten</td><td class="right">${f(data.kosten)}</td></tr>
  </table>

  ${data.afschrijvingen > 0 ? `
  <h3>Afschrijvingen</h3>
  <table>
    <tr><td style="padding-left:24px">Afschrijving vaste activa</td><td class="right">${f(data.afschrijvingen)}</td></tr>
  </table>
  ` : ''}

  <table>
    <tr class="total">
      <td>Nettoresultaat</td>
      <td class="right ${data.winst >= 0 ? 'positive' : 'negative'}">${f(data.winst)}</td>
    </tr>
  </table>

  <div class="footer">
    Gegenereerd op ${new Date().toLocaleDateString('nl-NL')} — Mijn Bedrijf
  </div>
</body>
</html>`;
}
