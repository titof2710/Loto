import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth/session';
import type { AuthResponse } from '@/types/auth';

export async function POST() {
  try {
    await deleteSession();
    return NextResponse.json<AuthResponse>({ success: true });
  } catch (error) {
    console.error('Erreur déconnexion:', error);
    return NextResponse.json<AuthResponse>(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
