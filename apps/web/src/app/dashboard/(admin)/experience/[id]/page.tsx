import type { AdminExperience } from '@portfolio/contracts';
import { notFound } from 'next/navigation';
import { ExperienceEditor } from '@/components/dashboard/career-editors';
import { adminGetOrEmpty } from '@/lib/admin.server';

export const metadata = { title: 'Edit experience' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = (await adminGetOrEmpty<AdminExperience[]>('/admin/experience', [])).find((e) => e.id === id);
  if (!item) notFound();
  return <ExperienceEditor key={item.id} item={item} />;
}
