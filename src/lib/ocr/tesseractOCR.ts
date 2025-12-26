import Tesseract from 'tesseract.js';
import type { DetectedCarton } from './imagePreprocessing';
import { extractNumbersWithOCRSpace } from './ocrSpaceAPI';

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
 * Utilise OCR.space API par défaut (meilleur pour les chiffres)
 * Fallback sur Tesseract.js si OCR.space échoue
 */
export async function extractNumbersFromImage(
  imageSource: string | File,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  try {
    // Essayer d'abord avec OCR.space (meilleur pour les chiffres)
    console.log('Tentative OCR avec OCR.space API...');
    const ocrSpaceResult = await extractNumbersWithOCRSpace(imageSource, onProgress);

    if (ocrSpaceResult.numbers.length >= 5) {
      console.log('OCR.space a trouvé', ocrSpaceResult.numbers.length, 'numéros:', ocrSpaceResult.numbers);
      return ocrSpaceResult;
    }

    // Fallback sur Tesseract si OCR.space n'a pas trouvé assez de numéros
    console.log('OCR.space insuffisant, fallback sur Tesseract.js...');
    const numbers = await extractNumbersFromCartonGrid(imageSource);

    onProgress?.(1);

    return {
      numbers: numbers.sort((a, b) => a - b),
      confidence: numbers.length === 15 ? 95 : (numbers.length / 15) * 100,
      rawText: numbers.join(' '),
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
 * Extrait les numéros d'un carton en analysant cellule par cellule
 * Un carton loto = 3 lignes x 9 colonnes, avec 5 numéros par ligne
 */
async function extractNumbersFromCartonGrid(source: string | File): Promise<number[]> {
  const canvas = await loadImageToCanvas(source);
  const width = canvas.width;
  const height = canvas.height;

  // Un carton a 3 lignes et 9 colonnes
  const cellWidth = width / 9;
  const cellHeight = height / 3;

  const numbers: number[] = [];

  // Créer un worker Tesseract unique pour toutes les cellules
  const worker = await Tesseract.createWorker('eng', 1);
  await worker.setParameters({
    tessedit_char_whitelist: '0123456789',
    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_WORD, // SINGLE_WORD pour lire 1-2 chiffres
  });

  // Parcourir chaque cellule
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 9; col++) {
      // Extraire la cellule avec une marge pour éviter les bordures
      const marginX = cellWidth * 0.1;
      const marginY = cellHeight * 0.1;

      const cellCanvas = document.createElement('canvas');
      // Taille plus grande pour meilleure OCR
      cellCanvas.width = Math.floor(cellWidth * 2);
      cellCanvas.height = Math.floor(cellHeight * 2);

      const cellCtx = cellCanvas.getContext('2d');
      if (!cellCtx) continue;

      // Fond blanc
      cellCtx.fillStyle = 'white';
      cellCtx.fillRect(0, 0, cellCanvas.width, cellCanvas.height);

      // Extraire et agrandir la cellule
      cellCtx.drawImage(
        canvas,
        col * cellWidth + marginX,
        row * cellHeight + marginY,
        cellWidth - marginX * 2,
        cellHeight - marginY * 2,
        0,
        0,
        cellCanvas.width,
        cellCanvas.height
      );

      // Vérifier si la cellule contient quelque chose (pas vide/blanc)
      const imageData = cellCtx.getImageData(0, 0, cellCanvas.width, cellCanvas.height);
      const hasContent = checkCellHasContent(imageData);

      if (hasContent) {
        // OCR sur cette cellule
        const result = await worker.recognize(cellCanvas.toDataURL('image/png'));
        const text = result.data.text.trim().replace(/\s/g, '');

        console.log(`Cell [${row},${col}]: "${text}"`);

        // Parser le numéro (1 ou 2 chiffres)
        const num = parseInt(text, 10);
        if (!isNaN(num) && num >= 1 && num <= 90 && !numbers.includes(num)) {
          numbers.push(num);
        }
      }
    }
  }

  await worker.terminate();

  console.log('Numéros extraits par cellule:', numbers);
  return numbers;
}

/**
 * Vérifie si une cellule contient du contenu (pas vide)
 */
function checkCellHasContent(imageData: ImageData): boolean {
  const data = imageData.data;
  let darkPixels = 0;
  const total = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (brightness < 100) {
      darkPixels++;
    }
  }

  // Si plus de 2% de pixels sombres, il y a probablement du contenu
  return darkPixels / total > 0.02;
}

/**
 * Prétraitement simplifié pour l'OCR
 * Les PDFs sont déjà propres, on évite les traitements agressifs
 */
async function preprocessForOCR(source: string | File): Promise<string> {
  // Charger l'image
  const canvas = await loadImageToCanvas(source);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Upscale x2 pour améliorer la reconnaissance
  const upscaled = document.createElement('canvas');
  upscaled.width = canvas.width * 2;
  upscaled.height = canvas.height * 2;
  const upCtx = upscaled.getContext('2d');
  if (!upCtx) throw new Error('Could not get upscaled canvas context');

  upCtx.imageSmoothingEnabled = true;
  upCtx.imageSmoothingQuality = 'high';
  upCtx.drawImage(canvas, 0, 0, upscaled.width, upscaled.height);

  // Traitement léger: augmenter le contraste sans binariser
  const imageData = upCtx.getImageData(0, 0, upscaled.width, upscaled.height);
  const data = imageData.data;

  // Convertir en niveaux de gris et augmenter le contraste
  for (let i = 0; i < data.length; i += 4) {
    // Niveaux de gris
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

    // Augmenter le contraste (facteur 1.8)
    const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.8 + 128));

    data[i] = contrasted;
    data[i + 1] = contrasted;
    data[i + 2] = contrasted;
  }

  upCtx.putImageData(imageData, 0, 0);

  return upscaled.toDataURL('image/png');
}

/**
 * Charge une image depuis un fichier ou URL et retourne un canvas
 */
async function loadImageToCanvas(source: File | string): Promise<HTMLCanvasElement> {
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
      resolve(canvas);
    };

    img.onerror = () => reject(new Error('Failed to load image'));

    if (source instanceof File) {
      img.src = URL.createObjectURL(source);
    } else {
      img.src = source;
    }
  });
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
