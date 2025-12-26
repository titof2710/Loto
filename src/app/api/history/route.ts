import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import type { GameHistory, GlobalStats } from '@/types';

const redis = Redis.fromEnv();
const HISTORY_KEY = 'loto:history';
const STATS_KEY = 'loto:stats';

// GET - Récupérer l'historique des parties
export async function GET() {
  try {
    const history = await redis.get<GameHistory[]>(HISTORY_KEY);
    return NextResponse.json(history || []);
  } catch (error) {
    console.error('Erreur récupération historique:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST - Ajouter une partie à l'historique
export async function POST(request: Request) {
  try {
    const game: GameHistory = await request.json();

    // Récupérer l'historique existant
    const history = await redis.get<GameHistory[]>(HISTORY_KEY) || [];

    // Ajouter la nouvelle partie au début
    history.unshift(game);

    // Limiter à 100 parties maximum
    if (history.length > 100) {
      history.splice(100);
    }

    await redis.set(HISTORY_KEY, history);

    // Mettre à jour les statistiques globales
    await updateStats(game);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur sauvegarde historique:', error);
    return NextResponse.json({ error: 'Erreur sauvegarde' }, { status: 500 });
  }
}

// DELETE - Supprimer tout l'historique
export async function DELETE() {
  try {
    await redis.del(HISTORY_KEY);
    await redis.del(STATS_KEY);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression historique:', error);
    return NextResponse.json({ error: 'Erreur suppression' }, { status: 500 });
  }
}

// Fonction pour mettre à jour les statistiques
async function updateStats(game: GameHistory) {
  try {
    const stats = await redis.get<GlobalStats>(STATS_KEY) || {
      totalGames: 0,
      totalQuines: 0,
      totalDoubleQuines: 0,
      totalCartonsPlein: 0,
      totalBallsDrawn: 0,
      averageBallsToQuine: 0,
      averageBallsToCartonPlein: 0,
      numberFrequency: {},
      fastestQuine: 999,
      fastestCartonPlein: 999,
    };

    // Incrémenter les compteurs
    stats.totalGames++;
    stats.totalBallsDrawn += game.totalBalls;

    // Compter les gains
    let quineCount = 0;
    let cartonPleinCount = 0;
    let totalBallsToQuine = 0;
    let totalBallsToCartonPlein = 0;

    for (const win of game.wins) {
      if (win.type === 'quine') {
        stats.totalQuines++;
        quineCount++;
        totalBallsToQuine += win.atBallCount;
        if (win.atBallCount < stats.fastestQuine) {
          stats.fastestQuine = win.atBallCount;
        }
      } else if (win.type === 'double_quine') {
        stats.totalDoubleQuines++;
      } else if (win.type === 'carton_plein') {
        stats.totalCartonsPlein++;
        cartonPleinCount++;
        totalBallsToCartonPlein += win.atBallCount;
        if (win.atBallCount < stats.fastestCartonPlein) {
          stats.fastestCartonPlein = win.atBallCount;
        }
      }
    }

    // Mettre à jour les moyennes
    if (stats.totalQuines > 0) {
      const prevTotal = stats.averageBallsToQuine * (stats.totalQuines - quineCount);
      stats.averageBallsToQuine = (prevTotal + totalBallsToQuine) / stats.totalQuines;
    }

    if (stats.totalCartonsPlein > 0) {
      const prevTotal = stats.averageBallsToCartonPlein * (stats.totalCartonsPlein - cartonPleinCount);
      stats.averageBallsToCartonPlein = (prevTotal + totalBallsToCartonPlein) / stats.totalCartonsPlein;
    }

    // Mettre à jour la fréquence des numéros
    for (const ball of game.drawnBalls) {
      stats.numberFrequency[ball] = (stats.numberFrequency[ball] || 0) + 1;
    }

    await redis.set(STATS_KEY, stats);
  } catch (error) {
    console.error('Erreur mise à jour stats:', error);
  }
}
