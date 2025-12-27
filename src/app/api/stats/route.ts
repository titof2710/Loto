import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import type { GlobalStats } from '@/types';
import { getSession } from '@/lib/auth/session';

const redis = Redis.fromEnv();

// Clé Redis préfixée par userId
const getUserStatsKey = (userId: string) => `loto:${userId}:stats`;

// Valeurs par défaut des stats
const defaultStats: GlobalStats = {
  totalGames: 0,
  totalQuines: 0,
  totalDoubleQuines: 0,
  totalCartonsPlein: 0,
  totalBallsDrawn: 0,
  averageBallsToQuine: 0,
  averageBallsToCartonPlein: 0,
  numberFrequency: {},
  fastestQuine: 0,
  fastestCartonPlein: 0,
};

// GET - Récupérer les statistiques de l'utilisateur
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const key = getUserStatsKey(session.userId);
    const stats = await redis.get<GlobalStats>(key);
    return NextResponse.json(stats || defaultStats);
  } catch (error) {
    console.error('Erreur récupération stats:', error);
    return NextResponse.json({}, { status: 500 });
  }
}

// PATCH - Incrémenter la fréquence d'un numéro tiré
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { ballNumber } = await request.json();

    if (typeof ballNumber !== 'number' || ballNumber < 1 || ballNumber > 90) {
      return NextResponse.json({ error: 'Numéro invalide' }, { status: 400 });
    }

    const key = getUserStatsKey(session.userId);
    const stats = await redis.get<GlobalStats>(key) || { ...defaultStats };

    // Incrémenter la fréquence du numéro
    stats.numberFrequency[ballNumber] = (stats.numberFrequency[ballNumber] || 0) + 1;
    stats.totalBallsDrawn = (stats.totalBallsDrawn || 0) + 1;

    await redis.set(key, stats);

    return NextResponse.json({ success: true, frequency: stats.numberFrequency[ballNumber] });
  } catch (error) {
    console.error('Erreur mise à jour fréquence:', error);
    return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 });
  }
}

// POST - Décrémenter la fréquence d'un numéro (pour undo)
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { ballNumber, action } = await request.json();

    if (action !== 'decrement') {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
    }

    if (typeof ballNumber !== 'number' || ballNumber < 1 || ballNumber > 90) {
      return NextResponse.json({ error: 'Numéro invalide' }, { status: 400 });
    }

    const key = getUserStatsKey(session.userId);
    const stats = await redis.get<GlobalStats>(key) || { ...defaultStats };

    // Décrémenter la fréquence du numéro
    if (stats.numberFrequency[ballNumber] && stats.numberFrequency[ballNumber] > 0) {
      stats.numberFrequency[ballNumber]--;
      stats.totalBallsDrawn = Math.max(0, (stats.totalBallsDrawn || 0) - 1);
    }

    await redis.set(key, stats);

    return NextResponse.json({ success: true, frequency: stats.numberFrequency[ballNumber] || 0 });
  } catch (error) {
    console.error('Erreur mise à jour fréquence:', error);
    return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 });
  }
}
