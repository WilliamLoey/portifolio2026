import type { MediaAsset } from '@portfolio/contracts';
import type { Metadata } from 'next';
import { MediaLibrary } from '@/components/dashboard/media-library';
import { PageHeader } from '@/components/dashboard/ui';
import { adminGetOrEmpty } from '@/lib/admin.server';

export const metadata: Metadata = { title: 'Images' };

export default async function MediaPage() {
  const media = await adminGetOrEmpty<MediaAsset[]>('/admin/media', []);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Images" description="Replacing a file updates every project and profile using it. Images in use cannot be deleted." />
      <MediaLibrary initial={media} />
    </div>
  );
}
