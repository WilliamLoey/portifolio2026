import type { AdminProject, Category, MediaAsset, Technology } from '@portfolio/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProjectEditor } from '@/components/dashboard/project-editor';
import { adminGet, adminGetOrEmpty } from '@/lib/admin.server';

export const metadata: Metadata = { title: 'Edit project' };

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project, technologies, categories, media] = await Promise.all([
    adminGet<AdminProject>(`/admin/projects/${encodeURIComponent(id)}`),
    adminGetOrEmpty<Technology[]>('/admin/technologies', []),
    adminGetOrEmpty<Category[]>('/admin/categories', []),
    adminGetOrEmpty<MediaAsset[]>('/admin/media', []),
  ]);
  if (!project) notFound();
  return <ProjectEditor key={project.id} project={project} technologies={technologies} categories={categories} media={media} />;
}
