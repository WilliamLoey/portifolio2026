import { ContactMessageRecord } from '../domain/content';
import { MailMessage } from '../domain/ports';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Strips CR/LF so user input can never inject extra mail headers. */
const singleLine = (value: string) => value.replace(/[\r\n]+/g, ' ').trim();

export function buildOwnerNotification(message: ContactMessageRecord, to: string): MailMessage {
  const subject = singleLine(`[Portfolio] ${message.subject}`).slice(0, 200);

  const text = [
    `Name: ${message.name}`,
    `Email: ${message.email}`,
    `Language: ${message.locale.toUpperCase()}`,
    `Received: ${message.createdAt.toISOString()}`,
    '',
    message.message,
  ].join('\n');

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:auto;color:#16171a">
    <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b6c66;margin:0 0 8px">Portfolio · contact form</p>
    <h2 style="margin:0 0 16px;font-size:20px">${escapeHtml(message.subject)}</h2>
    <table style="font-size:14px;border-collapse:collapse;margin-bottom:16px">
      <tr><td style="padding:2px 12px 2px 0;color:#6b6c66">Name</td><td>${escapeHtml(message.name)}</td></tr>
      <tr><td style="padding:2px 12px 2px 0;color:#6b6c66">Email</td><td><a href="mailto:${escapeHtml(message.email)}">${escapeHtml(message.email)}</a></td></tr>
      <tr><td style="padding:2px 12px 2px 0;color:#6b6c66">Language</td><td>${message.locale.toUpperCase()}</td></tr>
    </table>
    <div style="white-space:pre-wrap;font-size:15px;line-height:1.6;border-left:3px solid #1452c2;padding-left:12px">${escapeHtml(message.message)}</div>
    <p style="font-size:12px;color:#6b6c66;margin-top:24px">Reply directly to this email to answer ${escapeHtml(message.name)}.</p>
  </div>`;

  return { to, subject, text, html, replyTo: singleLine(message.email) };
}
