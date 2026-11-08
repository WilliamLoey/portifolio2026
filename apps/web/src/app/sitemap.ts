import { LOCALES, Locale } from '@portfolio/contracts';
import type { MetadataRoute } from 'next';
import { getPathname } from '@/i18n/navigation';
import { getSitemapEntries } from '@/lib/content.server';
import { publicEnv } from '@/lib/env.public';

type Href = Parameters<typeof getPathname>[0]['href'];

const url = (locale: Locale, href: Href) => `${publicEnv.NEXT_PUBLIC_SITE_URL}${getPathname({ locale, href })}`;

function entry(href: Href, locales: readonly Locale[], lastModified?: string): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(locales.map((l) => [l, url(l, href)]));
  return locales.map((locale) => ({ url: url(locale, href), lastModified, alternates: { languages } }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await getSitemapEntries();
  return [
    ...entry('/', LOCALES),
    ...entry('/work', LOCALES),
    ...entry('/about', LOCALES),
    ...entry('/colophon', LOCALES),
    // Case studies are listed only in the languages they are written in.
    ...projects.flatMap((p) => entry(`/work/${p.slug}`, p.locales, p.updatedAt)),
  ];
}
