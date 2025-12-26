import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Planche, Carton, DrawnBall, WinEvent, CartonProgress, WinType, Cell, GameHistory, GameHistoryWin } from '@/types';

// Fonctions de persistance avec Vercel KV
async function savePlanchesToKV(planches: Planche[]) {
  try {
    await fetch('/api/planches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(planches),
    });
  } catch (error) {
    console.error('Erreur sauvegarde KV:', error);
  }
}

async function loadPlanchesFromKV(): Promise<Planche[]> {
  try {
    const response = await fetch('/api/planches');
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Erreur chargement KV:', error);
  }
  return [];
}

// Sauvegarder une partie dans l'historique
async function saveGameToHistory(
  planches: Planche[],
  drawnBalls: DrawnBall[],
  wins: WinEvent[],
  startedAt: Date | null
) {
  if (drawnBalls.length === 0) return;

  const now = new Date();
  const duration = startedAt ? Math.round((now.getTime() - startedAt.getTime()) / 1000) : 0;

  // Convertir les gains en format historique
  const historyWins: GameHistoryWin[] = wins.map(win => {
    const planche = planches.find(p => p.id === win.plancheId);
    const carton = planche?.cartons.find(c => c.id === win.cartonId);
    const ballIndex = drawnBalls.findIndex(b => b.number === win.atBallNumber);

    return {
      type: win.type,
      cartonSerialNumber: win.serialNumber,
      cartonPosition: win.cartonPosition || (carton?.position ?? 0) + 1,
      plancheName: planche?.name || 'Planche inconnue',
      atBallNumber: win.atBallNumber,
      atBallCount: ballIndex + 1,
    };
  });

  const gameHistory: GameHistory = {
    id: uuidv4(),
    date: now,
    plancheIds: planches.map(p => p.id),
    plancheNames: planches.map(p => p.name),
    drawnBalls: drawnBalls.map(b => b.number),
    totalBalls: drawnBalls.length,
    wins: historyWins,
    duration,
  };

  try {
    await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gameHistory),
    });
    console.log('Partie sauvegardée dans l\'historique');
  } catch (error) {
    console.error('Erreur sauvegarde historique:', error);
  }
}

interface GameStore {
  // État
  isPlaying: boolean;
  planches: Planche[];
  drawnBalls: DrawnBall[];
  wins: WinEvent[];
  voiceRecognitionEnabled: boolean;
  startedAt: Date | null;
  isLoading: boolean;

  // Actions planches
  addPlanche: (planche: Planche) => void;
  removePlanche: (plancheId: string) => void;
  clearPlanches: () => void;
  loadPlanches: () => Promise<void>;

  // Actions jeu
  startGame: () => void;
  stopGame: () => void;
  resetGame: () => void;
  clearDrawnBalls: () => void;

  // Actions boules
  drawBall: (number: number, source: 'manual' | 'voice') => void;
  undoLastBall: () => void;

  // Actions reconnaissance vocale
  toggleVoiceRecognition: () => void;

  // Getters calculés
  getMarkedNumbers: () => number[];
  getCartonProgress: (cartonId: string, plancheId: string) => CartonProgress | null;
  getAllCartonsProgress: () => CartonProgress[];
  getBestCartons: () => CartonProgress[];
}

// Fonction utilitaire pour calculer la progression d'un carton
function calculateCartonProgress(
  carton: Carton,
  plancheId: string,
  drawnNumbers: number[]
): CartonProgress {
  const markedNumbers = carton.numbers.filter(n => drawnNumbers.includes(n));

  // Calculer les numéros marqués par ligne
  const linesProgress: [number, number, number] = [0, 0, 0];
  const linesCompleted: [boolean, boolean, boolean] = [false, false, false];
  const lineNumbers: [number[], number[], number[]] = [[], [], []];

  for (const row of carton.grid) {
    for (const cell of row) {
      if (cell.value !== null) {
        lineNumbers[cell.row].push(cell.value);
        if (drawnNumbers.includes(cell.value)) {
          linesProgress[cell.row]++;
        }
      }
    }
  }

  // Vérifier les lignes complètes (5 numéros par ligne)
  linesCompleted[0] = linesProgress[0] === 5;
  linesCompleted[1] = linesProgress[1] === 5;
  linesCompleted[2] = linesProgress[2] === 5;

  // Calculer les numéros manquants pour chaque type de gain
  const completedLinesCount = linesCompleted.filter(Boolean).length;

  // Pour la quine (première ligne non complète)
  let missingForQuine: number[] = [];
  if (completedLinesCount < 1) {
    // Trouver la ligne la plus proche de la complétion
    let bestLine = 0;
    let bestProgress = linesProgress[0];
    for (let i = 1; i < 3; i++) {
      if (linesProgress[i] > bestProgress) {
        bestLine = i;
        bestProgress = linesProgress[i];
      }
    }
    missingForQuine = lineNumbers[bestLine].filter(n => !drawnNumbers.includes(n));
  }

  // Pour la double quine
  let missingForDoubleQuine: number[] = [];
  if (completedLinesCount < 2) {
    // Trouver les 2 lignes les plus proches
    const lineScores = [0, 1, 2].map(i => ({ line: i, progress: linesProgress[i], completed: linesCompleted[i] }));
    lineScores.sort((a, b) => b.progress - a.progress);

    for (const lineScore of lineScores.slice(0, 2)) {
      if (!lineScore.completed) {
        missingForDoubleQuine.push(...lineNumbers[lineScore.line].filter(n => !drawnNumbers.includes(n)));
      }
    }
  }

  // Pour le carton plein
  const missingForCartonPlein = carton.numbers.filter(n => !drawnNumbers.includes(n));

  return {
    cartonId: carton.id,
    plancheId,
    markedNumbers,
    linesProgress,
    linesCompleted,
    missingForQuine,
    missingForDoubleQuine,
    missingForCartonPlein,
  };
}

// Fonction pour détecter les gains
function detectWins(
  carton: Carton,
  plancheId: string,
  drawnNumbers: number[],
  previousProgress: CartonProgress | null,
  lastBallNumber: number
): WinEvent[] {
  const wins: WinEvent[] = [];
  const currentProgress = calculateCartonProgress(carton, plancheId, drawnNumbers);

  const prevCompletedCount = previousProgress
    ? previousProgress.linesCompleted.filter(Boolean).length
    : 0;
  const currentCompletedCount = currentProgress.linesCompleted.filter(Boolean).length;

  // Données communes pour tous les gains
  const commonData = {
    cartonId: carton.id,
    plancheId,
    atBallNumber: lastBallNumber,
    timestamp: new Date(),
    serialNumber: carton.serialNumber, // Numéro de série pour validation téléphonique
    cartonPosition: carton.position + 1, // Position 1-12 (pas 0-11)
  };

  // Quine
  if (prevCompletedCount < 1 && currentCompletedCount >= 1) {
    wins.push({
      ...commonData,
      type: 'quine',
    });
  }

  // Double quine
  if (prevCompletedCount < 2 && currentCompletedCount >= 2) {
    wins.push({
      ...commonData,
      type: 'double_quine',
    });
  }

  // Carton plein
  if (currentProgress.missingForCartonPlein.length === 0 &&
      (previousProgress?.missingForCartonPlein.length ?? carton.numbers.length) > 0) {
    wins.push({
      ...commonData,
      type: 'carton_plein',
    });
  }

  return wins;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // État initial
  isPlaying: false,
  planches: [],
  drawnBalls: [],
  wins: [],
  voiceRecognitionEnabled: false,
  startedAt: null,
  isLoading: true,

  // Actions planches
  addPlanche: (planche) => {
    set((state) => {
      const newPlanches = [...state.planches, planche];
      savePlanchesToKV(newPlanches);
      return { planches: newPlanches };
    });
  },

  removePlanche: (plancheId) => {
    set((state) => {
      const newPlanches = state.planches.filter(p => p.id !== plancheId);
      savePlanchesToKV(newPlanches);
      return { planches: newPlanches };
    });
  },

  clearPlanches: () => {
    savePlanchesToKV([]);
    set({ planches: [] });
  },

  loadPlanches: async () => {
    set({ isLoading: true });
    const planches = await loadPlanchesFromKV();
    set({ planches, isLoading: false });
  },

  // Actions jeu
  startGame: () => set({
    isPlaying: true,
    drawnBalls: [],
    wins: [],
    startedAt: new Date(),
  }),

  stopGame: () => set({
    isPlaying: false,
    voiceRecognitionEnabled: false,
  }),

  resetGame: () => set({
    isPlaying: false,
    drawnBalls: [],
    wins: [],
    voiceRecognitionEnabled: false,
    startedAt: null,
  }),

  // Nouveau cadeau : sauvegarde l'historique puis efface boules et gains, garde les planches
  clearDrawnBalls: () => {
    const state = get();
    // Sauvegarder dans l'historique avant de nettoyer
    saveGameToHistory(state.planches, state.drawnBalls, state.wins, state.startedAt);
    set({
      drawnBalls: [],
      wins: [],
      isPlaying: false,
      voiceRecognitionEnabled: false,
      startedAt: null,
    });
  },

  // Actions boules
  drawBall: (number, source) => {
    const state = get();

    // Vérifier que le numéro n'a pas déjà été tiré
    if (state.drawnBalls.some(b => b.number === number)) {
      return;
    }

    // Vérifier que le numéro est valide (1-90)
    if (number < 1 || number > 90) {
      return;
    }

    const newBall: DrawnBall = {
      number,
      timestamp: new Date(),
      source,
      order: state.drawnBalls.length + 1,
    };

    const drawnNumbers = [...state.drawnBalls.map(b => b.number), number];

    // Calculer les gains potentiels
    const newWins: WinEvent[] = [];
    for (const planche of state.planches) {
      for (const carton of planche.cartons) {
        const previousProgress = calculateCartonProgress(
          carton,
          planche.id,
          state.drawnBalls.map(b => b.number)
        );
        const wins = detectWins(carton, planche.id, drawnNumbers, previousProgress, number);
        newWins.push(...wins);
      }
    }

    set({
      drawnBalls: [...state.drawnBalls, newBall],
      wins: [...state.wins, ...newWins],
    });
  },

  undoLastBall: () => set((state) => {
    if (state.drawnBalls.length === 0) return state;

    const lastBall = state.drawnBalls[state.drawnBalls.length - 1];

    return {
      drawnBalls: state.drawnBalls.slice(0, -1),
      // Retirer les gains associés à cette boule
      wins: state.wins.filter(w => w.atBallNumber !== lastBall.number),
    };
  }),

  // Actions reconnaissance vocale
  toggleVoiceRecognition: () => set((state) => ({
    voiceRecognitionEnabled: !state.voiceRecognitionEnabled,
  })),

  // Getters calculés
  getMarkedNumbers: () => get().drawnBalls.map(b => b.number),

  getCartonProgress: (cartonId, plancheId) => {
    const state = get();
    const planche = state.planches.find(p => p.id === plancheId);
    if (!planche) return null;

    const carton = planche.cartons.find(c => c.id === cartonId);
    if (!carton) return null;

    return calculateCartonProgress(carton, plancheId, state.drawnBalls.map(b => b.number));
  },

  getAllCartonsProgress: () => {
    const state = get();
    const drawnNumbers = state.drawnBalls.map(b => b.number);
    const progress: CartonProgress[] = [];

    for (const planche of state.planches) {
      for (const carton of planche.cartons) {
        progress.push(calculateCartonProgress(carton, planche.id, drawnNumbers));
      }
    }

    return progress;
  },

  getBestCartons: () => {
    const allProgress = get().getAllCartonsProgress();

    // Trier par proximité d'un gain (moins de numéros manquants = mieux)
    return allProgress.sort((a, b) => {
      // Priorité: carton plein > double quine > quine
      const aScore = Math.min(
        a.missingForCartonPlein.length,
        a.missingForDoubleQuine.length + 10,
        a.missingForQuine.length + 20
      );
      const bScore = Math.min(
        b.missingForCartonPlein.length,
        b.missingForDoubleQuine.length + 10,
        b.missingForQuine.length + 20
      );
      return aScore - bScore;
    });
  },
}));
