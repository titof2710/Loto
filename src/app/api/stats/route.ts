import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import type { GlobalStats } from '@/types';

const redis = Redis.fromEnv();
const STATS_KEY = 'loto:stats';

// GET - Récupérer les statistiques globales
export async function GET() {
  try {
    const stats = await redis.get<GlobalStats>(STATS_KEY);
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
