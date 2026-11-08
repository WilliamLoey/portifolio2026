import type {
  Locale,
  PublicEducation,
  PublicExperience,
  PublicTechnology,
  SitePayload,
  TechnologyGroup,
} from '@portfolio/contracts';
import { TECHNOLOGY_GROUPS } from '@portfolio/contracts';
import { getTranslations } from 'next-intl/server';

function monthYear(value: string, locale: Locale) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year!, month! - 1, 1)),
  );
}

export async function ExperienceList({ items, locale }: { items: PublicExperience[]; locale: Locale }) {
  const t = await getTranslations('experience');
  if (items.length === 0) return <p className="text-muted">{t('empty')}</p>;

  return (
    <ol className="border-t border-line">
      {items.map((item) => (
        <li key={item.id} className="grid gap-2 border-b border-line py-6 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-10" lang={item.contentLocale}>
          <p className="font-mono text-xs tabular-nums text-muted">
            {monthYear(item.startDate, locale)} — {item.endDate ? monthYear(item.endDate, locale) : <span className="text-warm">{t('present')}</span>}
          </p>
          <div className="flex flex-col gap-2">
            <h3 className="text-xl font-semibold">
              {item.role}{' '}
              <span className="font-normal text-muted">
                ·{' '}
                {item.companyUrl ? (
                  <a href={item.companyUrl} className="underline decoration-line-strong underline-offset-4 hover:text-fg" rel="noopener noreferrer" target="_blank">
                    {item.company}
                  </a>
                ) : (
                  item.company
                )}
              </span>
            </h3>
            <p className="font-mono text-xs text-muted">
              {t(`types.${item.employmentType}`)}
              {item.location && ` · ${item.location}`}
            </p>
            {item.summary && <p className="max-w-prose">{item.summary}</p>}
            {item.highlights.length > 0 && (
              <ul className="flex max-w-prose list-[square] flex-col gap-1 pl-5 text-muted marker:text-faint">
                {item.highlights.map((h) => <li key={h}>{h}</li>)}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export async function StackGroups({ technologies }: { technologies: PublicTechnology[] }) {
  const t = await getTranslations('stack.groups');
  const groups = TECHNOLOGY_GROUPS.map((group) => ({
    group,
    items: technologies.filter((tech) => tech.group === group),
  })).filter((g) => g.items.length > 0);

  return (
    <dl className="hairline-grid grid sm:grid-cols-2 lg:grid-cols-3">
      {groups.map(({ group, items }) => (
        <div key={group} className="flex flex-col gap-3 bg-bg p-6">
          <dt className="font-mono text-xs uppercase tracking-[0.08em] text-muted">{t(group as TechnologyGroup)}</dt>
          <dd>
            <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-lg">
              {items.map((tech) => <li key={tech.slug}>{tech.name}</li>)}
            </ul>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export async function EducationList({ items }: { items: PublicEducation[] }) {
  const t = await getTranslations('education.status');
  return (
    <ul className="border-t border-line">
      {items.map((item) => (
        <li key={item.id} className="flex flex-col gap-1 border-b border-line py-5" lang={item.contentLocale}>
          <p className="font-mono text-xs text-muted">
            {item.startYear} — {item.endYear ?? '…'} · <span className={item.status === 'in_progress' ? 'text-warm' : ''}>{t(item.status)}</span>
          </p>
          <h3 className="text-lg font-semibold">{item.degree}</h3>
          <p className="text-muted">
            {item.url ? <a href={item.url} rel="noopener noreferrer" target="_blank" className="underline decoration-line-strong underline-offset-4 hover:text-fg">{item.institution}</a> : item.institution}
            {item.field && ` · ${item.field}`}
          </p>
          {item.notes && <p className="max-w-prose text-sm text-muted">{item.notes}</p>}
        </li>
      ))}
    </ul>
  );
}

export async function LanguagesList({ languages }: { languages: NonNullable<SitePayload['profile']>['spokenLanguages'] }) {
  const t = await getTranslations('languages.levels');
  return (
    <ul className="border-t border-line">
      {languages.map((l) => (
        <li key={l.name} className="flex items-baseline justify-between gap-4 border-b border-line py-4">
          <span className="text-lg">{l.name}</span>
          <span className="font-mono text-xs text-warm">{t(l.level)}</span>
        </li>
      ))}
    </ul>
  );
}

export async function CertificationList({ items, locale }: { items: SitePayload['certifications']; locale: Locale }) {
  const t = await getTranslations('certifications');
  return (
    <ul className="hairline-grid grid sm:grid-cols-2">
      {items.map((c) => (
        <li key={c.id} className="flex flex-col gap-1 bg-bg p-4">
          <p className="font-medium">{c.name}</p>
          <p className="font-mono text-xs text-muted">
            {c.issuer}
            {c.issuedOn && ` · ${monthYear(c.issuedOn, locale)}`}
            {c.credentialUrl && (
              <>
                {' · '}
                <a href={c.credentialUrl} className="text-cool underline underline-offset-4" rel="noopener noreferrer" target="_blank">{t('verify')}</a>
              </>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
