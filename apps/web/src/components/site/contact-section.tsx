import type { Locale } from '@portfolio/contracts';
import { getTranslations } from 'next-intl/server';
import { SectionHeading } from '../ui/request-line';
import { ContactForm } from './contact-form';
import { CopyEmail } from './copy-email';

export async function ContactSection({ email }: { email: string | null; locale: Locale }) {
  const t = await getTranslations('contact');
  return (
    <section id="contact" aria-labelledby="contact-title" className="page-gutter mx-auto max-w-page border-t border-line py-20 md:py-28">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col gap-6">
          <SectionHeading id="contact-title" request="/contact" method="POST" status={202} title={t("title")} />
          <p className="max-w-md text-lg text-muted">{t('lead')}</p>
          {email && (
            <div className="flex flex-col gap-2">
              <p className="font-mono text-xs text-muted">{t('emailLabel')}</p>
              <CopyEmail email={email} labels={{ copy: t('copy'), copied: t('copied') }} />
            </div>
          )}
        </div>
        <ContactForm />
      </div>
    </section>
  );
}
