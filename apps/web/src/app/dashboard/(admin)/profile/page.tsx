import type { AdminProfile, MediaAsset } from '@portfolio/contracts';
import type { Metadata } from 'next';
import { ProfileEditor } from '@/components/dashboard/profile-editor';
import { adminGet, adminGetOrEmpty } from '@/lib/admin.server';

export const metadata: Metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const [profile, media] = await Promise.all([
    adminGet<AdminProfile>('/admin/profile'),
    adminGetOrEmpty<MediaAsset[]>('/admin/media', []),
  ]);
  return <ProfileEditor profile={profile} media={media} />;
}
