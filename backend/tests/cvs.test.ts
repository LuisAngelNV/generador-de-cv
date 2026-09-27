import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDatabase } from './helpers/db';
import { signUp } from './helpers/session';

let app: ReturnType<typeof createApp>;
let ana: string[];
let bob: string[];

beforeEach(async () => {
  await resetDatabase();
  app = createApp();
  ana = await signUp(app, 'ana@example.com', 'Ana García');
  bob = await signUp(app, 'bob@example.com', 'Bob');
});

function createCv(cookies: string[], body: object = { title: 'Desarrolladora' }) {
  return request(app).post('/api/cvs').set('Cookie', cookies).send(body);
}

describe('authentication', () => {
  it('requires a session for every CV endpoint', async () => {
    const res = await request(app).get('/api/cvs');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });
});

describe('POST /api/cvs', () => {
  it('creates a CV prefilled with the user name and email', async () => {
    const res = await createCv(ana);

    expect(res.status).toBe(201);
    expect(res.body.cv).toMatchObject({
      title: 'Desarrolladora',
      language: 'es',
      templateId: 'classic',
      fullName: 'Ana García',
      email: 'ana@example.com',
      links: [],
      experiences: [],
      educations: [],
      skills: [],
      languages: [],
      projects: [],
      certifications: [],
    });
    expect(res.body.cv).not.toHaveProperty('userId');
  });

  it('requires a title', async () => {
    const res = await createCv(ana, { title: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([{ path: 'title', message: expect.any(String) }]);
  });
});

describe('GET /api/cvs', () => {
  it('lists only the CVs of the current user, most recently updated first', async () => {
    const first = await createCv(ana, { title: 'Primero' });
    await createCv(ana, { title: 'Segundo' });
    await createCv(bob, { title: 'De Bob' });
    await request(app)
      .patch(`/api/cvs/${first.body.cv.id}`)
      .set('Cookie', ana)
      .send({ headline: 'Actualizado' });

    const res = await request(app).get('/api/cvs').set('Cookie', ana);

    expect(res.status).toBe(200);
    expect(res.body.cvs.map((cv: { title: string }) => cv.title)).toEqual(['Primero', 'Segundo']);
  });
});

describe('GET /api/cvs/:cvId', () => {
  it('returns the CV of its owner', async () => {
    const { body } = await createCv(ana);
    const res = await request(app).get(`/api/cvs/${body.cv.id}`).set('Cookie', ana);

    expect(res.status).toBe(200);
    expect(res.body.cv.id).toBe(body.cv.id);
  });

  it('answers 404 for CVs of other users, so they cannot be probed', async () => {
    const { body } = await createCv(bob);
    const res = await request(app).get(`/api/cvs/${body.cv.id}`).set('Cookie', ana);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CV_NOT_FOUND');
  });

  it('rejects ids that are not UUIDs', async () => {
    const res = await request(app).get('/api/cvs/not-a-uuid').set('Cookie', ana);

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/cvs/:cvId', () => {
  it('updates the profile fields and stores empty optional texts as null', async () => {
    const { body } = await createCv(ana);
    const res = await request(app)
      .patch(`/api/cvs/${body.cv.id}`)
      .set('Cookie', ana)
      .send({
        headline: '  Frontend developer  ',
        summary: '',
        links: [{ label: 'GitHub', url: 'https://github.com/ana' }],
      });

    expect(res.status).toBe(200);
    expect(res.body.cv).toMatchObject({
      headline: 'Frontend developer',
      summary: null,
      links: [{ label: 'GitHub', url: 'https://github.com/ana' }],
    });
  });

  it('only accepts http(s) links', async () => {
    const { body } = await createCv(ana);
    const res = await request(app)
      .patch(`/api/cvs/${body.cv.id}`)
      .set('Cookie', ana)
      .send({ links: [{ label: 'XSS', url: 'javascript:alert(1)' }] });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('links.0.url');
  });

  it('rejects an empty update', async () => {
    const { body } = await createCv(ana);
    const res = await request(app).patch(`/api/cvs/${body.cv.id}`).set('Cookie', ana).send({});

    expect(res.status).toBe(400);
  });

  it('cannot modify CVs of other users', async () => {
    const { body } = await createCv(bob);
    const res = await request(app)
      .patch(`/api/cvs/${body.cv.id}`)
      .set('Cookie', ana)
      .send({ title: 'Robado' });

    expect(res.status).toBe(404);
    const stored = await prisma.cv.findUniqueOrThrow({ where: { id: body.cv.id } });
    expect(stored.title).toBe('Desarrolladora');
  });
});

describe('DELETE /api/cvs/:cvId', () => {
  it('deletes the CV together with its sections', async () => {
    const { body } = await createCv(ana);
    await request(app)
      .post(`/api/cvs/${body.cv.id}/skills`)
      .set('Cookie', ana)
      .send({ name: 'TypeScript' });

    const res = await request(app).delete(`/api/cvs/${body.cv.id}`).set('Cookie', ana);

    expect(res.status).toBe(204);
    expect(await prisma.cv.count({ where: { id: body.cv.id } })).toBe(0);
    expect(await prisma.skill.count({ where: { cvId: body.cv.id } })).toBe(0);
  });

  it('cannot delete CVs of other users', async () => {
    const { body } = await createCv(bob);
    const res = await request(app).delete(`/api/cvs/${body.cv.id}`).set('Cookie', ana);

    expect(res.status).toBe(404);
    expect(await prisma.cv.count({ where: { id: body.cv.id } })).toBe(1);
  });
});

describe('POST /api/cvs/:cvId/duplicate', () => {
  it('copies the CV and all its sections, keeping the order', async () => {
    const { body } = await createCv(ana);
    const cvId = body.cv.id;
    await request(app).patch(`/api/cvs/${cvId}`).set('Cookie', ana).send({ headline: 'Dev' });
    for (const name of ['TypeScript', 'Angular']) {
      await request(app).post(`/api/cvs/${cvId}/skills`).set('Cookie', ana).send({ name });
    }
    await request(app)
      .post(`/api/cvs/${cvId}/experiences`)
      .set('Cookie', ana)
      .send({ position: 'Dev', company: 'ACME', startDate: '2020-01-01' });

    const res = await request(app).post(`/api/cvs/${cvId}/duplicate`).set('Cookie', ana);

    expect(res.status).toBe(201);
    const copy = res.body.cv;
    expect(copy.id).not.toBe(cvId);
    expect(copy.title).toBe('Desarrolladora (copia)');
    expect(copy.headline).toBe('Dev');
    expect(copy.skills.map((s: { name: string; order: number }) => [s.name, s.order])).toEqual([
      ['TypeScript', 0],
      ['Angular', 1],
    ]);
    expect(copy.experiences).toHaveLength(1);
    expect(copy.experiences[0].cvId).toBe(copy.id);
    expect(await prisma.skill.count({ where: { cvId } })).toBe(2);
  });

  it('cannot duplicate CVs of other users', async () => {
    const { body } = await createCv(bob);
    const res = await request(app).post(`/api/cvs/${body.cv.id}/duplicate`).set('Cookie', ana);

    expect(res.status).toBe(404);
  });
});
