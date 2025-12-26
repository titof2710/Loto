/**
 * Script pour générer les icônes PWA
 * Exécuter avec: node scripts/generate-icons.js
 *
 * Note: Ce script utilise sharp pour la conversion.
 * Installer avec: npm install -D sharp
 *
 * Pour l'instant, les icônes sont des placeholders.
 * En production, remplacez-les par de vraies icônes PNG.
 */

const fs = require('fs');
const path = require('path');

// Créer des icônes placeholder en base64 (carré bleu simple)
function createPlaceholderIcon(size) {
  // SVG simple
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#3b82f6"/>
        <stop offset="100%" style="stop-color:#1d4ed8"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="url(#bg)"/>
    <circle cx="${size * 0.35}" cy="${size * 0.35}" r="${size * 0.12}" fill="#fff" opacity="0.9"/>
    <circle cx="${size * 0.65}" cy="${size * 0.35}" r="${size * 0.12}" fill="#fff" opacity="0.9"/>
    <circle cx="${size * 0.5}" cy="${size * 0.65}" r="${size * 0.12}" fill="#fbbf24"/>
    <text x="${size * 0.35}" y="${size * 0.38}" text-anchor="middle" font-family="Arial" font-size="${size * 0.08}" font-weight="bold" fill="#3b82f6">7</text>
    <text x="${size * 0.65}" y="${size * 0.38}" text-anchor="middle" font-family="Arial" font-size="${size * 0.08}" font-weight="bold" fill="#3b82f6">42</text>
    <text x="${size * 0.5}" y="${size * 0.68}" text-anchor="middle" font-family="Arial" font-size="${size * 0.08}" font-weight="bold" fill="#1d4ed8">90</text>
  </svg>`;

  return svg;
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Créer le dossier si nécessaire
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Générer les icônes SVG (les navigateurs modernes les supportent)
const sizes = [192, 512];

sizes.forEach(size => {
  const svg = createPlaceholderIcon(size);
  const filename = `icon-${size}.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), svg);
  console.log(`Created ${filename}`);
});

console.log('Icons generated successfully!');
console.log('Note: For production, convert these SVGs to PNG using a tool like sharp or an online converter.');
