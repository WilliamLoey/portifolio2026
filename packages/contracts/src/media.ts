import { z } from 'zod';
import { idSchema } from './common';
import { localeSchema } from './locales';

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'] as const;

/** Alt text per language. English falls back for missing languages. */
export const altTextSchema = z.partialRecord(localeSchema, z.string().trim().max(200));

export const mediaAssetSchema = z.object({
  id: idSchema,
  url: z.string(),
  mimeType: z.string(),
  bytes: z.number().int(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  alt: altTextSchema,
  /** How many projects / profile fields point at this image. Assets in use cannot be deleted. */
  usage: z.number().int(),
  createdAt: z.iso.datetime(),
});
export type MediaAsset = z.infer<typeof mediaAssetSchema>;

export const updateMediaSchema = z.object({ alt: altTextSchema });
export type UpdateMediaBody = z.output<typeof updateMediaSchema>;

/** Image as embedded in public content: only what a page needs to render it. */
export const publicImageSchema = z.object({
  url: z.string(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  alt: z.string(),
});
export type PublicImage = z.infer<typeof publicImageSchema>;
