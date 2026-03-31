# Boekhouding App - MISC Trading

Gratis boekhouding-app voor ZZP'ers met Revolut Business integratie.

## Features

- **Revolut Sync** - Automatisch transacties ophalen via Revolut Business API
- **Auto-categorisatie** - Transacties worden automatisch gecategoriseerd met BTW op basis van regelset
- **BTW Aangifte** - Kwartaaloverzicht klaar om in te vullen bij de Belastingdienst (rubrieken 1a, 1b, 1e, 5b)
- **Facturen** - Maak en print professionele facturen als PDF
- **Dashboard** - Realtime overzicht van omzet, kosten, winst en BTW

## Quick Start

```bash
# 1. Installeer dependencies
npm install

# 2. Kopieer environment variabelen
cp .env.example .env

# 3. Initialiseer database met categorieën en regels
npm run setup

# 4. Start de app
npm run dev
```

Open http://localhost:3000

## Revolut API Setup

1. Login op [Revolut Business](https://business.revolut.com)
2. Ga naar **Settings > API**
3. Klik **Generate New Certificate**
4. Sla private key op als `./certs/private.pem`
5. Kopieer Client ID naar `.env`
6. Autoriseer de API in het dashboard
7. Klik "Sync Revolut" in de app

**Tip:** Begin met de Sandbox om te testen.

## Categorieregels aanpassen

De auto-categorisatie werkt op basis van regels in `prisma/seed.ts`. Voeg nieuwe regels toe en run:

```bash
npm run db:seed
```

## Tech Stack

- Next.js 14 (App Router)
- Prisma + SQLite
- Tailwind CSS
- TypeScript
