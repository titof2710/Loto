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
  // Chercher les images dans la galerie produit
  // Pattern pour les images contenant "lots" ou "liste" dans le nom
  const patterns = [
    // Images avec "lots" dans le nom
    /<img[^>]*src="([^"]*(?:lots|liste|lot)[^"]*\.(?:jpg|jpeg|png|webp))"[^>]*>/gi,
    // Images dans la galerie WooCommerce
    /<div[^>]*class="[^"]*woocommerce-product-gallery[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>/gi,
    // Images data-large_image (haute résolution)
    /data-large_image="([^"]*(?:lots|liste)[^"]*)"/gi,
    // Toutes les images de la galerie
    /<a[^>]*href="([^"]*(?:lots|liste|Lots|Liste)[^"]*\.(?:jpg|jpeg|png|webp))"[^>]*>/gi,
  ];

  for (const pattern of patterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        return match[1];
      }
    }
  }

  // Fallback: chercher n'importe quelle grande image dans la page
  const allImagesPattern = /data-large_image="([^"]+)"/gi;
  const allMatches = [...html.matchAll(allImagesPattern)];

  // Prendre la 2ème image si elle existe (la 1ère est souvent l'affiche principale)
  if (allMatches.length > 1 && allMatches[1][1]) {
    return allMatches[1][1];
  }

  return null;
}

/**
 * Parse le texte OCR pour extraire les lots
 * Format attendu: N Q/DQ/CP description
 * Ex: "1 Q 1 Tablette SAMSUNG Galaxy A+"
 */
function parsePrizesFromOCRText(text: string): LotoPrize[] {
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

  // Si le parsing ligne par ligne n'a pas fonctionné, essayer un parsing plus flexible
  if (prizes.length === 0) {
    return parsePrizesFlexible(text);
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
    .replace(/\r\n/g, '\n')
    .replace(/\n+/g, '\n');

  // Regex plus flexible: chercher N TYPE description
  // Le numéro peut être collé au type (ex: "1Q" ou "1 Q")
  const flexRegex = /(\d{1,2})\s*(Q|DQ|CP)\s+(?:\d+\s+)?([A-ZÀÂÄÉÈÊËÏÎÔÙÛÇ][^\n\d]{3,})/gim;

  let match;
  while ((match = flexRegex.exec(normalized)) !== null) {
    const number = parseInt(match[1], 10);
    const type = match[2].toUpperCase() as PrizeType;
    let description = match[3].trim();

    // Nettoyer la description
    description = description
      .replace(/[|\\]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*\d{1,2}\s*(Q|DQ|CP)\s*$/i, '') // Enlever le début du lot suivant
      .trim();

    if (description.length > 2 && number >= 1 && number <= 50) {
      // Vérifier qu'on n'a pas déjà ce numéro
      if (!prizes.some(p => p.number === number && p.type === type)) {
        prizes.push({ number, type, description });
      }
    }
  }

  return prizes.sort((a, b) => a.number - b.number);
}
