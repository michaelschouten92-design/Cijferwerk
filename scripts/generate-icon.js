const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

async function generateIcon() {
  const svgPath = path.join(__dirname, '..', 'build-assets', 'icon.svg');
  const outPath = path.join(__dirname, '..', 'build-assets', 'icon.ico');
  const svgBuffer = fs.readFileSync(svgPath);

  const sizes = [16, 32, 48, 64, 128, 256];
  const pngs = await Promise.all(
    sizes.map(s => sharp(svgBuffer).resize(s, s).png().toBuffer())
  );

  const ico = await toIco(pngs);
  fs.writeFileSync(outPath, ico);

  // Ook een 256px PNG voor electron-builder (fallback)
  const png256 = await sharp(svgBuffer).resize(256, 256).png().toBuffer();
  fs.writeFileSync(path.join(__dirname, '..', 'build-assets', 'icon.png'), png256);

  console.log('Icoon gegenereerd: build-assets/icon.ico + icon.png');
}

generateIcon().catch(err => { console.error(err); process.exit(1); });
