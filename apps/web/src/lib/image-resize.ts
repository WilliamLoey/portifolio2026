'use client';

const MAX_EDGE = 2400;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/**
 * Downscales large photos in the browser before upload (WebP, longest edge 2400px).
 * Keeps uploads under the 4 MB request limit of serverless functions and saves storage.
 * GIFs are sent as-is so animations survive.
 */
export async function prepareImage(file: File): Promise<File> {
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // Unknown format for the browser: let the API decide.
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= MAX_UPLOAD_BYTES && file.type === 'image/webp') {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.86));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' });
}

export const UPLOAD_LIMIT_BYTES = MAX_UPLOAD_BYTES;
