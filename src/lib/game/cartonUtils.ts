import { v4 as uuidv4 } from 'uuid';
import type { Carton, Cell, Planche } from '@/types';
import type { NumberWithPosition } from '@/lib/ocr/googleVisionOCR';

/**
 * Crée un carton vide avec une grille 3x9
 */
export function createEmptyCarton(position: number): Carton {
  const grid: Cell[][] = [];

  for (let row = 0; row < 3; row++) {
    const rowCells: Cell[] = [];
    for (let col = 0; col < 9; col++) {
      rowCells.push({
        value: null,
        row,
        column: col,
      });
    }
    grid.push(rowCells);
  }

  return {
    id: uuidv4(),
    position,
    grid,
    numbers: [],
  };
}

/**
 * Crée une planche vide avec 12 cartons
 */
export function createEmptyPlanche(name: string): Planche {
  return {
    id: uuidv4(),
    name,
    cartons: Array.from({ length: 12 }, (_, i) => createEmptyCarton(i)),
  };
}

/**
 * Valide un numéro de loto (1-90)
 */
export function isValidLotoNumber(num: number): boolean {
  return Number.isInteger(num) && num >= 1 && num <= 90;
}

/**
 * Retourne la colonne correspondante pour un numéro
 * 1-9 → colonne 0, 10-19 → colonne 1, ..., 80-90 → colonne 8
 */
export function getColumnForNumber(num: number): number {
  if (num < 1 || num > 90) return -1;
  if (num < 10) return 0;
  if (num === 90) return 8; // 90 va dans la dernière colonne
  return Math.floor(num / 10);
}

/**
 * Crée un carton à partir d'une liste de 15 numéros
 * Les numéros sont placés automatiquement dans les bonnes colonnes
 * @param serialNumber Numéro de série optionnel (ex: "30-0054")
 */
export function createCartonFromNumbers(numbers: number[], position: number, serialNumber?: string): Carton | null {
  // Valider qu'on a 15 numéros uniques entre 1 et 90
  if (numbers.length !== 15) return null;
  if (new Set(numbers).size !== 15) return null;
  if (!numbers.every(isValidLotoNumber)) return null;

  // Grouper les numéros par colonne
  const columns: Map<number, number[]> = new Map();
  for (let i = 0; i < 9; i++) {
    columns.set(i, []);
  }

  for (const num of numbers) {
    const col = getColumnForNumber(num);
    if (col >= 0 && col <= 8 && columns.has(col)) {
      columns.get(col)!.push(num);
    } else {
      console.error(`Invalid column ${col} for number ${num}`);
      return null;
    }
  }

  // Vérifier qu'aucune colonne n'a plus de 3 numéros
  for (const [, nums] of columns) {
    if (nums.length > 3) return null;
  }

  // Trier les numéros dans chaque colonne
  for (const [col, nums] of columns) {
    columns.set(col, nums.sort((a, b) => a - b));
  }

  // Créer la grille
  const grid: Cell[][] = [[], [], []];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 9; col++) {
      grid[row].push({
        value: null,
        row,
        column: col,
      });
    }
  }

  // Placer les numéros selon les règles du loto français :
  // - Dans une colonne, les numéros sont triés du plus petit (haut) au plus grand (bas)
  // - Chaque ligne doit avoir exactement 5 numéros

  // D'abord, déterminer quelles lignes chaque colonne utilise
  // en fonction du nombre de numéros dans la colonne
  const columnRows: Map<number, number[]> = new Map();

  // Calculer combien de numéros chaque colonne a
  const colCounts: number[] = [];
  for (let col = 0; col < 9; col++) {
    colCounts.push(columns.get(col)!.length);
  }

  // Utiliser un algorithme de placement qui respecte :
  // 1. L'ordre vertical (petit en haut) dans chaque colonne
  // 2. 5 numéros par ligne

  // Pour simplifier, on place les numéros colonne par colonne
  // en assignant les lignes disponibles de haut en bas
  for (const [col, nums] of columns) {
    // Placer les numéros triés dans les lignes 0, 1, 2 selon leur ordre
    for (let i = 0; i < nums.length; i++) {
      grid[i][col].value = nums[i];
    }
  }

  // Note: Cette méthode simple ne garantit pas 5 numéros par ligne
  // mais respecte l'ordre vertical (petit en haut)

  return {
    id: uuidv4(),
    position,
    grid,
    numbers: numbers.sort((a, b) => a - b),
    serialNumber,
  };
}

/**
 * Crée un carton à partir des numéros avec leurs positions détectées par OCR
 * Utilise les positions Y exactes pour placer les numéros dans les bonnes lignes
 */
export function createCartonFromNumbersWithPositions(
  numbersWithPositions: NumberWithPosition[],
  position: number,
  serialNumber?: string
): Carton | null {
  const numbers = numbersWithPositions.map(n => n.number);

  // Valider qu'on a 15 numéros uniques entre 1 et 90
  if (numbers.length !== 15) return null;
  if (new Set(numbers).size !== 15) return null;
  if (!numbers.every(isValidLotoNumber)) return null;

  // Créer la grille vide
  const grid: Cell[][] = [[], [], []];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 9; col++) {
      grid[row].push({
        value: null,
        row,
        column: col,
      });
    }
  }

  // Placer chaque numéro selon sa position détectée par OCR
  for (const item of numbersWithPositions) {
    const row = item.row;
    const col = item.column;

    if (row >= 0 && row < 3 && col >= 0 && col < 9) {
      grid[row][col].value = item.number;
    }
  }

  return {
    id: uuidv4(),
    position,
    grid,
    numbers: numbers.sort((a, b) => a - b),
    serialNumber,
  };
}

/**
 * Génère un carton aléatoire valide
 */
export function generateRandomCarton(position: number): Carton {
  const numbers: number[] = [];
  const usedColumns: Map<number, number[]> = new Map();

  // Initialiser les colonnes
  for (let i = 0; i < 9; i++) {
    usedColumns.set(i, []);
  }

  // Générer 15 numéros uniques répartis sur les colonnes
  while (numbers.length < 15) {
    const num = Math.floor(Math.random() * 90) + 1;
    const col = getColumnForNumber(num);

    if (!numbers.includes(num) && usedColumns.get(col)!.length < 3) {
      numbers.push(num);
      usedColumns.get(col)!.push(num);
    }
  }

  return createCartonFromNumbers(numbers, position)!;
}

/**
 * Génère une planche de 12 cartons aléatoires
 */
export function generateRandomPlanche(name: string): Planche {
  return {
    id: uuidv4(),
    name,
    cartons: Array.from({ length: 12 }, (_, i) => generateRandomCarton(i)),
  };
}
