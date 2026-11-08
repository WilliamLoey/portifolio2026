import { createHmac } from 'node:crypto';
import { AppLogger, ContentChangeNotifier } from '../../domain/ports';

/**
 * Calls the website's /api/revalidate route after published content changes.
 * The body is signed with HMAC-SHA256 and timestamped, so the route can reject
 * forged or replayed calls. Failures are logged, never thrown: the edit is saved
 * either way and the pages also expire on their own.
 */
export class HttpRevalidationNotifier extends ContentChangeNotifier {
  constructor(
    private readonly url: string,
    private readonly secret: string,
    private readonly logger: AppLogger,
    private readonly timeoutMs = 4_000,
  ) {
    super();
  }

  async contentChanged(reason: string): Promise<void> {
    const body = JSON.stringify({ reason, timestamp: Date.now() });
    const signature = createHmac('sha256', this.secret).update(body).digest('hex');
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-signature': signature },
        body,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!response.ok) this.logger.warn(`Revalidation returned ${response.status} (${reason})`);
    } catch (error) {
      this.logger.warn(`Revalidation failed (${reason}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/** Used when WEB_REVALIDATE_URL is not configured (local development, tests). */
export class NoopNotifier extends ContentChangeNotifier {
  async contentChanged(): Promise<void> {}
}
