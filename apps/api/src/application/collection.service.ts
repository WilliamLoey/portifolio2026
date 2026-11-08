import { NotFoundError } from '../domain/errors';
import { CollectionRepository, ContentChangeNotifier } from '../domain/ports';

/**
 * Reference data (technologies, categories, certifications, social links) has no draft:
 * it is small, rarely edited, and every change applies to the site immediately.
 */
export class CollectionService<TInput, TRecord extends { id: string }> {
  constructor(
    private readonly repo: CollectionRepository<TInput, TRecord>,
    private readonly notifier: ContentChangeNotifier,
    private readonly label: string,
  ) {}

  list(): Promise<TRecord[]> {
    return this.repo.list();
  }

  async create(input: TInput): Promise<TRecord> {
    const created = await this.repo.create(input);
    await this.notifier.contentChanged(`${this.label} created`);
    return created;
  }

  async update(id: string, input: TInput): Promise<TRecord> {
    await this.getOrFail(id);
    const updated = await this.repo.update(id, input);
    await this.notifier.contentChanged(`${this.label} updated`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.getOrFail(id);
    await this.repo.delete(id);
    await this.notifier.contentChanged(`${this.label} deleted`);
  }

  async reorder(ids: string[]): Promise<void> {
    await this.repo.reorder(ids);
    await this.notifier.contentChanged(`${this.label} reordered`);
  }

  private async getOrFail(id: string): Promise<TRecord> {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundError(`${this.label} not found`);
    return item;
  }
}
