import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import type { LotoPrize, PrizeType } from '@/types';

// Clé API Google Cloud Vision
const GOOGLE_API_KEY = process.env.GOOGLE_VISION_API_KEY || 'AIzaSyBOL0Fw0Y0vzKTdmCAsX7hfaV_Uufufuy0';

// Connexion Redis pour le cache
const redis = Redis.fromEnv();
const TIRAGES_KEY = 'loto:tirages';
const CACHE_TTL = 24 * 60 * 60; // 24 heures

interface CachedTirage {
  id: string;
  prizes: LotoPrize[];
  prizesImageUrl?: string;
  cachedAt: string;
}

/**
 * Génère un ID unique pour un tirage basé sur son URL
 */
function getTirageIdFromUrl(url: string): string {
  // Extraire le slug du produit de l'URL (ex: /produit/as-muret-football -> as-muret-football)
  const match = url.match(/\/produit\/([^\/\?]+)/);
  return match ? match[1] : url.replace(/[^a-z0-9]/gi, '-');
}

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

    const tirageId = getTirageIdFromUrl(tirageUrl);

    // 0. Vérifier le cache Upstash Redis avant d'appeler Google Vision
    try {
      const cachedData = await redis.get<Record<string, CachedTirage>>(TIRAGES_KEY);
      if (cachedData && cachedData[tirageId] && cachedData[tirageId].prizes.length > 0) {
        console.log(`✅ CACHE HIT pour tirage ${tirageId}: ${cachedData[tirageId].prizes.length} lots (économie API Google Vision)`);
        return NextResponse.json({
          prizes: cachedData[tirageId].prizes,
          prizesImageUrl: cachedData[tirageId].prizesImageUrl,
          fromCache: true,
          cachedAt: cachedData[tirageId].cachedAt
        });
      }
      console.log(`❌ CACHE MISS pour tirage ${tirageId}, appel Google Vision OCR...`);
    } catch (cacheError) {
      console.error('Erreur lecture cache (continue avec OCR):', cacheError);
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

    // 6. Sauvegarder dans le cache Upstash pour éviter de rappeler Google Vision
    if (prizes.length > 0) {
      try {
        const existingData = await redis.get<Record<string, CachedTirage>>(TIRAGES_KEY) || {};
        existingData[tirageId] = {
          id: tirageId,
          prizes,
          prizesImageUrl,
          cachedAt: new Date().toISOString(),
        };
        await redis.set(TIRAGES_KEY, existingData, { ex: CACHE_TTL });
        console.log(`✅ CACHE SAVE pour tirage ${tirageId}: ${prizes.length} lots sauvegardés`);
      } catch (cacheError) {
        console.error('Erreur sauvegarde cache:', cacheError);
      }
    }

    return NextResponse.json({ prizes, prizesImageUrl, rawText, fromCache: false });
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
  console.log('Line-by-line prizes:', prizes.map(p => `#${p.number} ${p.type}`).join(', '));

  // Si le parsing ligne par ligne n'a pas trouvé assez de lots (minimum 6 = 2 groupes),
  // ou s'il manque des lots importants (comme le lot #1), essayer le parsing flexible
  const hasLot1 = prizes.some(p => p.number === 1);
  if (prizes.length < 6 || !hasLot1) {
    console.log('Line-by-line insufficient, trying flexible parsing...');
    const flexPrizes = parsePrizesFlexible(text);
    console.log('Prizes found with flexible parsing:', flexPrizes.length);
    console.log('Flexible prizes:', flexPrizes.map(p => `#${p.number} ${p.type}`).join(', '));

    // Utiliser le résultat qui a le plus de lots
    if (flexPrizes.length > prizes.length) {
      // Si on a trouvé des lots mais qu'il en manque (notamment les Q),
      // compléter avec les lots manquants basés sur le pattern
      const finalPrizes = completeWithMissingPrizes(flexPrizes, text);
      return finalPrizes;
    }
  }

  return prizes.sort((a, b) => a.number - b.number);
}

/**
 * Complète les lots manquants quand l'OCR n'a pas réussi à tous les détecter
 * Cherche le type réel dans le texte brut, sinon utilise le pattern standard
 */
function completeWithMissingPrizes(prizes: LotoPrize[], rawText: string): LotoPrize[] {
  const result = [...prizes];

  // Chercher les numéros de lots manquants
  const foundNumbers = new Set(prizes.map(p => p.number));
  const maxFound = Math.max(...prizes.map(p => p.number));

  console.log('Found lot numbers:', [...foundNumbers].sort((a,b) => a-b).join(', '));
  console.log('Max lot number found:', maxFound);

  const normalized = rawText.replace(/\n/g, ' ').replace(/\s+/g, ' ');

  // Pour chaque lot manquant jusqu'au max trouvé
  for (let lotNum = 1; lotNum <= maxFound; lotNum++) {
    if (foundNumbers.has(lotNum)) continue;

    // D'abord essayer de trouver le type réel dans le texte brut
    // Pattern: "N Q/DQ/CP" où N est le numéro du lot
    const typePattern = lotNum < 10
      ? new RegExp(`(?:^|[^0-9])${lotNum}\\s+(Q|DQ|CP)\\s`, 'i')
      : new RegExp(`(?:^|\\s)${lotNum}\\s+(Q|DQ|CP)\\s`, 'i');
    const typeMatch = normalized.match(typePattern);

    // Utiliser le type trouvé ou le type calculé par défaut
    const foundType = typeMatch ? typeMatch[1].toUpperCase() as PrizeType : getExpectedType(lotNum);

    // Essayer de trouver une description
    let description = `Lot #${lotNum}`;

    // Chercher si le texte contient des patterns comme "CARTE CADEAU" avec des montants
    if (rawText.includes('CARTE CADEAU') || rawText.includes('CARTE')) {
      // Essayer de trouver le montant pour ce lot
      // Pattern: chercher "N Q/DQ/CP ... €"
      const searchPattern = new RegExp(
        `(?:^|[^0-9])${lotNum}\\s+(?:Q|DQ|CP)\\s+.*?(\\d+)\\s*€`,
        'i'
      );
      const priceMatch = normalized.match(searchPattern);

      if (priceMatch) {
        description = `CARTE CADEAU ${priceMatch[1]}€`;
      } else {
        description = 'CARTE CADEAU';
      }
    }

    console.log(`Adding missing lot #${lotNum} ${foundType}: ${description}`);
    result.push({
      number: lotNum,
      type: foundType,
      description,
    });
  }

  return result.sort((a, b) => a.number - b.number);
}

/**
 * Parsing plus flexible du texte OCR
 * Cherche TOUS les patterns "N Q/DQ/CP" dans le texte (pas seulement les types attendus)
 * Certains tirages ont des formats spéciaux où les types ne suivent pas le pattern Q/DQ/CP
 */
function parsePrizesFlexible(text: string): LotoPrize[] {
  const prizes: LotoPrize[] = [];
  const foundLotNumbers = new Set<number>();

  // Normaliser le texte
  const normalized = text
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  console.log('Normalized text (first 2000):', normalized.substring(0, 2000));

  // NOUVELLE STRATÉGIE: Chercher TOUS les patterns "N TYPE" (avec N de 1 à 24)
  // et accepter N'IMPORTE QUEL type (Q, DQ, CP), pas seulement le type attendu
  // Cela permet de gérer les tirages avec formats spéciaux

  // Pattern global pour trouver tous les lots: numéro (1-24) suivi de Q/DQ/CP
  // Pour éviter les faux positifs avec les quantités, on cherche avec contexte
  // (?:^|\s|[^0-9]) = début de chaîne, espace, ou non-chiffre
  const allLotsPattern = /(?:^|\s|[^0-9])(\d{1,2})\s+(Q|DQ|CP)\s+/gi;

  const allMatches: Array<{
    lotNum: number;
    type: PrizeType;
    index: number;
    fullMatch: string;
    endOfMatch: number;
  }> = [];

  let match;
  while ((match = allLotsPattern.exec(normalized)) !== null) {
    const lotNum = parseInt(match[1], 10);
    const type = match[2].toUpperCase() as PrizeType;

    // Ignorer les numéros > 24 (probablement des prix en euros)
    if (lotNum >= 1 && lotNum <= 24) {
      allMatches.push({
        lotNum,
        type,
        index: match.index,
        fullMatch: match[0],
        endOfMatch: match.index + match[0].length,
      });
    }
  }

  console.log('All matches found:', allMatches.map(m => `#${m.lotNum} ${m.type} @${m.index}`).join(', '));

  // Trier par position dans le texte
  allMatches.sort((a, b) => a.index - b.index);

  // Pour chaque lot (1-24), trouver la PREMIÈRE occurrence
  // (évite les doublons si un même numéro apparaît plusieurs fois)
  for (let lotNum = 1; lotNum <= 24; lotNum++) {
    // Chercher la première occurrence de ce numéro de lot
    const lotMatch = allMatches.find(m => m.lotNum === lotNum && !foundLotNumbers.has(m.lotNum));

    if (!lotMatch) {
      console.log(`Lot #${lotNum}: not found in OCR`);
      continue;
    }

    foundLotNumbers.add(lotNum);

    // Utiliser le TYPE LU par l'OCR (pas le type calculé)
    const actualType = lotMatch.type;
    const expectedType = getExpectedType(lotNum);

    if (actualType !== expectedType) {
      console.log(`⚠️ Lot #${lotNum}: type OCR=${actualType} diffère du type attendu=${expectedType} (format spécial)`);
    }

    // Trouver la fin de la description = début du prochain lot
    const startIdx = lotMatch.endOfMatch;
    let endIdx = normalized.length;

    // Chercher le prochain lot dans la liste des matches (triée par position)
    for (const nextMatch of allMatches) {
      if (nextMatch.index > startIdx && nextMatch.lotNum !== lotNum) {
        endIdx = nextMatch.index;
        break;
      }
    }

    let description = normalized.substring(startIdx, endIdx).trim();

    // Nettoyer la description
    // Enlever la quantité au début (ex: "1 Tablette" -> "Tablette")
    description = description.replace(/^\d+\s+/, '');
    // Enlever les caractères parasites
    description = description
      .replace(/[|\\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Limiter la longueur de la description (évite les descriptions mélangées multi-colonnes)
    if (description.length > 80) {
      // Chercher un point de coupure naturel (prix en €, virgule, etc.)
      const euroMatch = description.match(/^(.+?\d+\s*€)/);
      if (euroMatch) {
        description = euroMatch[1];
      } else {
        description = description.substring(0, 80).trim();
      }
    }

    if (description.length > 2) {
      console.log(`✓ Prize #${lotNum} ${actualType}: ${description.substring(0, 60)}`);
      prizes.push({
        number: lotNum,
        type: actualType, // Utiliser le type réellement lu, pas le type calculé
        description,
      });
    }
  }

  console.log(`Total prizes found: ${prizes.length}`);
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
