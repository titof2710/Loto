import { cookies } from 'next/headers';
import { signToken, verifyToken } from './jwt';
import type { Session } from '@/types/auth';

const COOKIE_NAME = 'loto-session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

export async function createSession(session: Session): Promise<void> {
  const token = await signToken(session);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
