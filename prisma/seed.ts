import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Standaard Nederlandse grootboekcategorieën
  const categorieen = [
    { code: '4500', naam: 'Contributies en abonnementen', type: 'kosten', btwTarief: 0.21 },
    { code: '4510', naam: 'Reclame en advertenties', type: 'kosten', btwTarief: 0.21 },
    { code: '4520', naam: 'Representatiekosten', type: 'kosten', btwTarief: 0.21 },
    { code: '4530', naam: 'Reis- en verblijfkosten', type: 'kosten', btwTarief: 0.21 },
    { code: '4540', naam: 'Relatiegeschenken', type: 'kosten', btwTarief: 0.21 },
    { code: '4545', naam: 'Verzekeringen', type: 'kosten', btwTarief: 0, btwVrijgesteld: true },
    { code: '4550', naam: 'Bankkosten', type: 'kosten', btwTarief: 0, btwVrijgesteld: true },
    { code: '4590', naam: 'Overige kosten', type: 'kosten', btwTarief: 0.21 },
    { code: '4600', naam: 'Kilometervergoeding', type: 'kosten', btwTarief: 0, btwVrijgesteld: true },
    { code: '4700', naam: 'Kantoorbenodigdheden', type: 'kosten', btwTarief: 0.21 },
    { code: '4740', naam: 'Drukwerk, porti en vrachten', type: 'kosten', btwTarief: 0.21 },
    { code: '4750', naam: 'Telefoon en internet', type: 'kosten', btwTarief: 0.21 },
    { code: '4790', naam: 'Overige kantoorkosten', type: 'kosten', btwTarief: 0.21 },
    { code: '4810', naam: 'Accountants- en administratiekosten', type: 'kosten', btwTarief: 0.21 },
    { code: '4850', naam: 'Cursussen/seminars', type: 'kosten', btwTarief: 0.21 },
    { code: '4900', naam: 'Afschrijvingen', type: 'kosten', btwTarief: 0, btwVrijgesteld: true },
    { code: '8000', naam: 'Omzet NL', type: 'omzet', btwTarief: 0.21 },
    { code: '8100', naam: 'Omzet EU', type: 'omzet', btwTarief: 0 },
    { code: '8200', naam: 'Omzet buiten EU', type: 'omzet', btwTarief: 0 },
    { code: '9100', naam: 'Privéstortingen', type: 'prive', btwTarief: 0, btwVrijgesteld: true },
    { code: '9200', naam: 'Privéopnames', type: 'prive', btwTarief: 0, btwVrijgesteld: true },
  ];

  for (const cat of categorieen) {
    await prisma.categorie.upsert({
      where: { code: cat.code },
      update: cat,
      create: { ...cat, btwVrijgesteld: cat.btwVrijgesteld ?? false },
    });
  }

  // Veelvoorkomende auto-categorisatie regels
  const regels = [
    { zoekterm: 'revolut', zoekVeld: 'tegenpartij', categorieCode: '4550', btwTarief: 0, prioriteit: 10 },
  ];

  for (const regel of regels) {
    const existing = await prisma.categorieRegel.findFirst({
      where: { zoekterm: regel.zoekterm, zoekVeld: regel.zoekVeld },
    });
    if (!existing) {
      await prisma.categorieRegel.create({ data: regel });
    }
  }

  // Standaard instellingen
  await prisma.appSettings.upsert({
    where: { id: 1 },
    create: {},
    update: {},
  });

  console.log('Seed voltooid: categorieën en standaard instellingen aangemaakt');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
