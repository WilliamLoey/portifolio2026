import type { Locale } from '@portfolio/contracts';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { WorkBrowser } from '@/components/site/work-browser';
import { RequestLine } from '@/components/ui/request-line';
import { getAllProjects, getSite } from '@/lib/content.server';
import { pageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return pageMetadata({ locale, href: '/work', title: t('workTitle'), description: t('workDescription') });
}

export default async function WorkPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, projects, site] = await Promise.all([getTranslations('work'), getAllProjects(locale), getSite(locale)]);

  return (
    <div className="page-gutter mx-auto max-w-page py-16 md:py-24">
      <header className="flex max-w-3xl flex-col gap-4">
        <RequestLine path={`/projects?locale=${locale}`} />
        <h1 className="text-5xl font-extrabold md:text-7xl">{t('allTitle')}</h1>
        <p className="text-lg text-muted">{t('lead')}</p>
      </header>
      <div className="mt-14">
        {projects.length > 0 ? (
          <WorkBrowser
            projects={projects}
            categories={site.categories}
          />
        ) : (
          <p className="border border-dashed border-line-strong p-10 text-center text-muted">{t('empty')}</p>
        )}
      </div>
    </div>
  );
}
