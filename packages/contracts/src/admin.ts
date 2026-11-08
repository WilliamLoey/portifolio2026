import { z } from 'zod';
import { PUBLICATION_STATUSES } from './common';
import { LOCALES } from './locales';

export const overviewSchema = z.object({
  projects: z.object({ total: z.number(), published: z.number(), drafts: z.number(), changed: z.number() }),
  messages: z.object({ total: z.number(), unread: z.number(), last30Days: z.number(), undelivered: z.number() }),
  translations: z.object({ filled: z.number(), expected: z.number() }),
  media: z.object({ count: z.number(), bytes: z.number() }),
  content: z.object({ experience: z.number(), education: z.number(), technologies: z.number() }),
});
export type Overview = z.infer<typeof overviewSchema>;

export const CONTENT_TYPES = ['profile', 'project', 'experience', 'education', 'category'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const coverageRowSchema = z.object({
  type: z.enum(CONTENT_TYPES),
  id: z.string(),
  label: z.string(),
  /** Which languages have content. */
  locales: z.array(z.enum(LOCALES)),
  /** Null for content without a publish workflow (categories). */
  status: z.enum(PUBLICATION_STATUSES).nullable(),
});
export const coverageSchema = z.object({ rows: z.array(coverageRowSchema) });
export type CoverageRow = z.infer<typeof coverageRowSchema>;
export type Coverage = z.infer<typeof coverageSchema>;
