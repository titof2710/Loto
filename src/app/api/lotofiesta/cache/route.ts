import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';
import type { LotoPrize, LotoTirage } from '@/types';

const redis = Redis.fromEnv();

// Clé pour stocker les tirages avec leurs lots
const TIRAGES_KEY = 'loto:tirages';

// Cache d'une journée (les lots changent chaque jour)
const CACHE_TTL = 24 * 60 * 60; // 24 heures en secondes

interface CachedTirage {
  id: string;
  prizes: LotoPrize[];
  prizesImageUrl?: string;
  cachedAt: string;
}

/**
 * GET /api/lotofiesta/cache?tirageId=xxx
 * Récupère les prizes d'un tirage depuis le cache
 */
export async function GET(request: NextRequest) {
  const tirageId = request.nextUrl.searchParams.get('tirageId');

  try {
    const cachedData = await redis.get<Record<string, CachedTirage>>(TIRAGES_KEY);

    if (!cachedData) {
      return NextResponse.json({ cached: false, prizes: [] });
    }

    // Si un tirageId est spécifié, retourner uniquement ce tirage
    if (tirageId) {
      const tirage = cachedData[tirageId];
      if (tirage && tirage.prizes.length > 0) {
        console.log(`Cache HIT pour tirage ${tirageId}: ${tirage.prizes.length} lots`);
        return NextResponse.json({
          cached: true,
          prizes: tirage.prizes,
          prizesImageUrl: tirage.prizesImageUrl,
          cachedAt: tirage.cachedAt
        });
      }
      return NextResponse.json({ cached: false, prizes: [] });
    }

    // Sinon retourner tous les tirages cachés
    return NextResponse.json({ cached: true, tirages: cachedData });
  } catch (error) {
    console.error('Erreur récupération cache prizes:', error);
    return NextResponse.json({ cached: false, prizes: [] });
  }
}

/**
 * POST /api/lotofiesta/cache
 * Sauvegarde les prizes d'un tirage dans le cache
 * Body: { tirageId: string, prizes: LotoPrize[], prizesImageUrl?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { tirageId, prizes, prizesImageUrl } = await request.json();

    if (!tirageId || !prizes) {
      return NextResponse.json({ error: 'tirageId et prizes requis' }, { status: 400 });
    }

    // Récupérer les données existantes
    const existingData = await redis.get<Record<string, CachedTirage>>(TIRAGES_KEY) || {};

    // Ajouter/mettre à jour ce tirage
    existingData[tirageId] = {
      id: tirageId,
      prizes,
      prizesImageUrl,
      cachedAt: new Date().toISOString(),
    };

    // Sauvegarder avec TTL
    await redis.set(TIRAGES_KEY, existingData, { ex: CACHE_TTL });

    console.log(`Cache SAVE pour tirage ${tirageId}: ${prizes.length} lots`);

    return NextResponse.json({ success: true, cachedPrizes: prizes.length });
  } catch (error) {
    console.error('Erreur sauvegarde cache prizes:', error);
    return NextResponse.json({ error: 'Erreur sauvegarde cache' }, { status: 500 });
  }
}

/**
 * DELETE /api/lotofiesta/cache
 * Vide le cache des prizes (utile pour forcer un refresh)
 */
export async function DELETE() {
  try {
    await redis.del(TIRAGES_KEY);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression cache prizes:', error);
    return NextResponse.json({ error: 'Erreur suppression' }, { status: 500 });
  }
}
