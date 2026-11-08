import type { Locale, PublicProfile, UpdateProfileBody } from '@portfolio/contracts';
import { ProfileRecord, toProfileSnapshot } from '../domain/content';
import { NotFoundError, ValidationError } from '../domain/errors';
import { Clock, ContentChangeNotifier, MediaRepository, ProfileRepository } from '../domain/ports';
import { localizeProfile } from './localize';

export class ProfileService {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly media: MediaRepository,
    private readonly notifier: ContentChangeNotifier,
    private readonly clock: Clock,
  ) {}

  get(): Promise<ProfileRecord | null> {
    return this.profiles.get();
  }

  async getOrFail(): Promise<ProfileRecord> {
    const profile = await this.profiles.get();
    if (!profile) throw new NotFoundError('The profile has not been created yet');
    return profile;
  }

  async save(body: UpdateProfileBody): Promise<ProfileRecord> {
    const current = await this.profiles.get();
    return this.profiles.save({ ...body, photoId: current?.draft.photoId ?? null });
  }

  async setPhoto(mediaId: string | null): Promise<ProfileRecord> {
    const current = await this.getOrFail();
    if (mediaId && !(await this.media.findById(mediaId))) throw new ValidationError('That image does not exist');
    return this.profiles.save({ ...current.draft, photoId: mediaId });
  }

  async publish(): Promise<ProfileRecord> {
    const current = await this.getOrFail();
    const result = await this.profiles.setPublication(toProfileSnapshot(current.draft), this.clock.now());
    await this.notifier.contentChanged('Profile published');
    return result;
  }

  /** The draft, shaped exactly like the public response — used by the preview mode. */
  async preview(locale: Locale): Promise<PublicProfile> {
    const { draft } = await this.getOrFail();
    const media = new Map((await this.media.findManyByIds(draft.photoId ? [draft.photoId] : [])).map((m) => [m.id, m]));
    return localizeProfile(draft, { media }, locale);
  }
}
