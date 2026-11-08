import type { Metadata } from 'next';
import { PasswordForm } from '@/components/dashboard/password-form';
import { PageHeader, Panel } from '@/components/dashboard/ui';
import { publicEnv } from '@/lib/env.public';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Settings" />
      <Panel title="Password" description="Changing it signs out every other device.">
        <PasswordForm />
      </Panel>
      <Panel title="API">
        <p className="text-sm text-muted">
          Interactive documentation of every endpoint: <a className="text-cool underline underline-offset-4" href={`${publicEnv.NEXT_PUBLIC_API_URL}/docs`} target="_blank" rel="noopener noreferrer">{publicEnv.NEXT_PUBLIC_API_URL}/docs</a>
        </p>
      </Panel>
    </div>
  );
}
