import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { StorageService, StoredFile, UploadFile } from '../../domain/ports';

/** Saves files on disk; main.ts serves UPLOAD_DIR at /uploads. */
export class LocalDiskStorage extends StorageService {
  readonly provider = 'local';
  private readonly root: string;

  constructor(uploadDir: string, private readonly publicBaseUrl: string) {
    super();
    this.root = resolve(uploadDir);
  }

  async upload(file: UploadFile): Promise<StoredFile> {
    const key = `media/${randomUUID()}.${file.extension}`;
    const target = this.resolveKey(key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.buffer);
    return { key, url: `${this.publicBaseUrl}/uploads/${key}` };
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolveKey(key), { force: true });
  }

  /** Prevents path traversal ("../../etc/passwd") through a tampered key. */
  private resolveKey(key: string): string {
    const target = resolve(this.root, key);
    if (!target.startsWith(this.root + sep)) throw new Error(`Invalid storage key: ${key}`);
    return target;
  }
}
