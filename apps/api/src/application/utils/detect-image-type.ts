export interface ImageType {
  mime: string;
  ext: string;
}

const startsWith = (buf: Buffer, bytes: number[], offset = 0) =>
  buf.length >= offset + bytes.length && bytes.every((b, i) => buf[offset + i] === b);

const ascii = (buf: Buffer, text: string, offset = 0) =>
  buf.length >= offset + text.length && buf.toString('latin1', offset, offset + text.length) === text;

/**
 * Detects the real image format from its magic bytes. The client-sent
 * Content-Type is never trusted. SVG is intentionally not supported (it can carry scripts).
 */
export function detectImageType(buf: Buffer): ImageType | null {
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return { mime: 'image/jpeg', ext: 'jpg' };
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: 'image/png', ext: 'png' };
  if (ascii(buf, 'GIF87a') || ascii(buf, 'GIF89a')) return { mime: 'image/gif', ext: 'gif' };
  if (ascii(buf, 'RIFF') && ascii(buf, 'WEBP', 8)) return { mime: 'image/webp', ext: 'webp' };
  if (ascii(buf, 'ftypavif', 4) || ascii(buf, 'ftypavis', 4)) return { mime: 'image/avif', ext: 'avif' };
  return null;
}
