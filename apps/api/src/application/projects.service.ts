import type { ProjectFlagsBody } from '@portfolio/contracts';
import { ProjectDraft, ProjectRecord, ProjectSnapshot, toProjectSnapshot } from '../domain/content';
import { ConflictError } from '../domain/errors';
import { Clock, ContentChangeNotifier, ProjectRepository } from '../domain/ports';
import { PublishingService } from './publishing.service';

export class ProjectsService extends PublishingService<ProjectDraft, ProjectSnapshot> {
  constructor(
    private readonly projects: ProjectRepository,
    notifier: ContentChangeNotifier,
    clock: Clock,
  ) {
    super(projects, toProjectSnapshot, notifier, clock, 'Project');
  }

  /** Featured / home visibility are layout switches: they apply to the live site at once. */
  async setFlags(id: string, flags: ProjectFlagsBody): Promise<ProjectRecord> {
    const item = await this.get(id);
    const updated = await this.projects.setFlags(id, flags);
    if (item.snapshot !== null) await this.notifier.contentChanged('Project flags changed');
    return updated;
  }

  async reorder(ids: string[]): Promise<void> {
    await this.projects.reorder(ids);
    await this.notifier.contentChanged('Projects reordered');
  }

  /**
   * Draft slugs are unique, but a published snapshot keeps its old slug until republished.
   * Publishing must not create two public pages with the same URL.
   */
  protected override async beforePublish(item: ProjectRecord, snapshot: ProjectSnapshot): Promise<void> {
    const other = await this.projects.findPublishedBySlug(snapshot.slug);
    if (other && other.id !== item.id) {
      throw new ConflictError(
        `Another published project still uses the URL "${snapshot.slug}". Republish or unpublish it first.`,
      );
    }
  }
}
