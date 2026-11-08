'use client';

import type { ApiError } from '@portfolio/contracts';

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors: { path: string; message: string }[] = [],
  ) {
    super(message);
  }
}

/**
 * Browser → same-origin Next.js proxy (/api/admin/*) → API with the httpOnly session token.
 * The browser never sees the token.
 */
export async function adminRequest<T = unknown>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const isForm = body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`/api/admin${path}`, {
      method,
      headers: body === undefined || isForm ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    throw new ApiRequestError(0, 'Could not reach the server. Check your connection and try again.');
  }

  if (response.status === 401) {
    // A full navigation on purpose: it drops every piece of client state from the expired session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = '/dashboard/login?expired=1';
    throw new ApiRequestError(401, 'Your session has expired');
  }
  if (response.status === 204) return undefined as T;

  const data = (await response.json().catch(() => null)) as (ApiError & T) | null;
  if (!response.ok) {
    throw new ApiRequestError(
      response.status,
      data?.message ?? `Request failed (${response.status})`,
      data?.errors ?? [],
    );
  }
  return data as T;
}
