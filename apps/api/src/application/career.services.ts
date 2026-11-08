import type {
  CategoryInput,
  CertificationInput,
  SocialLinkInput,
  TechnologyInput,
} from '@portfolio/contracts';
import {
  CategoryRecord,
  CertificationRecord,
  EducationDraft,
  ExperienceDraft,
  SocialLinkRecord,
  TechnologyRecord,
} from '../domain/content';
import { CollectionService } from './collection.service';
import { PublishingService } from './publishing.service';

/* Named subclasses give Nest distinct injection tokens for each content type. */

export class ExperienceService extends PublishingService<ExperienceDraft, ExperienceDraft> {}
export class EducationService extends PublishingService<EducationDraft, EducationDraft> {}

export class TechnologiesService extends CollectionService<TechnologyInput, TechnologyRecord> {}
export class CategoriesService extends CollectionService<CategoryInput, CategoryRecord> {}
export class CertificationsService extends CollectionService<CertificationInput, CertificationRecord> {}
export class SocialLinksService extends CollectionService<SocialLinkInput, SocialLinkRecord> {}
