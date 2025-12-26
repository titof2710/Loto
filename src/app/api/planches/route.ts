import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import type { Planche } from '@/types';

const redis = Redis.fromEnv();
const PLANCHES_KEY = 'loto:planches';

// GET - Récupérer toutes les planches
export async function GET() {
  try {
    const planches = await redis.get<Planche[]>(PLANCHES_KEY);
    return NextResponse.json(planches || []);
  } catch (error) {
    console.error('Erreur récupération planches:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST - Sauvegarder les planches
export async function POST(request: Request) {
  try {
    const planches: Planche[] = await request.json();
    await redis.set(PLANCHES_KEY, planches);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur sauvegarde planches:', error);
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
