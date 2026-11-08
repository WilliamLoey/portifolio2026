'use client';

import type { AdminProject } from '@portfolio/contracts';
import { LOCALES } from '@portfolio/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { adminRequest, ApiRequestError } from '@/lib/admin-client';
import { StatusPill, useToast } from './ui';

export function ProjectList({ initial }: { initial: AdminProject[] }) {
  const [projects, setProjects] = useState(initial);
  const [pending, setPending] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();

  async function move(index: number, delta: -1 | 1) {
    const next = [...projects];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item!);
    const previous = projects;
    setProjects(next); // optimistic
    try {
      await adminRequest('PUT', '/projects/order', { ids: next.map((p) => p.id) });
      router.refresh();
    } catch (error) {
      setProjects(previous);
      toast(error instanceof ApiRequestError ? error.message : 'Could not reorder', 'error');
    }
  }

  async function toggle(project: AdminProject, flag: 'featured' | 'showOnHome') {
    setPending(`${project.id}:${flag}`);
    try {
      const updated = await adminRequest<AdminProject>('PATCH', `/projects/${project.id}/flags`, { [flag]: !project[flag] });
      setProjects((list) => list.map((p) => (p.id === updated.id ? updated : p)));
    } catch (error) {
      toast(error instanceof ApiRequestError ? error.message : 'Could not update', 'error');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="overflow-x-auto border border-line bg-surface">
      <table className="w-full min-w-[44rem] text-sm">
        <thead>
          <tr className="border-b border-line text-left font-mono text-2xs uppercase tracking-[0.08em] text-muted">
            <th scope="col" className="w-24 px-4 py-3 font-medium">Order</th>
            <th scope="col" className="px-4 py-3 font-medium">Project</th>
            <th scope="col" className="px-4 py-3 font-medium">Status</th>
            <th scope="col" className="px-4 py-3 font-medium">Languages</th>
            <th scope="col" className="px-4 py-3 text-center font-medium">Home</th>
            <th scope="col" className="px-4 py-3 text-center font-medium">Featured</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project, index) => {
            const title = project.translations.en?.title ?? project.slug;
            return (
              <tr key={project.id} className="border-b border-line last:border-0 hover:bg-raised/50">
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move ${title} up`} className="grid size-7 cursor-pointer place-items-center border border-line disabled:opacity-30">↑</button>
                    <button type="button" disabled={index === projects.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${title} down`} className="grid size-7 cursor-pointer place-items-center border border-line disabled:opacity-30">↓</button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/projects/${project.id}`} className="font-medium hover:text-cool hover:underline">{title}</Link>
                  <p className="font-mono text-2xs text-muted">/work/{project.slug}</p>
                </td>
                <td className="px-4 py-3"><StatusPill status={project.publication.status} /></td>
                <td className="px-4 py-3 font-mono text-2xs">
                  {LOCALES.map((l) => (
                    <span key={l} className={`mr-1.5 ${project.translations[l] ? 'text-fg' : 'text-faint line-through'}`}>{l === 'pt-BR' ? 'PT' : l.toUpperCase()}</span>
                  ))}
                </td>
                {(['showOnHome', 'featured'] as const).map((flag) => (
                  <td key={flag} className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={project[flag]}
                      disabled={pending === `${project.id}:${flag}`}
                      onChange={() => toggle(project, flag)}
                      aria-label={`${flag === 'featured' ? 'Featured' : 'Show on homepage'}: ${title}`}
                      className="size-4 cursor-pointer accent-[var(--cool)]"
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
