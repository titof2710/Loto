// Types pour l'application Loto Fiesta

/**
 * Cellule d'un carton - peut contenir un numéro ou être vide
 * Grille 3x9 : 3 lignes, 9 colonnes (colonnes = dizaines 1-9, 10-19, ..., 80-90)
 */
export interface Cell {
  value: number | null;  // null = case vide
  row: number;           // 0, 1 ou 2
  column: number;        // 0 à 8
}

/**
 * Carton individuel - grille 3x9 avec 15 numéros
 * Format loto français : 5 numéros par ligne, 15 au total
 */
export interface Carton {
  id: string;
  position: number;      // Position sur la planche (0-11)
  grid: Cell[][];        // Grille 3x9
  numbers: number[];     // Liste des 15 numéros (pour recherche rapide)
  serialNumber?: string; // Numéro de série du carton (ex: "30-0054") pour validation téléphonique
}

/**
 * Planche de 12 cartons (format papier standard)
 */
export interface Planche {
  id: string;
  name: string;          // Nom personnalisé (ex: "Planche bleue")
  cartons: Carton[];     // 12 cartons
  imageUrl?: string;     // Photo originale (data URL)
}

/**
 * Boule tirée
 */
export interface DrawnBall {
  number: number;        // 1-90
  timestamp: Date;
  source: 'manual' | 'voice';
  order: number;         // Ordre du tirage
}

/**
 * Types de gains possibles
 */
export type WinType = 'quine' | 'double_quine' | 'carton_plein';

/**
 * Événement de gain
 */
export interface WinEvent {
  cartonId: string;
  plancheId: string;
  type: WinType;
  atBallNumber: number;  // Numéro de la boule qui a déclenché le gain
  timestamp: Date;
  serialNumber?: string; // Numéro de série du carton gagnant (ex: "30-0054") pour appel téléphonique
  cartonPosition?: number; // Position du carton sur la planche (1-12)
}

/**
 * État d'avancement d'un carton pendant une partie
 */
export interface CartonProgress {
  cartonId: string;
  plancheId: string;
  markedNumbers: number[];
  linesProgress: [number, number, number]; // Numéros marqués par ligne (0, 1, 2)
  linesCompleted: [boolean, boolean, boolean];
  missingForQuine: number[];      // Numéros manquants pour la prochaine quine
  missingForDoubleQuine: number[];
  missingForCartonPlein: number[];
}

/**
 * État d'une partie
 */
export interface GameState {
  isPlaying: boolean;
  planches: Planche[];
  drawnBalls: DrawnBall[];
  wins: WinEvent[];
  voiceRecognitionEnabled: boolean;
  startedAt: Date | null;
}

/**
 * Alerte pour l'utilisateur
 */
export interface Alert {
  id: string;
  type: 'one_remaining' | 'win';
  winType: WinType;
  cartonId: string;
  plancheId: string;
  message: string;
  timestamp: Date;
}

/**
 * Paramètres de l'application
 */
export interface Settings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  alertsEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
}

/**
 * Partie sauvegardée dans l'historique
 */
export interface GameHistory {
  id: string;
  date: Date;
  plancheIds: string[];
  plancheNames: string[];
  drawnBalls: number[];        // Juste les numéros pour économiser l'espace
  totalBalls: number;
  wins: GameHistoryWin[];
  duration: number;            // Durée en secondes
}

/**
 * Gain dans l'historique
 */
export interface GameHistoryWin {
  type: WinType;
  cartonSerialNumber?: string;
  cartonPosition: number;
  plancheName: string;
  atBallNumber: number;
  atBallCount: number;         // Combien de boules tirées au moment du gain
}

/**
 * Statistiques globales
 */
export interface GlobalStats {
  totalGames: number;
  totalQuines: number;
  totalDoubleQuines: number;
  totalCartonsPlein: number;
  totalBallsDrawn: number;
  averageBallsToQuine: number;
  averageBallsToCartonPlein: number;
  numberFrequency: Record<number, number>;  // Fréquence de chaque numéro (1-90)
  fastestQuine: number;        // Moins de boules pour une quine
  fastestCartonPlein: number;  // Moins de boules pour un carton plein
}

/**
 * Type de gain pour les lots Loto Fiesta
 */
export type PrizeType = 'Q' | 'DQ' | 'CP';

/**
 * Lot/Cadeau d'un tirage Loto Fiesta
 */
export interface LotoPrize {
  number: number;           // Numéro du lot (1, 2, 3...)
  type: PrizeType;          // Type de gain requis (Q, DQ, CP)
  description: string;      // Description du cadeau
}

/**
 * Tirage Loto Fiesta (événement sur le site)
 */
export interface LotoTirage {
  id: string;
  title: string;            // Nom de l'événement (ex: "AS MURET FOOTBALL")
  date: string;             // Date du tirage (ex: "VENDREDI 26 DÉCEMBRE")
  url: string;              // URL de la page produit
  imageUrl: string;         // URL de l'image principale
  prizesImageUrl?: string;  // URL de l'image des lots
  prizes: LotoPrize[];      // Liste des lots
}
