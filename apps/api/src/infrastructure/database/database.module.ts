import { Global, Module } from '@nestjs/common';
import {
  AdminUserRepository,
  CategoryRepository,
  CertificationRepository,
  ContactMessageRepository,
  DashboardQueries,
  EducationRepository,
  ExperienceRepository,
  MediaRepository,
  ProfileRepository,
  ProjectRepository,
  RateLimiter,
  SessionRepository,
  SocialLinkRepository,
  TechnologyRepository,
} from '../../domain/ports';
import { PrismaEducationRepository, PrismaExperienceRepository } from './prisma-career.repositories';
import {
  PostgresRateLimiter,
  PrismaAdminUserRepository,
  PrismaContactMessageRepository,
  PrismaDashboardQueries,
  PrismaMediaRepository,
  PrismaSessionRepository,
} from './prisma-misc.repositories';
import { PrismaProfileRepository } from './prisma-profile.repository';
import { PrismaProjectRepository } from './prisma-project.repository';
import {
  PrismaCategoryRepository,
  PrismaCertificationRepository,
  PrismaSocialLinkRepository,
  PrismaTechnologyRepository,
} from './prisma-reference.repositories';
import { PrismaService } from './prisma.service';

const bindings = [
  { provide: ProjectRepository, useClass: PrismaProjectRepository },
  { provide: ProfileRepository, useClass: PrismaProfileRepository },
  { provide: ExperienceRepository, useClass: PrismaExperienceRepository },
  { provide: EducationRepository, useClass: PrismaEducationRepository },
  { provide: TechnologyRepository, useClass: PrismaTechnologyRepository },
  { provide: CategoryRepository, useClass: PrismaCategoryRepository },
  { provide: CertificationRepository, useClass: PrismaCertificationRepository },
  { provide: SocialLinkRepository, useClass: PrismaSocialLinkRepository },
  { provide: MediaRepository, useClass: PrismaMediaRepository },
  { provide: ContactMessageRepository, useClass: PrismaContactMessageRepository },
  { provide: AdminUserRepository, useClass: PrismaAdminUserRepository },
  { provide: SessionRepository, useClass: PrismaSessionRepository },
  { provide: RateLimiter, useClass: PostgresRateLimiter },
  { provide: DashboardQueries, useClass: PrismaDashboardQueries },
];

@Global()
@Module({
  providers: [PrismaService, ...bindings],
  exports: [PrismaService, ...bindings.map((b) => b.provide)],
})
export class DatabaseModule {}
