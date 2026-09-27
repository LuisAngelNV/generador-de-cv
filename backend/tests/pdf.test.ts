import request from 'supertest';
import { createApp } from '../src/app';
import { resetDatabase } from './helpers/db';
import { signUp } from './helpers/session';

let app: ReturnType<typeof createApp>;
let ana: string[];
let bob: string[];
let cvId: string;

beforeEach(async () => {
  await resetDatabase();
  app = createApp();
  ana = await signUp(app, 'ana@example.com', 'Ana García');
  bob = await signUp(app, 'bob@example.com');
  const res = await request(app).post('/api/cvs').set('Cookie', ana).send({ title: 'Frontend' });
  cvId = res.body.cv.id;
  await request(app)
    .post(`/api/cvs/${cvId}/experiences`)
    .set('Cookie', ana)
    .send({ position: 'Dev', company: 'ACME', startDate: '2021-03-01' });
});

describe('GET /api/cvs/:cvId/preview', () => {
  it('returns the CV as an HTML document', async () => {
    const res = await request(app).get(`/api/cvs/${cvId}/preview`).set('Cookie', ana);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.text).toContain('Ana García');
    expect(res.text).toContain('ACME');
  });

  it('is not available for CVs of other users', async () => {
    const res = await request(app).get(`/api/cvs/${cvId}/preview`).set('Cookie', bob);

    expect(res.status).toBe(404);
  });
});

describe('GET /api/cvs/:cvId/pdf', () => {
  it('returns a PDF file named after the CV', async () => {
    const res = await request(app)
      .get(`/api/cvs/${cvId}/pdf`)
      .set('Cookie', ana)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toBe('attachment; filename="ana-garcia.pdf"');
    const body = res.body as Buffer;
    expect(body.subarray(0, 5).toString()).toBe('%PDF-');
    expect(body.length).toBeGreaterThan(1000);
  });

  it('is not available for CVs of other users', async () => {
    const res = await request(app).get(`/api/cvs/${cvId}/pdf`).set('Cookie', bob);

    expect(res.status).toBe(404);
  });
});
