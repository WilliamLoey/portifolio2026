import { getTranslations } from 'next-intl/server';

export async function PreviewBanner({ editHref }: { editHref: string }) {
  const t = await getTranslations('preview');
  return (
    <div role="status" className="sticky top-16 z-30 border-b border-warm bg-warm text-on-accent">
      <div className="page-gutter mx-auto flex max-w-page flex-wrap items-center justify-between gap-2 py-2 text-sm font-medium">
        <p>{t('banner')}</p>
        <a href={editHref} className="underline underline-offset-4">{t('back')}</a>
      </div>
    </div>
  );
}
