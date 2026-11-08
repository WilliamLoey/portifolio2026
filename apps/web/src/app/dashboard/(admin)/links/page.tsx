import type { Certification, SocialLink } from '@portfolio/contracts';
import type { Metadata } from 'next';
import { CertificationsManager, SocialLinksManager } from '@/components/dashboard/reference-managers';
import { PageHeader } from '@/components/dashboard/ui';
import { adminGetOrEmpty } from '@/lib/admin.server';

export const metadata: Metadata = { title: 'Links & certificates' };

export default async function LinksPage() {
  const [links, certifications] = await Promise.all([
    adminGetOrEmpty<SocialLink[]>('/admin/social-links', []),
    adminGetOrEmpty<Certification[]>('/admin/certifications', []),
  ]);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Links & certificates" description="Changes go live as soon as you save." />
      <SocialLinksManager initial={links} />
      <CertificationsManager initial={certifications} />
    </div>
  );
}
