import type { AdminEducation } from '@portfolio/contracts';
import { notFound } from 'next/navigation';
import { EducationEditor } from '@/components/dashboard/career-editors';
import { adminGetOrEmpty } from '@/lib/admin.server';

export const metadata = { title: 'Edit education' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = (await adminGetOrEmpty<AdminEducation[]>('/admin/education', [])).find((e) => e.id === id);
  if (!item) notFound();
  return <EducationEditor key={item.id} item={item} />;
}
