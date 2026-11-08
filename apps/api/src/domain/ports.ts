/*
 * Ports: the application layer depends on these abstractions, never on Prisma,
 * Cloudinary or SMTP. Abstract classes (instead of interfaces) double as Nest DI tokens.
 */
import type {
  CategoryInput,
  CertificationInput,
  Locale,
  Overview,
  Paginated,
  ProjectFlagsBody,
  SocialLinkInput,
  TechnologyInput,
} from '@portfolio/contracts';
import type {
  AdminUserRecord,
  CategoryRecord,
  CertificationRecord,
  ContactMessageRecord,
  EducationDraft,
  ExperienceDraft,
  MediaRecord,
  ProfileDraft,
  ProfileRecord,
  ProfileSnapshot,
  ProjectDraft,
  ProjectRecord,
  ProjectSnapshot,
  SessionRecord,
  SocialLinkRecord,
  TechnologyRecord,
} from './content';
import type { Versioned } from './publication';

/* ── Publishable content ── */

export abstract class VersionedRepository<TDraft, TSnapshot> {
  /** Every item, in display order. */
  abstract list(): Promise<Versioned<TDraft, TSnapshot>[]>;
  /** Items with a snapshot, in display order. */
  abstract listPublished(): Promise<Versioned<TDraft, TSnapshot>[]>;
  abstract findById(id: string): Promise<Versioned<TDraft, TSnapshot> | null>;
  abstract create(draft: TDraft): Promise<Versioned<TDraft, TSnapshot>>;
  abstract update(id: string, draft: TDraft): Promise<Versioned<TDraft, TSnapshot>>;
  /** snapshot = null unpublishes. */
  abstract setPublication(id: string, snapshot: TSnapshot | null, at: Date | null): Promise<Versioned<TDraft, TSnapshot>>;
  abstract delete(id: string): Promise<void>;
}

export abstract class ProjectRepository extends VersionedRepository<ProjectDraft, ProjectSnapshot> {
  /** Matches the published slug, which can differ from the draft slug until the next publish. */
  abstract findPublishedBySlug(slug: string): Promise<ProjectRecord | null>;
  abstract setFlags(id: string, flags: ProjectFlagsBody): Promise<ProjectRecord>;
  abstract reorder(ids: string[]): Promise<void>;
}

export abstract class ExperienceRepository extends VersionedRepository<ExperienceDraft, ExperienceDraft> {}
export abstract class EducationRepository extends VersionedRepository<EducationDraft, EducationDraft> {}

export abstract class ProfileRepository {
  abstract get(): Promise<ProfileRecord | null>;
  abstract save(draft: ProfileDraft): Promise<ProfileRecord>;
  abstract setPublication(snapshot: ProfileSnapshot | null, at: Date | null): Promise<ProfileRecord>;
}

/* ── Reference data ── */

export abstract class CollectionRepository<TInput, TRecord extends { id: string }> {
  abstract list(): Promise<TRecord[]>;
  abstract findById(id: string): Promise<TRecord | null>;
  abstract create(input: TInput): Promise<TRecord>;
  abstract update(id: string, input: TInput): Promise<TRecord>;
  abstract delete(id: string): Promise<void>;
  abstract reorder(ids: string[]): Promise<void>;
}


export abstract class TechnologyRepository extends CollectionRepository<TechnologyInput, TechnologyRecord> {}
export abstract class CategoryRepository extends CollectionRepository<CategoryInput, CategoryRecord> {}
export abstract class CertificationRepository extends CollectionRepository<CertificationInput, CertificationRecord> {}
export abstract class SocialLinkRepository extends CollectionRepository<SocialLinkInput, SocialLinkRecord> {}

/* ── Media ── */

export type NewMedia = Omit<MediaRecord, 'id' | 'createdAt'>;

export abstract class MediaRepository {
  abstract list(): Promise<MediaRecord[]>;
  abstract findById(id: string): Promise<MediaRecord | null>;
  abstract findManyByIds(ids: string[]): Promise<MediaRecord[]>;
  abstract create(data: NewMedia): Promise<MediaRecord>;
  abstract update(id: string, data: Partial<NewMedia>): Promise<MediaRecord>;
  abstract delete(id: string): Promise<void>;
  /** References from drafts and published snapshots (profile photo, project covers). */
  abstract usageCounts(ids?: string[]): Promise<Map<string, number>>;
}

/* ── Contact ── */

export type NewContactMessage = Pick<ContactMessageRecord, 'name' | 'email' | 'subject' | 'message' | 'locale' | 'ipHash'>;

export abstract class ContactMessageRepository {
  abstract create(data: NewContactMessage): Promise<ContactMessageRecord>;
  abstract markDelivered(id: string, at: Date): Promise<void>;
  abstract page(query: { page: number; pageSize: number; unreadOnly: boolean }): Promise<Paginated<ContactMessageRecord>>;
  abstract setRead(id: string, readAt: Date | null): Promise<ContactMessageRecord>;
  abstract delete(id: string): Promise<void>;
}

/* ── Auth ── */

export abstract class AdminUserRepository {
  abstract findByEmail(email: string): Promise<AdminUserRecord | null>;
  abstract findById(id: string): Promise<AdminUserRecord | null>;
  abstract create(data: Omit<AdminUserRecord, 'id'>): Promise<AdminUserRecord>;
  abstract updatePassword(id: string, passwordHash: string): Promise<void>;
  abstract touchLogin(id: string, at: Date): Promise<void>;
}

export abstract class SessionRepository {
  abstract create(data: { userId: string; tokenHash: string; expiresAt: Date; ipHash: string | null; userAgent: string | null }): Promise<SessionRecord>;
  abstract findByTokenHash(tokenHash: string): Promise<SessionRecord | null>;
  abstract touch(id: string, at: Date): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract deleteForUser(userId: string, exceptSessionId?: string): Promise<void>;
  abstract deleteExpired(now: Date): Promise<number>;
}

/* ── Dashboard read model ── */

export abstract class DashboardQueries {
  abstract overview(now: Date): Promise<Omit<Overview, 'projects' | 'translations'>>;
}

/* ── Services ── */

export interface UploadFile {
  buffer: Buffer;
  /** Detected from the file's magic bytes, never trusted from the client. */
  mimeType: string;
  extension: string;
}

export interface StoredFile {
  url: string;
  key: string;
}

export abstract class StorageService {
  abstract readonly provider: string;
  abstract upload(file: UploadFile): Promise<StoredFile>;
  abstract delete(key: string): Promise<void>;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export abstract class MailService {
  abstract send(message: MailMessage): Promise<void>;
}

export abstract class PasswordHasher {
  abstract hash(plain: string): Promise<string>;
  abstract verify(hash: string, plain: string): Promise<boolean>;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** Shared across serverless instances (backed by PostgreSQL). */
export abstract class RateLimiter {
  abstract hit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult>;
}

/** Tells the website that published content changed, so cached pages are rebuilt. */
export abstract class ContentChangeNotifier {
  abstract contentChanged(reason: string): Promise<void>;
}

export interface AppLogger {
  log(message: string): void;
  warn(message: string): void;
  error(message: string, trace?: string): void;
}

export abstract class Clock {
  abstract now(): Date;
}

export type { Locale };
