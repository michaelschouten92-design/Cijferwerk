/**
 * Kopieert de Next.js standalone build + static + public naar een build-assets/standalone map.
 * Electron-builder pakt het dan op als extraResource.
 * Cross-platform: werkt op Windows, Mac en Linux.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STANDALONE_SRC = path.join(ROOT, '.next', 'standalone');
const STATIC_SRC = path.join(ROOT, '.next', 'static');
const PUBLIC_SRC = path.join(ROOT, 'public');
const DEST = path.join(ROOT, 'build-assets', 'standalone');

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Verwijder oude build
if (fs.existsSync(DEST)) {
  fs.rmSync(DEST, { recursive: true });
}

console.log('Standalone build kopiëren...');

// Kopieer standalone (inclusief node_modules)
copyDirSync(STANDALONE_SRC, DEST);

// Kopieer .next/static
const staticDest = path.join(DEST, '.next', 'static');
copyDirSync(STATIC_SRC, staticDest);

// Kopieer public
const publicDest = path.join(DEST, 'public');
copyDirSync(PUBLIC_SRC, publicDest);

// Hernoem node_modules naar _modules zodat electron-builder het niet filtert
const nmSrc = path.join(DEST, 'node_modules');
const nmDest = path.join(DEST, '_modules');
if (fs.existsSync(nmSrc)) {
  fs.renameSync(nmSrc, nmDest);
  console.log('node_modules hernoemd naar _modules (electron-builder workaround)');
}

console.log('Standalone build gereed');
