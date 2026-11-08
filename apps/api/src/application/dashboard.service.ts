import { CoverageRow, LOCALES, Overview, translatedLocales } from '@portfolio/contracts';
import { identity, toProfileSnapshot, toProjectSnapshot } from '../domain/content';
import {
  CategoryRepository,
  Clock,
  DashboardQueries,
  EducationRepository,
  ExperienceRepository,
  ProfileRepository,
  ProjectRepository,
} from '../domain/ports';
import { publicationStatus } from '../domain/publication';
import { compareEducation, compareExperience } from './localize';

export class DashboardService {
  constructor(
    private readonly queries: DashboardQueries,
    private readonly profiles: ProfileRepository,
    private readonly projects: ProjectRepository,
    private readonly experience: ExperienceRepository,
    private readonly education: EducationRepository,
    private readonly categories: CategoryRepository,
    private readonly clock: Clock,
  ) {}

  async overview(): Promise<Overview> {
    const [counts, coverage, projects] = await Promise.all([
      this.queries.overview(this.clock.now()),
      this.coverage(),
      this.projects.list(),
    ]);
    const statuses = projects.map((p) => publicationStatus(p, toProjectSnapshot));
    const filled = coverage.reduce((sum, row) => sum + row.locales.length, 0);

    return {
      ...counts,
      projects: {
        total: projects.length,
        published: statuses.filter((s) => s !== 'draft').length,
        drafts: statuses.filter((s) => s === 'draft').length,
        changed: statuses.filter((s) => s === 'changed').length,
      },
      translations: { filled, expected: coverage.length * LOCALES.length },
    };
  }

  /** One row per translatable item, with the languages it is written in. */
  async coverage(): Promise<CoverageRow[]> {
    const [profile, projects, experience, education, categories] = await Promise.all([
      this.profiles.get(),
      this.projects.list(),
      this.experience.list(),
      this.education.list(),
      this.categories.list(),
    ]);

    const rows: CoverageRow[] = [];
    if (profile) {
      rows.push({
        type: 'profile', id: 'main', label: 'Profile',
        locales: translatedLocales(profile.draft.translations),
        status: publicationStatus(profile, toProfileSnapshot),
      });
    }
    for (const p of projects) {
      rows.push({
        type: 'project', id: p.id, label: p.draft.translations.en?.title ?? p.draft.slug,
        locales: translatedLocales(p.draft.translations),
        status: publicationStatus(p, toProjectSnapshot),
      });
    }
    for (const e of [...experience].sort((a, b) => compareExperience(a.draft, b.draft))) {
      rows.push({
        type: 'experience', id: e.id, label: `${e.draft.translations.en?.role ?? 'Role'} · ${e.draft.company}`,
        locales: translatedLocales(e.draft.translations),
        status: publicationStatus(e, identity),
      });
    }
    for (const e of [...education].sort((a, b) => compareEducation(a.draft, b.draft))) {
      rows.push({
        type: 'education', id: e.id, label: `${e.draft.translations.en?.degree ?? 'Degree'} · ${e.draft.institution}`,
        locales: translatedLocales(e.draft.translations),
        status: publicationStatus(e, identity),
      });
    }
    for (const c of categories) {
      rows.push({
        type: 'category', id: c.id, label: c.translations.en?.name ?? c.slug,
        locales: translatedLocales(c.translations),
        status: null,
      });
    }
    return rows;
  }
}
