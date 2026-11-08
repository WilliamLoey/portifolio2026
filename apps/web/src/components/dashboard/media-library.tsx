'use client';

import { LOCALE_NAMES, LOCALES, MediaAsset } from '@portfolio/contracts';
import { useRef, useState } from 'react';
import { adminRequest, ApiRequestError } from '@/lib/admin-client';
import { uploadImage } from './media-picker';
import { Button, ConfirmButton, EmptyState, Field, formatBytes, Input, Panel, useToast } from './ui';

export function MediaLibrary({ initial }: { initial: MediaAsset[] }) {
  const [items, setItems] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();

  async function upload(files: FileList | File[]) {
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const media = await uploadImage(file);
        setItems((list) => [media, ...list]);
        toast(`${file.name} uploaded`);
      } catch (error) {
        toast(`${file.name}: ${error instanceof ApiRequestError ? error.message : 'upload failed'}`, 'error');
      }
    }
    setUploading(false);
    if (input.current) input.current.value = '';
  }

  const replace = (updated: MediaAsset) => setItems((list) => list.map((m) => (m.id === updated.id ? updated : m)));

  return (
    <div className="flex flex-col gap-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) void upload(e.dataTransfer.files); }}
        className={`flex flex-col items-center gap-3 border border-dashed px-6 py-10 text-center transition-colors ${dragging ? 'border-cool bg-cool/5' : 'border-line-strong'}`}
      >
        <p className="font-medium">Drop images here</p>
        <p className="text-sm text-muted">JPEG, PNG, WebP, AVIF or GIF. Large photos are resized to 2400px and converted to WebP in your browser before upload.</p>
        <input ref={input} id="media-upload" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/gif" className="sr-only" onChange={(e) => e.target.files && upload(e.target.files)} />
        <Button variant="primary" busy={uploading} onClick={() => input.current?.click()}>Choose files</Button>
      </div>

      {items.length === 0 ? (
        <EmptyState title="No images yet" text="Uploaded images can be used as project covers and as your profile photo." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((media) => <MediaCard key={media.id} media={media} onChange={replace} onDeleted={() => setItems((l) => l.filter((m) => m.id !== media.id))} />)}
        </ul>
      )}
    </div>
  );
}

function MediaCard({ media, onChange, onDeleted }: { media: MediaAsset; onChange: (m: MediaAsset) => void; onDeleted: () => void }) {
  const toast = useToast();
  const [alt, setAlt] = useState(() => Object.fromEntries(LOCALES.map((l) => [l, media.alt[l] ?? ''])));
  const [saving, setSaving] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function saveAlt() {
    setSaving(true);
    try {
      const cleaned = Object.fromEntries(Object.entries(alt).filter(([, v]) => v.trim()));
      onChange(await adminRequest<MediaAsset>('PATCH', `/media/${media.id}`, { alt: cleaned }));
      toast('Alt text saved');
    } catch (error) {
      toast(error instanceof ApiRequestError ? error.message : 'Could not save', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function replaceFile(file?: File) {
    if (!file) return;
    setReplacing(true);
    try {
      onChange(await uploadImage(file, media.id));
      toast('Image replaced everywhere it is used');
    } catch (error) {
      toast(error instanceof ApiRequestError ? error.message : 'Could not replace', 'error');
    } finally {
      setReplacing(false);
    }
  }

  async function remove() {
    try {
      await adminRequest('DELETE', `/media/${media.id}`);
      onDeleted();
      toast('Image deleted');
    } catch (error) {
      toast(error instanceof ApiRequestError ? error.message : 'Could not delete', 'error');
    }
  }

  return (
    <li>
      <Panel>
        <div className="aspect-[3/2] overflow-hidden border border-line bg-raised">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={media.url} alt={media.alt.en ?? ''} className="size-full object-cover" loading="lazy" />
        </div>
        <p className="font-mono text-2xs text-muted">
          {media.width}×{media.height} · {formatBytes(media.bytes)} · {media.mimeType.replace('image/', '')} ·{' '}
          <span className={media.usage > 0 ? 'text-ok' : ''}>{media.usage > 0 ? `used ${media.usage}×` : 'unused'}</span>
        </p>
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium">Alt text {Object.values(media.alt).filter(Boolean).length === 0 && <span className="text-warn">· missing</span>}</summary>
          <div className="mt-3 flex flex-col gap-3">
            {LOCALES.map((l) => (
              <Field key={l} id={`alt-${media.id}-${l}`} label={LOCALE_NAMES[l].english}>
                <Input id={`alt-${media.id}-${l}`} lang={l} value={alt[l]} maxLength={200} onChange={(e) => setAlt((a) => ({ ...a, [l]: e.target.value }))} placeholder={l === 'en' ? 'Describe what the image shows' : 'Falls back to English'} />
              </Field>
            ))}
            <Button size="sm" onClick={saveAlt} busy={saving}>Save alt text</Button>
          </div>
        </details>
        <div className="flex flex-wrap gap-2">
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" className="sr-only" id={`replace-${media.id}`} onChange={(e) => replaceFile(e.target.files?.[0])} />
          <Button size="sm" busy={replacing} onClick={() => fileInput.current?.click()}>Replace file</Button>
          <ConfirmButton
            size="sm"
            variant="ghost"
            disabled={media.usage > 0}
            title="Delete this image?"
            description="The file is removed from storage. This cannot be undone."
            confirmLabel="Delete image"
            onConfirm={remove}
          >
            {media.usage > 0 ? 'In use' : 'Delete'}
          </ConfirmButton>
        </div>
      </Panel>
    </li>
  );
}
