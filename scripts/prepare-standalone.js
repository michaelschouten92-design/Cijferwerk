/**
 * Kopieert de Next.js standalone build + static + public naar een build-assets/standalone map.
 * Electron-builder pakt het dan op als extraResource.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const STANDALONE_SRC = path.join(ROOT, '.next', 'standalone');
const STATIC_SRC = path.join(ROOT, '.next', 'static');
const PUBLIC_SRC = path.join(ROOT, 'public');
const DEST = path.join(ROOT, 'build-assets', 'standalone');

// Verwijder oude build
if (fs.existsSync(DEST)) {
  fs.rmSync(DEST, { recursive: true });
}

console.log('Standalone build kopiëren...');

// Kopieer standalone (inclusief node_modules)
execSync(`xcopy "${STANDALONE_SRC}" "${DEST}" /E /I /H /Y /Q`, { stdio: 'inherit' });

// Kopieer .next/static
const staticDest = path.join(DEST, '.next', 'static');
fs.mkdirSync(staticDest, { recursive: true });
execSync(`xcopy "${STATIC_SRC}" "${staticDest}" /E /I /H /Y /Q`, { stdio: 'inherit' });

// Kopieer public
const publicDest = path.join(DEST, 'public');
fs.mkdirSync(publicDest, { recursive: true });
execSync(`xcopy "${PUBLIC_SRC}" "${publicDest}" /E /I /H /Y /Q`, { stdio: 'inherit' });

// Hernoem node_modules naar _modules zodat electron-builder het niet filtert
const nmSrc = path.join(DEST, 'node_modules');
const nmDest = path.join(DEST, '_modules');
if (fs.existsSync(nmSrc)) {
  fs.renameSync(nmSrc, nmDest);
  console.log('node_modules hernoemd naar _modules (electron-builder workaround)');
}

console.log('Standalone build gereed');
