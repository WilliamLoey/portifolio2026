import type { Translations } from '@portfolio/contracts';
import { imageSize } from 'image-size';
import { MediaRecord } from '../domain/content';
import { InUseError, NotFoundError, ValidationError } from '../domain/errors';
import { AppLogger, ContentChangeNotifier, MediaRepository, StorageService } from '../domain/ports';
import { detectImageType } from './utils/detect-image-type';

export type MediaWithUsage = MediaRecord & { usage: number };

export class MediaService {
  constructor(
    private readonly media: MediaRepository,
    private readonly storage: StorageService,
    private readonly notifier: ContentChangeNotifier,
    private readonly logger: AppLogger,
    private readonly maxBytes: number,
  ) {}

  async list(): Promise<MediaWithUsage[]> {
    const [items, usage] = await Promise.all([this.media.list(), this.media.usageCounts()]);
    return items.map((item) => ({ ...item, usage: usage.get(item.id) ?? 0 }));
  }

  async upload(buffer: Buffer, alt: Translations<string> = {}): Promise<MediaWithUsage> {
    const file = this.inspect(buffer);
    const stored = await this.storage.upload({ buffer, mimeType: file.mimeType, extension: file.extension });
    const record = await this.media.create({
      provider: this.storage.provider,
      key: stored.key,
      url: stored.url,
      mimeType: file.mimeType,
      bytes: buffer.length,
      width: file.width,
      height: file.height,
      alt,
    });
    return { ...record, usage: 0 };
  }

  /** Swaps the file behind an asset: every project or profile using it shows the new image. */
  async replace(id: string, buffer: Buffer): Promise<MediaWithUsage> {
    const { key: previousKey } = await this.getOrFail(id);
    const file = this.inspect(buffer);
    const stored = await this.storage.upload({ buffer, mimeType: file.mimeType, extension: file.extension });
    const updated = await this.media.update(id, {
      provider: this.storage.provider,
      key: stored.key,
      url: stored.url,
      mimeType: file.mimeType,
      bytes: buffer.length,
      width: file.width,
      height: file.height,
    });
    await this.removeFile(previousKey);
    const usage = (await this.media.usageCounts([id])).get(id) ?? 0;
    if (usage > 0) await this.notifier.contentChanged('Image replaced');
    return { ...updated, usage };
  }

  async updateAlt(id: string, alt: Translations<string>): Promise<MediaWithUsage> {
    await this.getOrFail(id);
    const updated = await this.media.update(id, { alt });
    const usage = (await this.media.usageCounts([id])).get(id) ?? 0;
    if (usage > 0) await this.notifier.contentChanged('Image alt text changed');
    return { ...updated, usage };
  }

  async delete(id: string): Promise<void> {
    const current = await this.getOrFail(id);
    const usage = (await this.media.usageCounts([id])).get(id) ?? 0;
    if (usage > 0) {
      throw new InUseError(
        `This image is used in ${usage} place${usage === 1 ? '' : 's'} (drafts or published content). Replace it there first.`,
      );
    }
    await this.media.delete(id);
    await this.removeFile(current.key);
  }

  private inspect(buffer: Buffer) {
    if (buffer.length === 0) throw new ValidationError('The file is empty');
    if (buffer.length > this.maxBytes) {
      throw new ValidationError(`The image must be ${Math.floor(this.maxBytes / 1024 / 1024)} MB or smaller`);
    }
    const type = detectImageType(buffer);
    if (!type) throw new ValidationError('Upload a JPEG, PNG, WebP, AVIF or GIF image');

    let width: number | null = null;
    let height: number | null = null;
    try {
      const size = imageSize(buffer);
      width = size.width ?? null;
      height = size.height ?? null;
    } catch {
      // Dimensions are a nice-to-have for layout; a file the probe can't read still uploads.
    }
    return { mimeType: type.mime, extension: type.ext, width, height };
  }

  /** Storage cleanup never fails the request: an orphaned file is cheaper than a lost edit. */
  private async removeFile(key: string): Promise<void> {
    try {
      await this.storage.delete(key);
    } catch (error) {
      this.logger.warn(`Could not delete file ${key}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getOrFail(id: string): Promise<MediaRecord> {
    const media = await this.media.findById(id);
    if (!media) throw new NotFoundError('Image not found');
    return media;
  }
}
