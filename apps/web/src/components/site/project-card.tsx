import type { PublicProjectSummary } from '@portfolio/contracts';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';

/**
 * Whole card is one link (to the case study). Hovering lights its top edge with a gel colour,
 * alternating cool / warm so neighbouring cards differ.
 */
export function ProjectCard({
  project,
  index,
  size = 'regular',
  labels,
}: {
  project: PublicProjectSummary;
  index: number;
  size?: 'large' | 'regular';
  labels: { featured: string; read: string };
}) {
  const gel = index % 2 === 0 ? 'bg-cool' : 'bg-warm';
  return (
    <article className="group relative flex h-full flex-col bg-bg transition-colors hover:bg-surface" lang={project.contentLocale}>
      <span aria-hidden className={`absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 ${gel} transition-transform duration-500 ease-out-soft group-hover:scale-x-100 group-focus-within:scale-x-100`} />
      {project.cover && (
        <div className={`relative overflow-hidden bg-raised ${size === 'large' ? 'aspect-[16/9]' : 'aspect-[3/2]'}`}>
          <Image
            src={project.cover.url}
            alt={project.cover.alt}
            fill
            sizes={size === 'large' ? '(min-width: 1024px) 60vw, 100vw' : '(min-width: 1024px) 40vw, 100vw'}
            className="object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.02]"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-6 md:p-8">
        <p className="flex justify-between gap-4 font-mono text-xs text-muted">
          <span>
            {String(index + 1).padStart(2, '0')}
            {project.category && ` · ${project.category.name}`}
            {project.featured && <span className="text-warm"> · {labels.featured}</span>}
          </span>
          {project.year && <span className="tabular-nums">{project.year}</span>}
        </p>
        <h3 className={`font-semibold ${size === 'large' ? 'text-3xl md:text-4xl' : 'text-2xl'}`}>
          <Link href={`/work/${project.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {project.title}
          </Link>
        </h3>
        <p className="max-w-prose text-muted">{project.summary}</p>
        {project.technologies.length > 0 && (
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-3" aria-label="Stack">
            {project.technologies.slice(0, 6).map((tech) => (
              <li key={tech.slug} className="border border-line px-2 py-0.5 font-mono text-2xs text-muted">
                {tech.name}
              </li>
            ))}
          </ul>
        )}
        <span aria-hidden className="font-mono text-xs text-cool opacity-0 transition-opacity group-hover:opacity-100">
          {labels.read} →
        </span>
      </div>
    </article>
  );
}

/** Asymmetric grid: the first project gets the wide column. Hairline gaps instead of card shadows. */
export function ProjectGrid({
  projects,
  labels,
}: {
  projects: PublicProjectSummary[];
  labels: { featured: string; read: string };
}) {
  return (
    <div className="hairline-grid grid md:grid-cols-5">
      {projects.map((project, index) => (
        <div
          key={project.slug}
          className={
            index === 0 && projects.length > 1
              ? 'md:col-span-3 md:row-span-2'
              : projects.length === 1
                ? 'md:col-span-5'
                : 'md:col-span-2'
          }
        >
          <ProjectCard project={project} index={index} size={index === 0 ? 'large' : 'regular'} labels={labels} />
        </div>
      ))}
    </div>
  );
}
