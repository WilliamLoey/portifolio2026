import type { Publication, PublicationStatus } from '@portfolio/contracts';

/**
 * Publishable content: an editable working copy (`draft`) and, once published,
 * a frozen `snapshot` of what visitors see. Visitors never read the draft.
 */
export interface Versioned<TDraft, TSnapshot> {
  id: string;
  draft: TDraft;
  snapshot: TSnapshot | null;
  publishedAt: Date | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/** JSON.stringify with sorted keys, so two equal objects always produce the same string. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
}

/**
 * draft     → never published (or unpublished)
 * published → the snapshot equals what the draft would publish
 * changed   → published, with unpublished edits in the draft
 */
export function publicationStatus<TDraft, TSnapshot>(
  item: Pick<Versioned<TDraft, TSnapshot>, 'draft' | 'snapshot'>,
  toSnapshot: (draft: TDraft) => TSnapshot,
): PublicationStatus {
  if (item.snapshot === null) return 'draft';
  return stableStringify(toSnapshot(item.draft)) === stableStringify(item.snapshot) ? 'published' : 'changed';
}

export function describePublication<TDraft, TSnapshot>(
  item: Versioned<TDraft, TSnapshot>,
  toSnapshot: (draft: TDraft) => TSnapshot,
): Publication {
  return {
    status: publicationStatus(item, toSnapshot),
    publishedAt: item.publishedAt?.toISOString() ?? null,
    updatedAt: item.updatedAt.toISOString(),
  };
}
