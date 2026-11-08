import { useTranslations } from 'next-intl';
import { RequestLine } from '@/components/ui/request-line';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('notFound');
  return (
    <div className="page-gutter mx-auto flex max-w-page flex-col gap-5 py-28">
      <RequestLine path="/…" status={404} />
      <h1 className="text-5xl font-extrabold md:text-6xl">{t('title')}</h1>
      <p className="text-lg text-muted">{t('text')}</p>
      <Link href="/" className="w-fit border border-fg bg-fg px-5 py-3 text-sm font-medium text-bg">{t('home')}</Link>
    </div>
  );
}
