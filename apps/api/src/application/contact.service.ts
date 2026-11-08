import type { ContactRequest, MessagesQuery, Paginated } from '@portfolio/contracts';
import { ContactMessageRecord } from '../domain/content';
import { RateLimitedError } from '../domain/errors';
import { AppLogger, Clock, ContactMessageRepository, MailService, RateLimiter } from '../domain/ports';
import { buildOwnerNotification } from './contact-email.template';

/** A person needs more than this to read the form and type a message. */
export const MIN_FILL_TIME_MS = 3_000;
export const CONTACT_LIMIT = { max: 3, windowSeconds: 10 * 60 };

export type ContactOutcome = 'delivered' | 'stored' | 'dropped';

export class ContactService {
  constructor(
    private readonly messages: ContactMessageRepository,
    private readonly mail: MailService,
    private readonly rateLimiter: RateLimiter,
    private readonly clock: Clock,
    private readonly logger: AppLogger,
    private readonly ownerEmail: string,
  ) {}

  /**
   * Persists every genuine message first (nothing is lost if email delivery fails),
   * then forwards it to the owner's inbox with Reply-To set to the sender.
   * Bot submissions are dropped silently so bots get no signal to adapt to.
   */
  async send(input: ContactRequest, ipHash: string | null): Promise<ContactOutcome> {
    if (this.looksAutomated(input)) {
      this.logger.warn('Contact submission dropped by spam checks');
      return 'dropped';
    }

    const limit = await this.rateLimiter.hit(
      `contact:${ipHash ?? 'unknown'}`,
      CONTACT_LIMIT.max,
      CONTACT_LIMIT.windowSeconds,
    );
    if (!limit.allowed) {
      throw new RateLimitedError('Too many messages. Please try again later.', limit.retryAfterSeconds);
    }

    const saved = await this.messages.create({
      name: input.name,
      email: input.email,
      subject: input.subject,
      message: input.message,
      locale: input.locale,
      ipHash,
    });

    try {
      await this.mail.send(buildOwnerNotification(saved, this.ownerEmail));
      await this.messages.markDelivered(saved.id, this.clock.now());
      return 'delivered';
    } catch (error) {
      this.logger.error(
        `Contact message ${saved.id} saved but email delivery failed`,
        error instanceof Error ? error.stack : String(error),
      );
      return 'stored';
    }
  }

  page(query: MessagesQuery): Promise<Paginated<ContactMessageRecord>> {
    return this.messages.page({ page: query.page, pageSize: query.pageSize, unreadOnly: query.filter === 'unread' });
  }

  markRead(id: string, read: boolean): Promise<ContactMessageRecord> {
    return this.messages.setRead(id, read ? this.clock.now() : null);
  }

  delete(id: string): Promise<void> {
    return this.messages.delete(id);
  }

  private looksAutomated(input: ContactRequest): boolean {
    if (input.website && input.website.trim() !== '') return true;
    if (input.startedAt !== undefined) {
      const elapsed = this.clock.now().getTime() - input.startedAt;
      if (elapsed < MIN_FILL_TIME_MS) return true;
    }
    return false;
  }
}
