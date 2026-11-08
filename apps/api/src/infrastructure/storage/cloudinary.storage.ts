import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';
import { StorageService, StoredFile, UploadFile } from '../../domain/ports';

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
}

export class CloudinaryStorage extends StorageService {
  readonly provider = 'cloudinary';

  constructor(private readonly config: CloudinaryConfig) {
    super();
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      secure: true,
    });
  }

  upload(file: UploadFile): Promise<StoredFile> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: this.config.folder, resource_type: 'image', overwrite: false },
        (error, result?: UploadApiResponse) => {
          if (error || !result) return reject(error ?? new Error('Cloudinary upload failed'));
          resolve({ url: result.secure_url, key: result.public_id });
        },
      );
      stream.end(file.buffer);
    });
  }

  async delete(key: string): Promise<void> {
    await cloudinary.uploader.destroy(key, { resource_type: 'image', invalidate: true });
  }
}
