'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AdminProject,
  Category,
  LOCALE_PATHS,
  LOCALES,
  Locale,
  MediaAsset,
  ProjectInput,
  projectInputSchema,
  Technology,
  TECHNOLOGY_GROUPS,
} from '@portfolio/contracts';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Controller, type Resolver, useForm, useWatch } from 'react-hook-form';
import { adminRequest, ApiRequestError } from '@/lib/admin-client';
import { LocaleTabs } from './locale-tabs';
import { MediaPicker } from './media-picker';
import { applyServerErrors, slugify } from './form-helpers';
import {
  Button,
  Checkbox,
  ConfirmButton,
  describedBy,
  Field,
  Input,
  PageHeader,
  Panel,
  Select,
  StatusPill,
  Textarea,
  useToast,
  useUnsavedChangesWarning,
} from './ui';

const emptyTranslation = { title: '', summary: '', body: '', role: '', outcome: '' };

/** Raw form state: every language present as strings; the shared schema prunes and converts on submit. */
type ProjectForm = {
  slug: string;
  categoryId: string | null;
  coverId: string | null;
  repoUrl: string;
  liveUrl: string;
  year: number | null;
  technologyIds: string[];
  featured: boolean;
  showOnHome: boolean;
  translations: Record<Locale, typeof emptyTranslation>;
};

function toFormValues(project?: AdminProject): ProjectForm {
  return {
    slug: project?.slug ?? '',
    categoryId: project?.categoryId ?? null,
    coverId: project?.cover?.id ?? null,
    repoUrl: project?.repoUrl ?? '',
    liveUrl: project?.liveUrl ?? '',
    year: project?.year ?? new Date().getFullYear(),
    technologyIds: project?.technologyIds ?? [],
    featured: project?.featured ?? false,
    showOnHome: project?.showOnHome ?? true,
    translations: Object.fromEntries(
      LOCALES.map((l) => {
        const t = project?.translations[l];
        return [l, t ? { ...t, role: t.role ?? '', outcome: t.outcome ?? '' } : { ...emptyTranslation }];
      }),
    ) as ProjectForm['translations'],
  };
}

export function ProjectEditor({
  project: initial,
  technologies,
  categories,
  media,
}: {
  project?: AdminProject;
  technologies: Technology[];
  categories: Category[];
  media: MediaAsset[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [project, setProject] = useState(initial);
  const [locale, setLocale] = useState<Locale>('en');
  const [cover, setCover] = useState(initial?.cover ?? null);
  const [action, setAction] = useState<'publish' | 'unpublish' | 'preview' | null>(null);

  const form = useForm<ProjectForm, unknown, ProjectInput>({
    resolver: zodResolver(projectInputSchema) as unknown as Resolver<ProjectForm, unknown, ProjectInput>,
    defaultValues: toFormValues(initial),
  });
  const { register, control, handleSubmit, setValue, getValues, reset, setError, formState } = form;
  const { errors, isDirty, isSubmitting, dirtyFields } = formState;
  useUnsavedChangesWarning(isDirty);

  const translations = useWatch({ control, name: 'translations' });
  const filled = Object.fromEntries(LOCALES.map((l) => [l, Object.values(translations?.[l] ?? {}).some((v) => String(v ?? '').trim())]));
  const localeErrors = Object.fromEntries(LOCALES.map((l) => [l, Boolean((errors.translations as Record<string, unknown> | undefined)?.[l])]));

  /** Saves the draft. Returns the saved project, or null when validation failed. */
  async function save(values: ProjectInput): Promise<AdminProject | null> {
    try {
      const saved = project
        ? await adminRequest<AdminProject>('PUT', `/projects/${project.id}`, values)
        : await adminRequest<AdminProject>('POST', '/projects', values);
      setProject(saved);
      reset(toFormValues(saved));
      if (!project) router.replace(`/dashboard/projects/${saved.id}`);
      return saved;
    } catch (error) {
      if (error instanceof ApiRequestError) {
        if (error.status === 409) setError('slug', { message: error.message });
        else applyServerErrors(error, setError);
        toast(error.message, 'error');
      } else toast('Could not save', 'error');
      return null;
    }
  }

  const onSave = handleSubmit(async (values) => {
    if (await save(values)) toast('Draft saved. Visitors still see the published version.');
  }, () => toast('Some fields need attention', 'error'));

  /** Publish / preview need the latest draft on the server first. */
  const withSaved = (next: (saved: AdminProject) => Promise<void>) =>
    handleSubmit(async (values) => {
      const saved = isDirty || !project ? await save(values) : project;
      if (saved) await next(saved);
    }, () => toast('Fix the highlighted fields first', 'error'));

  const publish = withSaved(async (saved) => {
    setAction('publish');
    try {
      const published = await adminRequest<AdminProject>('POST', `/projects/${saved.id}/publish`);
      setProject(published);
      toast('Published. The site updates in a few seconds.');
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiRequestError ? error.message : 'Could not publish', 'error');
    } finally {
      setAction(null);
    }
  });

  const preview = withSaved(async (saved) => {
    window.open(`/${LOCALE_PATHS[locale]}/preview/project/${saved.id}`, '_blank', 'noopener');
  });

  async function unpublish() {
    if (!project) return;
    setAction('unpublish');
    try {
      setProject(await adminRequest<AdminProject>('POST', `/projects/${project.id}/unpublish`));
      toast('Unpublished. The page is no longer visible.');
    } catch (error) {
      toast(error instanceof ApiRequestError ? error.message : 'Could not unpublish', 'error');
    } finally {
      setAction(null);
    }
  }

  async function remove() {
    if (!project) return;
    try {
      await adminRequest('DELETE', `/projects/${project.id}`);
      reset(getValues()); // clear dirty state so the leave warning does not fire
      toast('Project deleted');
      router.replace('/dashboard/projects');
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiRequestError ? error.message : 'Could not delete', 'error');
    }
  }

  const status = project?.publication.status ?? 'draft';
  const t = (field: keyof typeof emptyTranslation) => `translations.${locale}.${field}` as const;
  const tError = (field: keyof typeof emptyTranslation) =>
    (errors.translations as Record<string, Record<string, { message?: string }>> | undefined)?.[locale]?.[field]?.message;

  return (
    <form onSubmit={onSave} noValidate className="flex flex-col gap-8">
      <PageHeader
        title={project ? (translations?.en?.title || project.slug) : 'New project'}
        description={
          <span className="flex flex-wrap items-center gap-3">
            <StatusPill status={status} />
            {project?.publication.publishedAt && (
              <span>Last published {new Date(project.publication.publishedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</span>
            )}
          </span>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Text" description="English is required. Other languages are optional and fall back to English.">
            <LocaleTabs active={locale} onChange={setLocale} filled={filled} errors={localeErrors}>
              <div key={locale} className="flex flex-col gap-5" lang={locale}>
                <Field id={`title-${locale}`} label="Title" error={tError('title')}>
                  <Input
                    id={`title-${locale}`}
                    {...register(t('title'), {
                      onChange: (e) => {
                        if (locale === 'en' && !project && !dirtyFields.slug) setValue('slug', slugify(e.target.value));
                      },
                    })}
                    {...describedBy(`title-${locale}`, tError('title'))}
                  />
                </Field>
                <Field id={`summary-${locale}`} label="Summary" hint="One or two sentences shown on project cards (max. 280 characters)." error={tError('summary')}>
                  <Textarea id={`summary-${locale}`} rows={2} maxLength={280} {...register(t('summary'))} {...describedBy(`summary-${locale}`, tError('summary'), true)} />
                </Field>
                <Field
                  id={`body-${locale}`}
                  label="Case study"
                  hint="Markdown: ## headings, **bold**, - lists, [links](https://…). Describe the problem, your role, the architecture and the result."
                  error={tError('body')}
                >
                  <Textarea id={`body-${locale}`} rows={16} className="font-mono text-[13px]" {...register(t('body'))} {...describedBy(`body-${locale}`, tError('body'), true)} />
                </Field>
                <div className="grid gap-5 md:grid-cols-2">
                  <Field id={`role-${locale}`} label="Your role" hint="e.g. Backend lead" error={tError('role')}>
                    <Input id={`role-${locale}`} {...register(t('role'))} {...describedBy(`role-${locale}`, tError('role'), true)} />
                  </Field>
                  <Field id={`outcome-${locale}`} label="Outcome" hint="Only results you can stand behind." error={tError('outcome')}>
                    <Input id={`outcome-${locale}`} {...register(t('outcome'))} {...describedBy(`outcome-${locale}`, tError('outcome'), true)} />
                  </Field>
                </div>
              </div>
            </LocaleTabs>
          </Panel>

          <Panel title="Technologies" description="Shown on the card and the case study, in the order you tick them.">
            <Controller
              control={control}
              name="technologyIds"
              render={({ field }) =>
                technologies.length === 0 ? (
                  <p className="text-sm text-muted">No technologies yet. Add them under Skills & categories.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {TECHNOLOGY_GROUPS.map((group) => {
                      const items = technologies.filter((tech) => tech.group === group);
                      if (items.length === 0) return null;
                      return (
                        <fieldset key={group} className="flex flex-col gap-2">
                          <legend className="mb-1 font-mono text-2xs uppercase tracking-[0.08em] text-muted">{group}</legend>
                          <div className="flex flex-wrap gap-1.5">
                            {items.map((tech) => {
                              const checked = field.value?.includes(tech.id) ?? false;
                              return (
                                <label key={tech.id} className={`cursor-pointer border px-2.5 py-1 text-xs transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-cool ${checked ? 'border-fg bg-fg text-bg' : 'border-line text-muted hover:border-line-strong'}`}>
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={checked}
                                    onChange={() =>
                                      field.onChange(checked ? field.value!.filter((v) => v !== tech.id) : [...(field.value ?? []), tech.id])
                                    }
                                  />
                                  {tech.name}
                                </label>
                              );
                            })}
                          </div>
                        </fieldset>
                      );
                    })}
                  </div>
                )
              }
            />
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Details">
            <Field id="slug" label="URL" hint={`/work/${getValues('slug') || 'your-project'}`} error={errors.slug?.message}>
              <Input id="slug" {...register('slug')} {...describedBy('slug', errors.slug?.message, true)} />
            </Field>
            <Field id="categoryId" label="Category" error={errors.categoryId?.message}>
              <Select id="categoryId" {...register('categoryId', { setValueAs: (v) => v || null })}>
                <option value="">None</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.translations.en?.name ?? c.slug}</option>)}
              </Select>
            </Field>
            <Field id="year" label="Year" error={errors.year?.message}>
              <Input id="year" type="number" inputMode="numeric" {...register('year', { setValueAs: (v) => (v === '' || v === null ? null : Number(v)) })} {...describedBy('year', errors.year?.message)} />
            </Field>
            <Field id="repoUrl" label="Repository URL" error={errors.repoUrl?.message}>
              <Input id="repoUrl" type="url" placeholder="https://github.com/…" {...register('repoUrl')} {...describedBy('repoUrl', errors.repoUrl?.message)} />
            </Field>
            <Field id="liveUrl" label="Live demo URL" error={errors.liveUrl?.message}>
              <Input id="liveUrl" type="url" placeholder="https://…" {...register('liveUrl')} {...describedBy('liveUrl', errors.liveUrl?.message)} />
            </Field>
            <Checkbox id="showOnHome" label="Show on homepage" {...register('showOnHome')} />
            <Checkbox id="featured" label="Featured" hint="Marked as featured on cards." {...register('featured')} />
          </Panel>

          <Panel title="Cover image">
            <MediaPicker
              id="cover"
              label="Shown on cards and at the top of the case study"
              value={cover}
              library={media}
              onChange={(next) => {
                setCover(next);
                setValue('coverId', next?.id ?? null, { shouldDirty: true });
              }}
            />
          </Panel>

          {project && (
            <Panel title="Danger zone">
              <ConfirmButton
                title="Delete this project?"
                description={<>This removes <strong>{translations?.en?.title || project.slug}</strong> and all its translations{status !== 'draft' ? ', and takes the page offline' : ''}. It cannot be undone.</>}
                confirmLabel="Delete project"
                onConfirm={remove}
                size="sm"
              >
                Delete project
              </ConfirmButton>
            </Panel>
          )}
        </div>
      </div>

      {/* Sticky publishing bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 backdrop-blur lg:left-60">
        <div className="page-gutter mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 py-3">
          <p className="text-xs text-muted" aria-live="polite">
            {isDirty ? 'Unsaved changes' : status === 'changed' ? 'Saved. These edits are not public yet.' : status === 'published' ? 'Visitors see this version.' : 'Draft: not visible to visitors.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={preview} disabled={isSubmitting}>Preview ({LOCALE_PATHS[locale].toUpperCase()})</Button>
            {status !== 'draft' && (
              <Button variant="ghost" onClick={unpublish} busy={action === 'unpublish'}>Unpublish</Button>
            )}
            <Button type="submit" busy={isSubmitting && action === null} disabled={!isDirty && Boolean(project)}>Save draft</Button>
            <Button variant="primary" onClick={publish} busy={action === 'publish'} disabled={status === 'published' && !isDirty}>
              {isDirty || !project ? 'Save & publish' : status === 'published' ? 'Published' : 'Publish'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
