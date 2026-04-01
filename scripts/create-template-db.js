/**
 * Maakt een lege template database aan met schema + seed categorieën.
 * Wordt gebundeld met de Electron installer.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEMPLATE_DIR = path.resolve(__dirname, '..', 'build-assets');
const TEMPLATE_DB = path.join(TEMPLATE_DIR, 'template.db');
const TEMP_DB = path.join(TEMPLATE_DIR, 'temp-seed.db');

// Maak build-assets directory
fs.mkdirSync(TEMPLATE_DIR, { recursive: true });

// Verwijder eventuele oude temp database
if (fs.existsSync(TEMP_DB)) fs.unlinkSync(TEMP_DB);

console.log('Template database aanmaken...');

// Gebruik een tijdelijke database voor de seed
const env = { ...process.env, DATABASE_URL: `file:${TEMP_DB}` };

execSync('npx prisma db push --skip-generate', { env, stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
execSync('npx tsx prisma/seed.ts', { env, stdio: 'inherit', cwd: path.resolve(__dirname, '..') });

// Kopieer naar template.db
fs.copyFileSync(TEMP_DB, TEMPLATE_DB);
fs.unlinkSync(TEMP_DB);

console.log(`Template database aangemaakt: ${TEMPLATE_DB} (${Math.round(fs.statSync(TEMPLATE_DB).size / 1024)} KB)`);
