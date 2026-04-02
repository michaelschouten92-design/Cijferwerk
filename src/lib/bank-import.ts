/**
 * Universele bank-import parser
 * Ondersteunt: CSV (Revolut, ING, Rabobank, ABN AMRO, Bunq, generiek) + MT940
 */

interface ParsedTransaction {
  revolutTransId: string;
  datum: Date;
  omschrijving: string;
  bedrag: number; // bruto bedrag uit bankafschrift (incl. BTW)
  tegenpartij: string;
  richting: 'inkoop' | 'verkoop';
}

interface ParseResult {
  transacties: ParsedTransaction[];
  balans: number | null;
}

/**
 * Auto-detect formaat en parse bankbestand
 */
export function parseBankBestand(content: string, filename: string): ParseResult {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.sta') || lower.endsWith('.mt940') || content.trimStart().startsWith(':20:') || content.trimStart().startsWith('{1:')) {
    return parseMT940(content);
  }
  return parseCSV(content);
}

// ===================== CSV PARSER (multi-bank) =====================

function parseCSV(csvContent: string): ParseResult {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return { transacties: [], balans: null };

  const firstLine = lines[0];
  const separator = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
  const headers = parseCSVLine(firstLine, separator).map(h => h.trim().toLowerCase().replace(/"/g, ''));

  const bank = detectBank(headers);
  const transactions: ParsedTransaction[] = [];
  let balans: number | null = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseCSVLine(line, separator).map(c => c.replace(/^"|"$/g, '').trim());
    const tx = bank.parseLine(cols, headers);
    if (!tx) continue;
    if (balans === null && bank.balanceIdx !== -1) {
      const bal = parseAmount(cols[bank.balanceIdx]);
      if (!isNaN(bal)) balans = bal;
    }
    transactions.push(tx);
  }

  return { transacties: transactions, balans };
}

interface BankParser { name: string; balanceIdx: number; parseLine: (cols: string[], headers: string[]) => ParsedTransaction | null; }

function detectBank(headers: string[]): BankParser {
  const h = headers.join(' ');
  if (h.includes('date started') || h.includes('date completed')) return createRevolutParser(headers);
  if (h.includes('naam / omschrijving') || (h.includes('datum') && h.includes('af bij'))) return createINGParser(headers);
  if (h.includes('naam tegenpartij') || h.includes('iban/bban')) return createRaboParser(headers);
  if (h.includes('transactiedatum') || h.includes('rekeningnummer')) return createABNParser(headers);
  if (h.includes('bunq') || (h.includes('amount') && h.includes('type') && h.includes('sub type'))) return createBunqParser(headers);
  return createGenericParser(headers);
}

function createRevolutParser(headers: string[]): BankParser {
  const idIdx = findCol(headers, ['id']);
  const completedIdx = findCol(headers, ['date completed (utc)', 'completed date']);
  const startedIdx = findCol(headers, ['date started (utc)', 'started date']);
  const descIdx = findCol(headers, ['description']);
  const refIdx = findCol(headers, ['reference']);
  const amountIdx = findCol(headers, ['amount']);
  const totalIdx = findCol(headers, ['total amount']);
  const stateIdx = findCol(headers, ['state']);
  const balIdx = findCol(headers, ['balance']);
  return { name: 'Revolut', balanceIdx: balIdx, parseLine: (cols) => {
    const state = stateIdx !== -1 ? cols[stateIdx]?.toLowerCase() : '';
    if (state && state !== 'completed') return null;
    const amount = parseAmount(cols[totalIdx !== -1 ? totalIdx : amountIdx]);
    if (amount === 0) return null;
    const desc = cols[descIdx] || 'Geen omschrijving';
    const ref = refIdx !== -1 ? cols[refIdx] || '' : '';
    const dateStr = cols[completedIdx] || cols[startedIdx] || '';
    const id = idIdx !== -1 && cols[idIdx] ? cols[idIdx] : `csv-${dateStr}-${amount}-${desc}`.substring(0, 200);
    return { revolutTransId: id, datum: parseDate(dateStr), omschrijving: ref && ref !== desc ? `${desc} — ${ref}` : desc, bedrag: Math.abs(amount), tegenpartij: desc, richting: amount > 0 ? 'verkoop' : 'inkoop' };
  }};
}

function createINGParser(headers: string[]): BankParser {
  const datumIdx = findCol(headers, ['datum']);
  const naamIdx = findCol(headers, ['naam / omschrijving', 'naam/omschrijving']);
  const bedragIdx = findCol(headers, ['bedrag (eur)', 'bedrag']);
  const afBijIdx = findCol(headers, ['af bij', 'af/bij']);
  const medIdx = findCol(headers, ['mededelingen']);
  const saldiIdx = findCol(headers, ['saldo na mutatie']);
  return { name: 'ING', balanceIdx: saldiIdx, parseLine: (cols) => {
    const bedrag = parseAmount(cols[bedragIdx]);
    if (bedrag === 0) return null;
    const naam = cols[naamIdx] || '';
    const med = medIdx !== -1 ? cols[medIdx] || '' : '';
    const dateStr = cols[datumIdx] || '';
    const isInkomst = afBijIdx !== -1 ? cols[afBijIdx]?.toLowerCase() === 'bij' : bedrag > 0;
    return { revolutTransId: `ing-${dateStr}-${bedrag}-${naam}`.substring(0, 200), datum: parseDate(dateStr), omschrijving: med ? `${naam} — ${med}` : naam, bedrag: Math.abs(bedrag), tegenpartij: naam, richting: isInkomst ? 'verkoop' : 'inkoop' };
  }};
}

function createRaboParser(headers: string[]): BankParser {
  const datumIdx = findCol(headers, ['datum']);
  const naamIdx = findCol(headers, ['naam tegenpartij']);
  const bedragIdx = findCol(headers, ['bedrag']);
  const omschrIdx = findCol(headers, ['omschrijving-1', 'omschrijving']);
  const saldiIdx = findCol(headers, ['saldo na trn']);
  return { name: 'Rabobank', balanceIdx: saldiIdx, parseLine: (cols) => {
    const bedrag = parseAmount(cols[bedragIdx]);
    if (bedrag === 0) return null;
    const naam = cols[naamIdx] || '';
    const omschr = omschrIdx !== -1 ? cols[omschrIdx] || '' : '';
    const dateStr = cols[datumIdx] || '';
    return { revolutTransId: `rabo-${dateStr}-${bedrag}-${naam}`.substring(0, 200), datum: parseDate(dateStr), omschrijving: omschr ? `${naam} — ${omschr}` : naam, bedrag: Math.abs(bedrag), tegenpartij: naam, richting: bedrag > 0 ? 'verkoop' : 'inkoop' };
  }};
}

function createABNParser(headers: string[]): BankParser {
  const datumIdx = findCol(headers, ['transactiedatum', 'datum']);
  const naamIdx = findCol(headers, ['naam']);
  const bedragIdx = findCol(headers, ['bedrag', 'transactiebedrag']);
  const omschrIdx = findCol(headers, ['omschrijving']);
  return { name: 'ABN AMRO', balanceIdx: -1, parseLine: (cols) => {
    const bedrag = parseAmount(cols[bedragIdx]);
    if (bedrag === 0) return null;
    const naam = cols[naamIdx] || '';
    const omschr = omschrIdx !== -1 ? cols[omschrIdx] || '' : '';
    const dateStr = cols[datumIdx] || '';
    return { revolutTransId: `abn-${dateStr}-${bedrag}-${naam}`.substring(0, 200), datum: parseDate(dateStr), omschrijving: omschr ? `${naam} — ${omschr}` : naam, bedrag: Math.abs(bedrag), tegenpartij: naam, richting: bedrag > 0 ? 'verkoop' : 'inkoop' };
  }};
}

function createBunqParser(headers: string[]): BankParser {
  const datumIdx = findCol(headers, ['date', 'datum']);
  const amountIdx = findCol(headers, ['amount', 'bedrag']);
  const descIdx = findCol(headers, ['description', 'omschrijving']);
  const nameIdx = findCol(headers, ['name', 'naam']);
  const balIdx = findCol(headers, ['balance after mutation', 'saldo na mutatie']);
  return { name: 'Bunq', balanceIdx: balIdx, parseLine: (cols) => {
    const bedrag = parseAmount(cols[amountIdx]);
    if (bedrag === 0) return null;
    const naam = nameIdx !== -1 ? cols[nameIdx] || '' : '';
    const desc = descIdx !== -1 ? cols[descIdx] || '' : '';
    const dateStr = cols[datumIdx] || '';
    const omschr = naam && desc ? `${naam} — ${desc}` : naam || desc || 'Geen omschrijving';
    return { revolutTransId: `bunq-${dateStr}-${bedrag}-${omschr}`.substring(0, 200), datum: parseDate(dateStr), omschrijving: omschr, bedrag: Math.abs(bedrag), tegenpartij: naam || desc, richting: bedrag > 0 ? 'verkoop' : 'inkoop' };
  }};
}

function createGenericParser(headers: string[]): BankParser {
  const datumIdx = findCol(headers, ['datum', 'date', 'boekdatum', 'transactiedatum']);
  const descIdx = findCol(headers, ['omschrijving', 'description', 'naam', 'naam / omschrijving']);
  const bedragIdx = findCol(headers, ['bedrag', 'amount', 'bedrag (eur)']);
  const balIdx = findCol(headers, ['saldo', 'balance', 'saldo na mutatie']);
  if (datumIdx === -1 || bedragIdx === -1) throw new Error('CSV-formaat niet herkend. Zorg dat het bestand minimaal een datum- en bedragkolom bevat.');
  return { name: 'Generiek', balanceIdx: balIdx, parseLine: (cols) => {
    const bedrag = parseAmount(cols[bedragIdx]);
    if (bedrag === 0) return null;
    const desc = descIdx !== -1 ? cols[descIdx] || 'Geen omschrijving' : 'Geen omschrijving';
    const dateStr = cols[datumIdx] || '';
    return { revolutTransId: `csv-${dateStr}-${bedrag}-${desc}`.substring(0, 200), datum: parseDate(dateStr), omschrijving: desc, bedrag: Math.abs(bedrag), tegenpartij: desc, richting: bedrag > 0 ? 'verkoop' : 'inkoop' };
  }};
}

// ===================== MT940 PARSER =====================

function parseMT940(content: string): ParseResult {
  const transactions: ParsedTransaction[] = [];
  let balans: number | null = null;
  const blocks = content.split(/(?=:20:)/);

  for (const block of blocks) {
    const balMatch = block.match(/:62[FM]:([CD])(\d{6})([A-Z]{3})([\d,]+)/);
    if (balMatch && balans === null) {
      const bal = parseFloat(balMatch[4].replace(',', '.'));
      balans = balMatch[1] === 'D' ? -bal : bal;
    }

    const lines = block.split('\n');
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      if (line.startsWith(':61:')) {
        const m = line.match(/:61:(\d{6})\d{0,4}([CD])\D?([\d,]+)/);
        if (m) {
          const dateStr = m[1];
          const dc = m[2];
          const amount = parseFloat(m[3].replace(',', '.'));
          // Zoek :86: info
          let info = '';
          if (i + 1 < lines.length && lines[i + 1].trim().startsWith(':86:')) {
            i++;
            info = lines[i].trim().substring(4);
            while (i + 1 < lines.length && !lines[i + 1].trim().startsWith(':')) {
              i++;
              info += ' ' + lines[i].trim();
            }
          }
          const year = parseInt(dateStr.substring(0, 2)) + 2000;
          const month = parseInt(dateStr.substring(2, 4)) - 1;
          const day = parseInt(dateStr.substring(4, 6));
          const tegenpartij = info.substring(0, 80) || 'Onbekend';
          transactions.push({
            revolutTransId: `mt940-${dateStr}-${amount}-${dc}-${tegenpartij}`.substring(0, 200),
            datum: new Date(year, month, day),
            omschrijving: info.substring(0, 200) || tegenpartij,
            bedrag: amount,
            tegenpartij,
            richting: dc === 'C' ? 'verkoop' : 'inkoop',
          });
        }
      }
      i++;
    }
  }
  return { transacties: transactions, balans };
}

// ===================== HELPERS =====================

function findCol(headers: string[], names: string[]): number {
  for (const name of names) { const idx = headers.indexOf(name); if (idx !== -1) return idx; }
  return -1;
}

function parseCSVLine(line: string, sep: string = ','): string[] {
  const result: string[] = []; let current = ''; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQuotes && line[i + 1] === '"') { current += '"'; i++; } else inQuotes = !inQuotes; }
    else if (c === sep && !inQuotes) { result.push(current); current = ''; }
    else current += c;
  }
  result.push(current); return result;
}

function parseAmount(str: string | undefined): number {
  if (!str) return 0;
  let clean = str.trim();
  if (clean.includes(',') && clean.includes('.')) {
    if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) clean = clean.replace(/\./g, '').replace(',', '.');
    else clean = clean.replace(/,/g, '');
  } else if (clean.includes(',')) clean = clean.replace(',', '.');
  return parseFloat(clean) || 0;
}

function parseDate(dateStr: string): Date {
  if (!dateStr) throw new Error('Transactie heeft geen datum');
  let date: Date | null = null;
  const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) date = new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]));
  if (!date) {
    const compact = dateStr.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (compact) date = new Date(parseInt(compact[1]), parseInt(compact[2]) - 1, parseInt(compact[3]));
  }
  if (!date) {
    const eu = dateStr.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/);
    if (eu) date = new Date(parseInt(eu[3]), parseInt(eu[2]) - 1, parseInt(eu[1]));
  }
  if (!date) date = new Date(dateStr);
  if (!date || isNaN(date.getTime())) {
    throw new Error(`Ongeldige datum: "${dateStr}"`);
  }
  return date;
}

export type { ParsedTransaction };
