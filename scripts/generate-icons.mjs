/**
 * 從 assets/icon.svg 產生所有應用程式圖示
 *
 * 產出：
 *   - assets/icon.png      (512x512)
 *   - assets/tray-icon.png (32x32)
 *   - assets/icon.ico      (16/32/48/64/128/256)
 *
 * 用法：npm run icons
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirname, '..', 'assets');
const SVG_PATH = join(ASSETS_DIR, 'icon.svg');

// ICO 內含的尺寸
const ICO_SIZES = [16, 32, 48, 64, 128, 256];

async function svgToPng(svgBuffer, size) {
  return sharp(svgBuffer, { density: 300 }).resize(size, size).png().toBuffer();
}

async function main() {
  const svgBuffer = await readFile(SVG_PATH);
  console.log('讀取 SVG:', SVG_PATH);

  // 產生 icon.png (512x512)
  const icon512 = await svgToPng(svgBuffer, 512);
  await writeFile(join(ASSETS_DIR, 'icon.png'), icon512);
  console.log('✔ icon.png (512x512)');

  // 產生 tray-icon.png (32x32)
  const tray32 = await svgToPng(svgBuffer, 32);
  await writeFile(join(ASSETS_DIR, 'tray-icon.png'), tray32);
  console.log('✔ tray-icon.png (32x32)');

  // 產生 ICO 所需的各尺寸 PNG
  const icoPngs = await Promise.all(ICO_SIZES.map(size => svgToPng(svgBuffer, size)));

  // 合併為 ICO
  const icoBuffer = await pngToIco(icoPngs);
  await writeFile(join(ASSETS_DIR, 'icon.ico'), icoBuffer);
  console.log(`✔ icon.ico (${ICO_SIZES.join('/')})`);

  console.log('全部完成！');
}

main().catch(err => {
  console.error('產生圖示失敗:', err);
  process.exit(1);
});
