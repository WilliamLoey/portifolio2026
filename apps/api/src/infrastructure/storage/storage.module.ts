import { Module } from '@nestjs/common';
import { StorageService } from '../../domain/ports';
import { EnvService } from '../config/env.service';
import { CloudinaryStorage } from './cloudinary.storage';
import { LocalDiskStorage } from './local-disk.storage';
import { VercelBlobStorage } from './vercel-blob.storage';

/** Picks the storage adapter from STORAGE_DRIVER. Required keys are guaranteed by env.schema.ts. */
@Module({
  providers: [
    {
      provide: StorageService,
      inject: [EnvService],
      useFactory: (env: EnvService): StorageService => {
        switch (env.get('STORAGE_DRIVER')) {
          case 'vercel-blob':
            return new VercelBlobStorage(env.get('BLOB_READ_WRITE_TOKEN')!, env.get('STORAGE_FOLDER'));
          case 'cloudinary':
            return new CloudinaryStorage({
              cloudName: env.get('CLOUDINARY_CLOUD_NAME')!,
              apiKey: env.get('CLOUDINARY_API_KEY')!,
              apiSecret: env.get('CLOUDINARY_API_SECRET')!,
              folder: env.get('STORAGE_FOLDER'),
            });
          case 'local':
            return new LocalDiskStorage(env.get('UPLOAD_DIR'), env.get('PUBLIC_API_URL'));
        }
      },
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
