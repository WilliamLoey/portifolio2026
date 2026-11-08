import type { Locale } from '@portfolio/contracts';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ExperienceList, StackGroups } from '@/components/site/career';
import { ContactSection } from '@/components/site/contact-section';
import { Hero } from '@/components/site/hero';
import { ProjectGrid } from '@/components/site/project-card';
import { SectionHeading } from '@/components/ui/request-line';
import { Link } from '@/i18n/navigation';
import { getSite } from '@/lib/content.server';
import { publicEnv } from '@/lib/env.public';
import { pageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [t, site] = await Promise.all([getTranslations({ locale, namespace: 'meta' }), getSite(locale)]);
  return {
    ...pageMetadata({ locale, href: '/', title: t('title'), description: site.profile?.headline ?? t('description'), image: site.profile?.photo, type: 'profile' }),
    title: { absolute: t('title') },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [site, tWork, tCap, tExp, tStack] = await Promise.all([
    getSite(locale),
    getTranslations('work'),
    getTranslations('capabilities'),
    getTranslations('experience'),
    getTranslations('stack'),
  ]);
  const current = site.experience.find((e) => e.endDate === null);
  const profile = site.profile;

  // Structured data so search engines understand who this page is about.
  const personJsonLd = profile && {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.fullName,
    jobTitle: profile.role,
    description: profile.headline,
    url: publicEnv.NEXT_PUBLIC_SITE_URL,
    image: profile.photo?.url,
    address: { '@type': 'PostalAddress', addressLocality: profile.location },
    knowsLanguage: profile.spokenLanguages.map((l) => l.name),
    worksFor: current ? { '@type': 'Organization', name: current.company } : undefined,
    sameAs: site.socialLinks.filter((l) => l.kind !== 'email').map((l) => l.url),
  };

  return (
    <>
      {personJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd).replace(/</g, '\\u003c') }} />
      )}
      <Hero profile={profile} current={current} locale={locale} />

      <section aria-labelledby="work-title" className="page-gutter mx-auto mt-20 max-w-page border-t border-line py-20 md:mt-28">
        <SectionHeading
          id="work-title"
          request={`/site?locale=${locale}#featuredProjects`}
          title={tWork('title')}
          lead={tWork('lead')}
          action={
            site.featuredProjects.length > 0 && (
              <Link href="/work" className="shrink-0 font-mono text-xs text-cool underline underline-offset-4">
                {tWork('viewAll')} →
              </Link>
            )
          }
        />
        <div className="mt-12">
          {site.featuredProjects.length > 0 ? (
            <ProjectGrid projects={site.featuredProjects} labels={{ featured: tWork('featured'), read: tWork('read') }} />
          ) : (
            <p className="border border-dashed border-line-strong p-10 text-center text-muted">{tWork('empty')}</p>
          )}
        </div>
      </section>

      <section aria-labelledby="capabilities-title" className="page-gutter mx-auto max-w-page border-t border-line py-20">
        <h2 id="capabilities-title" className="text-3xl font-extrabold sm:text-4xl">{tCap('title')}</h2>
        <div className="mt-10 hairline-grid grid md:grid-cols-3">
          {(['apis', 'automation', 'languages'] as const).map((key, i) => (
            <div key={key} className="flex flex-col gap-3 bg-bg p-6 md:p-8">
              <span aria-hidden className={`h-0.5 w-8 ${i === 2 ? 'bg-warm' : 'bg-cool'}`} />
              <h3 className="text-xl font-semibold">{tCap(`${key}.title`)}</h3>
              <p className="text-muted">{tCap(`${key}.text`)}</p>
            </div>
          ))}
        </div>
      </section>

      {site.experience.length > 0 && (
        <section aria-labelledby="experience-title" className="page-gutter mx-auto max-w-page border-t border-line py-20">
          <SectionHeading id="experience-title" request={`/site?locale=${locale}#experience`} title={tExp('title')} />
          <div className="mt-10">
            <ExperienceList items={site.experience.slice(0, 4)} locale={locale} />
          </div>
        </section>
      )}

      {site.technologies.length > 0 && (
        <section aria-labelledby="stack-title" className="page-gutter mx-auto max-w-page border-t border-line py-20">
          <SectionHeading id="stack-title" request={`/site?locale=${locale}#technologies`} title={tStack('title')} lead={tStack('lead')} />
          <div className="mt-10">
            <StackGroups technologies={site.technologies} />
          </div>
        </section>
      )}

      <ContactSection email={profile?.email ?? null} locale={locale} />
    </>
  );
}
