import type { AdminProject } from '@portfolio/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ProjectList } from '@/components/dashboard/project-list';
import { EmptyState, PageHeader } from '@/components/dashboard/ui';
import { adminGetOrEmpty } from '@/lib/admin.server';

export const metadata: Metadata = { title: 'Projects' };

export default async function ProjectsPage() {
  const projects = await adminGetOrEmpty<AdminProject[]>('/admin/projects', []);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Projects"
        description="Order sets the sequence on the site. “Home” puts a project on the homepage (up to 6); “Featured” highlights it. Both apply immediately."
        actions={<Link href="/dashboard/projects/new" className="inline-flex h-10 items-center border border-fg bg-fg px-4 text-sm font-medium text-bg">New project</Link>}
      />
      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          text="Create your first case study. It stays a draft until you publish it."
          action={<Link href="/dashboard/projects/new" className="text-sm text-cool underline underline-offset-4">Create a project</Link>}
        />
      ) : (
        <ProjectList initial={projects} />
      )}
    </div>
  );
}
