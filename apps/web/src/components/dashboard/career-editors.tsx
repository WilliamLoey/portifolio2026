'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AdminEducation,
  AdminExperience,
  EDUCATION_STATUSES,
  EducationInput,
  educationInputSchema,
  EMPLOYMENT_TYPES,
  ExperienceInput,
  experienceInputSchema,
  LOCALES,
  Locale,
} from '@portfolio/contracts';
import { useState } from 'react';
import { type Resolver, useForm, useWatch } from 'react-hook-form';
import { LocaleTabs } from './locale-tabs';
import { PublishBar } from './publish-bar';
import { ConfirmButton, describedBy, Field, Input, PageHeader, Panel, Select, StatusPill, Textarea, useUnsavedChangesWarning } from './ui';
import { usePublishable } from './use-publishable';

type TErrors = Record<string, Record<string, { message?: string }>> | undefined;

function localeState<T extends Record<string, unknown>>(translations: Record<Locale, T> | undefined, errors: TErrors) {
  return {
    filled: Object.fromEntries(LOCALES.map((l) => [l, Object.values(translations?.[l] ?? {}).some((v) => String(v ?? '').trim())])),
    errors: Object.fromEntries(LOCALES.map((l) => [l, Boolean(errors?.[l])])),
  };
}

const EMPLOYMENT_LABELS: Record<(typeof EMPLOYMENT_TYPES)[number], string> = {
  full_time: 'Full-time', part_time: 'Part-time', contract: 'Contract', freelance: 'Freelance', internship: 'Internship',
};

/* ── Experience ── */

const emptyExp = { role: '', summary: '', highlights: '' };
type ExperienceForm = {
  company: string; companyUrl: string; location: string; employmentType: ExperienceInput['employmentType'];
  startDate: string; endDate: string; translations: Record<Locale, typeof emptyExp>;
};

const expToForm = (e?: AdminExperience): ExperienceForm => ({
  company: e?.company ?? '',
  companyUrl: e?.companyUrl ?? '',
  location: e?.location ?? '',
  employmentType: e?.employmentType ?? 'full_time',
  startDate: e?.startDate ?? '',
  endDate: e?.endDate ?? '',
  translations: Object.fromEntries(LOCALES.map((l) => {
    const t = e?.translations[l];
    return [l, t ? { role: t.role, summary: t.summary, highlights: t.highlights.join('\n') } : { ...emptyExp }];
  })) as ExperienceForm['translations'],
});

/** Highlights are edited one per line and sent as an array. */
const experienceResolver: Resolver<ExperienceForm, unknown, ExperienceInput> = (values, context, options) => {
  const translations = Object.fromEntries(Object.entries(values.translations).map(([l, t]) => [l, {
    ...t,
    highlights: t.highlights.split('\n').map((h) => h.trim()).filter(Boolean),
  }]));
  return (zodResolver(experienceInputSchema) as unknown as Resolver<ExperienceForm, unknown, ExperienceInput>)(
    { ...values, translations } as unknown as ExperienceForm, context, options,
  );
};

export function ExperienceEditor({ item: initial }: { item?: AdminExperience }) {
  const [locale, setLocale] = useState<Locale>('en');
  const form = useForm<ExperienceForm, unknown, ExperienceInput>({ resolver: experienceResolver, defaultValues: expToForm(initial) });
  const { register, control, formState: { errors, isDirty, isSubmitting } } = form;
  useUnsavedChangesWarning(isDirty);
  const { item, busy, onSave, publish, unpublish, remove } = usePublishable({
    basePath: '/experience', dashboardPath: '/dashboard/experience', initial, form, toForm: expToForm,
  });
  const tErrors = errors.translations as TErrors;
  const state = localeState(useWatch({ control, name: 'translations' }), tErrors);
  const tError = (f: string) => tErrors?.[locale]?.[f]?.message;
  const status = item?.publication.status ?? 'draft';

  return (
    <form onSubmit={onSave} noValidate className="flex flex-col gap-8">
      <PageHeader title={item ? `${item.translations.en?.role ?? 'Role'} · ${item.company}` : 'New experience'} description={<StatusPill status={status} />} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel title="Text">
          <LocaleTabs active={locale} onChange={setLocale} filled={state.filled} errors={state.errors}>
            <div key={locale} className="flex flex-col gap-5" lang={locale}>
              <Field id={`role-${locale}`} label="Job title" error={tError('role')}>
                <Input id={`role-${locale}`} {...register(`translations.${locale}.role`)} {...describedBy(`role-${locale}`, tError('role'))} />
              </Field>
              <Field id={`summary-${locale}`} label="Summary" hint="What the role was about, in two or three sentences." error={tError('summary')}>
                <Textarea id={`summary-${locale}`} rows={4} {...register(`translations.${locale}.summary`)} />
              </Field>
              <Field id={`highlights-${locale}`} label="Highlights" hint="One per line. Concrete things you built or changed." error={tError('highlights')}>
                <Textarea id={`highlights-${locale}`} rows={5} {...register(`translations.${locale}.highlights`)} />
              </Field>
            </div>
          </LocaleTabs>
        </Panel>
        <div className="flex flex-col gap-6">
          <Panel title="Details">
            <Field id="company" label="Company" error={errors.company?.message}><Input id="company" {...register('company')} {...describedBy('company', errors.company?.message)} /></Field>
            <Field id="companyUrl" label="Company website" error={errors.companyUrl?.message}><Input id="companyUrl" type="url" {...register('companyUrl')} /></Field>
            <Field id="location" label="Location" hint="e.g. Charleroi, Belgium · Remote" error={errors.location?.message}><Input id="location" {...register('location')} /></Field>
            <Field id="employmentType" label="Type"><Select id="employmentType" {...register('employmentType')}>{EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{EMPLOYMENT_LABELS[t]}</option>)}</Select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id="startDate" label="Start" error={errors.startDate?.message}><Input id="startDate" type="month" {...register('startDate')} {...describedBy('startDate', errors.startDate?.message)} /></Field>
              <Field id="endDate" label="End" hint="Empty = current" error={errors.endDate?.message}><Input id="endDate" type="month" {...register('endDate')} {...describedBy('endDate', errors.endDate?.message, true)} /></Field>
            </div>
          </Panel>
          {item && (
            <Panel title="Danger zone">
              <ConfirmButton title="Delete this entry?" description="It disappears from the dashboard and, if published, from the site." confirmLabel="Delete" onConfirm={remove} size="sm">Delete entry</ConfirmButton>
            </Panel>
          )}
        </div>
      </div>
      <PublishBar status={status} dirty={isDirty} saving={isSubmitting} busy={busy} exists={Boolean(item)} onPublish={publish} onUnpublish={unpublish} />
    </form>
  );
}

/* ── Education ── */

const emptyEdu = { degree: '', field: '', notes: '' };
type EducationForm = {
  institution: string; url: string; startYear: string; endYear: string; status: EducationInput['status'];
  translations: Record<Locale, typeof emptyEdu>;
};

const eduToForm = (e?: AdminEducation): EducationForm => ({
  institution: e?.institution ?? '',
  url: e?.url ?? '',
  startYear: e ? String(e.startYear) : '',
  endYear: e?.endYear ? String(e.endYear) : '',
  status: e?.status ?? 'in_progress',
  translations: Object.fromEntries(LOCALES.map((l) => {
    const t = e?.translations[l];
    return [l, t ? { degree: t.degree, field: t.field ?? '', notes: t.notes ?? '' } : { ...emptyEdu }];
  })) as EducationForm['translations'],
});

const STATUS_LABELS: Record<(typeof EDUCATION_STATUSES)[number], string> = { in_progress: 'In progress', completed: 'Completed', discontinued: 'Not completed' };

export function EducationEditor({ item: initial }: { item?: AdminEducation }) {
  const [locale, setLocale] = useState<Locale>('en');
  const form = useForm<EducationForm, unknown, EducationInput>({
    resolver: zodResolver(educationInputSchema) as unknown as Resolver<EducationForm, unknown, EducationInput>,
    defaultValues: eduToForm(initial),
  });
  const { register, control, formState: { errors, isDirty, isSubmitting } } = form;
  useUnsavedChangesWarning(isDirty);
  const { item, busy, onSave, publish, unpublish, remove } = usePublishable({
    basePath: '/education', dashboardPath: '/dashboard/education', initial, form, toForm: eduToForm,
  });
  const tErrors = errors.translations as TErrors;
  const state = localeState(useWatch({ control, name: 'translations' }), tErrors);
  const tError = (f: string) => tErrors?.[locale]?.[f]?.message;
  const status = item?.publication.status ?? 'draft';

  return (
    <form onSubmit={onSave} noValidate className="flex flex-col gap-8">
      <PageHeader title={item ? `${item.translations.en?.degree ?? 'Degree'} · ${item.institution}` : 'New education entry'} description={<StatusPill status={status} />} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel title="Text">
          <LocaleTabs active={locale} onChange={setLocale} filled={state.filled} errors={state.errors}>
            <div key={locale} className="flex flex-col gap-5" lang={locale}>
              <Field id={`degree-${locale}`} label="Degree or program" error={tError('degree')}>
                <Input id={`degree-${locale}`} {...register(`translations.${locale}.degree`)} {...describedBy(`degree-${locale}`, tError('degree'))} />
              </Field>
              <Field id={`field-${locale}`} label="Field of study" error={tError('field')}><Input id={`field-${locale}`} {...register(`translations.${locale}.field`)} /></Field>
              <Field id={`notes-${locale}`} label="Notes" error={tError('notes')}><Textarea id={`notes-${locale}`} rows={3} {...register(`translations.${locale}.notes`)} /></Field>
            </div>
          </LocaleTabs>
        </Panel>
        <div className="flex flex-col gap-6">
          <Panel title="Details">
            <Field id="institution" label="Institution" error={errors.institution?.message}><Input id="institution" {...register('institution')} {...describedBy('institution', errors.institution?.message)} /></Field>
            <Field id="url" label="Website" error={errors.url?.message}><Input id="url" type="url" {...register('url')} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id="startYear" label="Start year" error={errors.startYear?.message}><Input id="startYear" inputMode="numeric" {...register('startYear')} {...describedBy('startYear', errors.startYear?.message)} /></Field>
              <Field id="endYear" label="End year" hint="Empty if ongoing" error={errors.endYear?.message}><Input id="endYear" inputMode="numeric" {...register('endYear')} /></Field>
            </div>
            <Field id="status" label="Status"><Select id="status" {...register('status')}>{EDUCATION_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</Select></Field>
          </Panel>
          {item && (
            <Panel title="Danger zone">
              <ConfirmButton title="Delete this entry?" description="It disappears from the dashboard and, if published, from the site." confirmLabel="Delete" onConfirm={remove} size="sm">Delete entry</ConfirmButton>
            </Panel>
          )}
        </div>
      </div>
      <PublishBar status={status} dirty={isDirty} saving={isSubmitting} busy={busy} exists={Boolean(item)} onPublish={publish} onUnpublish={unpublish} />
    </form>
  );
}
