import { MailMessage, MailService } from '../../domain/ports';

/** Resend over its HTTP API — no SDK needed for a single endpoint. */
export class ResendMailService extends MailService {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {
    super();
  }

  async send(message: MailMessage): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
        reply_to: message.replyTo,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      // The body names the problem (unverified domain, bad key) without echoing the key.
      throw new Error(`Resend responded ${response.status}: ${(await response.text()).slice(0, 300)}`);
    }
  }
}
