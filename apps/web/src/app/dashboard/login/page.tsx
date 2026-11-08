import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/components/dashboard/login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <main id="main" className="page-gutter grid min-h-dvh place-items-center py-16">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col gap-2">
          <p aria-hidden className="request-line"><span className="text-cool">POST</span> /v1/auth/login</p>
          <h1 className="text-4xl font-extrabold">Sign in</h1>
          <p className="text-sm text-muted">Portfolio content management.</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
