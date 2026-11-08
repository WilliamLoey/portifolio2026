import { Logger } from '@nestjs/common';
import { MailMessage, MailService } from '../../domain/ports';

/** Development fallback: prints the email instead of sending it. */
export class LogMailService extends MailService {
  private readonly logger = new Logger('Mail');

  async send(message: MailMessage): Promise<void> {
    this.logger.log(`To: ${message.to} · Reply-To: ${message.replyTo ?? '-'} · ${message.subject}\n${message.text}`);
  }
}
