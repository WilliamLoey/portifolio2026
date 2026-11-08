'use client';

import {
  Category,
  categoryInputSchema,
  Certification,
  certificationInputSchema,
  LOCALE_NAMES,
  LOCALES,
  SOCIAL_KINDS,
  SocialLink,
  socialLinkInputSchema,
  Technology,
  TECHNOLOGY_GROUPS,
  technologyInputSchema,
} from '@portfolio/contracts';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { CollectionManager } from './collection-manager';
import { slugify } from './form-helpers';
import { Checkbox, describedBy, Field, Input, Select } from './ui';

function err<F extends FieldValues>(form: UseFormReturn<F>, path: string): string | undefined {
  const parts = path.split('.');
  let node: unknown = form.formState.errors;
  for (const p of parts) node = (node as Record<string, unknown> | undefined)?.[p];
  return (node as { message?: string } | undefined)?.message;
}

/* ── Technologies ── */

type TechForm = { name: string; slug: string; group: Technology['group']; featured: boolean };

export function TechnologiesManager({ initial }: { initial: Technology[] }) {
  return (
    <CollectionManager<Technology, TechForm>
      title="Technologies"
      description="Featured technologies appear in the Stack section, grouped and in this order. All of them can be attached to projects."
      noun="Technology"
      basePath="/technologies"
      initial={initial}
      schema={technologyInputSchema}
      empty={{ name: '', slug: '', group: 'backend', featured: true }}
      toForm={({ name, slug, group, featured }) => ({ name, slug, group, featured })}
      deleteWarning={(t) => (t.projectCount > 0 ? `It is used by ${t.projectCount} project(s) and will be removed from them.` : 'This change applies to the site immediately.')}
      renderRow={(t) => (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{t.name}</span>
          <span className="font-mono text-2xs text-muted">{t.group}</span>
          {!t.featured && <span className="font-mono text-2xs text-faint">· not in Stack section</span>}
          {t.projectCount > 0 && <span className="font-mono text-2xs text-muted">· {t.projectCount} project(s)</span>}
        </p>
      )}
      renderForm={(form, p) => (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id={`${p}-name`} label="Name" error={err(form, 'name')}>
            <Input
              id={`${p}-name`}
              {...form.register('name', { onChange: (e) => !form.formState.dirtyFields.slug && form.setValue('slug', slugify(e.target.value)) })}
              {...describedBy(`${p}-name`, err(form, 'name'))}
            />
          </Field>
          <Field id={`${p}-slug`} label="Slug" error={err(form, 'slug')}><Input id={`${p}-slug`} {...form.register('slug')} /></Field>
          <Field id={`${p}-group`} label="Group">
            <Select id={`${p}-group`} {...form.register('group')}>{TECHNOLOGY_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}</Select>
          </Field>
          <Checkbox id={`${p}-featured`} label="Show in the Stack section" {...form.register('featured')} />
        </div>
      )}
    />
  );
}

/* ── Categories ── */

type CategoryForm = { slug: string; translations: Record<string, { name: string }> };

export function CategoriesManager({ initial }: { initial: Category[] }) {
  return (
    <CollectionManager<Category, CategoryForm>
      title="Project categories"
      description="Used to filter the Work page. Only categories with published projects are shown to visitors."
      noun="Category"
      basePath="/categories"
      initial={initial}
      reorderable={false}
      schema={categoryInputSchema}
      empty={{ slug: '', translations: Object.fromEntries(LOCALES.map((l) => [l, { name: '' }])) }}
      toForm={(c) => ({ slug: c.slug, translations: Object.fromEntries(LOCALES.map((l) => [l, { name: c.translations[l]?.name ?? '' }])) })}
      deleteWarning={(c) => (c.projectCount > 0 ? `${c.projectCount} project(s) will become uncategorised.` : 'This change applies to the site immediately.')}
      renderRow={(c) => (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{c.translations.en?.name ?? c.slug}</span>
          <span className="font-mono text-2xs text-muted">{LOCALES.filter((l) => c.translations[l]).map((l) => LOCALE_NAMES[l].short).join(' ')}</span>
        </p>
      )}
      renderForm={(form, p) => (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id={`${p}-slug`} label="Slug" error={err(form, 'slug')}><Input id={`${p}-slug`} {...form.register('slug')} /></Field>
          {LOCALES.map((l) => (
            <Field key={l} id={`${p}-name-${l}`} label={`Name (${LOCALE_NAMES[l].english})${l === 'en' ? '' : ' · optional'}`} error={err(form, `translations.${l}.name`) ?? (l === 'en' ? err(form, 'translations.en') : undefined)}>
              <Input
                id={`${p}-name-${l}`}
                lang={l}
                {...form.register(`translations.${l}.name`, l === 'en' ? { onChange: (e) => !form.formState.dirtyFields.slug && form.setValue('slug', slugify(e.target.value)) } : {})}
              />
            </Field>
          ))}
        </div>
      )}
    />
  );
}

/* ── Certifications ── */

type CertForm = { name: string; issuer: string; issuedOn: string; credentialId: string; credentialUrl: string; visible: boolean };

export function CertificationsManager({ initial }: { initial: Certification[] }) {
  return (
    <CollectionManager<Certification, CertForm>
      title="Certificates"
      description="Listed on the About page. Names are proper nouns and are not translated."
      noun="Certificate"
      basePath="/certifications"
      initial={initial}
      schema={certificationInputSchema}
      empty={{ name: '', issuer: '', issuedOn: '', credentialId: '', credentialUrl: '', visible: true }}
      toForm={(c) => ({ name: c.name, issuer: c.issuer, issuedOn: c.issuedOn ?? '', credentialId: c.credentialId ?? '', credentialUrl: c.credentialUrl ?? '', visible: c.visible })}
      renderRow={(c) => (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{c.name}</span>
          <span className="font-mono text-2xs text-muted">{c.issuer}{c.issuedOn && ` · ${c.issuedOn}`}</span>
          {!c.visible && <span className="font-mono text-2xs text-faint">· hidden</span>}
        </p>
      )}
      renderForm={(form, p) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${p}-name`} label="Name" error={err(form, 'name')}><Input id={`${p}-name`} {...form.register('name')} /></Field>
          <Field id={`${p}-issuer`} label="Issuer" error={err(form, 'issuer')}><Input id={`${p}-issuer`} {...form.register('issuer')} /></Field>
          <Field id={`${p}-issuedOn`} label="Issued" error={err(form, 'issuedOn')}><Input id={`${p}-issuedOn`} type="month" {...form.register('issuedOn')} /></Field>
          <Field id={`${p}-credentialId`} label="Credential ID" error={err(form, 'credentialId')}><Input id={`${p}-credentialId`} {...form.register('credentialId')} /></Field>
          <Field id={`${p}-credentialUrl`} label="Verification URL" error={err(form, 'credentialUrl')} className="sm:col-span-2"><Input id={`${p}-credentialUrl`} type="url" {...form.register('credentialUrl')} /></Field>
          <Checkbox id={`${p}-visible`} label="Show on the site" {...form.register('visible')} />
        </div>
      )}
    />
  );
}

/* ── Social links ── */

type LinkForm = { kind: SocialLink['kind']; label: string; url: string; visible: boolean };

export function SocialLinksManager({ initial }: { initial: SocialLink[] }) {
  return (
    <CollectionManager<SocialLink, LinkForm>
      title="Links"
      description="Shown in the footer and in search-engine structured data (sameAs)."
      noun="Link"
      basePath="/social-links"
      initial={initial}
      schema={socialLinkInputSchema}
      empty={{ kind: 'github', label: '', url: '', visible: true }}
      toForm={({ kind, label, url, visible }) => ({ kind, label, url, visible })}
      renderRow={(l) => (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{l.label}</span>
          <span className="truncate font-mono text-2xs text-muted">{l.url}</span>
          {!l.visible && <span className="font-mono text-2xs text-faint">· hidden</span>}
        </p>
      )}
      renderForm={(form, p) => (
        <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)_minmax(0,2fr)]">
          <Field id={`${p}-kind`} label="Type"><Select id={`${p}-kind`} {...form.register('kind')}>{SOCIAL_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</Select></Field>
          <Field id={`${p}-label`} label="Label" error={err(form, 'label')}><Input id={`${p}-label`} {...form.register('label')} /></Field>
          <Field id={`${p}-url`} label="URL or email" error={err(form, 'url')}><Input id={`${p}-url`} {...form.register('url')} {...describedBy(`${p}-url`, err(form, 'url'))} /></Field>
          <Checkbox id={`${p}-visible`} label="Show on the site" {...form.register('visible')} />
        </div>
      )}
    />
  );
}
