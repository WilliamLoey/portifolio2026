import type { INestApplication } from '@nestjs/common';
import { api, login, startApp } from './helpers';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

const project = (overrides: Record<string, unknown> = {}) => ({
  slug: 'payments-api',
  categoryId: null,
  coverId: null,
  repoUrl: 'https://github.com/example/payments',
  liveUrl: '',
  year: 2025,
  technologyIds: [],
  featured: true,
  showOnHome: true,
  translations: {
    en: { title: 'Payments API', summary: 'Card payments.', body: 'Case study', role: 'Backend', outcome: '' },
    fr: { title: 'API de paiements', summary: 'Paiements par carte.', body: 'Étude de cas', role: '', outcome: '' },
    nl: { title: '', summary: '', body: '', role: '', outcome: '' },
  },
  ...overrides,
});

describe('Content management (HTTP + PostgreSQL)', () => {
  let app: INestApplication;
  let auth: { authorization: string };

  beforeAll(async () => {
    app = await startApp();
    auth = { authorization: `Bearer ${await login(app)}` };
  });

  afterAll(() => app?.close());

  describe('authorization', () => {
    it.each([
      ['GET', '/api/v1/admin/projects'],
      ['POST', '/api/v1/admin/projects'],
      ['PUT', '/api/v1/admin/profile'],
      ['POST', '/api/v1/admin/media'],
      ['GET', '/api/v1/admin/messages'],
      ['DELETE', '/api/v1/admin/technologies/x'],
    ])('%s %s requires a session', async (method, path) => {
      const response = await api(app)[method.toLowerCase() as 'get'](path).set('authorization', 'Bearer forged-token');
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({ statusCode: 401, error: 'UNAUTHORIZED' });
    });
  });

  describe('projects: create, publish, edit, unpublish', () => {
    let id: string;

    it('creates a draft that is invisible to visitors', async () => {
      const created = await api(app).post('/api/v1/admin/projects').set(auth).send(project()).expect(201);
      id = created.body.id;
      expect(created.body.publication.status).toBe('draft');
      expect(Object.keys(created.body.translations)).toEqual(['en', 'fr']); // empty NL tab dropped
      expect(created.body.liveUrl).toBeNull();

      await api(app).get('/api/v1/projects/payments-api').expect(404);
      const list = await api(app).get('/api/v1/projects').expect(200);
      expect(list.body.total).toBe(0);
    });

    it('shows the draft in preview only', async () => {
      const preview = await api(app).get(`/api/v1/admin/preview/projects/${id}?locale=fr`).set(auth).expect(200);
      expect(preview.body.title).toBe('API de paiements');
    });

    it('publishes, then serves each language with English fallback', async () => {
      const published = await api(app).post(`/api/v1/admin/projects/${id}/publish`).set(auth).expect(200);
      expect(published.body.publication.status).toBe('published');

      const fr = await api(app).get('/api/v1/projects/payments-api?locale=fr').expect(200);
      expect(fr.body).toMatchObject({ title: 'API de paiements', contentLocale: 'fr', availableLocales: ['en', 'fr'] });

      const nl = await api(app).get('/api/v1/projects/payments-api?locale=nl').expect(200);
      expect(nl.body).toMatchObject({ title: 'Payments API', contentLocale: 'en' });

      const site = await api(app).get('/api/v1/site?locale=pt-BR').expect(200);
      expect(site.body.featuredProjects).toHaveLength(1);
    });

    it('keeps the published version live while the draft is edited', async () => {
      const edited = project({
        translations: { en: { title: 'Payments API v2', summary: 'New', body: 'New body', role: null, outcome: null } },
      });
      const saved = await api(app).put(`/api/v1/admin/projects/${id}`).set(auth).send(edited).expect(200);
      expect(saved.body.publication.status).toBe('changed');

      const live = await api(app).get('/api/v1/projects/payments-api?locale=en').expect(200);
      expect(live.body.title).toBe('Payments API');

      await api(app).post(`/api/v1/admin/projects/${id}/publish`).set(auth).expect(200);
      const updated = await api(app).get('/api/v1/projects/payments-api?locale=en').expect(200);
      expect(updated.body.title).toBe('Payments API v2');
    });

    it('rejects a duplicate slug with 409', async () => {
      const response = await api(app).post('/api/v1/admin/projects').set(auth).send(project()).expect(409);
      expect(response.body.message).toMatch(/slug/);
    });

    it('returns field errors for invalid input', async () => {
      const response = await api(app)
        .post('/api/v1/admin/projects')
        .set(auth)
        .send(project({ slug: 'Not A Slug', repoUrl: 'javascript:alert(1)', translations: { fr: { title: 'x', summary: 'y', body: 'z' } } }))
        .expect(400);
      const paths = response.body.errors.map((e: { path: string }) => e.path);
      expect(paths).toEqual(expect.arrayContaining(['slug', 'repoUrl', 'translations.en']));
    });

    it('unpublishes: the page disappears for visitors', async () => {
      await api(app).post(`/api/v1/admin/projects/${id}/unpublish`).set(auth).expect(200);
      await api(app).get('/api/v1/projects/payments-api').expect(404);
    });
  });

  describe('images', () => {
    it('uploads, attaches, replaces and protects images in use', async () => {
      const uploaded = await api(app).post('/api/v1/admin/media').set(auth).attach('file', PNG_1X1, 'cover.png').expect(201);
      expect(uploaded.body).toMatchObject({ mimeType: 'image/png', width: 1, height: 1, usage: 0 });

      const created = await api(app)
        .post('/api/v1/admin/projects')
        .set(auth)
        .send(project({ slug: 'with-cover', coverId: uploaded.body.id }))
        .expect(201);
      expect(created.body.cover.id).toBe(uploaded.body.id);

      const blocked = await api(app).delete(`/api/v1/admin/media/${uploaded.body.id}`).set(auth).expect(409);
      expect(blocked.body.error).toBe('IN_USE');

      const replaced = await api(app)
        .put(`/api/v1/admin/media/${uploaded.body.id}/file`)
        .set(auth)
        .attach('file', PNG_1X1, 'new.png')
        .expect(200);
      expect(replaced.body.url).not.toBe(uploaded.body.url);
      expect(replaced.body.usage).toBe(1);

      // The file on disk is actually served.
      const path = new URL(replaced.body.url).pathname;
      await api(app).get(path).expect(200).expect('content-type', /image\/png/);
    });

    it('rejects files that are not images, whatever their name says', async () => {
      const response = await api(app)
        .post('/api/v1/admin/media')
        .set(auth)
        .attach('file', Buffer.from('<svg onload="alert(1)"/>'), { filename: 'evil.png', contentType: 'image/png' })
        .expect(422);
      expect(response.body.message).toMatch(/JPEG, PNG/);
    });
  });

  describe('profile and reference data', () => {
    it('publishes the profile and exposes it in every language', async () => {
      const body = {
        fullName: 'William Van Loey',
        email: 'william@example.com',
        location: 'Brussels, Belgium',
        timezone: 'Europe/Brussels',
        openToWork: true,
        resumeUrl: '',
        spokenLanguages: [{ name: 'Portuguese', level: 'native' }],
        translations: {
          en: { role: 'Software Engineer', headline: 'I build reliable APIs.', bio: 'A short but real biography.', availability: '' },
          'pt-BR': { role: 'Engenheiro de Software', headline: 'Construo APIs confiáveis.', bio: 'Uma biografia curta mas real.', availability: '' },
        },
      };
      await api(app).put('/api/v1/admin/profile').set(auth).send(body).expect(200);
      await api(app).get('/api/v1/profile').expect(404);
      await api(app).post('/api/v1/admin/profile/publish').set(auth).expect(200);

      const pt = await api(app).get('/api/v1/profile?locale=pt-BR').expect(200);
      expect(pt.body).toMatchObject({ role: 'Engenheiro de Software', contentLocale: 'pt-BR' });
    });

    it('lists missing translations in the coverage report', async () => {
      const response = await api(app).get('/api/v1/admin/translations').set(auth).expect(200);
      const profileRow = response.body.rows.find((r: { type: string }) => r.type === 'profile');
      expect(profileRow.locales).toEqual(['en', 'pt-BR']);
    });

    it('creates and reorders technologies; only featured ones appear publicly', async () => {
      const ts = await api(app).post('/api/v1/admin/technologies').set(auth)
        .send({ name: 'TypeScript', slug: 'typescript', group: 'language', featured: true }).expect(201);
      const go = await api(app).post('/api/v1/admin/technologies').set(auth)
        .send({ name: 'Go', slug: 'go', group: 'language', featured: true }).expect(201);
      await api(app).post('/api/v1/admin/technologies').set(auth)
        .send({ name: 'Hidden', slug: 'hidden', group: 'other', featured: false }).expect(201);

      await api(app).put('/api/v1/admin/technologies/order').set(auth).send({ ids: [go.body.id, ts.body.id] }).expect(204);
      const site = await api(app).get('/api/v1/site').expect(200);
      expect(site.body.technologies.map((t: { slug: string }) => t.slug)).toEqual(['go', 'typescript']);
    });
  });
});
