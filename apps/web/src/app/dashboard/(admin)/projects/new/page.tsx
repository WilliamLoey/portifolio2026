import type { Category, MediaAsset, Technology } from '@portfolio/contracts';
import type { Metadata } from 'next';
import { ProjectEditor } from '@/components/dashboard/project-editor';
import { adminGetOrEmpty } from '@/lib/admin.server';

export const metadata: Metadata = { title: 'New project' };

export default async function NewProjectPage() {
  const [technologies, categories, media] = await Promise.all([
    adminGetOrEmpty<Technology[]>('/admin/technologies', []),
    adminGetOrEmpty<Category[]>('/admin/categories', []),
    adminGetOrEmpty<MediaAsset[]>('/admin/media', []),
  ]);
  return <ProjectEditor technologies={technologies} categories={categories} media={media} />;
}
