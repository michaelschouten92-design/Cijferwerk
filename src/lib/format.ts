export function formatEuro(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n);
}

/** Parse een prijsinvoer ("10,50" of "10.50") naar een getal. Tolerant voor de Nederlandse komma. */
export function parsePrijs(v: string | number | null | undefined): number {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}
