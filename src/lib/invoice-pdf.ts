/**
 * Factuur PDF generator — professionele facturen als printbare HTML
 */

interface FactuurData {
  nummer: string;
  datum: string;
  vervaldatum: string;
  klant: {
    naam: string;
    adres?: string;
    postcode?: string;
    plaats?: string;
    btwNummer?: string;
  };
  bedrijf: {
    naam: string;
    contactpersoon: string;
    adres: string;
    postcode: string;
    telefoon?: string;
    email?: string;
    kvk: string;
    btw: string;
    iban: string;
  };
  regels: {
    aantal: number;
    beschrijving: string;
    stuksprijs: number;
    btwPercentage: number;
  }[];
  logo?: string | null;   // Base64 data URL
  kleur?: string;          // Hex kleurcode
}

export function genereerFactuurHTML(data: FactuurData): string {
  const kleur = data.kleur || '#2563eb';
  const regels = data.regels.map(r => {
    const totaal = r.aantal * r.stuksprijs;
    const btw = totaal * r.btwPercentage;
    return { ...r, totaal, btw };
  });

  const subtotaal = regels.reduce((s, r) => s + r.totaal, 0);
  const totaalBtw = regels.reduce((s, r) => s + r.btw, 0);
  const totaal = subtotaal + totaalBtw;

  const logoHtml = data.logo
    ? `<img src="${data.logo}" style="max-height:60px;max-width:200px;" alt="Logo" />`
    : `<h1 style="font-size:28px;color:${kleur};font-weight:700;margin:0;">FACTUUR</h1>`;

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<title>Factuur ${data.nummer}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
  .company-info { text-align: right; font-size: 13px; color: #555; line-height: 1.6; }
  .accent { color: ${kleur}; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 30px; }
  .client-info { font-size: 14px; line-height: 1.6; }
  .client-info .label { color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .invoice-meta { text-align: right; font-size: 14px; line-height: 1.8; }
  .invoice-meta .label { color: #888; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  thead th { background: ${kleur}11; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: ${kleur}; border-bottom: 2px solid ${kleur}33; }
  thead th:last-child, thead th:nth-child(4) { text-align: right; }
  tbody td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
  tbody td:last-child, tbody td:nth-child(4) { text-align: right; }
  .totals { margin-top: 20px; display: flex; justify-content: flex-end; }
  .totals table { width: 280px; }
  .totals td { padding: 6px 12px; font-size: 14px; }
  .totals tr:last-child td { font-weight: 700; font-size: 16px; border-top: 2px solid ${kleur}; padding-top: 10px; color: ${kleur}; }
  .totals td:last-child { text-align: right; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #888; text-align: center; }
  @media print { body { padding: 20px; } .no-print { display: none !important; } }
</style>
</head>
<body>
  <div class="header">
    ${logoHtml}
    <div class="company-info">
      <strong>${data.bedrijf.naam}</strong><br>
      ${data.bedrijf.contactpersoon ? data.bedrijf.contactpersoon + '<br>' : ''}
      ${data.bedrijf.adres}<br>
      ${data.bedrijf.postcode}<br>
      ${data.bedrijf.telefoon ? data.bedrijf.telefoon + '<br>' : ''}
      ${data.bedrijf.email ? data.bedrijf.email + '<br>' : ''}
      KVK: ${data.bedrijf.kvk}<br>
      ${data.bedrijf.btw}<br>
      IBAN: ${data.bedrijf.iban}
    </div>
  </div>

  <div class="meta">
    <div class="client-info">
      <div class="label">Factuuradres</div>
      <strong>${data.klant.naam}</strong><br>
      ${data.klant.adres || ''}<br>
      ${data.klant.postcode || ''} ${data.klant.plaats || ''}
      ${data.klant.btwNummer ? '<br>BTW: ' + data.klant.btwNummer : ''}
    </div>
    <div class="invoice-meta">
      <span class="label">Factuurnummer:</span> <strong>${data.nummer}</strong><br>
      <span class="label">Datum:</span> ${data.datum}<br>
      <span class="label">Betaal vóór:</span> ${data.vervaldatum}
    </div>
  </div>

  <table>
    <thead>
      <tr><th>Aantal</th><th>Beschrijving</th><th>Prijs</th><th>BTW</th><th>Totaal</th></tr>
    </thead>
    <tbody>
      ${regels.map(r => `
      <tr>
        <td>${r.aantal}</td>
        <td>${r.beschrijving}</td>
        <td>&euro; ${r.stuksprijs.toFixed(2)}</td>
        <td>${(r.btwPercentage * 100).toFixed(0)}%</td>
        <td>&euro; ${r.totaal.toFixed(2)}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr><td>Subtotaal</td><td>&euro; ${subtotaal.toFixed(2)}</td></tr>
      <tr><td>BTW</td><td>&euro; ${totaalBtw.toFixed(2)}</td></tr>
      <tr><td>Totaal</td><td>&euro; ${totaal.toFixed(2)}</td></tr>
    </table>
  </div>

  <div class="footer">
    Betaling binnen 14 dagen op ${data.bedrijf.iban} t.n.v. ${data.bedrijf.naam}<br>
    o.v.v. factuurnummer ${data.nummer}
  </div>

  <div class="no-print" style="position:fixed;bottom:20px;right:20px;">
    <button onclick="window.print()" style="padding:10px 20px;background:${kleur};color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;">Opslaan als PDF</button>
  </div>
  <script>setTimeout(() => window.print(), 500);</script>
</body>
</html>`;
}

export type { FactuurData };
