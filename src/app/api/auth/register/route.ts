import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '@/lib/auth/password';
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

    if (password.length < 6) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Le mot de passe doit faire au moins 6 caractères' },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    // Vérifier si l'email existe déjà
    const existingUserId = await redis.get<string>(`user:email:${emailLower}`);
    if (existingUserId) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Cet email est déjà utilisé' },
        { status: 409 }
      );
    }

    // Créer l'utilisateur
    const userId = uuidv4();
    const passwordHash = await hashPassword(password);

    const user: User = {
      id: userId,
      email: emailLower,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    // Sauvegarder dans Redis (transaction pour atomicité)
    await redis.set(`user:${userId}`, user);
    await redis.set(`user:email:${emailLower}`, userId);

    console.log('✅ Nouvel utilisateur créé:', emailLower);

    // Créer la session
    await createSession({ userId, email: emailLower });

    // Retourner l'user sans le passwordHash
    return NextResponse.json<AuthResponse>({
      success: true,
      userId,
      user: {
        id: userId,
        email: emailLower,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    return NextResponse.json<AuthResponse>(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
