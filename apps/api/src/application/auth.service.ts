import { createHash, randomBytes } from 'node:crypto';
import { AdminUserRecord, SessionRecord } from '../domain/content';
import { ConflictError, RateLimitedError, UnauthorizedError, ValidationError } from '../domain/errors';
import { AdminUserRepository, Clock, PasswordHasher, RateLimiter, SessionRepository } from '../domain/ports';

export const LOGIN_LIMITS = {
  perIp: { max: 5, windowSeconds: 60 },
  perAccount: { max: 10, windowSeconds: 15 * 60 },
};

/** Sessions are extended at most once per this interval, to avoid a write on every request. */
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

export interface LoginResult {
  token: string;
  session: SessionRecord;
}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/**
 * Opaque, server-side sessions instead of JWTs: logging out or changing the password
 * revokes access immediately, and only a hash of each token is stored.
 */
export class AuthService {
  /** Compared against when the email is unknown, so response time doesn't reveal which emails exist. */
  private dummyHash: Promise<string> | null = null;

  constructor(
    private readonly users: AdminUserRepository,
    private readonly sessions: SessionRepository,
    private readonly hasher: PasswordHasher,
    private readonly rateLimiter: RateLimiter,
    private readonly clock: Clock,
    private readonly sessionTtlHours: number,
  ) {}

  async login(
    email: string,
    password: string,
    meta: { ipHash: string | null; userAgent: string | null },
  ): Promise<LoginResult> {
    const normalizedEmail = email.trim().toLowerCase();
    await this.enforce(`login-ip:${meta.ipHash ?? 'unknown'}`, LOGIN_LIMITS.perIp);
    await this.enforce(`login-account:${normalizedEmail}`, LOGIN_LIMITS.perAccount);

    const user = await this.users.findByEmail(normalizedEmail);
    const valid = user
      ? await this.hasher.verify(user.passwordHash, password)
      : (await this.hasher.verify(await this.getDummyHash(), password), false);
    if (!user || !valid) throw new UnauthorizedError('Incorrect email or password');

    const token = randomBytes(32).toString('base64url');
    const now = this.clock.now();
    const session = await this.sessions.create({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(now.getTime() + this.sessionTtlHours * 3_600_000),
      ipHash: meta.ipHash,
      userAgent: meta.userAgent?.slice(0, 300) ?? null,
    });
    await this.users.touchLogin(user.id, now);
    return { token, session };
  }

  async authenticate(token: string): Promise<SessionRecord> {
    const session = await this.sessions.findByTokenHash(hashToken(token));
    const now = this.clock.now();
    if (!session || session.expiresAt <= now) throw new UnauthorizedError('Your session has expired');

    if (now.getTime() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
      await this.sessions.touch(session.id, now);
    }
    return session;
  }

  logout(sessionId: string): Promise<void> {
    return this.sessions.delete(sessionId);
  }

  /** Changes the password and signs out every other device. */
  async changePassword(session: SessionRecord, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.users.findById(session.userId);
    if (!user || !(await this.hasher.verify(user.passwordHash, currentPassword))) {
      throw new ValidationError('The current password is incorrect');
    }
    await this.users.updatePassword(user.id, await this.hasher.hash(newPassword));
    await this.sessions.deleteForUser(user.id, session.id);
  }

  async createAdmin(email: string, name: string, password: string): Promise<AdminUserRecord> {
    const normalizedEmail = email.trim().toLowerCase();
    if (password.length < 12) throw new ValidationError('Use a password of at least 12 characters');
    if (await this.users.findByEmail(normalizedEmail)) throw new ConflictError(`${normalizedEmail} already exists`);
    return this.users.create({ email: normalizedEmail, name, passwordHash: await this.hasher.hash(password) });
  }

  purgeExpiredSessions(): Promise<number> {
    return this.sessions.deleteExpired(this.clock.now());
  }

  private async enforce(key: string, limit: { max: number; windowSeconds: number }): Promise<void> {
    const result = await this.rateLimiter.hit(key, limit.max, limit.windowSeconds);
    if (!result.allowed) {
      throw new RateLimitedError('Too many sign-in attempts. Wait a moment and try again.', result.retryAfterSeconds);
    }
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.hasher.hash(randomBytes(16).toString('hex'));
    return this.dummyHash;
  }
}
