import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import type { Planche } from '@/types';

const redis = Redis.fromEnv();
const PLANCHES_KEY = 'loto:planches';

// GET - Récupérer toutes les planches
export async function GET() {
  try {
    console.log('📥 API GET /api/planches');
    const planches = await redis.get<Planche[]>(PLANCHES_KEY);
    console.log('✅ Planches récupérées:', planches?.length || 0);
    return NextResponse.json(planches || []);
  } catch (error) {
    console.error('❌ Erreur récupération planches:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST - Sauvegarder les planches
export async function POST(request: Request) {
  try {
    const planches: Planche[] = await request.json();
    console.log('💾 API POST /api/planches:', planches.length, 'planches');
    await redis.set(PLANCHES_KEY, planches);
    console.log('✅ Planches sauvegardées dans Redis');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur sauvegarde planches:', error);
    return NextResponse.json({ error: 'Erreur sauvegarde' }, { status: 500 });
  }
}

// DELETE - Supprimer toutes les planches
export async function DELETE() {
  try {
    await redis.del(PLANCHES_KEY);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression planches:', error);
    return NextResponse.json({ error: 'Erreur suppression' }, { status: 500 });
  }
}
