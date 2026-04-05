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

  // 512px PNG voor Mac/Linux (Mac vereist minimaal 512x512)
  const png512 = await sharp(svgBuffer).resize(512, 512).png().toBuffer();
  fs.writeFileSync(path.join(__dirname, '..', 'build-assets', 'icon.png'), png512);

  console.log('Icoon gegenereerd: build-assets/icon.ico + icon.png');
}

generateIcon().catch(err => { console.error(err); process.exit(1); });
