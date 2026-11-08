import { z } from 'zod';

/**
 * Supported content languages. English is the default and the only mandatory one:
 * every translatable entity must have an English version before it can be saved.
 */
export const LOCALES = ['en', 'fr', 'nl', 'pt-BR', 'es'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export const localeSchema = z.enum(LOCALES);

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Names shown in the language switcher (native) and in the dashboard (English). */
export const LOCALE_NAMES: Record<Locale, { native: string; english: string; short: string }> = {
  en: { native: 'English', english: 'English', short: 'EN' },
  fr: { native: 'Français', english: 'French', short: 'FR' },
  nl: { native: 'Nederlands', english: 'Dutch', short: 'NL' },
  'pt-BR': { native: 'Português (Brasil)', english: 'Portuguese (Brazil)', short: 'PT' },
  es: { native: 'Español', english: 'Spanish', short: 'ES' },
};

/** Lower-case URL segment for each locale: /en, /fr, /nl, /pt-br, /es. */
export const LOCALE_PATHS: Record<Locale, string> = {
  en: 'en',
  fr: 'fr',
  nl: 'nl',
  'pt-BR': 'pt-br',
  es: 'es',
};

/** Open Graph locale codes. */
export const OG_LOCALES: Record<Locale, string> = {
  en: 'en_US',
  fr: 'fr_BE',
  nl: 'nl_BE',
  'pt-BR': 'pt_BR',
  es: 'es_ES',
};
