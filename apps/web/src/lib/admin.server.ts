import 'server-only';
import type { Session } from '@portfolio/contracts';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { serverEnv } from './env.server';
import { SESSION_COOKIE } from './session';

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/**
 * Verifies the session against the API (the cookie alone proves nothing).
 * Cached per request, so a layout and its page share one check.
 */
export const requireSession = cache(async (): Promise<Session> => {
  const token = await getSessionToken();
  if (!token) redirect('/dashboard/login');
  const response = await fetch(`${serverEnv().API_URL}/auth/me`, {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  }).catch(() => null);
  if (response?.status === 401) redirect('/dashboard/login?expired=1');
  if (!response?.ok) throw new Error('The API is unreachable. Is it running?');
  return (await response.json()) as Session;
});

/** Server-side admin read. 404 → null; 401 → back to login. Never cached. */
export async function adminGet<T>(path: string): Promise<T | null> {
  const token = await getSessionToken();
  if (!token) redirect('/dashboard/login');
  const response = await fetch(`${serverEnv().API_URL}${path}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (response.status === 401) redirect('/dashboard/login?expired=1');
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`API ${response.status} on GET ${path}`);
  return (await response.json()) as T;
}

export async function adminGetOrEmpty<T>(path: string, empty: T): Promise<T> {
  return (await adminGet<T>(path)) ?? empty;
}
