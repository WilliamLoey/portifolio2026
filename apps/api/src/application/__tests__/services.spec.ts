import { ContactRequest } from '@portfolio/contracts';
import { AdminUserRecord, SessionRecord } from '../../domain/content';
import { InUseError, RateLimitedError, UnauthorizedError, ValidationError } from '../../domain/errors';
import { AdminUserRepository, PasswordHasher, SessionRepository } from '../../domain/ports';
import { AuthService, hashToken, LOGIN_LIMITS } from '../auth.service';
import { CONTACT_LIMIT, ContactService } from '../contact.service';
import { compareExperience, pickTranslation } from '../localize';
import { MediaService } from '../media.service';
import {
  CountingRateLimiter,
  FakeMail,
  FakeStorage,
  FixedClock,
  InMemoryContactRepository,
  InMemoryMediaRepository,
  PNG_1X1,
  RecordingNotifier,
  silentLogger,
} from './fakes';

/* ── Contact ── */

const message = (overrides: Partial<ContactRequest> = {}): ContactRequest => ({
  name: 'Ana',
  email: 'ana@example.com',
  subject: 'Hello',
  message: 'A message long enough for the form.',
  locale: 'pt-BR',
  startedAt: Date.parse('2026-11-08T11:59:00Z'),
  ...overrides,
});

function contactSetup() {
  const repo = new InMemoryContactRepository();
  const mail = new FakeMail();
  const limiter = new CountingRateLimiter();
  const service = new ContactService(repo, mail, limiter, new FixedClock(), silentLogger, 'owner@example.com');
  return { repo, mail, limiter, service };
}

describe('ContactService', () => {
  it('stores the message and emails the owner with Reply-To set to the sender', async () => {
    const { repo, mail, service } = contactSetup();
    await expect(service.send(message(), 'ip1')).resolves.toBe('delivered');
    expect(repo.items[0]!.deliveredAt).not.toBeNull();
    expect(mail.sent[0]).toMatchObject({ to: 'owner@example.com', replyTo: 'ana@example.com' });
  });

  it('keeps the message when email delivery fails', async () => {
    const { repo, mail, service } = contactSetup();
    mail.shouldFail = true;
    await expect(service.send(message(), 'ip1')).resolves.toBe('stored');
    expect(repo.items).toHaveLength(1);
    expect(repo.items[0]!.deliveredAt).toBeNull();
  });

  it.each([
    ['the honeypot is filled', { website: 'https://spam.example' }],
    ['the form was submitted faster than a person types', { startedAt: Date.parse('2026-11-08T11:59:59Z') }],
  ])('silently drops submissions when %s', async (_case, overrides) => {
    const { repo, mail, service } = contactSetup();
    await expect(service.send(message(overrides), 'ip1')).resolves.toBe('dropped');
    expect(repo.items).toHaveLength(0);
    expect(mail.sent).toHaveLength(0);
  });

  it('limits messages per visitor', async () => {
    const { service } = contactSetup();
    for (let i = 0; i < CONTACT_LIMIT.max; i++) await service.send(message(), 'ip1');
    await expect(service.send(message(), 'ip1')).rejects.toBeInstanceOf(RateLimitedError);
    await expect(service.send(message(), 'ip2')).resolves.toBe('delivered');
  });

  it('strips line breaks from the email subject (header injection)', async () => {
    const { mail, service } = contactSetup();
    await service.send(message({ subject: 'Hi\r\nBcc: victim@example.com' }), 'ip1');
    expect(mail.sent[0]!.subject).not.toMatch(/[\r\n]/);
  });
});

/* ── Auth ── */

class PlainHasher extends PasswordHasher {
  async hash(p: string) { return `hashed:${p}`; }
  async verify(h: string, p: string) { return h === `hashed:${p}`; }
}

class MemoryUsers extends AdminUserRepository {
  users: AdminUserRecord[] = [];
  async findByEmail(email: string) { return this.users.find((u) => u.email === email) ?? null; }
  async findById(id: string) { return this.users.find((u) => u.id === id) ?? null; }
  async create(data: Omit<AdminUserRecord, 'id'>) { const u = { ...data, id: `u${this.users.length + 1}` }; this.users.push(u); return u; }
  async updatePassword(id: string, passwordHash: string) { this.users.find((u) => u.id === id)!.passwordHash = passwordHash; }
  async touchLogin() {}
}

class MemorySessions extends SessionRepository {
  sessions: (SessionRecord & { tokenHash: string })[] = [];
  constructor(private readonly users: MemoryUsers) { super(); }
  async create(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    const user = (await this.users.findById(data.userId))!;
    const s = { id: `s${this.sessions.length + 1}`, userId: data.userId, tokenHash: data.tokenHash, expiresAt: data.expiresAt, lastSeenAt: new Date(0), user };
    this.sessions.push(s);
    return s;
  }
  async findByTokenHash(tokenHash: string) { return this.sessions.find((s) => s.tokenHash === tokenHash) ?? null; }
  async touch(id: string, at: Date) { this.sessions.find((s) => s.id === id)!.lastSeenAt = at; }
  async delete(id: string) { this.sessions = this.sessions.filter((s) => s.id !== id); }
  async deleteForUser(userId: string, except?: string) { this.sessions = this.sessions.filter((s) => s.userId !== userId || s.id === except); }
  async deleteExpired() { return 0; }
}

function authSetup() {
  const users = new MemoryUsers();
  const sessions = new MemorySessions(users);
  const clock = new FixedClock();
  const limiter = new CountingRateLimiter();
  const auth = new AuthService(users, sessions, new PlainHasher(), limiter, clock, 24);
  return { users, sessions, clock, auth };
}

const meta = { ipHash: 'ip', userAgent: 'jest' };

describe('AuthService', () => {
  it('creates a session and stores only a hash of the token', async () => {
    const { auth, sessions } = authSetup();
    await auth.createAdmin('Me@Example.com', 'Me', 'a-long-password!');
    const { token } = await auth.login('me@example.com', 'a-long-password!', meta);
    expect(sessions.sessions[0]!.tokenHash).toBe(hashToken(token));
    expect(sessions.sessions[0]!.tokenHash).not.toContain(token);
    await expect(auth.authenticate(token)).resolves.toMatchObject({ user: { email: 'me@example.com' } });
  });

  it('gives the same error for unknown emails and wrong passwords', async () => {
    const { auth } = authSetup();
    await auth.createAdmin('me@example.com', 'Me', 'a-long-password!');
    await expect(auth.login('me@example.com', 'nope', meta)).rejects.toThrow('Incorrect email or password');
    await expect(auth.login('other@example.com', 'nope', meta)).rejects.toThrow('Incorrect email or password');
  });

  it('rejects expired sessions and revoked ones', async () => {
    const { auth, clock } = authSetup();
    await auth.createAdmin('me@example.com', 'Me', 'a-long-password!');
    const first = await auth.login('me@example.com', 'a-long-password!', meta);
    await auth.logout(first.session.id);
    await expect(auth.authenticate(first.token)).rejects.toBeInstanceOf(UnauthorizedError);

    const second = await auth.login('me@example.com', 'a-long-password!', meta);
    clock.advance(25 * 3_600_000);
    await expect(auth.authenticate(second.token)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('signs out other devices when the password changes', async () => {
    const { auth } = authSetup();
    await auth.createAdmin('me@example.com', 'Me', 'a-long-password!');
    const laptop = await auth.login('me@example.com', 'a-long-password!', meta);
    const phone = await auth.login('me@example.com', 'a-long-password!', { ...meta, ipHash: 'ip2' });

    await expect(auth.changePassword(laptop.session, 'wrong', 'another-long-password')).rejects.toBeInstanceOf(ValidationError);
    await auth.changePassword(laptop.session, 'a-long-password!', 'another-long-password');

    await expect(auth.authenticate(laptop.token)).resolves.toBeDefined();
    await expect(auth.authenticate(phone.token)).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(auth.login('me@example.com', 'another-long-password', { ...meta, ipHash: 'ip3' })).resolves.toBeDefined();
  });

  it('rate limits sign-in attempts per IP', async () => {
    const { auth } = authSetup();
    for (let i = 0; i < LOGIN_LIMITS.perIp.max; i++) {
      await expect(auth.login('x@example.com', 'bad', meta)).rejects.toBeInstanceOf(UnauthorizedError);
    }
    await expect(auth.login('x@example.com', 'bad', meta)).rejects.toBeInstanceOf(RateLimitedError);
  });

  it('refuses short passwords for new admins', async () => {
    const { auth } = authSetup();
    await expect(auth.createAdmin('me@example.com', 'Me', 'short')).rejects.toBeInstanceOf(ValidationError);
  });
});

/* ── Media ── */

function mediaSetup() {
  const repo = new InMemoryMediaRepository();
  const storage = new FakeStorage();
  const notifier = new RecordingNotifier();
  const service = new MediaService(repo, storage, notifier, silentLogger, 1024 * 1024);
  return { repo, storage, notifier, service };
}

describe('MediaService', () => {
  it('detects the real type and dimensions from the bytes', async () => {
    const { service, storage } = mediaSetup();
    const media = await service.upload(PNG_1X1);
    expect(media).toMatchObject({ mimeType: 'image/png', width: 1, height: 1, usage: 0 });
    expect(storage.uploaded[0]!.extension).toBe('png');
  });

  it.each([
    ['an SVG (can carry scripts)', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')],
    ['a renamed text file', Buffer.from('hello world')],
    ['an empty file', Buffer.alloc(0)],
  ])('rejects %s', async (_case, buffer) => {
    const { service } = mediaSetup();
    await expect(service.upload(buffer)).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects files over the size limit', async () => {
    const { service } = mediaSetup();
    const big = Buffer.concat([PNG_1X1, Buffer.alloc(2 * 1024 * 1024)]);
    await expect(service.upload(big)).rejects.toThrow('1 MB or smaller');
  });

  it('replaces the file, deletes the old one and refreshes pages using it', async () => {
    const { service, repo, storage, notifier } = mediaSetup();
    const media = await service.upload(PNG_1X1);
    repo.usage.set(media.id, 1);
    const replaced = await service.replace(media.id, PNG_1X1);
    expect(replaced.id).toBe(media.id);
    expect(replaced.url).not.toBe(media.url);
    expect(storage.deleted).toEqual(['key-1']);
    expect(notifier.reasons).toEqual(['Image replaced']);
  });

  it('refuses to delete images still in use', async () => {
    const { service, repo } = mediaSetup();
    const media = await service.upload(PNG_1X1);
    repo.usage.set(media.id, 2);
    await expect(service.delete(media.id)).rejects.toBeInstanceOf(InUseError);
    repo.usage.set(media.id, 0);
    await service.delete(media.id);
    expect(repo.items).toHaveLength(0);
  });
});

/* ── Localisation ── */

describe('localisation helpers', () => {
  it('falls back to English, then to any language', () => {
    expect(pickTranslation({ en: 'Hi', fr: 'Salut' }, 'fr')).toEqual({ value: 'Salut', locale: 'fr' });
    expect(pickTranslation({ en: 'Hi' }, 'nl')).toEqual({ value: 'Hi', locale: 'en' });
    expect(pickTranslation({ es: 'Hola' }, 'nl')).toEqual({ value: 'Hola', locale: 'es' });
  });

  it('lists current roles first, then by start date', () => {
    const base = { company: 'X', companyUrl: null, location: null, employmentType: 'full_time' as const, translations: {} };
    const items = [
      { ...base, startDate: '2020-01', endDate: '2021-01' },
      { ...base, startDate: '2019-01', endDate: null },
      { ...base, startDate: '2022-01', endDate: '2023-01' },
    ];
    expect(items.sort(compareExperience).map((i) => i.startDate)).toEqual(['2019-01', '2022-01', '2020-01']);
  });
});
