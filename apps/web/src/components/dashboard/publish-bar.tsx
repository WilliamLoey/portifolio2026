'use client';

import type { PublicationStatus } from '@portfolio/contracts';
import { Button } from './ui';

/** Sticky bar at the bottom of every editor: save the draft, preview, publish. */
export function PublishBar({
  status,
  dirty,
  saving,
  busy,
  exists,
  onPublish,
  onUnpublish,
  onPreview,
  previewLabel,
}: {
  status: PublicationStatus;
  dirty: boolean;
  saving: boolean;
  busy: 'publish' | 'unpublish' | null;
  exists: boolean;
  onPublish: () => void;
  onUnpublish?: () => void;
  onPreview?: () => void;
  previewLabel?: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 backdrop-blur lg:left-60">
      <div className="page-gutter mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 py-3">
        <p className="text-xs text-muted" aria-live="polite">
          {dirty
            ? 'Unsaved changes'
            : status === 'changed'
              ? 'Saved. These edits are not public yet.'
              : status === 'published'
                ? 'Visitors see this version.'
                : 'Draft: not visible to visitors.'}
        </p>
        <div className="flex flex-wrap gap-2">
          {onPreview && <Button variant="ghost" onClick={onPreview} disabled={saving}>{previewLabel ?? 'Preview'}</Button>}
          {onUnpublish && status !== 'draft' && (
            <Button variant="ghost" onClick={onUnpublish} busy={busy === 'unpublish'}>Unpublish</Button>
          )}
          <Button type="submit" busy={saving && busy === null} disabled={!dirty && exists}>Save draft</Button>
          <Button variant="primary" onClick={onPublish} busy={busy === 'publish'} disabled={status === 'published' && !dirty}>
            {dirty || !exists ? 'Save & publish' : status === 'published' ? 'Published' : 'Publish'}
          </Button>
        </div>
      </div>
    </div>
  );
}
