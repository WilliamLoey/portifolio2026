import type { Locale } from '@portfolio/contracts';
import type { Metadata, Viewport } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';
import { routing } from '@/i18n/routing';
import { publicEnv } from '@/lib/env.public';
import { getSite } from '@/lib/content.server';
import { fontVariables } from '@/lib/fonts';
import { themeInitScript } from '@/lib/theme';
import '../globals.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f1f3f7' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0c14' },
  ],
  viewportFit: 'cover',
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    metadataBase: new URL(publicEnv.NEXT_PUBLIC_SITE_URL),
    title: { default: t('title'), template: '%s · William Van Loey' },
    description: t('description'),
    applicationName: 'William Van Loey',
    authors: [{ name: 'William Van Loey' }],
    formatDetection: { telephone: false },
  };
}

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale as Locale);
  const site = await getSite(locale as Locale); // deduplicated with the page's own request

  return (
    // suppressHydrationWarning: data-theme is set by the inline script before React hydrates.
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh">
        <NextIntlClientProvider>
          <SiteHeader />
          <main id="main" tabIndex={-1} className="focus:outline-none">
            {children}
          </main>
          <SiteFooter links={site.socialLinks} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
