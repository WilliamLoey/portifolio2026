import { LOCALES, Locale, OG_LOCALES } from '@portfolio/contracts';
import type { Metadata } from 'next';
import { getPathname } from '@/i18n/navigation';
import { publicEnv } from './env.public';

type Href = Parameters<typeof getPathname>[0]['href'];

const absolute = (path: string) => `${publicEnv.NEXT_PUBLIC_SITE_URL}${path}`;

/**
 * Canonical URL for this language plus hreflang alternates for the languages
 * the page actually exists in (x-default → English).
 */
export function localizedAlternates(locale: Locale, href: Href, available: readonly Locale[] = LOCALES): Metadata['alternates'] {
  const languages: Record<string, string> = {};
  for (const l of available) languages[l] = absolute(getPathname({ locale: l, href }));
  languages['x-default'] = absolute(getPathname({ locale: 'en', href }));
  return { canonical: absolute(getPathname({ locale, href })), languages };
}

export function pageMetadata(options: {
  locale: Locale;
  href: Href;
  title: string;
  description: string;
  image?: { url: string; width?: number | null; height?: number | null; alt: string } | null;
  available?: readonly Locale[];
  type?: 'website' | 'article' | 'profile';
}): Metadata {
  const { locale, href, title, description, image, available, type = 'website' } = options;
  const images = image ? [{ url: image.url, width: image.width ?? undefined, height: image.height ?? undefined, alt: image.alt }] : undefined;
  return {
    title,
    description,
    alternates: localizedAlternates(locale, href, available),
    openGraph: {
      title,
      description,
      type,
      locale: OG_LOCALES[locale],
      alternateLocale: (available ?? LOCALES).filter((l) => l !== locale).map((l) => OG_LOCALES[l]),
      url: absolute(getPathname({ locale, href })),
      siteName: 'William Van Loey',
      images,
    },
    twitter: { card: images ? 'summary_large_image' : 'summary', title, description, images: images?.map((i) => i.url) },
  };
}
