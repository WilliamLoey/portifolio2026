'use client';

import type { MediaAsset } from '@portfolio/contracts';
import { useRef, useState } from 'react';
import { adminRequest, ApiRequestError } from '@/lib/admin-client';
import { prepareImage, UPLOAD_LIMIT_BYTES } from '@/lib/image-resize';
import { Button, formatBytes, useToast } from './ui';

export async function uploadImage(file: File, replaceId?: string): Promise<MediaAsset> {
  const prepared = await prepareImage(file);
  if (prepared.size > UPLOAD_LIMIT_BYTES) {
    throw new ApiRequestError(413, `This image is ${formatBytes(prepared.size)} after compression. The limit is 4 MB.`);
  }
  const form = new FormData();
  form.append('file', prepared);
  return replaceId
    ? adminRequest<MediaAsset>('PUT', `/media/${replaceId}/file`, form)
    : adminRequest<MediaAsset>('POST', '/media', form);
}

/**
 * Shows the selected image and lets the editor pick another from the library
 * or upload a new one. Returns a media id; the file itself lives in object storage.
 */
export function MediaPicker({
  id,
  value,
  onChange,
  library,
  label,
}: {
  id: string;
  value: { id: string; url: string } | null;
  onChange: (media: { id: string; url: string } | null) => void;
  library: MediaAsset[];
  label: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState(library);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const media = await uploadImage(file);
      setItems((list) => [media, ...list]);
      onChange({ id: media.id, url: media.url });
      dialog.current?.close();
      toast('Image uploaded');
    } catch (error) {
      toast(error instanceof ApiRequestError ? error.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span id={`${id}-label`} className="text-sm font-medium">{label}</span>
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid aspect-[3/2] w-48 place-items-center overflow-hidden border border-line bg-raised">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- dashboard thumbnail, any host
            <img src={value.url} alt="" className="size-full object-cover" />
          ) : (
            <span className="font-mono text-2xs text-muted">No image</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button size="sm" onClick={() => dialog.current?.showModal()} aria-describedby={`${id}-label`}>
            {value ? 'Change image' : 'Choose image'}
          </Button>
          {value && <Button size="sm" variant="ghost" onClick={() => onChange(null)}>Remove</Button>}
        </div>
      </div>

      <dialog ref={dialog} aria-labelledby={`${id}-dialog-title`} className="m-auto w-[min(56rem,calc(100vw-2rem))] border border-line bg-surface p-0 text-fg backdrop:bg-scrim">
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
            <h2 id={`${id}-dialog-title`} className="text-lg font-semibold">Choose an image</h2>
            <div className="flex gap-2">
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" className="sr-only" id={`${id}-file`} onChange={(e) => onFile(e.target.files?.[0])} />
              <Button size="sm" variant="primary" busy={uploading} onClick={() => fileInput.current?.click()}>Upload new</Button>
              <Button size="sm" variant="ghost" onClick={() => dialog.current?.close()}>Close</Button>
            </div>
          </div>
          <div className="overflow-y-auto p-4">
            {items.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">The library is empty. Upload an image to start.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {items.map((media) => (
                  <li key={media.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange({ id: media.id, url: media.url });
                        dialog.current?.close();
                      }}
                      aria-pressed={value?.id === media.id}
                      className="group flex w-full cursor-pointer flex-col gap-1 text-left"
                    >
                      <span className="block aspect-[3/2] overflow-hidden border border-line group-hover:border-cool group-aria-pressed:border-2 group-aria-pressed:border-cool">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={media.url} alt={media.alt.en ?? ''} className="size-full object-cover" loading="lazy" />
                      </span>
                      <span className="truncate font-mono text-2xs text-muted">{media.width}×{media.height} · {formatBytes(media.bytes)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}
