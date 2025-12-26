import { NextRequest, NextResponse } from 'next/server';
import type { LotoPrize, PrizeType } from '@/types';

// Clé API Google Cloud Vision
const GOOGLE_API_KEY = process.env.GOOGLE_VISION_API_KEY || 'AIzaSyBOL0Fw0Y0vzKTdmCAsX7hfaV_Uufufuy0';

/**
 * POST /api/lotofiesta/prizes
 * Extrait les lots depuis l'image d'un tirage via OCR
 * Body: { tirageUrl: string } - URL de la page produit du tirage
 */
export async function POST(request: NextRequest) {
  try {
    const { tirageUrl } = await request.json();

    if (!tirageUrl) {
      return NextResponse.json(
        { error: 'tirageUrl requis' },
        { status: 400 }
      );
    }

    // 1. Fetch la page du tirage pour trouver l'image des lots
    const pageResponse = await fetch(tirageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!pageResponse.ok) {
      throw new Error(`HTTP ${pageResponse.status}`);
    }

    const html = await pageResponse.text();

    // 2. Trouver l'URL de l'image des lots
    const prizesImageUrl = findPrizesImageUrl(html);

    if (!prizesImageUrl) {
      return NextResponse.json(
        { error: 'Image des lots non trouvée', prizes: [] },
        { status: 200 }
      );
    }

    console.log('Image des lots trouvée:', prizesImageUrl);

    // 3. Télécharger l'image et convertir en base64
    const imageResponse = await fetch(prizesImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Impossible de télécharger l'image: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    // 4. Envoyer à Google Vision pour OCR
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64Image },
              features: [{ type: 'TEXT_DETECTION', maxResults: 100 }],
            },
          ],
        }),
      }
    );

    if (!visionResponse.ok) {
      const errorData = await visionResponse.json();
      console.error('Google Vision error:', errorData);
      throw new Error(`Google Vision API error: ${visionResponse.status}`);
    }

    const visionResult = await visionResponse.json();
    const textAnnotations = visionResult.responses?.[0]?.textAnnotations;

    if (!textAnnotations || textAnnotations.length === 0) {
      return NextResponse.json({ prizes: [], prizesImageUrl });
    }

    // 5. Parser le texte OCR pour extraire les lots
    const rawText = textAnnotations[0]?.description || '';
    console.log('OCR raw text (premiers 500 chars):', rawText.substring(0, 500));

    const prizes = parsePrizesFromOCRText(rawText);

    return NextResponse.json({ prizes, prizesImageUrl, rawText });
  } catch (error) {
    console.error('Erreur extraction lots:', error);
    return NextResponse.json(
      { error: 'Erreur extraction lots', prizes: [] },
      { status: 500 }
    );
  }
}

/**
 * Trouve l'URL de l'image des lots dans le HTML de la page produit
 * L'image est généralement dans le carousel/gallery avec un nom comme "liste-lots" ou "lots"
 */
function findPrizesImageUrl(html: string): string | null {
  // D'abord chercher les images avec "lots" ou "liste" dans le nom (data-large_image)
  const lotsPatterns = [
    /data-large_image="([^"]*(?:lots|liste|Lots|Liste)[^"]*)"/gi,
    /data-src="([^"]*(?:lots|liste|Lots|Liste)[^"]*)"/gi,
    /href="([^"]*(?:lots|liste|Lots|Liste)[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi,
    /src="([^"]*(?:lots|liste|Lots|Liste)[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi,
  ];

  for (const pattern of lotsPatterns) {
    const matches = [...html.matchAll(pattern)];
    for (const match of matches) {
      if (match[1]) {
        console.log('Image lots trouvée avec pattern lots/liste:', match[1]);
        return match[1];
      }
    }
  }

  // Fallback: chercher toutes les grandes images dans la galerie
  const allImagesPattern = /data-large_image="([^"]+)"/gi;
  const allMatches = [...html.matchAll(allImagesPattern)];

  console.log('Nombre d\'images trouvées dans galerie:', allMatches.length);
  allMatches.forEach((m, i) => console.log(`Image ${i}:`, m[1]?.substring(0, 80)));

  // Prendre la 2ème image si elle existe (la 1ère est souvent l'affiche principale)
  if (allMatches.length > 1 && allMatches[1][1]) {
    return allMatches[1][1];
  }

  // Sinon prendre la première
  if (allMatches.length > 0 && allMatches[0][1]) {
    return allMatches[0][1];
  }

  return null;
}

/**
 * Parse le texte OCR pour extraire les lots
 * Format attendu: N Q/DQ/CP description
 * Ex: "1 Q 1 Tablette SAMSUNG Galaxy A+"
 */
function parsePrizesFromOCRText(text: string): LotoPrize[] {
  console.log('=== Parsing OCR text ===');
  console.log('Text length:', text.length);
  console.log('First 1000 chars:', text.substring(0, 1000));

  const prizes: LotoPrize[] = [];
  const lines = text.split('\n');

  // Regex pour parser une ligne de lot
  // Format: numéro + type (Q, DQ, CP) + éventuellement quantité + description
  const prizeRegex = /^(\d{1,2})\s+(Q|DQ|CP)\s+(?:\d+\s+)?(.+)$/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(prizeRegex);
    if (match) {
      const number = parseInt(match[1], 10);
      const type = match[2].toUpperCase() as PrizeType;
      const description = match[3].trim();

      // Nettoyer la description (enlever les caractères parasites)
      const cleanDescription = description
        .replace(/[|\\]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanDescription.length > 2) {
        prizes.push({
          number,
          type,
          description: cleanDescription,
        });
      }
    }
  }

  console.log('Prizes found with line-by-line:', prizes.length);

  // Si le parsing ligne par ligne n'a pas fonctionné, essayer un parsing plus flexible
  if (prizes.length === 0) {
    const flexPrizes = parsePrizesFlexible(text);
    console.log('Prizes found with flexible parsing:', flexPrizes.length);
    return flexPrizes;
  }

  return prizes.sort((a, b) => a.number - b.number);
}

/**
 * Parsing plus flexible du texte OCR
 * Cherche les patterns Q/DQ/CP dans tout le texte
 */
function parsePrizesFlexible(text: string): LotoPrize[] {
  const prizes: LotoPrize[] = [];

  // Normaliser le texte
  const normalized = text
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  console.log('Normalized text (first 800):', normalized.substring(0, 800));

  // Stratégie: chercher tous les "N TYPE" puis extraire la description jusqu'au prochain "N TYPE"
  // Pattern pour trouver toutes les occurrences de "N Q/DQ/CP"
  const typeMarkers: Array<{ index: number; number: number; type: PrizeType }> = [];
  // Regex plus permissif - cherche n'importe quel "nombre espace Q/DQ/CP espace"
  const markerRegex = /(\d{1,2})\s+(Q|DQ|CP)\s/gi;

  let match;
  while ((match = markerRegex.exec(normalized)) !== null) {
    const num = parseInt(match[1], 10);
    const type = match[2].toUpperCase() as PrizeType;

    // Vérifier que c'est un numéro de lot valide (1-30 typiquement)
    // et que le numéro suit le pattern attendu (Q=1,4,7..., DQ=2,5,8..., CP=3,6,9...)
    const expectedType = getExpectedType(num);

    // Log tous les marqueurs trouvés, même ceux qui ne correspondent pas
    console.log(`Marker candidate: #${num} ${type}, expected type: ${expectedType}, valid: ${type === expectedType}`);

    if (num >= 1 && num <= 30 && type === expectedType) {
      typeMarkers.push({
        index: match.index,
        number: num,
        type,
      });
      console.log(`✓ Found valid marker: #${num} ${type} at index ${match.index}`);
    }
  }

  // Pour chaque marqueur, extraire la description jusqu'au prochain marqueur
  for (let i = 0; i < typeMarkers.length; i++) {
    const current = typeMarkers[i];
    const next = typeMarkers[i + 1];

    // Position après "N TYPE "
    const startPos = current.index;
    const typeEndMatch = normalized.substring(startPos).match(/^\d{1,2}\s+(Q|DQ|CP)\s+/i);
    if (!typeEndMatch) continue;

    const descStart = startPos + typeEndMatch[0].length;
    const descEnd = next ? next.index : normalized.length;

    let description = normalized.substring(descStart, descEnd).trim();

    // Nettoyer la description
    // Enlever la quantité au début si présente (ex: "1 Tablette" -> "Tablette")
    description = description.replace(/^\d+\s+/, '');
    // Enlever les caractères parasites
    description = description
      .replace(/[|\\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (description.length > 2) {
      if (!prizes.some(p => p.number === current.number)) {
        console.log(`Found prize: ${current.number} ${current.type} - ${description.substring(0, 50)}`);
        prizes.push({
          number: current.number,
          type: current.type,
          description,
        });
      }
    }
  }

  return prizes.sort((a, b) => a.number - b.number);
}

/**
 * Retourne le type attendu pour un numéro de lot donné
 * Lot 1, 4, 7, 10... = Q
 * Lot 2, 5, 8, 11... = DQ
 * Lot 3, 6, 9, 12... = CP
 */
function getExpectedType(lotNumber: number): PrizeType {
  const mod = (lotNumber - 1) % 3;
  if (mod === 0) return 'Q';
  if (mod === 1) return 'DQ';
  return 'CP';
}
