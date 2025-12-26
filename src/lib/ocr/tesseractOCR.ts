import Tesseract from 'tesseract.js';

export interface OCRResult {
  numbers: number[];
  confidence: number;
  rawText: string;
}

/**
 * Extrait les numéros d'une image de carton via OCR
 */
export async function extractNumbersFromImage(
  imageSource: string | File,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  try {
    const result = await Tesseract.recognize(imageSource, 'fra', {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(m.progress);
        }
      },
    });

    const rawText = result.data.text;
    const confidence = result.data.confidence;

    // Extraire tous les nombres entre 1 et 90
    const numbers = extractLotoNumbers(rawText);

    return {
      numbers,
      confidence,
      rawText,
    };
  } catch (error) {
    console.error('OCR Error:', error);
    return {
      numbers: [],
      confidence: 0,
      rawText: '',
    };
  }
}

/**
 * Extrait les numéros de loto (1-90) d'un texte
 */
export function extractLotoNumbers(text: string): number[] {
  // Chercher tous les nombres dans le texte
  const matches = text.match(/\b(\d{1,2})\b/g);

  if (!matches) return [];

  const numbers: number[] = [];

  for (const match of matches) {
    const num = parseInt(match, 10);
    // Valider que c'est un numéro de loto valide et non dupliqué
    if (num >= 1 && num <= 90 && !numbers.includes(num)) {
      numbers.push(num);
    }
  }

  return numbers.sort((a, b) => a - b);
}

/**
 * Traite une planche complète (12 cartons)
 */
export async function processPlancheImage(
  imageSource: string | File,
  onProgress?: (carton: number, progress: number) => void
): Promise<OCRResult[]> {
  // Pour l'instant, on traite l'image entière
  // Une amélioration serait de découper en 12 zones
  const result = await extractNumbersFromImage(imageSource, (p) => {
    onProgress?.(0, p);
  });

  // Si on a trouvé environ 180 numéros (12 x 15), on peut essayer de les séparer
  // Sinon on retourne juste le résultat brut
  if (result.numbers.length >= 15) {
    return [result];
  }

  return [result];
}

/**
 * Vérifie si un ensemble de numéros peut former un carton valide
 */
export function validateCartonNumbers(numbers: number[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (numbers.length !== 15) {
    errors.push(`Il faut exactement 15 numéros (trouvé: ${numbers.length})`);
  }

  const uniqueNumbers = new Set(numbers);
  if (uniqueNumbers.size !== numbers.length) {
    errors.push('Des numéros sont en double');
  }

  const outOfRange = numbers.filter((n) => n < 1 || n > 90);
  if (outOfRange.length > 0) {
    errors.push(`Numéros hors limite (1-90): ${outOfRange.join(', ')}`);
  }

  // Vérifier la distribution par colonne (max 3 par colonne)
  const columns: Map<number, number[]> = new Map();
  for (let i = 0; i < 9; i++) {
    columns.set(i, []);
  }

  for (const num of numbers) {
    const col = num < 10 ? 0 : Math.floor(num / 10);
    if (col <= 8) {
      columns.get(col)!.push(num);
    }
  }

  for (const [col, nums] of columns) {
    if (nums.length > 3) {
      errors.push(`Colonne ${col + 1} a trop de numéros (max 3): ${nums.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
