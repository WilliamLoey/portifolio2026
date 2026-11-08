import type {
  CategoryInput,
  CertificationInput,
  EducationInput,
  ExperienceInput,
  Locale,
  ProjectInput,
  SocialLinkInput,
  TechnologyInput,
  Translations,
  UpdateProfileBody,
} from '@portfolio/contracts';
import { Versioned } from './publication';

/*
 * Content records reuse the validated input types from @portfolio/contracts instead of
 * re-declaring identical shapes. The contracts package is plain TypeScript + Zod with no
 * framework code, so the domain stays independent of Nest, Prisma and HTTP.
 */

/* ── Projects ── */

export type ProjectDraft = ProjectInput;
/** featured / showOnHome are layout switches that apply immediately, so they are not versioned. */
export type ProjectSnapshot = Omit<ProjectInput, 'featured' | 'showOnHome'>;
export type ProjectRecord = Versioned<ProjectDraft, ProjectSnapshot>;

export const toProjectSnapshot = ({ featured: _f, showOnHome: _h, ...snapshot }: ProjectDraft): ProjectSnapshot =>
  snapshot;

/* ── Profile ── */

export type ProfileDraft = UpdateProfileBody & { photoId: string | null };
export type ProfileSnapshot = ProfileDraft;
export type ProfileRecord = Versioned<ProfileDraft, ProfileSnapshot>;
export const toProfileSnapshot = (draft: ProfileDraft): ProfileSnapshot => draft;

/* ── Career ── */

export type ExperienceDraft = ExperienceInput;
export type ExperienceRecord = Versioned<ExperienceDraft, ExperienceDraft>;
export type EducationDraft = EducationInput;
export type EducationRecord = Versioned<EducationDraft, EducationDraft>;
export const identity = <T>(value: T): T => value;

/* ── Reference data (no draft workflow) ── */

export interface TechnologyRecord extends TechnologyInput {
  id: string;
  sortOrder: number;
  projectCount: number;
}

export interface CategoryRecord extends CategoryInput {
  id: string;
  sortOrder: number;
  projectCount: number;
}

export interface CertificationRecord extends CertificationInput {
  id: string;
  sortOrder: number;
}

export interface SocialLinkRecord extends SocialLinkInput {
  id: string;
  sortOrder: number;
}

/* ── Media ── */

export interface MediaRecord {
  id: string;
  provider: string;
  key: string;
  url: string;
  mimeType: string;
  bytes: number;
  width: number | null;
  height: number | null;
  alt: Translations<string>;
  createdAt: Date;
}

/* ── Contact ── */

export interface ContactMessageRecord {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  locale: Locale;
  ipHash: string | null;
  deliveredAt: Date | null;
  readAt: Date | null;
  createdAt: Date;
}

/* ── Auth ── */

export interface AdminUserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  expiresAt: Date;
  lastSeenAt: Date;
  user: Pick<AdminUserRecord, 'id' | 'email' | 'name'>;
}
