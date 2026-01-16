#!/usr/bin/env node
/**
 * Generate PWA icons from SVG
 *
 * This script generates PNG icons in various sizes for PWA manifest.
 * Requires: npm install sharp
 *
 * Usage: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Sharp not installed. Creating placeholder icons...');
  createPlaceholders();
  process.exit(0);
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const svgPath = path.join(__dirname, '../apps/web/public/icons/icon.svg');
const outputDir = path.join(__dirname, '../apps/web/public/icons');

async function generateIcons() {
  console.log('Generating PWA icons...');

  const svgBuffer = fs.readFileSync(svgPath);

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`Created: icon-${size}x${size}.png`);
  }

  console.log('Done! All icons generated.');
}

function createPlaceholders() {
  // Create simple placeholder files that indicate icons need to be generated
  console.log('Creating placeholder icon files...');
  console.log('To generate proper icons, install sharp: npm install sharp -D');
  console.log('Then run: node scripts/generate-icons.js');

  // For now, we'll update the manifest to work with what we have
  const manifestPath = path.join(__dirname, '../apps/web/public/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // Add SVG icon as fallback
  manifest.icons = [
    {
      src: '/icons/icon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'any'
    },
    {
      src: '/icons/icon.svg',
      sizes: '512x512',
      type: 'image/svg+xml',
      purpose: 'maskable'
    }
  ];

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log('Updated manifest.json to use SVG icons');
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err.message);
  createPlaceholders();
});
