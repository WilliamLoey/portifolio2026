import {
  buildOpenApiDocument,
  contactRequestSchema,
  experienceInputSchema,
  projectInputSchema,
  pruneEmptyTranslations,
  socialLinkInputSchema,
  updateProfileSchema,
} from './index';

const validProject = {
  slug: 'portfolio-cms',
  categoryId: null,
  coverId: null,
  repoUrl: '',
  liveUrl: 'https://example.com',
  year: 2026,
  technologyIds: [],
  featured: false,
  showOnHome: true,
  translations: {
    en: { title: 'Portfolio', summary: 'A CMS', body: 'Body', role: '', outcome: '' },
    fr: { title: '', summary: '', body: '', role: '', outcome: '' },
  },
};

describe('translations', () => {
  it('drops languages left completely empty in the form', () => {
    const parsed = projectInputSchema.parse(validProject);
    expect(Object.keys(parsed.translations)).toEqual(['en']);
    expect(parsed.repoUrl).toBeNull();
    expect(parsed.translations.en?.role).toBeNull();
  });

  it('requires English', () => {
    const result = projectInputSchema.safeParse({
      ...validProject,
      translations: { fr: { title: 'T', summary: 'S', body: 'B' } },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['translations', 'en']);
  });

  it('validates a partly filled language instead of dropping it', () => {
    const result = projectInputSchema.safeParse({
      ...validProject,
      translations: { ...validProject.translations, nl: { title: 'Alleen titel', summary: '', body: '' } },
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown languages', () => {
    const result = projectInputSchema.safeParse({
      ...validProject,
      translations: { ...validProject.translations, de: { title: 'T', summary: 'S', body: 'B' } },
    });
    expect(result.success).toBe(false);
  });

  it('keeps non-object values untouched', () => {
    expect(pruneEmptyTranslations(null)).toBeNull();
    expect(pruneEmptyTranslations('x')).toBe('x');
  });
});

describe('field rules', () => {
  it('rejects end dates before start dates', () => {
    const result = experienceInputSchema.safeParse({
      company: 'MJV', companyUrl: '', location: '', employmentType: 'full_time',
      startDate: '2024-05', endDate: '2023-01',
      translations: { en: { role: 'Engineer', summary: '', highlights: [] } },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['endDate']);
  });

  it('accepts an empty end date as a current position', () => {
    const parsed = experienceInputSchema.parse({
      company: 'MJV', companyUrl: '', location: '', employmentType: 'full_time',
      startDate: '2024-05', endDate: '',
      translations: { en: { role: 'Engineer', summary: '', highlights: [] } },
    });
    expect(parsed.endDate).toBeNull();
  });

  it('rejects invalid time zones in the profile', () => {
    const result = updateProfileSchema.safeParse({
      fullName: 'William Van Loey', email: 'a@b.co', location: 'Brussels', timezone: 'Mars/Olympus',
      openToWork: true, resumeUrl: '', spokenLanguages: [],
      translations: { en: { role: 'Engineer', headline: 'I build backends.', bio: 'A longer biography here.', availability: '' } },
    });
    expect(result.success).toBe(false);
  });

  it('only allows https links, except email', () => {
    expect(socialLinkInputSchema.safeParse({ kind: 'github', label: 'GitHub', url: 'javascript:alert(1)', visible: true }).success).toBe(false);
    expect(socialLinkInputSchema.safeParse({ kind: 'github', label: 'GitHub', url: 'https://github.com/x', visible: true }).success).toBe(true);
    expect(socialLinkInputSchema.safeParse({ kind: 'email', label: 'Email', url: 'mailto:a@b.co', visible: true }).success).toBe(true);
  });

  it('falls back to English for unknown contact locales', () => {
    const parsed = contactRequestSchema.parse({
      name: 'Ana', email: 'ana@example.com', subject: 'Hello', message: 'A message long enough to pass.', locale: 'de',
    });
    expect(parsed.locale).toBe('en');
  });
});

describe('OpenAPI document', () => {
  it('describes every route with a unique operation', () => {
    const doc = buildOpenApiDocument({ title: 'API', version: '1', serverUrl: 'http://localhost/api/v1' });
    expect(doc.paths['/projects/{slug}']?.get).toBeDefined();
    expect(doc.paths['/admin/projects/{id}']?.put).toBeDefined();
    const ops = Object.values(doc.paths).flatMap((p) => Object.values(p) as { operationId: string }[]);
    expect(new Set(ops.map((o) => o.operationId)).size).toBe(ops.length);
  });
});
