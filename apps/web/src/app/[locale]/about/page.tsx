import type { Locale } from '@portfolio/contracts';
import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CertificationList, EducationList, ExperienceList, LanguagesList, StackGroups } from '@/components/site/career';
import { Markdown } from '@/components/site/markdown';
import { RequestLine } from '@/components/ui/request-line';
import { getSite } from '@/lib/content.server';
import { pageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return pageMetadata({ locale, href: '/about', title: t('aboutTitle'), description: t('aboutDescription'), type: 'profile' });
}

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-6 border-t border-line py-14 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-14">
      <h2 id={id} className="text-2xl font-bold">{title}</h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [site, t] = await Promise.all([getSite(locale), getTranslations()]);
  const profile = site.profile;

  return (
    <div className="page-gutter mx-auto max-w-page py-16 md:py-24">
      <header className="grid items-end gap-10 md:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="flex flex-col gap-4">
          <RequestLine path={`/site?locale=${locale}`} />
          <h1 className="text-5xl font-extrabold md:text-7xl">{t('about.title')}</h1>
          <p className="max-w-xl text-lg text-muted">{t('about.lead')}</p>
        </div>
        {profile?.photo && (
          <div className="relative hidden aspect-[4/5] overflow-hidden bg-raised md:block">
            <Image src={profile.photo.url} alt={profile.photo.alt} fill sizes="16rem" className="object-cover object-[50%_20%]" />
          </div>
        )}
      </header>

      <div className="mt-16">
        {profile && (
          <section aria-label={profile.role} className="border-t border-line py-14">
            <p className="font-display text-2xl font-semibold leading-snug md:text-3xl" lang={profile.contentLocale}>{profile.headline}</p>
            <div className="mt-8">
              <Markdown lang={profile.contentLocale}>{profile.bio}</Markdown>
            </div>
          </section>
        )}

        <Block id="about-experience" title={t('experience.title')}>
          <ExperienceList items={site.experience} locale={locale} />
        </Block>

        {site.education.length > 0 && (
          <Block id="about-education" title={t('education.title')}>
            <EducationList items={site.education} />
          </Block>
        )}

        {profile && profile.spokenLanguages.length > 0 && (
          <Block id="about-languages" title={t('languages.title')}>
            <LanguagesList languages={profile.spokenLanguages} />
          </Block>
        )}

        {site.technologies.length > 0 && (
          <Block id="about-stack" title={t('stack.title')}>
            <StackGroups technologies={site.technologies} />
          </Block>
        )}

        {site.certifications.length > 0 && (
          <Block id="about-certifications" title={t('certifications.title')}>
            <CertificationList items={site.certifications} locale={locale} />
          </Block>
        )}
      </div>
    </div>
  );
}
