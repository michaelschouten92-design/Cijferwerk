import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient; dbMigrated?: Promise<void> };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Auto-migratie: voeg ontbrekende kolommen toe bij eerste gebruik
// Dit zorgt ervoor dat bestaande databases automatisch worden bijgewerkt
if (!globalForPrisma.dbMigrated) {
  const migrations: { col: string; table: string; sql: string }[] = [
    { col: 'factuurLogoGrootte', table: 'AppSettings', sql: "ALTER TABLE AppSettings ADD COLUMN factuurLogoGrootte INTEGER NOT NULL DEFAULT 60" },
  ];

  globalForPrisma.dbMigrated = (async () => {
    for (const m of migrations) {
      try {
        const cols: any[] = await prisma.$queryRawUnsafe(`PRAGMA table_info(${m.table})`);
        if (!cols.some((c: any) => c.name === m.col)) {
          await prisma.$executeRawUnsafe(m.sql);
          console.log(`Auto-migratie: ${m.col} toegevoegd aan ${m.table}`);
        }
      } catch {
        // Kolom bestaat al of andere niet-fatale fout
      }
    }
  })();
}

/** Wacht tot auto-migratie klaar is. Aanroepen aan het begin van routes die nieuwe kolommen gebruiken. */
export async function ensureMigrated() {
  if (globalForPrisma.dbMigrated) await globalForPrisma.dbMigrated;
}
