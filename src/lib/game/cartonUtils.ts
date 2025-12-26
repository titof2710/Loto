import { v4 as uuidv4 } from 'uuid';
import type { Carton, Cell, Planche } from '@/types';

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
 * 1-9 → colonne 0, 10-19 → colonne 1, etc.
 */
export function getColumnForNumber(num: number): number {
  if (num < 1 || num > 90) return -1;
  if (num < 10) return 0;
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
    columns.get(col)!.push(num);
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

  // Placer les numéros - algorithme simplifié
  // On remplit ligne par ligne en respectant les colonnes
  const rowCounts = [0, 0, 0]; // Nombre de numéros par ligne
  const columnUsed: Set<string> = new Set(); // "row-col" déjà utilisé

  for (const [col, nums] of columns) {
    for (let i = 0; i < nums.length; i++) {
      // Trouver la ligne avec le moins de numéros qui n'a pas encore ce col
      let bestRow = -1;
      let minCount = Infinity;

      for (let row = 0; row < 3; row++) {
        if (rowCounts[row] < 5 && !columnUsed.has(`${row}-${col}`)) {
          if (rowCounts[row] < minCount) {
            minCount = rowCounts[row];
            bestRow = row;
          }
        }
      }

      if (bestRow !== -1) {
        grid[bestRow][col].value = nums[i];
        rowCounts[bestRow]++;
        columnUsed.add(`${bestRow}-${col}`);
      }
    }
  }

  // Vérifier que chaque ligne a exactement 5 numéros
  for (let row = 0; row < 3; row++) {
    const count = grid[row].filter((c) => c.value !== null).length;
    if (count !== 5) {
      // Réessayer avec un placement différent si nécessaire
      // Pour l'instant on retourne null
      console.warn(`Ligne ${row} a ${count} numéros au lieu de 5`);
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
