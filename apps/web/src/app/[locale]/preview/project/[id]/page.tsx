import type { Locale, PublicProject } from '@portfolio/contracts';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { PreviewBanner } from '@/components/site/preview-banner';
import { ProjectArticle } from '@/components/site/project-article';
import { adminGet, requireSession } from '@/lib/admin.server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Preview', robots: { index: false, follow: false } };

type Props = { params: Promise<{ locale: Locale; id: string }> };

/** The draft rendered with the public layout. Requires a dashboard session; never cached. */
export default async function ProjectPreviewPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireSession();
  const project = await adminGet<PublicProject>(`/admin/preview/projects/${encodeURIComponent(id)}?locale=${locale}`);
  if (!project) notFound();

  return (
    <>
      <PreviewBanner editHref={`/dashboard/projects/${id}`} />
      <ProjectArticle project={project} locale={locale} requestPath={`/admin/preview/projects/${id}?locale=${locale}`} />
    </>
  );
}
