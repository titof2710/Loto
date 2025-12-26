'use client';

/**
 * OCR via Google Cloud Vision API
 * Beaucoup plus précis qu'OCR.space pour la reconnaissance de texte
 *
 * Limites gratuites: 1000 requêtes/mois
 * Documentation: https://cloud.google.com/vision/docs/ocr
 */

export interface GoogleVisionResult {
  numbers: number[];
  confidence: number;
  rawText: string;
  serialNumber?: string;
}

// Clé API Google Cloud Vision
const GOOGLE_API_KEY = 'AIzaSyDDPF9zg28IwGKcAyZbqHHZIv5GkTWGyf0';

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
        confidence: 0,
        rawText: '',
      };
    }

    // Le premier élément contient tout le texte détecté
    const rawText = textAnnotations[0]?.description || '';
    console.log('Google Vision raw text:', rawText);

    // Extraire le numéro de série (format XX-XXXX comme "30-0054")
    const serialNumber = extractSerialNumber(rawText);
    if (serialNumber) {
      console.log('Numéro de série détecté:', serialNumber);
    }

    // Extraire les numéros de loto (1-90)
    const numbers = extractLotoNumbers(rawText, serialNumber);
    console.log('Google Vision numéros extraits:', numbers);

    onProgress?.(1);

    return {
      numbers: numbers.sort((a, b) => a - b),
      confidence: numbers.length === 15 ? 98 : (numbers.length / 15) * 100,
      rawText,
      serialNumber,
    };
  } catch (error) {
    console.error('Google Vision error:', error);
    return {
      numbers: [],
      confidence: 0,
      rawText: '',
    };
  }
}

/**
 * Extrait le numéro de série du carton (format XX-XXXX comme "30-0054")
 */
function extractSerialNumber(text: string): string | undefined {
  // Chercher un pattern comme "30-0054" ou "30-0552"
  const serialMatch = text.match(/(\d{2})-(\d{4})/);
  if (serialMatch) {
    return `${serialMatch[1]}-${serialMatch[2]}`;
  }
  return undefined;
}

/**
 * Extrait les numéros de loto (1-90) d'un texte OCR
 */
function extractLotoNumbers(text: string, serialNumber?: string): number[] {
  // Supprimer le numéro de série du texte pour éviter les faux positifs
  let cleanedText = text;
  if (serialNumber) {
    cleanedText = cleanedText.replace(new RegExp(serialNumber.replace('-', '[-]?'), 'g'), ' ');
  }

  // Supprimer "LOTOQUINE" et variations
  cleanedText = cleanedText
    .replace(/L\s*O\s*T\s*O\s*Q\s*U\s*I\s*N\s*E/gi, ' ')
    .replace(/LOTOQUINE/gi, ' ')
    .replace(/LOTOOUINE/gi, ' ')
    .replace(/ILOTOQUINE/gi, ' ')
    .replace(/LOTOQUIN[E]?/gi, ' ');

  // Nettoyer le texte - garder seulement les chiffres et espaces
  const cleaned = cleanedText
    .replace(/[\n\r\t]/g, ' ')
    .replace(/[^\d\s]/g, ' ');

  // Trouver tous les nombres (1 ou 2 chiffres)
  const matches = cleaned.match(/\b(\d{1,2})\b/g);

  if (!matches) return [];

  const numbers: number[] = [];

  for (const match of matches) {
    const num = parseInt(match, 10);
    // Valider que c'est un numéro de loto valide (1-90)
    if (num >= 1 && num <= 90 && !numbers.includes(num)) {
      numbers.push(num);
    }
  }

  return numbers;
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
