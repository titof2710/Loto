import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import type { DrawnBall, WinEvent } from '@/types';
import { getSession } from '@/lib/auth/session';

const redis = Redis.fromEnv();

// Clé Redis pour l'état du jeu en cours
const getGameStateKey = (userId: string) => `loto:${userId}:game-state`;

interface GameState {
  drawnBalls: DrawnBall[];
  wins: WinEvent[];
  startedAt: string | null;
  isPlaying: boolean;
}

// GET - Récupérer l'état du jeu en cours
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const key = getGameStateKey(session.userId);
    const gameState = await redis.get<GameState>(key);

    return NextResponse.json(gameState || {
      drawnBalls: [],
      wins: [],
      startedAt: null,
      isPlaying: false,
    });
  } catch (error) {
    console.error('Erreur récupération état du jeu:', error);
    return NextResponse.json({
      drawnBalls: [],
      wins: [],
      startedAt: null,
      isPlaying: false,
    }, { status: 500 });
  }
}

// POST - Sauvegarder l'état du jeu en cours
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const gameState: GameState = await request.json();
    const key = getGameStateKey(session.userId);

    await redis.set(key, gameState);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur sauvegarde état du jeu:', error);
    return NextResponse.json({ error: 'Erreur sauvegarde' }, { status: 500 });
  }
}

// DELETE - Effacer l'état du jeu (nouvelle partie)
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const key = getGameStateKey(session.userId);
    await redis.del(key);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression état du jeu:', error);
    return NextResponse.json({ error: 'Erreur suppression' }, { status: 500 });
  }
}
