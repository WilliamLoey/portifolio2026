import type { Category, Technology } from '@portfolio/contracts';
import type { Metadata } from 'next';
import { CategoriesManager, TechnologiesManager } from '@/components/dashboard/reference-managers';
import { PageHeader } from '@/components/dashboard/ui';
import { adminGetOrEmpty } from '@/lib/admin.server';

export const metadata: Metadata = { title: 'Skills & categories' };

export default async function SkillsPage() {
  const [technologies, categories] = await Promise.all([
    adminGetOrEmpty<Technology[]>('/admin/technologies', []),
    adminGetOrEmpty<Category[]>('/admin/categories', []),
  ]);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Skills & categories" description="Reference data has no draft: changes go live as soon as you save." />
      <TechnologiesManager initial={technologies} />
      <CategoriesManager initial={categories} />
    </div>
  );
}
