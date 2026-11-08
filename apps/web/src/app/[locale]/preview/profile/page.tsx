import type { Locale, PublicProfile } from '@portfolio/contracts';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Markdown } from '@/components/site/markdown';
import { Hero } from '@/components/site/hero';
import { PreviewBanner } from '@/components/site/preview-banner';
import { adminGet, requireSession } from '@/lib/admin.server';
import { getSite } from '@/lib/content.server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Preview', robots: { index: false, follow: false } };

export default async function ProfilePreviewPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSession();
  const [profile, site] = await Promise.all([
    adminGet<PublicProfile>(`/admin/preview/profile?locale=${locale}`),
    getSite(locale),
  ]);
  if (!profile) notFound();

  return (
    <>
      <PreviewBanner editHref="/dashboard/profile" />
      <Hero profile={profile} current={site.experience.find((e) => e.endDate === null)} locale={locale} />
      <section className="page-gutter mx-auto mt-16 max-w-page border-t border-line py-14">
        <Markdown lang={profile.contentLocale}>{profile.bio}</Markdown>
      </section>
    </>
  );
}
