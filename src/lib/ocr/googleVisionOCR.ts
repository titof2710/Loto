'use client';

/**
 * OCR via Google Cloud Vision API
 * Beaucoup plus précis qu'OCR.space pour la reconnaissance de texte
 *
 * Limites gratuites: 1000 requêtes/mois
 * Documentation: https://cloud.google.com/vision/docs/ocr
 */

export interface NumberWithPosition {
  number: number;
  row: number; // 0, 1, ou 2 (haut, milieu, bas)
  column: number; // 0-8
  yCenter: number; // Position Y centrale pour debug
}

export interface GoogleVisionResult {
  numbers: number[];
  numbersWithPositions: NumberWithPosition[];
  confidence: number;
  rawText: string;
  serialNumber?: string;
}

// Clé API Google Cloud Vision
const GOOGLE_API_KEY = 'AIzaSyBOL0Fw0Y0vzKTdmCAsX7hfaV_Uufufuy0';

/**
 * Extrait les numéros d'une image via Google Cloud Vision API
 */
export async function extractNumbersWithGoogleVision(
  imageSource: string | File,
  onProgress?: (progress: number) => void
): Promise<GoogleVisionResult> {
  try {
    onProgress?.(0.1);

    // Convertir l'image en base64
    let base64Image: string;

    if (imageSource instanceof File) {
      base64Image = await fileToBase64(imageSource);
    } else if (imageSource.startsWith('data:')) {
      // Extraire seulement la partie base64 (sans le préfixe data:image/...)
      base64Image = imageSource.split(',')[1] || imageSource;
    } else {
      base64Image = await urlToBase64(imageSource);
    }

    // S'assurer qu'on n'a que la partie base64 pure
    if (base64Image.includes(',')) {
      base64Image = base64Image.split(',')[1];
    }

    onProgress?.(0.3);

    // Préparer la requête pour Google Vision API
    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [
            {
              type: 'TEXT_DETECTION',
              maxResults: 50,
            },
          ],
        },
      ],
    };

    onProgress?.(0.5);

    // Appel à l'API Google Vision
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Google Vision API error:', errorData);
      throw new Error(`Google Vision API error: ${response.status}`);
    }

    const result = await response.json();

    onProgress?.(0.8);

    // Extraire le texte de la réponse
    const textAnnotations = result.responses?.[0]?.textAnnotations;
    if (!textAnnotations || textAnnotations.length === 0) {
      console.log('Google Vision: Aucun texte détecté');
      return {
        numbers: [],
        numbersWithPositions: [],
        confidence: 0,
        rawText: '',
      };
    }

    // Le premier élément contient tout le texte détecté
    const rawText = textAnnotations[0]?.description || '';
    console.log('Google Vision raw text:', rawText);

    // Extraire le numéro de série (format XX-XXXX comme "30-0054")
    const serialInfo = extractSerialNumber(rawText);
    if (serialInfo) {
      console.log('Numéro de série détecté:', serialInfo.serialNumber, '(original:', serialInfo.originalPattern, ')');
    }

    // Extraire les numéros avec leurs positions Y depuis les annotations individuelles
    // Les éléments 1+ contiennent chaque mot/numéro détecté avec sa bounding box
    const numbersWithPositions = extractNumbersWithPositions(textAnnotations.slice(1), serialInfo);
    console.log('Google Vision numéros avec positions:', numbersWithPositions);

    // Extraire juste les numéros pour compatibilité
    const numbers = numbersWithPositions.map(n => n.number);

    onProgress?.(1);

    return {
      numbers: numbers.sort((a, b) => a - b),
      numbersWithPositions,
      confidence: numbers.length === 15 ? 98 : (numbers.length / 15) * 100,
      rawText,
      serialNumber: serialInfo?.serialNumber,
    };
  } catch (error) {
    console.error('Google Vision error:', error);
    return {
      numbers: [],
      numbersWithPositions: [],
      confidence: 0,
      rawText: '',
    };
  }
}

interface SerialNumberInfo {
  serialNumber: string;       // Numéro de série reconstitué (ex: "30-0035")
  originalPattern: string;    // Pattern original dans le texte (ex: "0-0035")
}

interface TextAnnotation {
  description: string;
  boundingPoly?: {
    vertices: Array<{ x?: number; y?: number }>;
  };
}

/**
 * Retourne la colonne correspondante pour un numéro de loto
 */
function getColumnForNumber(num: number): number {
  if (num < 1 || num > 90) return -1;
  if (num < 10) return 0;
  if (num === 90) return 8;
  return Math.floor(num / 10);
}

/**
 * Extrait les numéros avec leurs positions Y depuis les annotations Google Vision
 */
function extractNumbersWithPositions(
  annotations: TextAnnotation[],
  serialInfo?: SerialNumberInfo
): NumberWithPosition[] {
  const results: NumberWithPosition[] = [];
  const seenNumbers = new Set<number>();

  // Collecter tous les numéros valides avec leurs positions Y
  const numbersWithY: Array<{ number: number; yCenter: number; xCenter: number }> = [];

  for (const annotation of annotations) {
    const text = annotation.description?.trim();
    if (!text) continue;

    // Ignorer le numéro de série et ses composants
    if (serialInfo) {
      if (text.includes(serialInfo.originalPattern) || text.includes(serialInfo.serialNumber)) {
        continue;
      }
      // Ignorer les parties du numéro de série (format XX-XXXX)
      if (text.match(/^\d{1,2}-\d{4}$/) || text.match(/^\d-\d{4}$/)) {
        continue;
      }
      // Ignorer les chiffres qui font partie du préfixe du numéro de série (ex: "24" de "24-0544")
      const serialPrefix = serialInfo.serialNumber.split('-')[0]; // "24"
      const serialSuffix = serialInfo.serialNumber.split('-')[1]; // "0544"
      if (text === serialPrefix || text === serialSuffix) {
        continue;
      }
      // Ignorer aussi si le texte est juste le premier ou dernier chiffre du préfixe
      if (serialPrefix && (text === serialPrefix[0] || text === serialPrefix[1])) {
        // Vérifier si c'est vraiment un numéro de série isolé (position Y très haute)
        const vertices = annotation.boundingPoly?.vertices || [];
        if (vertices.length >= 4) {
          const yValues = vertices.map(v => v.y || 0).filter(y => y > 0);
          const yCenter = yValues.length > 0 ? yValues.reduce((a, b) => a + b, 0) / yValues.length : 0;
          // Si le numéro est dans les 15% supérieurs de l'image, c'est probablement le numéro de série
          if (yCenter < 60) {
            console.log(`Ignoring "${text}" at Y=${yCenter} - likely part of serial number`);
            continue;
          }
        }
      }
    }

    // Ignorer LOTOQUINE et variations
    if (/lotoquine|lotoouine|lotooline/i.test(text)) {
      continue;
    }

    // Calculer le centre Y de la bounding box
    const vertices = annotation.boundingPoly?.vertices || [];
    if (vertices.length < 4) continue;

    const yValues = vertices.map(v => v.y || 0).filter(y => y > 0);
    const xValues = vertices.map(v => v.x || 0).filter(x => x > 0);
    if (yValues.length === 0 || xValues.length === 0) continue;

    const yCenter = yValues.reduce((a, b) => a + b, 0) / yValues.length;
    const xCenter = xValues.reduce((a, b) => a + b, 0) / xValues.length;

    // Extraire les numéros du texte
    const nums = extractNumbersFromText(text);

    for (const num of nums) {
      if (num >= 1 && num <= 90 && !seenNumbers.has(num)) {
        seenNumbers.add(num);
        numbersWithY.push({ number: num, yCenter, xCenter });
      }
    }
  }

  if (numbersWithY.length === 0) {
    return [];
  }

  // Déterminer les seuils de lignes basé sur les positions Y trouvées
  const yPositions = numbersWithY.map(n => n.yCenter).sort((a, b) => a - b);
  const minY = yPositions[0];
  const maxY = yPositions[yPositions.length - 1];
  const rowHeight = (maxY - minY) / 3;

  console.log(`Y range: ${minY} - ${maxY}, rowHeight: ${rowHeight}`);

  // Assigner chaque numéro à une ligne (0, 1, ou 2)
  for (const item of numbersWithY) {
    let row: number;
    if (rowHeight < 5) {
      // Si tous les numéros sont très proches, utiliser une heuristique simple
      row = 0;
    } else {
      const relativeY = item.yCenter - minY;
      row = Math.min(2, Math.floor(relativeY / rowHeight));
    }

    const column = getColumnForNumber(item.number);

    results.push({
      number: item.number,
      row,
      column,
      yCenter: item.yCenter,
    });
  }

  console.log('Numbers with rows assigned:', results.map(r => `${r.number}(row${r.row})`).join(', '));

  // Vérifier les conflits : si deux numéros sont assignés à la même cellule (row, column),
  // garder celui qui a la position Y la plus cohérente avec sa ligne
  const cellMap = new Map<string, NumberWithPosition[]>();
  for (const item of results) {
    const key = `${item.row}-${item.column}`;
    if (!cellMap.has(key)) {
      cellMap.set(key, []);
    }
    cellMap.get(key)!.push(item);
  }

  // Filtrer pour garder un seul numéro par cellule
  const filteredResults: NumberWithPosition[] = [];
  for (const [, items] of cellMap) {
    if (items.length === 1) {
      filteredResults.push(items[0]);
    } else {
      // En cas de conflit, garder celui qui a le Y le plus cohérent avec les autres de sa ligne
      // Pour simplifier, on garde le premier trouvé
      console.log(`Conflit détecté à la cellule: ${items.map(i => i.number).join(', ')}`);
      filteredResults.push(items[0]);
    }
  }

  // Si on a plus de 15 numéros, c'est qu'il y a eu une erreur de détection
  // On garde les 15 numéros les plus "certains" (ceux qui sont bien alignés)
  if (filteredResults.length > 15) {
    console.log(`Trop de numéros détectés (${filteredResults.length}), filtrage nécessaire`);
    // Garder les numéros dont la colonne correspond bien au numéro (validation croisée)
    const validResults = filteredResults.filter(item => {
      const expectedCol = getColumnForNumber(item.number);
      return expectedCol === item.column;
    });
    if (validResults.length >= 15) {
      return validResults.slice(0, 15);
    }
  }

  return filteredResults;
}

/**
 * Extrait les numéros d'un texte court (un mot détecté par Vision)
 */
function extractNumbersFromText(text: string): number[] {
  const cleaned = text.replace(/[^\d]/g, '');
  if (!cleaned) return [];

  if (cleaned.length <= 2) {
    const num = parseInt(cleaned, 10);
    return num >= 1 && num <= 90 ? [num] : [];
  }

  // Pour les groupes de chiffres collés, utiliser splitDigitGroup
  return splitDigitGroup(cleaned);
}

/**
 * Extrait le numéro de série du carton (format XX-XXXX comme "30-0054")
 * Gère les cas où le premier chiffre est mal lu (ex: "0-0035" au lieu de "30-0035")
 * Retourne aussi le pattern original pour pouvoir le supprimer du texte
 */
function extractSerialNumber(text: string): SerialNumberInfo | undefined {
  // Chercher un pattern complet comme "30-0054"
  const fullMatch = text.match(/(\d{2})-(\d{4})/);
  if (fullMatch) {
    return {
      serialNumber: `${fullMatch[1]}-${fullMatch[2]}`,
      originalPattern: fullMatch[0],
    };
  }

  // Chercher un pattern incomplet comme "0-0035" (premier chiffre manquant/coupé)
  const partialMatch = text.match(/(\d)-(\d{4})/);
  if (partialMatch) {
    return {
      serialNumber: `30-${partialMatch[2]}`,
      originalPattern: partialMatch[0], // "0-0035" - c'est ça qu'on doit supprimer
    };
  }

  return undefined;
}

/**
 * Extrait les numéros de loto (1-90) d'un texte OCR
 * Gère les numéros collés comme "263744" (26, 37, 44) ou "3642" (36, 42)
 */
function extractLotoNumbers(text: string, serialInfo?: SerialNumberInfo): number[] {
  // Supprimer le numéro de série du texte pour éviter les faux positifs
  let cleanedText = text;
  if (serialInfo) {
    // Supprimer le pattern ORIGINAL trouvé dans le texte (ex: "0-0035" pas "30-0035")
    cleanedText = cleanedText.replace(new RegExp(serialInfo.originalPattern.replace('-', '[-]?'), 'g'), ' ');
    // Aussi supprimer le numéro reconstitué au cas où il apparaîtrait
    cleanedText = cleanedText.replace(new RegExp(serialInfo.serialNumber.replace('-', '[-]?'), 'g'), ' ');
  }

  // Supprimer "LOTOQUINE" et variations
  cleanedText = cleanedText
    .replace(/L\s*O\s*T\s*O\s*Q\s*U\s*I\s*N\s*E/gi, ' ')
    .replace(/LOTOQUINE/gi, ' ')
    .replace(/LOTOOUINE/gi, ' ')
    .replace(/LOTOOLINE/gi, ' ')
    .replace(/ILOTOQUINE/gi, ' ')
    .replace(/LOTOQUIN[E]?/gi, ' ');

  // Nettoyer le texte - garder seulement les chiffres et espaces
  const cleaned = cleanedText
    .replace(/[\n\r\t]/g, ' ')
    .replace(/[^\d\s]/g, ' ');

  const numbers: number[] = [];

  // Trouver tous les groupes de chiffres
  const allMatches = cleaned.match(/\d+/g);
  if (!allMatches) return [];

  for (const match of allMatches) {
    if (match.length <= 2) {
      // Nombre simple (1-2 chiffres)
      const num = parseInt(match, 10);
      if (num >= 1 && num <= 90 && !numbers.includes(num)) {
        numbers.push(num);
      }
    } else {
      // Groupe de chiffres collés (3+ chiffres) - découper intelligemment
      const extracted = splitDigitGroup(match);
      for (const num of extracted) {
        if (num >= 1 && num <= 90 && !numbers.includes(num)) {
          numbers.push(num);
        }
      }
    }
  }

  return numbers;
}

/**
 * Découpe un groupe de chiffres collés en numéros de loto valides (1-90)
 * Ex: "263744" -> [26, 37, 44], "3642" -> [36, 42], "711" -> [7, 11]
 * Pour les groupes de 3 chiffres, essaie les deux découpages possibles
 */
function splitDigitGroup(group: string): number[] {
  // Cas spécial pour 3 chiffres: essayer les deux découpages
  if (group.length === 3) {
    const first = parseInt(group[0], 10);
    const lastTwo = parseInt(group.substring(1), 10);
    const firstTwo = parseInt(group.substring(0, 2), 10);
    const last = parseInt(group[2], 10);

    // Option 1: X + YY (ex: "711" -> 7 + 11)
    const option1Valid = first >= 1 && first <= 9 && lastTwo >= 10 && lastTwo <= 90;
    // Option 2: XY + Z (ex: "711" -> 71 + 1)
    const option2Valid = firstTwo >= 10 && firstTwo <= 90 && last >= 1 && last <= 9;

    // Préférer l'option qui donne 2 numéros valides
    if (option1Valid && option2Valid) {
      // Les deux sont valides, préférer X + YY car plus probable
      return [first, lastTwo];
    } else if (option1Valid) {
      return [first, lastTwo];
    } else if (option2Valid) {
      return [firstTwo, last];
    }
    // Si aucune option n'est valide, utiliser l'algorithme standard
  }

  // Algorithme standard pour groupes de 4+ chiffres
  const results: number[] = [];
  let i = 0;

  while (i < group.length) {
    // Essayer d'abord 2 chiffres (plus probable pour les numéros de loto)
    if (i + 2 <= group.length) {
      const twoDigit = parseInt(group.substring(i, i + 2), 10);

      // Si c'est un nombre valide 10-90, le prendre
      if (twoDigit >= 10 && twoDigit <= 90) {
        results.push(twoDigit);
        i += 2;
        continue;
      }
    }

    // Sinon prendre 1 chiffre (1-9)
    const oneDigit = parseInt(group[i], 10);
    if (oneDigit >= 1 && oneDigit <= 9) {
      results.push(oneDigit);
    }
    i += 1;
  }

  return results;
}

/**
 * Convertit un File en base64 (sans le préfixe data:)
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Enlever le préfixe data:image/...;base64,
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convertit une URL en base64 (sans le préfixe data:)
 */
async function urlToBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      // Enlever le préfixe data:image/png;base64,
      const base64 = dataUrl.split(',')[1] || dataUrl;
      resolve(base64);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

/**
 * Traite un carton avec Google Vision
 */
export async function extractNumbersFromCartonGoogleVision(
  imageSource: string | File,
  onProgress?: (progress: number) => void
): Promise<GoogleVisionResult> {
  // Google Vision est assez précis, une seule requête suffit généralement
  const result = await extractNumbersWithGoogleVision(imageSource, onProgress);

  // Si on n'a pas trouvé assez de numéros, on peut réessayer mais Google Vision
  // est généralement très bon du premier coup
  if (result.numbers.length < 10) {
    console.log('Google Vision: Pas assez de numéros, résultat partiel');
  }

  return result;
}
