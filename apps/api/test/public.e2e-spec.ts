import type { INestApplication } from '@nestjs/common';
import { ADMIN, api, startApp } from './helpers';

const message = {
  name: 'Ana Souza',
  email: 'ana@example.com',
  subject: 'Backend role in Ghent',
  message: 'Hello William, we have a backend role that fits your profile.',
  locale: 'pt-BR',
  startedAt: Date.now() - 60_000,
};

describe('Public API (HTTP + PostgreSQL)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await startApp();
  });

  afterAll(() => app?.close());

  it('reports health with a database check', async () => {
    await api(app).get('/api/v1/health').expect(200, /"database":"up"/);
  });

  it('sends security headers and no framework fingerprint', async () => {
    const response = await api(app).get('/api/v1/site').expect(200);
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toContain("default-src 'none'");
  });

  it('only allows the website origin through CORS', async () => {
    const allowed = await api(app).options('/api/v1/contact').set('Origin', 'http://localhost:3000').set('Access-Control-Request-Method', 'POST');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    const other = await api(app).options('/api/v1/contact').set('Origin', 'https://evil.example').set('Access-Control-Request-Method', 'POST');
    expect(other.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers an empty site before any content is published', async () => {
    const response = await api(app).get('/api/v1/site?locale=xx').expect(200);
    expect(response.body).toMatchObject({ locale: 'en', profile: null, featuredProjects: [] });
  });

  describe('contact form', () => {
    it('validates fields server-side', async () => {
      const response = await api(app).post('/api/v1/contact').send({ ...message, email: 'not-an-email', message: 'short' }).expect(400);
      expect(response.body.errors.map((e: { path: string }) => e.path)).toEqual(expect.arrayContaining(['email', 'message']));
    });

    it('accepts a message and shows it in the admin inbox', async () => {
      await api(app).post('/api/v1/contact').send(message).expect(202, { ok: true });

      const { body } = await api(app).post('/api/v1/auth/login').send(ADMIN).expect(200);
      const inbox = await api(app).get('/api/v1/admin/messages?filter=unread').set('authorization', `Bearer ${body.token}`).expect(200);
      expect(inbox.body.items[0]).toMatchObject({ subject: 'Backend role in Ghent', locale: 'pt-BR', delivered: true, readAt: null });

      const read = await api(app)
        .patch(`/api/v1/admin/messages/${inbox.body.items[0].id}`)
        .set('authorization', `Bearer ${body.token}`)
        .send({ read: true })
        .expect(200);
      expect(read.body.readAt).not.toBeNull();
    });

    it('drops honeypot submissions without telling the bot', async () => {
      await api(app).post('/api/v1/contact').send({ ...message, website: 'http://spam' }).expect(202, { ok: true });
    });

    it('limits each visitor to 3 messages per 10 minutes, across instances', async () => {
      await api(app).post('/api/v1/contact').send(message).expect(202);
      await api(app).post('/api/v1/contact').send(message).expect(202);
      const limited = await api(app).post('/api/v1/contact').send(message).expect(429);
      expect(limited.headers['retry-after']).toBeDefined();
      expect(limited.body.error).toBe('RATE_LIMITED');
    });
  });

  describe('sign-in', () => {
    it('rejects wrong passwords with a generic message', async () => {
      const response = await api(app).post('/api/v1/auth/login').send({ ...ADMIN, password: 'wrong-password' }).expect(401);
      expect(response.body.message).toBe('Incorrect email or password');
    });

    it('revokes the session on logout', async () => {
      const { body } = await api(app).post('/api/v1/auth/login').send(ADMIN).expect(200);
      const auth = { authorization: `Bearer ${body.token}` };
      await api(app).get('/api/v1/auth/me').set(auth).expect(200);
      await api(app).post('/api/v1/auth/logout').set(auth).expect(204);
      await api(app).get('/api/v1/auth/me').set(auth).expect(401);
    });
  });

  it('publishes an OpenAPI document generated from the shared contracts', async () => {
    const response = await api(app).get('/api/v1/docs/openapi.json').expect(200);
    expect(response.body.openapi).toBe('3.1.0');
    expect(response.body.paths['/admin/projects/{id}/publish'].post.security).toEqual([{ session: [] }]);
  });
});
