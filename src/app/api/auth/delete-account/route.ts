import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import { getSession, deleteSession } from '@/lib/auth/session';
import { verifyPassword } from '@/lib/auth/password';
import type { User } from '@/types/auth';

const redis = Redis.fromEnv();

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { password } = await request.json();

    // Validation
    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Mot de passe requis pour confirmer la suppression' },
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

    // Vérifier le mot de passe
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Supprimer toutes les données de l'utilisateur
    const keysToDelete = [
      `user:${session.userId}`,
      `user:email:${user.email}`,
      `loto:${session.userId}:planches`,
      `loto:${session.userId}:history`,
      `loto:${session.userId}:stats`,
    ];

    // Supprimer toutes les clés en une seule opération
    await Promise.all(keysToDelete.map(key => redis.del(key)));

    // Supprimer la session
    await deleteSession();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression compte:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
