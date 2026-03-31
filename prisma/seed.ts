import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Categorieën (grootboek) - gebaseerd op jouw huidige Excel
  const categorieen = [
    { code: '4500', naam: 'Contributies en abonnementen', type: 'kosten', btwTarief: 0.21 },
    { code: '4510', naam: 'Reclame en advertenties', type: 'kosten', btwTarief: 0.21 },
    { code: '4520', naam: 'Representatiekosten', type: 'kosten', btwTarief: 0.21 },
    { code: '4530', naam: 'Reis- en verblijfkosten', type: 'kosten', btwTarief: 0.21 },
    { code: '4540', naam: 'Relatiegeschenken', type: 'kosten', btwTarief: 0.21 },
    { code: '4545', naam: 'Verzekeringen', type: 'kosten', btwTarief: 0, btwVrijgesteld: true },
    { code: '4550', naam: 'Bankkosten', type: 'kosten', btwTarief: 0, btwVrijgesteld: true },
    { code: '4590', naam: 'Overige verkoopkosten', type: 'kosten', btwTarief: 0.21 },
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
  ];

  for (const cat of categorieen) {
    await prisma.categorie.upsert({
      where: { code: cat.code },
      update: cat,
      create: { ...cat, btwVrijgesteld: cat.btwVrijgesteld ?? false },
    });
  }

  // Relaties - gebaseerd op jouw huidige Excel
  const relaties = [
    { naam: 'Han Lacourt', adres: 'Flevodwarsweg 1C', postcode: '2318 BW', plaats: 'Leiden', telefoon: '0715218887', email: 'info@autorijschoollacourt.nl', type: 'klant' },
    { naam: 'ATM', type: 'leverancier' },
    { naam: 'FTMO', type: 'leverancier' },
    { naam: 'Revolut', type: 'leverancier' },
    { naam: 'Ziggo', type: 'leverancier' },
    { naam: 'Vodafone', type: 'leverancier' },
    { naam: 'Cloud86', type: 'leverancier' },
    { naam: 'ChatGPT', type: 'leverancier' },
    { naam: 'Anthropic', type: 'leverancier' },
    { naam: 'Compucom', type: 'leverancier' },
    { naam: 'Bol', type: 'leverancier' },
  ];

  for (const rel of relaties) {
    const existing = await prisma.relatie.findFirst({ where: { naam: rel.naam } });
    if (!existing) {
      await prisma.relatie.create({ data: rel });
    }
  }

  // Categorieregels - automatische matching op basis van jouw huidige transacties
  const regels = [
    { zoekterm: 'atm', zoekVeld: 'tegenpartij', categorieCode: '4500', relatieNaam: 'ATM', btwTarief: 0.21, prioriteit: 10 },
    { zoekterm: 'revolut', zoekVeld: 'tegenpartij', categorieCode: '4550', relatieNaam: 'Revolut', btwTarief: 0, prioriteit: 10 },
    { zoekterm: 'ziggo', zoekVeld: 'tegenpartij', categorieCode: '4750', relatieNaam: 'Ziggo', btwTarief: 0.21, prioriteit: 10 },
    { zoekterm: 'vodafone', zoekVeld: 'tegenpartij', categorieCode: '4750', relatieNaam: 'Vodafone', btwTarief: 0.21, prioriteit: 10 },
    { zoekterm: 'cloud86', zoekVeld: 'tegenpartij', categorieCode: '4500', relatieNaam: 'Cloud86', btwTarief: 0.21, prioriteit: 10 },
    { zoekterm: 'anthropic', zoekVeld: 'tegenpartij', categorieCode: '4500', relatieNaam: 'Anthropic', btwTarief: 0.21, prioriteit: 10 },
    { zoekterm: 'chatgpt', zoekVeld: 'tegenpartij', categorieCode: '4500', relatieNaam: 'ChatGPT', btwTarief: 0.21, prioriteit: 10 },
    { zoekterm: 'openai', zoekVeld: 'tegenpartij', categorieCode: '4500', relatieNaam: 'ChatGPT', btwTarief: 0.21, prioriteit: 10 },
    { zoekterm: 'compucom', zoekVeld: 'tegenpartij', categorieCode: '4700', relatieNaam: 'Compucom', btwTarief: 0.21, prioriteit: 10 },
    { zoekterm: 'bol.com', zoekVeld: 'tegenpartij', categorieCode: '4700', relatieNaam: 'Bol', btwTarief: 0.21, prioriteit: 5 },
    { zoekterm: 'lacourt', zoekVeld: 'tegenpartij', categorieCode: '8000', relatieNaam: 'Han Lacourt', btwTarief: 0.21, prioriteit: 10 },
    { zoekterm: 'ftmo', zoekVeld: 'tegenpartij', categorieCode: '4500', relatieNaam: 'FTMO', btwTarief: 0, prioriteit: 10 },
    // Omschrijving-gebaseerde regels
    { zoekterm: 'rijles', zoekVeld: 'omschrijving', categorieCode: '8000', relatieNaam: 'Han Lacourt', btwTarief: 0.21, prioriteit: 5 },
    { zoekterm: 'scooter', zoekVeld: 'omschrijving', categorieCode: '8000', relatieNaam: 'Han Lacourt', btwTarief: 0.21, prioriteit: 5 },
    { zoekterm: 'server', zoekVeld: 'omschrijving', categorieCode: '4500', btwTarief: 0.21, prioriteit: 3 },
    { zoekterm: 'hosting', zoekVeld: 'omschrijving', categorieCode: '4500', btwTarief: 0.21, prioriteit: 3 },
  ];

  for (const regel of regels) {
    const existing = await prisma.categorieRegel.findFirst({
      where: { zoekterm: regel.zoekterm, zoekVeld: regel.zoekVeld },
    });
    if (!existing) {
      await prisma.categorieRegel.create({ data: regel });
    }
  }

  console.log('Seed completed: categorieën, relaties en categorieregels aangemaakt');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
