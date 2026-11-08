import { DEFAULT_LOCALE } from '@portfolio/contracts';
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

type Messages = Record<string, unknown>;

/** Missing keys in a language fall back to English instead of breaking the page. */
function withFallback(base: Messages, override: Messages): Messages {
  const result: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const baseValue = base[key];
    result[key] =
      value && typeof value === 'object' && baseValue && typeof baseValue === 'object'
        ? withFallback(baseValue as Messages, value as Messages)
        : value;
  }
  return result;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const english = (await import('../../messages/en.json')).default as Messages;
  const messages =
    locale === DEFAULT_LOCALE
      ? english
      : withFallback(english, (await import(`../../messages/${locale}.json`)).default as Messages);

  return {
    locale,
    messages,
    onError(error) {
      if (process.env.NODE_ENV !== 'production') console.warn(`[i18n] ${error.message}`);
    },
    getMessageFallback: ({ namespace, key }) => [namespace, key].filter(Boolean).join('.'),
  };
});
