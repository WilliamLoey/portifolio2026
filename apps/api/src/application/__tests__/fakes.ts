import type { ProjectFlagsBody } from '@portfolio/contracts';
import { ContactMessageRecord, MediaRecord, ProjectDraft, ProjectRecord, ProjectSnapshot } from '../../domain/content';
import { NotFoundError } from '../../domain/errors';
import {
  AppLogger,
  Clock,
  ContactMessageRepository,
  ContentChangeNotifier,
  MailMessage,
  MailService,
  MediaRepository,
  NewContactMessage,
  NewMedia,
  ProjectRepository,
  RateLimiter,
  StorageService,
  StoredFile,
  UploadFile,
  VersionedRepository,
} from '../../domain/ports';
import { Versioned } from '../../domain/publication';

export class FixedClock extends Clock {
  constructor(public current = new Date('2026-11-08T12:00:00Z')) {
    super();
  }
  now() {
    return new Date(this.current);
  }
  advance(ms: number) {
    this.current = new Date(this.current.getTime() + ms);
  }
}

export class RecordingNotifier extends ContentChangeNotifier {
  reasons: string[] = [];
  async contentChanged(reason: string) {
    this.reasons.push(reason);
  }
}

export class InMemoryVersionedRepository<TDraft, TSnapshot> extends VersionedRepository<TDraft, TSnapshot> {
  items: Versioned<TDraft, TSnapshot>[] = [];
  private seq = 0;

  async list() {
    return [...this.items].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  async listPublished() {
    return (await this.list()).filter((i) => i.snapshot !== null);
  }
  async findById(id: string) {
    return this.items.find((i) => i.id === id) ?? null;
  }
  async create(draft: TDraft) {
    const now = new Date();
    const item: Versioned<TDraft, TSnapshot> = {
      id: `id${++this.seq}`, draft: structuredClone(draft), snapshot: null, publishedAt: null,
      sortOrder: this.items.length, createdAt: now, updatedAt: now,
    };
    this.items.push(item);
    return item;
  }
  async update(id: string, draft: TDraft) {
    const item = this.require(id);
    item.draft = structuredClone(draft);
    item.updatedAt = new Date();
    return item;
  }
  async setPublication(id: string, snapshot: TSnapshot | null, at: Date | null) {
    const item = this.require(id);
    item.snapshot = snapshot === null ? null : structuredClone(snapshot);
    item.publishedAt = at;
    return item;
  }
  async delete(id: string) {
    this.require(id);
    this.items = this.items.filter((i) => i.id !== id);
  }
  protected require(id: string) {
    const item = this.items.find((i) => i.id === id);
    if (!item) throw new NotFoundError('not found');
    return item;
  }
}

export class InMemoryProjectRepository extends InMemoryVersionedRepository<ProjectDraft, ProjectSnapshot> implements ProjectRepository {
  async findPublishedBySlug(slug: string): Promise<ProjectRecord | null> {
    return this.items.find((i) => i.snapshot?.slug === slug) ?? null;
  }
  async setFlags(id: string, flags: ProjectFlagsBody) {
    const item = this.require(id);
    item.draft = { ...item.draft, ...flags };
    return item;
  }
  async reorder(ids: string[]) {
    ids.forEach((id, index) => {
      const item = this.items.find((i) => i.id === id);
      if (item) item.sortOrder = index;
    });
  }
}

export class InMemoryMediaRepository extends MediaRepository {
  items: MediaRecord[] = [];
  usage = new Map<string, number>();
  async list() { return this.items; }
  async findById(id: string) { return this.items.find((m) => m.id === id) ?? null; }
  async findManyByIds(ids: string[]) { return this.items.filter((m) => ids.includes(m.id)); }
  async create(data: NewMedia) {
    const record = { ...data, id: `m${this.items.length + 1}`, createdAt: new Date() };
    this.items.push(record);
    return record;
  }
  async update(id: string, data: Partial<NewMedia>) {
    const item = (await this.findById(id))!;
    Object.assign(item, data);
    return item;
  }
  async delete(id: string) { this.items = this.items.filter((m) => m.id !== id); }
  async usageCounts(ids?: string[]) {
    return new Map([...this.usage].filter(([id]) => !ids || ids.includes(id)));
  }
}

export class InMemoryContactRepository extends ContactMessageRepository {
  items: ContactMessageRecord[] = [];
  async create(data: NewContactMessage) {
    const record: ContactMessageRecord = { ...data, id: `c${this.items.length + 1}`, deliveredAt: null, readAt: null, createdAt: new Date() };
    this.items.push(record);
    return record;
  }
  async markDelivered(id: string, at: Date) { this.items.find((m) => m.id === id)!.deliveredAt = at; }
  async page({ page, pageSize }: { page: number; pageSize: number }) {
    return { items: this.items, page, pageSize, total: this.items.length, totalPages: 1 };
  }
  async setRead(id: string, readAt: Date | null) {
    const item = this.items.find((m) => m.id === id)!;
    item.readAt = readAt;
    return item;
  }
  async delete(id: string) { this.items = this.items.filter((m) => m.id !== id); }
}

export class FakeStorage extends StorageService {
  readonly provider = 'fake';
  uploaded: UploadFile[] = [];
  deleted: string[] = [];
  async upload(file: UploadFile): Promise<StoredFile> {
    this.uploaded.push(file);
    return { url: `https://cdn.test/${this.uploaded.length}.${file.extension}`, key: `key-${this.uploaded.length}` };
  }
  async delete(key: string) { this.deleted.push(key); }
}

export class FakeMail extends MailService {
  sent: MailMessage[] = [];
  shouldFail = false;
  async send(message: MailMessage) {
    if (this.shouldFail) throw new Error('SMTP down');
    this.sent.push(message);
  }
}

/** Counts hits per key like the real fixed-window limiter. */
export class CountingRateLimiter extends RateLimiter {
  hits = new Map<string, number>();
  async hit(key: string, limit: number) {
    const count = (this.hits.get(key) ?? 0) + 1;
    this.hits.set(key, count);
    return { allowed: count <= limit, retryAfterSeconds: 60 };
  }
}

export const silentLogger: AppLogger = { log: () => undefined, warn: () => undefined, error: () => undefined };

export const projectDraft = (overrides: Partial<ProjectDraft> = {}): ProjectDraft => ({
  slug: 'demo',
  categoryId: null,
  coverId: null,
  repoUrl: null,
  liveUrl: null,
  year: 2026,
  technologyIds: [],
  featured: false,
  showOnHome: true,
  translations: { en: { title: 'Demo', summary: 'Summary', body: 'Body', role: null, outcome: null } },
  ...overrides,
});

/** Smallest valid images for magic-byte detection. */
export const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);
