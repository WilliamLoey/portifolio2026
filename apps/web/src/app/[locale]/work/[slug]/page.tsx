import type { Locale } from '@portfolio/contracts';
import { LOCALES } from '@portfolio/contracts';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ProjectArticle } from '@/components/site/project-article';
import { getProject, getSitemapEntries } from '@/lib/content.server';
import { publicEnv } from '@/lib/env.public';
import { pageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: Locale; slug: string }> };

/** Pre-render every published case study; new ones render on first visit, then stay static. */
export async function generateStaticParams() {
  const entries = await getSitemapEntries();
  return entries.flatMap((e) => LOCALES.map((locale) => ({ locale, slug: e.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const project = await getProject(slug, locale);
  if (!project) return {};
  return pageMetadata({
    locale,
    href: `/work/${slug}`,
    title: project.title,
    description: project.summary,
    image: project.cover,
    available: project.availableLocales,
    type: 'article',
  });
}

export default async function ProjectPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const project = await getProject(slug, locale);
  if (!project) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: project.title,
    abstract: project.summary,
    inLanguage: project.contentLocale,
    datePublished: project.publishedAt,
    dateModified: project.updatedAt,
    author: { '@type': 'Person', name: 'William Van Loey', url: publicEnv.NEXT_PUBLIC_SITE_URL },
    keywords: project.technologies.map((t) => t.name).join(', '),
    ...(project.repoUrl && { codeRepository: project.repoUrl }),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <ProjectArticle project={project} locale={locale} requestPath={`/projects/${slug}?locale=${locale}`} />
    </>
  );
}
