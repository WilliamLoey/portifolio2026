import type { Locale, PublicExperience, PublicProfile } from '@portfolio/contracts';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { RequestLine } from '../ui/request-line';
import { LocalClock } from './local-clock';

export async function Hero({
  profile,
  current,
  locale,
}: {
  profile: PublicProfile | null;
  current: PublicExperience | undefined;
  locale: Locale;
}) {
  const t = await getTranslations('hero');

  if (!profile) {
    return (
      <section className="page-gutter mx-auto max-w-page py-24 md:py-32">
        <RequestLine path={`/site?locale=${locale}`} />
        <h1 className="mt-4 text-5xl font-extrabold md:text-7xl">William Van Loey</h1>
        <p className="mt-6 max-w-xl text-lg text-muted">{t('emptyText')}</p>
        <Link href="/#contact" className="mt-8 inline-block border border-fg bg-fg px-5 py-3 text-sm font-medium text-bg">
          {t('ctaContact')}
        </Link>
      </section>
    );
  }

  const [first, ...rest] = profile.fullName.split(' ');

  return (
    <section aria-labelledby="hero-title" className="page-gutter mx-auto max-w-page">
      <div className="grid items-end gap-10 pt-12 md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] md:gap-16 md:pt-20">
        <div className="flex flex-col gap-6 pb-4 md:pb-16">
          <RequestLine path={`/profile?locale=${locale}`} className="animate-rise" />
          <h1
            id="hero-title"
            className="animate-rise text-[clamp(3rem,9vw,7.5rem)] font-extrabold leading-[0.9] tracking-[-0.045em] [animation-delay:120ms]"
            lang={profile.contentLocale}
          >
            {first}
            <br />
            {rest.join(' ')}
          </h1>
          <p className="animate-rise font-display text-xl font-normal text-muted [animation-delay:220ms] md:text-2xl" lang={profile.contentLocale}>
            {profile.role}
          </p>
          <p className="animate-rise max-w-xl text-lg [animation-delay:300ms]" lang={profile.contentLocale}>
            {profile.headline}
          </p>

          <dl className="animate-rise flex flex-wrap gap-x-8 gap-y-3 font-mono text-xs [animation-delay:380ms]">
            <div className="flex gap-2">
              <dt className="text-muted">{profile.location}</dt>
              <dd><LocalClock timeZone={profile.timezone} locale={locale} /></dd>
            </div>
            {profile.spokenLanguages.length > 0 && (
              <div className="flex gap-2">
                <dt className="text-muted">{t('speaks')}</dt>
                <dd className="text-warm">{profile.spokenLanguages.map((l) => l.name).join(' · ')}</dd>
              </div>
            )}
            {current && (
              <div className="flex gap-2">
                <dt className="text-muted">{t('now')}</dt>
                <dd>{current.company}</dd>
              </div>
            )}
          </dl>

          <div className="animate-rise flex flex-wrap items-center gap-3 [animation-delay:460ms]">
            <Link href="/work" className="border border-fg bg-fg px-5 py-3 text-sm font-medium text-bg transition-opacity hover:opacity-85">
              {t('ctaWork')}
            </Link>
            <Link href="/#contact" className="border border-line-strong px-5 py-3 text-sm font-medium transition-colors hover:border-fg">
              {t('ctaContact')}
            </Link>
            {profile.openToWork && (
              <span className="ml-1 inline-flex items-center gap-2 font-mono text-xs text-warm">
                <span aria-hidden className="size-2 rounded-full bg-warm" />
                {profile.availability ?? t('available')}
              </span>
            )}
          </div>
        </div>

        {profile.photo && (
          <figure className="relative mx-auto w-full max-w-sm md:max-w-none">
            <div className="relative aspect-[4/5] overflow-hidden bg-raised">
              <Image
                src={profile.photo.url}
                alt={profile.photo.alt}
                fill
                priority
                sizes="(min-width: 768px) 36vw, 90vw"
                className="object-cover object-[50%_20%] dark:saturate-100 [:root[data-theme=light]_&]:saturate-[.85]"
              />
            </div>
            {/* The two gels: cyan on the left, magenta on the right. */}
            <span aria-hidden className="animate-gel absolute -left-px bottom-0 top-[12%] w-0.5 bg-gradient-to-t from-transparent to-cool" />
            <span aria-hidden className="animate-gel absolute -right-px bottom-0 top-[12%] w-0.5 bg-gradient-to-t from-transparent to-warm [animation-delay:140ms]" />
          </figure>
        )}
      </div>
    </section>
  );
}
