/**
 * Gedeelde financiële berekeningen — één bron van waarheid
 * Alle endpoints gebruiken deze functies zodat cijfers ALTIJD consistent zijn.
 */

interface VastActief {
  aanschafWaarde: number;
  restwaarde: number;
  levensduurJaren: number;
  aanschafDatum: Date;
}

/**
 * Bereken totale afschrijvingen voor een jaar, pro-rata per maand.
 * Maand-methode: de maand van aanschaf telt als volle maand.
 */
export function berekenAfschrijvingen(activa: VastActief[], jaar: number): number {
  const jaareinde = new Date(jaar, 11, 31);

  const totaal = activa.reduce((s, a) => {
    const afschrijfbaar = a.aanschafWaarde - a.restwaarde;
    if (afschrijfbaar <= 0 || a.levensduurJaren <= 0) return s;

    const jaarAfschr = afschrijfbaar / a.levensduurJaren;
    const aanschaf = new Date(a.aanschafDatum);

    // Nog niet aangeschaft dit jaar
    if (aanschaf > jaareinde) return s;

    // Pro-rata: maanden in gebruik dit jaar (maand van aanschaf telt mee)
    const maandenInGebruik = Math.min(12,
      (jaareinde.getFullYear() - aanschaf.getFullYear()) * 12 +
      (jaareinde.getMonth() - aanschaf.getMonth()) + 1
    );
    const proRata = maandenInGebruik >= 12 ? jaarAfschr : jaarAfschr * maandenInGebruik / 12;

    // Check of asset al volledig is afgeschreven
    const jarenSindsAanschaf = (jaareinde.getFullYear() - aanschaf.getFullYear());
    const totaalAfgeschreven = jaarAfschr * jarenSindsAanschaf;
    if (totaalAfgeschreven >= afschrijfbaar) return s;

    return s + proRata;
  }, 0);

  return round2(totaal);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
