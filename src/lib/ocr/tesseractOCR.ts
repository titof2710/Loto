import type { DetectedCarton } from './imagePreprocessing';
import { extractNumbersFromCartonGoogleVision } from './googleVisionOCR';

export interface OCRResult {
  numbers: number[];
  confidence: number;
  rawText: string;
  serialNumber?: string;
}

export interface CartonOCRResult {
  cartonIndex: number;
  numbers: number[];
  confidence: number;
  rawText: string;
  imageData: string;
  serialNumber?: string;
}

/**
 * Extrait les numéros d'une image de carton via Google Cloud Vision
 */
export async function extractNumbersFromImage(
  imageSource: string | File,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  try {
    console.log('OCR avec Google Cloud Vision...');
    const result = await extractNumbersFromCartonGoogleVision(imageSource, onProgress);
    console.log('Google Vision a trouvé', result.numbers.length, 'numéros:', result.numbers);
    return result;
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
        serialNumber: ocrResult.serialNumber,
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
  const grid: (number | null)[][] = [
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
  ];

  const sortedNumbers = [...numbers].sort((a, b) => a - b);
  const columns: number[][] = Array.from({ length: 9 }, () => []);

  for (const num of sortedNumbers) {
    const col = num === 90 ? 8 : Math.floor(num / 10);
    if (col >= 0 && col <= 8) {
      columns[col].push(num);
    }
  }

  const rowCounts = [0, 0, 0];

  for (let col = 0; col < 9; col++) {
    const nums = columns[col].sort((a, b) => a - b);

    for (let i = 0; i < nums.length && i < 3; i++) {
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
