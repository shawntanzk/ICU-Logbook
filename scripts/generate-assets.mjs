/**
 * Converts SVG source files in /assets into the PNG files that Expo needs.
 * Run once after editing any .svg file:
 *
 *   npm install --save-dev sharp
 *   node scripts/generate-assets.mjs
 *
 * Requires: sharp >= 0.33  (install with: npm i -D sharp)
 * sharp on macOS uses libvips which bundles librsvg — no extra brew installs needed.
 */

import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

let sharp
try {
  sharp = require('sharp')
} catch {
  console.error('\n  sharp is not installed. Run:\n\n    npm install --save-dev sharp\n')
  process.exit(1)
}

const jobs = [
  // [inputSvg, outputPng, width, height]
  ['assets/icon.svg',          'assets/icon.png',          1024, 1024],
  ['assets/adaptive-icon.svg', 'assets/adaptive-icon.png', 1024, 1024],
  ['assets/splash.svg',        'assets/splash.png',        1284, 2778],
]

for (const [src, dest, w, h] of jobs) {
  const srcPath  = path.join(root, src)
  const destPath = path.join(root, dest)

  if (!fs.existsSync(srcPath)) {
    console.warn(`  SKIP  ${src}  (file not found)`)
    continue
  }

  await sharp(srcPath)
    .resize(w, h)
    .png()
    .toFile(destPath)

  console.log(`  OK    ${dest}  (${w}×${h})`)
}

console.log('\nDone. Commit the generated PNG files.')
