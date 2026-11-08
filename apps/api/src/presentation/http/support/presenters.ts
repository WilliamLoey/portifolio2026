import type {
  AdminEducation,
  AdminExperience,
  AdminProfile,
  AdminProject,
  ContactMessage,
  MediaAsset,
} from '@portfolio/contracts';
import { MediaWithUsage } from '../../../application/media.service';
import {
  ContactMessageRecord,
  EducationRecord,
  ExperienceRecord,
  identity,
  MediaRecord,
  ProfileRecord,
  ProjectRecord,
  toProfileSnapshot,
  toProjectSnapshot,
} from '../../../domain/content';
import { describePublication } from '../../../domain/publication';

export function presentProject(p: ProjectRecord, media: Map<string, MediaRecord>): AdminProject {
  const cover = p.draft.coverId ? media.get(p.draft.coverId) : undefined;
  const { coverId: _c, ...draft } = p.draft;
  return {
    id: p.id,
    ...draft,
    cover: cover ? { id: cover.id, url: cover.url } : null,
    sortOrder: p.sortOrder,
    translations: p.draft.translations as AdminProject['translations'],
    publication: describePublication(p, toProjectSnapshot),
    createdAt: p.createdAt.toISOString(),
  };
}

export function presentProfile(p: ProfileRecord, photo: MediaRecord | undefined): AdminProfile {
  const { photoId: _p, ...draft } = p.draft;
  return {
    ...draft,
    photo: photo ? { id: photo.id, url: photo.url } : null,
    translations: p.draft.translations as AdminProfile['translations'],
    publication: describePublication(p, toProfileSnapshot),
  };
}

export const presentExperience = (e: ExperienceRecord): AdminExperience => ({
  id: e.id,
  ...e.draft,
  translations: e.draft.translations as AdminExperience['translations'],
  sortOrder: e.sortOrder,
  publication: describePublication(e, identity),
});

export const presentEducation = (e: EducationRecord): AdminEducation => ({
  id: e.id,
  ...e.draft,
  translations: e.draft.translations as AdminEducation['translations'],
  sortOrder: e.sortOrder,
  publication: describePublication(e, identity),
});

export const presentMedia = ({ provider: _p, key: _k, ...m }: MediaWithUsage): MediaAsset => ({
  ...m,
  createdAt: m.createdAt.toISOString(),
});

export const presentMessage = (m: ContactMessageRecord): ContactMessage => ({
  id: m.id,
  name: m.name,
  email: m.email,
  subject: m.subject,
  message: m.message,
  locale: m.locale,
  delivered: m.deliveredAt !== null,
  readAt: m.readAt?.toISOString() ?? null,
  createdAt: m.createdAt.toISOString(),
});
