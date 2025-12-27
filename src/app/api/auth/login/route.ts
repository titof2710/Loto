import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import type { User, AuthResponse } from '@/types/auth';

const redis = Redis.fromEnv();

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Validation
    if (!email || !password) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    // Trouver l'utilisateur par email
    const userId = await redis.get<string>(`user:email:${emailLower}`);
    if (!userId) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Récupérer l'utilisateur
    const user = await redis.get<User>(`user:${userId}`);
    if (!user) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Vérifier le mot de passe
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    console.log('✅ Connexion réussie:', emailLower);

    // Créer la session
    await createSession({ userId, email: user.email });

    // Retourner l'user sans le passwordHash
    return NextResponse.json<AuthResponse>({
      success: true,
      userId,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Erreur connexion:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
    return NextResponse.json<AuthResponse>(
      { success: false, error: `Erreur serveur: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
