import type { Locale } from '@portfolio/contracts';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { RequestLine } from '@/components/ui/request-line';
import { publicEnv } from '@/lib/env.public';
import { pageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: Locale }> };

const DECISIONS = ['contract', 'publishing', 'revalidation', 'security', 'architecture', 'testing'] as const;
const STACK = ['Next.js 15', 'React 19', 'TypeScript', 'Tailwind CSS 4', 'next-intl', 'React Hook Form', 'Zod', 'NestJS 11', 'Prisma', 'PostgreSQL', 'Argon2id', 'Vercel', 'Neon', 'GitHub Actions', 'Docker', 'Jest', 'Vitest', 'Playwright'];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return pageMetadata({ locale, href: '/colophon', title: t('colophonTitle'), description: t('colophonDescription'), type: 'article' });
}

export default async function ColophonPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('colophon');

  return (
    <div className="page-gutter mx-auto max-w-page py-16 md:py-24">
      <header className="flex max-w-3xl flex-col gap-4">
        <RequestLine path="/docs/openapi.json" />
        <h1 className="text-5xl font-extrabold md:text-6xl">{t('title')}</h1>
        <p className="text-lg text-muted">{t('lead')}</p>
      </header>

      <section aria-labelledby="architecture" className="mt-16 border-t border-line py-12">
        <h2 id="architecture" className="text-2xl font-bold">{t('architectureTitle')}</h2>
        <p className="mt-4 max-w-2xl text-lg">{t('architecture')}</p>
        <figure className="mt-10 overflow-x-auto border border-line bg-surface p-6">
          <pre className="font-mono text-xs leading-relaxed text-muted" aria-label={t('architecture')}>{`  Visitor ──▶ Next.js (Vercel) ── static pages, revalidated on publish
                 │        ▲
     dashboard   │        │ signed POST /api/revalidate
     (BFF proxy) ▼        │
             NestJS REST API (Vercel) ──▶ PostgreSQL (Neon)
                          ├──────────────▶ Object storage (images)
                          └──────────────▶ Email (contact form)`}</pre>
        </figure>
      </section>

      <section aria-labelledby="decisions" className="border-t border-line py-12">
        <h2 id="decisions" className="text-2xl font-bold">{t('decisionsTitle')}</h2>
        <div className="mt-8 hairline-grid grid md:grid-cols-2 lg:grid-cols-3">
          {DECISIONS.map((key, i) => (
            <div key={key} className="flex flex-col gap-2 bg-bg p-6">
              <p className="font-mono text-xs text-muted">ADR-{String(i + 1).padStart(2, '0')}</p>
              <h3 className="text-lg font-semibold">{t(`decisions.${key}.title`)}</h3>
              <p className="text-muted">{t(`decisions.${key}.text`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="colophon-stack" className="border-t border-line py-12">
        <h2 id="colophon-stack" className="text-2xl font-bold">{t('stackTitle')}</h2>
        <ul className="mt-6 flex flex-wrap gap-2">
          {STACK.map((s) => <li key={s} className="border border-line px-3 py-1 font-mono text-xs">{s}</li>)}
        </ul>
        <p className="mt-10 flex flex-wrap gap-6">
          <a href={`${publicEnv.NEXT_PUBLIC_API_URL}/docs`} className="text-cool underline underline-offset-4" target="_blank" rel="noopener noreferrer">{t('api')} ↗</a>
        </p>
      </section>
    </div>
  );
}
