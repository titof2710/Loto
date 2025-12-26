import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';
import type { Planche } from '@/types';
import { getSession } from '@/lib/auth/session';

const redis = Redis.fromEnv();

// Clé Redis préfixée par userId
const getUserPlanchesKey = (userId: string) => `loto:${userId}:planches`;

// GET - Récupérer les planches de l'utilisateur
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const key = getUserPlanchesKey(session.userId);
    console.log('📥 API GET /api/planches pour user:', session.userId);
    const planches = await redis.get<Planche[]>(key);
    console.log('✅ Planches récupérées:', planches?.length || 0);
    return NextResponse.json(planches || []);
  } catch (error) {
    console.error('❌ Erreur récupération planches:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST - Sauvegarder les planches de l'utilisateur
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const planches: Planche[] = await request.json();
    const key = getUserPlanchesKey(session.userId);
    console.log('💾 API POST /api/planches pour user:', session.userId, '-', planches.length, 'planches');
    await redis.set(key, planches);
    console.log('✅ Planches sauvegardées dans Redis');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur sauvegarde planches:', error);
    return NextResponse.json({ error: 'Erreur sauvegarde' }, { status: 500 });
  }
}

// DELETE - Supprimer toutes les planches de l'utilisateur
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const key = getUserPlanchesKey(session.userId);
    await redis.del(key);
    console.log('🗑️ Planches supprimées pour user:', session.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression planches:', error);
    return NextResponse.json({ error: 'Erreur suppression' }, { status: 500 });
  }
}
