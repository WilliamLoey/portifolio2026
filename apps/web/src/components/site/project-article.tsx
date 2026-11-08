import type { Locale, PublicProject } from '@portfolio/contracts';
import { LOCALE_NAMES } from '@portfolio/contracts';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { RequestLine } from '../ui/request-line';
import { Markdown } from './markdown';

/** Case study layout, shared by the public page and the dashboard preview. */
export async function ProjectArticle({ project, locale, requestPath }: { project: PublicProject; locale: Locale; requestPath: string }) {
  const t = await getTranslations('project');
  const isFallback = project.contentLocale !== locale;

  const facts = [
    project.role && { label: t('role'), value: project.role },
    project.year && { label: t('year'), value: String(project.year) },
    project.category && { label: t('category'), value: project.category.name },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <article className="page-gutter mx-auto max-w-page pb-24 pt-10 md:pt-16">
      <Link href="/work" className="font-mono text-xs text-muted hover:text-fg">← {t('back')}</Link>

      <header className="mt-10 flex flex-col gap-6" lang={project.contentLocale}>
        <RequestLine path={requestPath} />
        <h1 className="max-w-4xl text-4xl font-extrabold sm:text-5xl md:text-6xl">{project.title}</h1>
        <p className="max-w-2xl text-xl text-muted">{project.summary}</p>
      </header>

      {isFallback && (
        <p role="note" className="mt-8 max-w-2xl border-l-2 border-warm pl-4 text-sm text-muted">
          {t('fallback', { language: LOCALE_NAMES[project.contentLocale].native })}
        </p>
      )}

      {project.cover && (
        <div className="relative mt-12 aspect-[16/9] overflow-hidden bg-raised">
          <Image src={project.cover.url} alt={project.cover.alt} fill priority sizes="(min-width: 1280px) 1200px, 100vw" className="object-cover" />
        </div>
      )}

      <div className="mt-14 grid gap-14 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-8 lg:sticky lg:top-24 lg:self-start">
          {facts.length > 0 && (
            <dl className="flex flex-col gap-4 border-t border-line pt-4">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt className="font-mono text-xs text-muted">{f.label}</dt>
                  <dd lang={project.contentLocale}>{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {project.technologies.length > 0 && (
            <div className="border-t border-line pt-4">
              <h2 className="font-mono text-xs font-normal tracking-normal text-muted">{t('stack')}</h2>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {project.technologies.map((tech) => (
                  <li key={tech.slug} className="border border-line px-2 py-0.5 font-mono text-2xs">{tech.name}</li>
                ))}
              </ul>
            </div>
          )}
          {(project.repoUrl || project.liveUrl) && (
            <div className="border-t border-line pt-4">
              <h2 className="font-mono text-xs font-normal tracking-normal text-muted">{t('links')}</h2>
              <ul className="mt-2 flex flex-col gap-1">
                {project.liveUrl && <li><a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="text-cool underline underline-offset-4">{t('liveSite')} ↗</a></li>}
                {project.repoUrl && <li><a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="text-cool underline underline-offset-4">{t('repository')} ↗</a></li>}
              </ul>
            </div>
          )}
        </aside>

        <div className="flex min-w-0 flex-col gap-12">
          <Markdown lang={project.contentLocale}>{project.body}</Markdown>
          {project.outcome && (
            <section className="max-w-[68ch] border-l-2 border-warm pl-5" lang={project.contentLocale}>
              <h2 className="font-mono text-xs font-normal tracking-normal text-muted">{t('outcome')}</h2>
              <p className="mt-2 font-display text-2xl font-semibold leading-snug">{project.outcome}</p>
            </section>
          )}
          <div className="flex flex-wrap items-center gap-4 border-t border-line pt-8">
            <p className="text-lg">{t('next')}</p>
            <Link href="/#contact" className="border border-fg bg-fg px-5 py-2.5 text-sm font-medium text-bg">{t('nextCta')}</Link>
          </div>
        </div>
      </div>
    </article>
  );
}
