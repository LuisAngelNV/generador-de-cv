import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDatabase } from './helpers/db';
import { signUp } from './helpers/session';

let app: ReturnType<typeof createApp>;
let ana: string[];
let bob: string[];
let cvId: string;

beforeEach(async () => {
  await resetDatabase();
  app = createApp();
  ana = await signUp(app, 'ana@example.com');
  bob = await signUp(app, 'bob@example.com');
  const res = await request(app).post('/api/cvs').set('Cookie', ana).send({ title: 'Mi CV' });
  cvId = res.body.cv.id;
});

const url = (section: string, itemId?: string) =>
  `/api/cvs/${cvId}/${section}${itemId ? `/${itemId}` : ''}`;

function addExperience(body: object = {}) {
  return request(app)
    .post(url('experiences'))
    .set('Cookie', ana)
    .send({ position: 'Dev', company: 'ACME', startDate: '2020-01-15', ...body });
}

describe.each([
  ['experiences', { position: 'Dev', company: 'ACME', startDate: '2020-01-01' }],
  ['educations', { institution: 'Universidad', degree: 'Grado en Informática' }],
  ['skills', { name: 'TypeScript', level: 'ADVANCED' }],
  ['languages', { name: 'Inglés', proficiency: 'C1' }],
  ['projects', { name: 'Generador de CV', url: 'https://example.com' }],
  ['certifications', { name: 'AWS Cloud Practitioner', issuer: 'AWS' }],
])('%s', (section, validItem) => {
  it('creates and lists items', async () => {
    const created = await request(app).post(url(section)).set('Cookie', ana).send(validItem);
    expect(created.status).toBe(201);
    expect(created.body.item).toMatchObject({ cvId, order: 0 });

    const list = await request(app).get(url(section)).set('Cookie', ana);
    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(1);
  });

  it('validates the payload', async () => {
    const res = await request(app).post(url(section)).set('Cookie', ana).send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('is not accessible through CVs of other users', async () => {
    const list = await request(app).get(url(section)).set('Cookie', bob);
    const create = await request(app).post(url(section)).set('Cookie', bob).send(validItem);

    expect(list.status).toBe(404);
    expect(create.status).toBe(404);
  });
});

describe('section items', () => {
  it('appends new items at the end', async () => {
    await addExperience({ position: 'Primero' });
    await addExperience({ position: 'Segundo' });
    const third = await addExperience({ position: 'Tercero' });

    expect(third.body.item.order).toBe(2);
  });

  it('stores dates as calendar dates', async () => {
    const res = await addExperience({ startDate: '2020-01-15', endDate: '2022-06-30' });

    expect(res.body.item.startDate).toBe('2020-01-15T00:00:00.000Z');
    expect(res.body.item.endDate).toBe('2022-06-30T00:00:00.000Z');
  });

  it('rejects an end date before the start date', async () => {
    const res = await addExperience({ startDate: '2022-01-01', endDate: '2020-01-01' });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('endDate');
  });

  it('also checks the date range against the stored values on partial updates', async () => {
    const { body } = await addExperience({ startDate: '2022-01-01' });
    const res = await request(app)
      .patch(url('experiences', body.item.id))
      .set('Cookie', ana)
      .send({ endDate: '2020-01-01' });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('endDate');
  });

  it('clears the end date when the item is marked as current', async () => {
    const { body } = await addExperience({ endDate: '2022-06-30' });
    const res = await request(app)
      .patch(url('experiences', body.item.id))
      .set('Cookie', ana)
      .send({ isCurrent: true });

    expect(res.status).toBe(200);
    expect(res.body.item).toMatchObject({ isCurrent: true, endDate: null });
  });

  it('updates an item and marks the CV as modified', async () => {
    const { body } = await addExperience();
    const before = await prisma.cv.findUniqueOrThrow({ where: { id: cvId } });

    const res = await request(app)
      .patch(url('experiences', body.item.id))
      .set('Cookie', ana)
      .send({ company: 'Otra empresa', description: '' });

    expect(res.status).toBe(200);
    expect(res.body.item).toMatchObject({ company: 'Otra empresa', description: null });
    const after = await prisma.cv.findUniqueOrThrow({ where: { id: cvId } });
    expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());
  });

  it('deletes an item', async () => {
    const { body } = await addExperience();
    const removed = await request(app).delete(url('experiences', body.item.id)).set('Cookie', ana);
    const again = await request(app).delete(url('experiences', body.item.id)).set('Cookie', ana);

    expect(removed.status).toBe(204);
    expect(again.status).toBe(404);
    expect(again.body.error.code).toBe('ITEM_NOT_FOUND');
  });

  it('does not reach items of another CV through this CV', async () => {
    const other = await request(app).post('/api/cvs').set('Cookie', ana).send({ title: 'Otro' });
    const item = await request(app)
      .post(`/api/cvs/${other.body.cv.id}/skills`)
      .set('Cookie', ana)
      .send({ name: 'Go' });

    const res = await request(app)
      .patch(url('skills', item.body.item.id))
      .set('Cookie', ana)
      .send({ name: 'Cambiado' });

    expect(res.status).toBe(404);
  });

  it('cannot modify items of other users', async () => {
    const { body } = await addExperience();
    const res = await request(app).delete(url('experiences', body.item.id)).set('Cookie', bob);

    expect(res.status).toBe(404);
    expect(await prisma.experience.count({ where: { id: body.item.id } })).toBe(1);
  });
});

describe('PUT /api/cvs/:cvId/<section>/order', () => {
  it('reorders the items', async () => {
    const ids: string[] = [];
    for (const name of ['A', 'B', 'C']) {
      const res = await request(app).post(url('skills')).set('Cookie', ana).send({ name });
      ids.push(res.body.item.id);
    }

    const res = await request(app)
      .put(`${url('skills')}/order`)
      .set('Cookie', ana)
      .send({ ids: [ids[2], ids[0], ids[1]] });

    expect(res.status).toBe(200);
    expect(res.body.items.map((s: { name: string }) => s.name)).toEqual(['C', 'A', 'B']);
  });

  it('requires every item exactly once', async () => {
    const a = await request(app).post(url('skills')).set('Cookie', ana).send({ name: 'A' });
    await request(app).post(url('skills')).set('Cookie', ana).send({ name: 'B' });

    const missing = await request(app)
      .put(`${url('skills')}/order`)
      .set('Cookie', ana)
      .send({ ids: [a.body.item.id] });
    const repeated = await request(app)
      .put(`${url('skills')}/order`)
      .set('Cookie', ana)
      .send({ ids: [a.body.item.id, a.body.item.id] });

    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe('INVALID_ORDER');
    expect(repeated.status).toBe(400);
  });
});
