/**
 * Revolut Business CSV Import
 *
 * Verwacht CSV-formaat (Revolut Business account statement export):
 * Date started (UTC), Date completed (UTC), ID, Type, State, Description, Reference,
 * Payer, Card number, ..., Amount, Total amount, ..., Fee, ..., Balance, ...
 */

interface ParsedTransaction {
  revolutTransId: string;
  datum: Date;
  omschrijving: string;
  bedragExclBtw: number;
  tegenpartij: string;
  richting: 'inkoop' | 'verkoop';
}

interface ParseResult {
  transacties: ParsedTransaction[];
  balans: number | null;
}

/**
 * Parse een Revolut Business CSV-bestand naar transacties + balans
 */
export function parseRevolutCSV(csvContent: string): ParseResult {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return { transacties: [], balans: null };

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());

  // Kolom-indexen opzoeken (flexibel voor verschillende Revolut exports)
  const idIdx = findCol(headers, ['id']);
  const startedIdx = findCol(headers, ['date started (utc)', 'started date', 'date started']);
  const completedIdx = findCol(headers, ['date completed (utc)', 'completed date', 'date completed']);
  const descIdx = findCol(headers, ['description']);
  const referenceIdx = findCol(headers, ['reference']);
  const amountIdx = findCol(headers, ['amount']);
  const totalAmountIdx = findCol(headers, ['total amount']);
  const stateIdx = findCol(headers, ['state']);
  const balanceIdx = findCol(headers, ['balance']);

  if (amountIdx === -1 || descIdx === -1) {
    throw new Error('Ongeldig CSV-formaat. Exporteer je transacties vanuit Revolut Business als CSV.');
  }

  const transactions: ParsedTransaction[] = [];
  let balans: number | null = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);

    // Balans uitlezen (eerste data-rij = meest recente transactie)
    if (balanceIdx !== -1 && balans === null) {
      const bal = parseFloat(cols[balanceIdx]?.trim().replace(',', '.') || '');
      if (!isNaN(bal)) balans = bal;
    }

    // Alleen voltooide transacties
    const state = stateIdx !== -1 ? cols[stateIdx]?.trim().toLowerCase() : '';
    if (state && state !== 'completed') continue;

    // Gebruik 'Total amount' (incl. fees) als die er is, anders 'Amount'
    const amountCol = totalAmountIdx !== -1 ? totalAmountIdx : amountIdx;
    const amount = parseFloat(cols[amountCol]?.trim().replace(',', '.') || '0');
    if (amount === 0) continue;

    const description = cols[descIdx]?.trim() || 'Geen omschrijving';
    const reference = referenceIdx !== -1 ? cols[referenceIdx]?.trim() || '' : '';

    // Datum: gebruik completed date, fallback naar started date
    const dateStr = completedIdx !== -1 && cols[completedIdx]?.trim()
      ? cols[completedIdx].trim()
      : (startedIdx !== -1 ? cols[startedIdx]?.trim() : '') || '';

    const datum = parseRevolutDate(dateStr);

    // Gebruik het Revolut transaction ID voor deduplicatie
    const revolutTransId = idIdx !== -1 && cols[idIdx]?.trim()
      ? cols[idIdx].trim()
      : `csv-${datum.toISOString()}-${amount}-${description}`.substring(0, 200);

    // Omschrijving: description + reference voor meer context
    const omschrijving = reference && reference !== description
      ? `${description} — ${reference}`
      : description;

    transactions.push({
      revolutTransId,
      datum,
      omschrijving,
      bedragExclBtw: Math.abs(amount),
      tegenpartij: description, // Description bevat altijd de tegenpartij bij Revolut
      richting: amount > 0 ? 'verkoop' : 'inkoop',
    });
  }

  return { transacties: transactions, balans };
}

/**
 * Zoek een kolom-index op basis van meerdere mogelijke namen
 */
function findCol(headers: string[], names: string[]): number {
  for (const name of names) {
    const idx = headers.indexOf(name);
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Parse een CSV-regel, rekening houdend met aanhalingstekens
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Parse Revolut datumformaat
 */
function parseRevolutDate(dateStr: string): Date {
  if (!dateStr) return new Date();

  // "2026-03-15" of "2026-03-15 14:30:00"
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
  }

  // "15 Mar 2026"
  const textMatch = dateStr.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (textMatch) return new Date(dateStr);

  // "15/03/2026"
  const euMatch = dateStr.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/);
  if (euMatch) return new Date(parseInt(euMatch[3]), parseInt(euMatch[2]) - 1, parseInt(euMatch[1]));

  return new Date(dateStr);
}

export type { ParsedTransaction };
