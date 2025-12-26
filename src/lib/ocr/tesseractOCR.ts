import Tesseract from 'tesseract.js';
import { preprocessCartonImage, type DetectedCarton } from './imagePreprocessing';

export interface OCRResult {
  numbers: number[];
  confidence: number;
  rawText: string;
}

export interface CartonOCRResult {
  cartonIndex: number;
  numbers: number[];
  confidence: number;
  rawText: string;
  imageData: string;
}

/**
 * Extrait les numéros d'une image de carton via OCR
 * Configuration optimisée pour les numéros de loto
 */
export async function extractNumbersFromImage(
  imageSource: string | File,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  try {
    // Prétraiter l'image pour améliorer la reconnaissance
    const preprocessedImage = typeof imageSource === 'string'
      ? await preprocessCartonImage(imageSource)
      : await preprocessCartonImage(imageSource);

    const result = await Tesseract.recognize(preprocessedImage, 'eng', {
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
 * Gère les erreurs OCR courantes (0 confondu avec O, 1 avec I/l, etc.)
 */
export function extractLotoNumbers(text: string): number[] {
  // Normaliser le texte pour corriger les erreurs OCR courantes
  let normalized = text
    .replace(/[Oo]/g, '0')  // O -> 0
    .replace(/[Iil|]/g, '1') // I, i, l, | -> 1
    .replace(/[Ss]/g, '5')   // S -> 5
    .replace(/[Bb]/g, '8')   // B -> 8
    .replace(/[Zz]/g, '2')   // Z -> 2
    .replace(/[Gg]/g, '9')   // G -> 9
    .replace(/[Qq]/g, '9')   // Q -> 9
    .replace(/[Dd]/g, '0')   // D -> 0
    .replace(/[Aa]/g, '4')   // A -> 4
    .replace(/[\n\r\t]/g, ' ') // Normaliser les espaces
    .replace(/[^\d\s]/g, ' '); // Supprimer tout sauf chiffres et espaces

  // Chercher tous les nombres dans le texte (1 ou 2 chiffres)
  const matches = normalized.match(/\b(\d{1,2})\b/g);

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
 * Traite une planche complète de cartons détectés
 */
export async function processDetectedCartons(
  cartons: DetectedCarton[],
  onProgress?: (cartonIndex: number, progress: number) => void
): Promise<CartonOCRResult[]> {
  const results: CartonOCRResult[] = [];

  for (let i = 0; i < cartons.length; i++) {
    const carton = cartons[i];

    try {
      const ocrResult = await extractNumbersFromImage(
        carton.imageData,
        (p) => onProgress?.(i, p)
      );

      results.push({
        cartonIndex: carton.index,
        numbers: ocrResult.numbers,
        confidence: ocrResult.confidence,
        rawText: ocrResult.rawText,
        imageData: carton.imageData,
      });
    } catch (error) {
      console.error(`OCR Error for carton ${i}:`, error);
      results.push({
        cartonIndex: carton.index,
        numbers: [],
        confidence: 0,
        rawText: '',
        imageData: carton.imageData,
      });
    }
  }

  return results;
}

/**
 * Traite une planche complète (12 cartons)
 * @deprecated Utiliser detectCartonBorders + processDetectedCartons
 */
export async function processPlancheImage(
  imageSource: string | File,
  onProgress?: (carton: number, progress: number) => void
): Promise<OCRResult[]> {
  const result = await extractNumbersFromImage(imageSource, (p) => {
    onProgress?.(0, p);
  });

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

/**
 * Reconstruit un carton 3x9 à partir d'une liste de 15 numéros
 */
export function buildCartonGrid(numbers: number[]): (number | null)[][] {
  // Grille 3x9
  const grid: (number | null)[][] = [
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
  ];

  // Trier les numéros par colonne
  const sortedNumbers = [...numbers].sort((a, b) => a - b);

  // Répartir par colonne
  const columns: number[][] = Array.from({ length: 9 }, () => []);

  for (const num of sortedNumbers) {
    const col = num === 90 ? 8 : Math.floor(num / 10);
    if (col >= 0 && col <= 8) {
      columns[col].push(num);
    }
  }

  // Placer dans la grille (5 numéros par ligne, max 3 par colonne)
  const rowCounts = [0, 0, 0];

  for (let col = 0; col < 9; col++) {
    const nums = columns[col].sort((a, b) => a - b);

    for (let i = 0; i < nums.length && i < 3; i++) {
      // Trouver la meilleure ligne (celle avec le moins de numéros, max 5)
      let bestRow = 0;
      let minCount = rowCounts[0];

      for (let row = 1; row < 3; row++) {
        if (rowCounts[row] < minCount && rowCounts[row] < 5) {
          minCount = rowCounts[row];
          bestRow = row;
        }
      }

      if (rowCounts[bestRow] < 5) {
        grid[bestRow][col] = nums[i];
        rowCounts[bestRow]++;
      }
    }
  }

  return grid;
}
