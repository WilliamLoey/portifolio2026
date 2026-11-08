/**
 * Seeds a development database with William's verified public information
 * (GitHub profile, LinkedIn public page) and this portfolio as the first project.
 * Nothing here is invented: unknown facts (job titles, dates, degree names) are left
 * for the dashboard. Safe to run twice: it stops if a profile already exists.
 *
 *   npm run db:seed
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { CertificationInput, TechnologyInput } from '@portfolio/contracts';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AppModule } from '../app.module';
import {
  CertificationsService,
  SocialLinksService,
  TechnologiesService,
} from '../application/career.services';
import { MediaService } from '../application/media.service';
import { ProfileService } from '../application/profile.service';
import { ProjectsService } from '../application/projects.service';

const technologies: TechnologyInput[] = [
  { name: 'TypeScript', slug: 'typescript', group: 'language', featured: true },
  { name: 'JavaScript', slug: 'javascript', group: 'language', featured: true },
  { name: 'Node.js', slug: 'nodejs', group: 'backend', featured: true },
  { name: 'NestJS', slug: 'nestjs', group: 'backend', featured: true },
  { name: 'PostgreSQL', slug: 'postgresql', group: 'data', featured: true },
  { name: 'Prisma', slug: 'prisma', group: 'data', featured: true },
  { name: 'React', slug: 'react', group: 'frontend', featured: true },
  { name: 'Next.js', slug: 'nextjs', group: 'frontend', featured: true },
  { name: 'Tailwind CSS', slug: 'tailwind-css', group: 'frontend', featured: true },
  { name: 'Zod', slug: 'zod', group: 'backend', featured: false },
  { name: 'Docker', slug: 'docker', group: 'devops', featured: true },
  { name: 'GitHub Actions', slug: 'github-actions', group: 'devops', featured: true },
  { name: 'Vercel', slug: 'vercel', group: 'cloud', featured: true },
  { name: 'Jest', slug: 'jest', group: 'testing', featured: true },
  { name: 'Playwright', slug: 'playwright', group: 'testing', featured: true },
];

/** From the public LinkedIn profile (Licenses & Certifications). */
const certifications: CertificationInput[] = [
  { name: 'React.js + Redux', issuer: 'Sololearn', issuedOn: '2022-01', credentialId: '1097-22861683', credentialUrl: null, visible: true },
  { name: 'CSS Framework', issuer: 'BeCode', issuedOn: '2021-12', credentialId: 'HpruXSJfRF-iObc2Gf_oJg', credentialUrl: null, visible: true },
  { name: 'CSS3', issuer: 'BeCode', issuedOn: '2021-12', credentialId: 'e-zZPxAgSb6LMQYFtCpL7w', credentialUrl: null, visible: true },
  { name: 'HTML 5', issuer: 'BeCode', issuedOn: '2021-12', credentialId: 'iyVYJ5tYTRaSNVYJYdq_5w', credentialUrl: null, visible: true },
  { name: 'JavaScript', issuer: 'BeCode', issuedOn: '2021-12', credentialId: 'ij1SR7EhSNug08qnBxkWyg', credentialUrl: null, visible: true },
  { name: 'Useful README', issuer: 'BeCode', issuedOn: '2021-12', credentialId: 'TBwFWTvfSduSWuAfs_5oVA', credentialUrl: null, visible: true },
  { name: 'JavaScript', issuer: 'Sololearn', issuedOn: '2021-09', credentialId: '22861683/1024', credentialUrl: null, visible: true },
  { name: 'CSS', issuer: 'Sololearn', issuedOn: '2021-08', credentialId: '1023-22861683', credentialUrl: null, visible: true },
  { name: 'HTML5', issuer: 'Sololearn', issuedOn: '2021-08', credentialId: '1014-22861683', credentialUrl: null, visible: true },
  { name: 'PHP', issuer: 'Sololearn', issuedOn: null, credentialId: '1059-22861683', credentialUrl: null, visible: true },
];

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  try {
    const profileService = app.get(ProfileService);
    if (await profileService.get()) {
      console.log('A profile already exists — nothing to seed.');
      return;
    }

    const techService = app.get(TechnologiesService);
    const techIds = new Map<string, string>();
    for (const tech of technologies) techIds.set(tech.slug, (await techService.create(tech)).id);

    for (const cert of certifications) await app.get(CertificationsService).create(cert);

    const links = app.get(SocialLinksService);
    await links.create({ kind: 'github', label: 'GitHub', url: 'https://github.com/WilliamLoey', visible: true });
    await links.create({ kind: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/in/williamloey/', visible: true });
    await links.create({ kind: 'email', label: 'Email', url: 'williamvanloey@gmail.com', visible: true });

    const media = app.get(MediaService);
    const portrait = await media.upload(
      await readFile(resolve(__dirname, '../../../web/public/images/william-portrait.webp')),
      { en: 'Portrait of William Van Loey, lit in cyan and magenta' },
    );

    await profileService.save({
      fullName: 'William Van Loey',
      email: 'williamvanloey@gmail.com',
      location: 'Brussels, Belgium',
      timezone: 'Europe/Brussels',
      openToWork: true,
      resumeUrl: null,
      spokenLanguages: [
        { name: 'Portuguese', level: 'native' },
        { name: 'French', level: 'full_professional' },
        { name: 'English', level: 'professional' },
      ],
      translations: {
        en: {
          role: 'Backend-focused Software Engineer',
          headline: 'Backend-focused full-stack engineer in Brussels. I build APIs and automate business processes with AI.',
          bio: 'I am a backend-focused full-stack engineer based in Brussels, Belgium, working remotely, with more than three years of experience building software. My focus is APIs, AI and digital process automation.\n\nI also trained in International Relations, which helps me work across teams, cultures and languages. I work in Portuguese, French and English.',
          availability: null,
        },
        'pt-BR': {
          role: 'Engenheiro de Software com foco em backend',
          headline: 'Engenheiro full-stack com foco em backend, em Bruxelas. Construo APIs e automatizo processos de negócio com IA.',
          bio: 'Sou engenheiro full-stack com foco em backend, baseado em Bruxelas, na Bélgica, trabalhando remotamente, com mais de três anos de experiência construindo software. Meu foco são APIs, IA e automação de processos digitais.\n\nTambém tenho formação em Relações Internacionais, o que me ajuda a trabalhar entre equipes, culturas e idiomas. Trabalho em português, francês e inglês.',
          availability: null,
        },
        fr: {
          role: 'Ingénieur logiciel orienté backend',
          headline: 'Ingénieur full-stack orienté backend, à Bruxelles. Je conçois des API et j’automatise des processus métier avec l’IA.',
          bio: 'Je suis ingénieur full-stack orienté backend, basé à Bruxelles et travaillant à distance, avec plus de trois ans d’expérience dans le développement logiciel. Je me concentre sur les API, l’IA et l’automatisation des processus numériques.\n\nJ’ai également une formation en relations internationales, ce qui m’aide à travailler entre équipes, cultures et langues. Je travaille en portugais, en français et en anglais.',
          availability: null,
        },
      },
    });
    await profileService.setPhoto(portrait.id);
    await profileService.publish();

    const projects = app.get(ProjectsService);
    const portfolio = await projects.create({
      slug: 'portfolio-cms',
      categoryId: null,
      coverId: null,
      repoUrl: null,
      liveUrl: null,
      year: 2026,
      technologyIds: ['nextjs', 'nestjs', 'typescript', 'postgresql', 'prisma', 'zod', 'tailwind-css', 'docker', 'github-actions', 'vercel', 'playwright']
        .map((slug) => techIds.get(slug)!),
      featured: true,
      showOnHome: true,
      translations: {
        en: {
          title: 'This portfolio and its CMS',
          summary: 'A five-language portfolio with a purpose-built CMS: draft and publish workflow, previews, image library and contact inbox.',
          body: '## What it is\n\nThe site you are reading. Every text, image and project comes from a NestJS API and a PostgreSQL database, edited in a private dashboard.\n\n## How it is built\n\n- **API**: NestJS with Clean Architecture. Use cases depend on ports; Prisma, storage and email are adapters.\n- **One contract**: request and response schemas live in a shared Zod package used by the API, the OpenAPI document and the dashboard forms.\n- **Publishing**: each item keeps a draft and a published snapshot. Visitors only read snapshots; publishing triggers a signed revalidation of the static pages.\n- **Security**: Argon2id passwords, opaque server-side sessions in httpOnly cookies, rate limits shared through PostgreSQL, magic-byte upload checks.\n- **Quality**: unit, integration and end-to-end tests run in GitHub Actions before every deploy.',
          role: 'Design, backend, frontend and deployment',
          outcome: null,
        },
      },
    });
    await projects.publish(portfolio.id);

    console.log('Seeded profile, 15 technologies, 10 certifications, 3 links and 1 project.');
  } finally {
    await app.close();
  }
}

main().catch((error: Error) => {
  console.error(error);
  process.exit(1);
});
