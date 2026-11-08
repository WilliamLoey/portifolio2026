import { Global, Logger, Module, Provider } from '@nestjs/common';
import { AuthService } from '../application/auth.service';
import {
  CategoriesService,
  CertificationsService,
  EducationService,
  ExperienceService,
  SocialLinksService,
  TechnologiesService,
} from '../application/career.services';
import { ContactService } from '../application/contact.service';
import { DashboardService } from '../application/dashboard.service';
import { MediaService } from '../application/media.service';
import { ProfileService } from '../application/profile.service';
import { ProjectsService } from '../application/projects.service';
import { SiteService } from '../application/site.service';
import { identity } from '../domain/content';
import {
  AdminUserRepository,
  CategoryRepository,
  CertificationRepository,
  Clock,
  ContactMessageRepository,
  ContentChangeNotifier,
  DashboardQueries,
  EducationRepository,
  ExperienceRepository,
  MailService,
  MediaRepository,
  PasswordHasher,
  ProfileRepository,
  ProjectRepository,
  RateLimiter,
  SessionRepository,
  SocialLinkRepository,
  StorageService,
  TechnologyRepository,
} from '../domain/ports';
import { EnvService } from '../infrastructure/config/env.service';

/**
 * Composition root. Application services are plain classes with no Nest decorators;
 * this is the only place that knows which adapter backs which port.
 */
const providers: Provider[] = [
  {
    provide: AuthService,
    inject: [AdminUserRepository, SessionRepository, PasswordHasher, RateLimiter, Clock, EnvService],
    useFactory: (users, sessions, hasher, limiter, clock, env: EnvService) =>
      new AuthService(users, sessions, hasher, limiter, clock, env.get('SESSION_TTL_HOURS')),
  },
  {
    provide: ProjectsService,
    inject: [ProjectRepository, ContentChangeNotifier, Clock],
    useFactory: (repo, notifier, clock) => new ProjectsService(repo, notifier, clock),
  },
  {
    provide: ExperienceService,
    inject: [ExperienceRepository, ContentChangeNotifier, Clock],
    useFactory: (repo, notifier, clock) => new ExperienceService(repo, identity, notifier, clock, 'Experience entry'),
  },
  {
    provide: EducationService,
    inject: [EducationRepository, ContentChangeNotifier, Clock],
    useFactory: (repo, notifier, clock) => new EducationService(repo, identity, notifier, clock, 'Education entry'),
  },
  {
    provide: ProfileService,
    inject: [ProfileRepository, MediaRepository, ContentChangeNotifier, Clock],
    useFactory: (repo, media, notifier, clock) => new ProfileService(repo, media, notifier, clock),
  },
  {
    provide: TechnologiesService,
    inject: [TechnologyRepository, ContentChangeNotifier],
    useFactory: (repo, notifier) => new TechnologiesService(repo, notifier, 'Technology'),
  },
  {
    provide: CategoriesService,
    inject: [CategoryRepository, ContentChangeNotifier],
    useFactory: (repo, notifier) => new CategoriesService(repo, notifier, 'Category'),
  },
  {
    provide: CertificationsService,
    inject: [CertificationRepository, ContentChangeNotifier],
    useFactory: (repo, notifier) => new CertificationsService(repo, notifier, 'Certification'),
  },
  {
    provide: SocialLinksService,
    inject: [SocialLinkRepository, ContentChangeNotifier],
    useFactory: (repo, notifier) => new SocialLinksService(repo, notifier, 'Link'),
  },
  {
    provide: MediaService,
    inject: [MediaRepository, StorageService, ContentChangeNotifier, EnvService],
    useFactory: (repo, storage, notifier, env: EnvService) =>
      new MediaService(repo, storage, notifier, new Logger('Media'), env.get('MAX_UPLOAD_MB') * 1024 * 1024),
  },
  {
    provide: ContactService,
    inject: [ContactMessageRepository, MailService, RateLimiter, Clock, EnvService],
    useFactory: (repo, mail, limiter, clock, env: EnvService) =>
      new ContactService(repo, mail, limiter, clock, new Logger('Contact'), env.get('MAIL_TO')),
  },
  {
    provide: SiteService,
    inject: [
      ProfileRepository, ProjectRepository, ExperienceRepository, EducationRepository, TechnologyRepository,
      CategoryRepository, CertificationRepository, SocialLinkRepository, MediaRepository,
    ],
    useFactory: (...repos: ConstructorParameters<typeof SiteService>) => new SiteService(...repos),
  },
  {
    provide: DashboardService,
    inject: [DashboardQueries, ProfileRepository, ProjectRepository, ExperienceRepository, EducationRepository, CategoryRepository, Clock],
    useFactory: (...deps: ConstructorParameters<typeof DashboardService>) => new DashboardService(...deps),
  },
];

@Global()
@Module({ providers, exports: providers.map((p) => (p as { provide: unknown }).provide as never) })
export class AppServicesModule {}
