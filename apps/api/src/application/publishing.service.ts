import { NotFoundError } from '../domain/errors';
import { Clock, ContentChangeNotifier, VersionedRepository } from '../domain/ports';
import { Versioned } from '../domain/publication';

/**
 * Draft → publish workflow shared by projects, experience and education.
 * Saving only touches the draft; visitors see a change after `publish`.
 */
export class PublishingService<TDraft, TSnapshot> {
  constructor(
    protected readonly repo: VersionedRepository<TDraft, TSnapshot>,
    readonly toSnapshot: (draft: TDraft) => TSnapshot,
    protected readonly notifier: ContentChangeNotifier,
    protected readonly clock: Clock,
    protected readonly label: string,
  ) {}

  list(): Promise<Versioned<TDraft, TSnapshot>[]> {
    return this.repo.list();
  }

  async get(id: string): Promise<Versioned<TDraft, TSnapshot>> {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundError(`${this.label} not found`);
    return item;
  }

  create(draft: TDraft): Promise<Versioned<TDraft, TSnapshot>> {
    return this.repo.create(draft);
  }

  async update(id: string, draft: TDraft): Promise<Versioned<TDraft, TSnapshot>> {
    await this.get(id);
    return this.repo.update(id, draft);
  }

  async publish(id: string): Promise<Versioned<TDraft, TSnapshot>> {
    const item = await this.get(id);
    const snapshot = this.toSnapshot(item.draft);
    await this.beforePublish(item, snapshot);
    const published = await this.repo.setPublication(id, snapshot, this.clock.now());
    await this.notifier.contentChanged(`${this.label} published`);
    return published;
  }

  async unpublish(id: string): Promise<Versioned<TDraft, TSnapshot>> {
    const item = await this.get(id);
    if (item.snapshot === null) return item;
    const result = await this.repo.setPublication(id, null, null);
    await this.notifier.contentChanged(`${this.label} unpublished`);
    return result;
  }

  async delete(id: string): Promise<void> {
    const item = await this.get(id);
    await this.repo.delete(id);
    if (item.snapshot !== null) await this.notifier.contentChanged(`${this.label} deleted`);
  }

  /** Hook for cross-item rules checked at publish time. */
  protected async beforePublish(_item: Versioned<TDraft, TSnapshot>, _snapshot: TSnapshot): Promise<void> {}
}
