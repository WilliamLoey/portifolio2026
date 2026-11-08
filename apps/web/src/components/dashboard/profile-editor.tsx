'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AdminProfile,
  LANGUAGE_LEVELS,
  LOCALE_PATHS,
  LOCALES,
  Locale,
  MediaAsset,
  UpdateProfileBody,
  updateProfileSchema,
} from '@portfolio/contracts';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { type Resolver, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { adminRequest, ApiRequestError } from '@/lib/admin-client';
import { applyServerErrors } from './form-helpers';
import { LocaleTabs } from './locale-tabs';
import { MediaPicker } from './media-picker';
import { PublishBar } from './publish-bar';
import { Button, Checkbox, describedBy, Field, Input, PageHeader, Panel, Select, StatusPill, Textarea, useToast, useUnsavedChangesWarning } from './ui';

const emptyT = { role: '', headline: '', bio: '', availability: '' };

type ProfileForm = Omit<UpdateProfileBody, 'translations' | 'resumeUrl'> & {
  resumeUrl: string;
  translations: Record<Locale, typeof emptyT>;
};

const LEVEL_LABELS: Record<(typeof LANGUAGE_LEVELS)[number], string> = {
  native: 'Native',
  full_professional: 'Full professional',
  professional: 'Professional working',
  limited: 'Limited working',
  elementary: 'Elementary',
};

function toForm(p: AdminProfile | null): ProfileForm {
  return {
    fullName: p?.fullName ?? '',
    email: p?.email ?? '',
    location: p?.location ?? '',
    timezone: p?.timezone ?? 'Europe/Brussels',
    openToWork: p?.openToWork ?? false,
    resumeUrl: p?.resumeUrl ?? '',
    spokenLanguages: p?.spokenLanguages ?? [],
    translations: Object.fromEntries(
      LOCALES.map((l) => {
        const t = p?.translations[l];
        return [l, t ? { ...t, availability: t.availability ?? '' } : { ...emptyT }];
      }),
    ) as ProfileForm['translations'],
  };
}

export function ProfileEditor({ profile: initial, media }: { profile: AdminProfile | null; media: MediaAsset[] }) {
  const router = useRouter();
  const toast = useToast();
  const [profile, setProfile] = useState(initial);
  const [locale, setLocale] = useState<Locale>('en');
  const [busy, setBusy] = useState<'publish' | null>(null);
  const { register, control, handleSubmit, reset, setError, formState: { errors, isDirty, isSubmitting } } = useForm<ProfileForm, unknown, UpdateProfileBody>({
    resolver: zodResolver(updateProfileSchema) as unknown as Resolver<ProfileForm, unknown, UpdateProfileBody>,
    defaultValues: toForm(initial),
  });
  const languages = useFieldArray({ control, name: 'spokenLanguages' });
  useUnsavedChangesWarning(isDirty);

  const translations = useWatch({ control, name: 'translations' });
  const filled = Object.fromEntries(LOCALES.map((l) => [l, Object.values(translations?.[l] ?? {}).some((v) => String(v ?? '').trim())]));
  const tErrors = errors.translations as Record<string, Record<string, { message?: string }>> | undefined;
  const localeErrors = Object.fromEntries(LOCALES.map((l) => [l, Boolean(tErrors?.[l])]));
  const tError = (f: keyof typeof emptyT) => tErrors?.[locale]?.[f]?.message;

  async function save(values: UpdateProfileBody) {
    try {
      const saved = await adminRequest<AdminProfile>('PUT', '/profile', values);
      setProfile(saved);
      reset(toForm(saved));
      return saved;
    } catch (error) {
      if (error instanceof ApiRequestError) applyServerErrors(error, setError);
      toast(error instanceof ApiRequestError ? error.message : 'Could not save', 'error');
      return null;
    }
  }

  const onSave = handleSubmit(async (v) => { if (await save(v)) toast('Draft saved'); }, () => toast('Some fields need attention', 'error'));
  const withSaved = (next: () => Promise<void>) =>
    handleSubmit(async (v) => { if (!isDirty && profile) return next(); if (await save(v)) await next(); }, () => toast('Fix the highlighted fields first', 'error'));

  const publish = withSaved(async () => {
    setBusy('publish');
    try {
      setProfile(await adminRequest<AdminProfile>('POST', '/profile/publish'));
      toast('Profile published');
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiRequestError ? error.message : 'Could not publish', 'error');
    } finally {
      setBusy(null);
    }
  });

  const preview = withSaved(async () => {
    window.open(`/${LOCALE_PATHS[locale]}/preview/profile`, '_blank', 'noopener');
  });

  async function setPhoto(next: { id: string; url: string } | null) {
    if (!profile) {
      toast('Save the profile once before choosing a photo', 'error');
      return;
    }
    try {
      setProfile(await adminRequest<AdminProfile>('PUT', '/profile/photo', { mediaId: next?.id ?? null }));
      toast('Photo updated in the draft. Publish to show it.');
    } catch (error) {
      toast(error instanceof ApiRequestError ? error.message : 'Could not update the photo', 'error');
    }
  }

  const status = profile?.publication.status ?? 'draft';

  return (
    <form onSubmit={onSave} noValidate className="flex flex-col gap-8">
      <PageHeader title="Profile" description={<span className="flex items-center gap-3"><StatusPill status={status} /> Hero, About page and structured data for search engines.</span>} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Text" description="English is required. Other languages fall back to English.">
            <LocaleTabs active={locale} onChange={setLocale} filled={filled} errors={localeErrors}>
              <div key={locale} className="flex flex-col gap-5" lang={locale}>
                <Field id={`role-${locale}`} label="Professional title" error={tError('role')}>
                  <Input id={`role-${locale}`} {...register(`translations.${locale}.role`)} {...describedBy(`role-${locale}`, tError('role'))} />
                </Field>
                <Field id={`headline-${locale}`} label="Headline" hint="One sentence under your name in the hero." error={tError('headline')}>
                  <Textarea id={`headline-${locale}`} rows={2} {...register(`translations.${locale}.headline`)} {...describedBy(`headline-${locale}`, tError('headline'), true)} />
                </Field>
                <Field id={`bio-${locale}`} label="Biography" hint="About page. Markdown allowed." error={tError('bio')}>
                  <Textarea id={`bio-${locale}`} rows={10} {...register(`translations.${locale}.bio`)} {...describedBy(`bio-${locale}`, tError('bio'), true)} />
                </Field>
                <Field id={`availability-${locale}`} label="Availability note" hint="Optional, e.g. “Open to remote roles in the EU”. Replaces “Open to opportunities”." error={tError('availability')}>
                  <Input id={`availability-${locale}`} {...register(`translations.${locale}.availability`)} {...describedBy(`availability-${locale}`, tError('availability'), true)} />
                </Field>
              </div>
            </LocaleTabs>
          </Panel>

          <Panel
            title="Languages you speak"
            actions={<Button size="sm" onClick={() => languages.append({ name: '', level: 'professional' })}>Add language</Button>}
          >
            {languages.fields.length === 0 && <p className="text-sm text-muted">No languages listed.</p>}
            <ul className="flex flex-col gap-3">
              {languages.fields.map((field, index) => (
                <li key={field.id} className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_14rem_auto]">
                  <Field id={`lang-${index}`} label="Language" error={errors.spokenLanguages?.[index]?.name?.message}>
                    <Input id={`lang-${index}`} {...register(`spokenLanguages.${index}.name`)} />
                  </Field>
                  <Field id={`level-${index}`} label="Level">
                    <Select id={`level-${index}`} {...register(`spokenLanguages.${index}.level`)}>
                      {LANGUAGE_LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
                    </Select>
                  </Field>
                  <Button variant="ghost" onClick={() => languages.remove(index)} aria-label={`Remove language ${index + 1}`}>Remove</Button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Details">
            <Field id="fullName" label="Full name" error={errors.fullName?.message}><Input id="fullName" autoComplete="name" {...register('fullName')} /></Field>
            <Field id="email" label="Public email" error={errors.email?.message}><Input id="email" type="email" {...register('email')} /></Field>
            <Field id="location" label="Location" error={errors.location?.message}><Input id="location" {...register('location')} /></Field>
            <Field id="timezone" label="Time zone" hint="Drives the local clock in the hero." error={errors.timezone?.message}><Input id="timezone" {...register('timezone')} /></Field>
            <Field id="resumeUrl" label="CV link" hint="Optional public URL to a PDF." error={errors.resumeUrl?.message}><Input id="resumeUrl" type="url" {...register('resumeUrl')} /></Field>
            <Checkbox id="openToWork" label="Open to opportunities" hint="Shows the status next to the hero buttons." {...register('openToWork')} />
          </Panel>
          <Panel title="Photo" description="Use a real photograph. It appears in the hero, About page and link previews.">
            <MediaPicker id="photo" label="Profile photo" value={profile?.photo ?? null} library={media} onChange={setPhoto} />
          </Panel>
        </div>
      </div>

      <PublishBar
        status={status}
        dirty={isDirty}
        saving={isSubmitting}
        busy={busy}
        exists={Boolean(profile)}
        onPublish={publish}
        onPreview={preview}
        previewLabel={`Preview (${LOCALE_PATHS[locale].toUpperCase()})`}
      />
    </form>
  );
}
