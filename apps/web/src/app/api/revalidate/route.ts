import { createHmac, timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { CONTENT_TAG } from '@/lib/content.server';
import { serverEnv } from '@/lib/env.server';

const MAX_SKEW_MS = 5 * 60 * 1000;

/**
 * Called by the API after published content changes.
 * Body: { reason, timestamp }. Header x-signature = HMAC-SHA256(body, REVALIDATE_SECRET).
 * Old timestamps are rejected so a captured request cannot be replayed later.
 */
export async function POST(request: NextRequest) {
  const secret = serverEnv().REVALIDATE_SECRET;
  if (!secret) return NextResponse.json({ message: 'Revalidation is not configured' }, { status: 501 });

  const body = await request.text();
  const signature = request.headers.get('x-signature') ?? '';
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  const valid =
    signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) return NextResponse.json({ message: 'Invalid signature' }, { status: 401 });

  const { timestamp, reason } = JSON.parse(body) as { timestamp?: number; reason?: string };
  if (typeof timestamp !== 'number' || Math.abs(Date.now() - timestamp) > MAX_SKEW_MS) {
    return NextResponse.json({ message: 'Stale request' }, { status: 401 });
  }

  revalidateTag(CONTENT_TAG);
  return NextResponse.json({ revalidated: true, reason: reason ?? null });
}
