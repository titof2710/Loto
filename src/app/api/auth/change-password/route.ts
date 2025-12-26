import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { verifyPassword, hashPassword } from '@/lib/auth/password';
import type { User } from '@/types/auth';

const redis = Redis.fromEnv();

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { oldPassword, newPassword } = await request.json();

    // Validation
    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Ancien et nouveau mot de passe requis' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur
    const user = await redis.get<User>(`user:${session.userId}`);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier l'ancien mot de passe
    const isValid = await verifyPassword(oldPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Ancien mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Hasher et sauvegarder le nouveau mot de passe
    const newHash = await hashPassword(newPassword);
    await redis.set(`user:${session.userId}`, {
      ...user,
      passwordHash: newHash,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur changement mot de passe:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
