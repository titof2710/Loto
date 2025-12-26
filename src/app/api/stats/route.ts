import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import type { GlobalStats } from '@/types';
import { getSession } from '@/lib/auth/session';

const redis = Redis.fromEnv();

// Clé Redis préfixée par userId
const getUserStatsKey = (userId: string) => `loto:${userId}:stats`;

// GET - Récupérer les statistiques de l'utilisateur
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const key = getUserStatsKey(session.userId);
    const stats = await redis.get<GlobalStats>(key);
    return NextResponse.json(stats || {
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
    });
  } catch (error) {
    console.error('Erreur récupération stats:', error);
    return NextResponse.json({}, { status: 500 });
  }
}
