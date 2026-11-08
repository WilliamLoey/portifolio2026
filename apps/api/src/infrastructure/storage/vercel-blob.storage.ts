import { del, put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';
import { StorageService, StoredFile, UploadFile } from '../../domain/ports';

/**
 * Vercel Blob adapter — the natural choice when the API runs on Vercel,
 * where the filesystem is read-only/ephemeral.
 */
export class VercelBlobStorage extends StorageService {
  readonly provider = 'vercel-blob';

  constructor(
    private readonly token: string,
    private readonly folder: string,
  ) {
    super();
  }

  async upload(file: UploadFile): Promise<StoredFile> {
    const blob = await put(`${this.folder}/media/${randomUUID()}.${file.extension}`, file.buffer, {
      access: 'public',
      contentType: file.mimeType,
      token: this.token,
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
    // Vercel Blob deletes by URL, so the URL doubles as the storage key.
    return { url: blob.url, key: blob.url };
  }

  async delete(key: string): Promise<void> {
    await del(key, { token: this.token });
  }
}
