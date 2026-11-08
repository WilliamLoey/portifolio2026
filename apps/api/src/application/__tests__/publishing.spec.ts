import { ConflictError, NotFoundError } from '../../domain/errors';
import { describePublication, stableStringify } from '../../domain/publication';
import { toProjectSnapshot } from '../../domain/content';
import { ProjectsService } from '../projects.service';
import { FixedClock, InMemoryProjectRepository, projectDraft, RecordingNotifier } from './fakes';

function setup() {
  const repo = new InMemoryProjectRepository();
  const notifier = new RecordingNotifier();
  const clock = new FixedClock();
  return { repo, notifier, clock, service: new ProjectsService(repo, notifier, clock) };
}

describe('draft → publish workflow', () => {
  it('creates projects as drafts that visitors cannot see', async () => {
    const { service, repo } = setup();
    const project = await service.create(projectDraft());
    expect(describePublication(project, toProjectSnapshot).status).toBe('draft');
    expect(await repo.listPublished()).toHaveLength(0);
  });

  it('publishes a snapshot and tells the website to rebuild', async () => {
    const { service, repo, notifier, clock } = setup();
    const { id } = await service.create(projectDraft());
    const published = await service.publish(id);

    expect(published.publishedAt).toEqual(clock.now());
    expect(describePublication(published, toProjectSnapshot).status).toBe('published');
    expect(await repo.listPublished()).toHaveLength(1);
    expect(notifier.reasons).toEqual(['Project published']);
  });

  it('keeps visitors on the published version while the draft changes', async () => {
    const { service, repo, notifier } = setup();
    const { id } = await service.create(projectDraft());
    await service.publish(id);

    const edited = projectDraft({
      translations: { en: { title: 'New title', summary: 'S', body: 'B', role: null, outcome: null } },
    });
    const updated = await service.update(id, edited);

    expect(describePublication(updated, toProjectSnapshot).status).toBe('changed');
    const [live] = await repo.listPublished();
    expect(live!.snapshot!.translations.en!.title).toBe('Demo');
    expect(notifier.reasons).toEqual(['Project published']); // saving a draft never touches the live site
  });

  it('does not count layout flags as unpublished content changes', async () => {
    const { service } = setup();
    const { id } = await service.create(projectDraft());
    await service.publish(id);
    const flagged = await service.setFlags(id, { featured: true });
    expect(describePublication(flagged, toProjectSnapshot).status).toBe('published');
  });

  it('unpublishes and notifies, and is a no-op for drafts', async () => {
    const { service, repo, notifier } = setup();
    const { id } = await service.create(projectDraft());
    await service.unpublish(id);
    expect(notifier.reasons).toEqual([]);

    await service.publish(id);
    await service.unpublish(id);
    expect(await repo.listPublished()).toHaveLength(0);
    expect(notifier.reasons).toEqual(['Project published', 'Project unpublished']);
  });

  it('refuses to publish two live projects on the same URL', async () => {
    const { service } = setup();
    const a = await service.create(projectDraft({ slug: 'shared' }));
    await service.publish(a.id);
    // A's draft moves away, but its snapshot still owns /shared until republished.
    await service.update(a.id, projectDraft({ slug: 'renamed' }));
    const b = await service.create(projectDraft({ slug: 'shared' }));

    await expect(service.publish(b.id)).rejects.toBeInstanceOf(ConflictError);
    await service.publish(a.id);
    await expect(service.publish(b.id)).resolves.toBeDefined();
  });

  it('reports unknown ids as not found', async () => {
    const { service } = setup();
    await expect(service.publish('missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('stableStringify', () => {
  it('ignores key order and undefined values', () => {
    expect(stableStringify({ b: 1, a: [1, { d: 2, c: undefined }] })).toBe(stableStringify({ a: [1, { d: 2 }], b: 1 }));
  });
});
