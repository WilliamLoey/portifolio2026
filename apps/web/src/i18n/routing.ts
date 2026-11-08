import { DEFAULT_LOCALE, LOCALE_PATHS, LOCALES } from '@portfolio/contracts';
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  // Every language has its own prefix (/en, /fr, /nl, /pt-br, /es): one canonical URL per page and language.
  localePrefix: { mode: 'always', prefixes: { 'pt-BR': `/${LOCALE_PATHS['pt-BR']}` } },
  // hreflang links are emitted in each page's metadata instead.
  alternateLinks: false,
});
