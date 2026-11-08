'use client';

import type { PublicCategory, PublicProjectSummary } from '@portfolio/contracts';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ProjectCard } from './project-card';

/** Category filter applied in the browser: the full list is small and already in the static page. */
export function WorkBrowser({
  projects,
  categories,
}: {
  projects: PublicProjectSummary[];
  categories: PublicCategory[];
}) {
  const t = useTranslations('work');
  const labels = { featured: t('featured'), read: t('read') };
  const [active, setActive] = useState<string | null>(null);
  const visible = active ? projects.filter((p) => p.category?.slug === active) : projects;

  return (
    <div className="flex flex-col gap-8">
      {categories.length > 1 && (
        <div role="group" aria-label={t('filter')} className="flex flex-wrap items-center gap-2">
          {[{ slug: null, name: t('all') }, ...categories].map((c) => (
            <button
              key={c.slug ?? 'all'}
              type="button"
              aria-pressed={active === c.slug}
              onClick={() => setActive(c.slug)}
              className="cursor-pointer border border-line px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-line-strong hover:text-fg aria-pressed:border-fg aria-pressed:bg-fg aria-pressed:text-bg"
            >
              {c.name}
            </button>
          ))}
          <p aria-live="polite" className="ml-auto font-mono text-xs text-muted">
            {t('count', { count: visible.length })}
          </p>
        </div>
      )}
      <div className="hairline-grid grid md:grid-cols-2">
        {visible.map((project, index) => (
          <ProjectCard key={project.slug} project={project} index={index} labels={labels} />
        ))}
      </div>
    </div>
  );
}
