import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { cookiesFrom, getSetCookie } from './helpers/cookies';
import { resetDatabase } from './helpers/db';

const credentials = { email: 'ana@example.com', password: 'Secreta123' };

let app: ReturnType<typeof createApp>;

beforeEach(async () => {
  await resetDatabase();
  app = createApp();
});

function register(body: object = { ...credentials, name: 'Ana' }) {
  return request(app).post('/api/auth/register').send(body);
}

function login(body: object = credentials) {
  return request(app).post('/api/auth/login').send(body);
}

describe('POST /api/auth/register', () => {
  it('creates the user, returns it without the password and starts a session', async () => {
    const res = await register();

    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({
      id: expect.any(String),
      email: 'ana@example.com',
      name: 'Ana',
      createdAt: expect.any(String),
    });

    const access = getSetCookie(res, 'access_token');
    const refresh = getSetCookie(res, 'refresh_token');
    expect(access).toMatch(/HttpOnly/);
    expect(access).toMatch(/Secure/);
    expect(access).toMatch(/SameSite=Strict/);
    expect(access).toMatch(/Path=\/api(;|$)/);
    expect(refresh).toMatch(/Path=\/api\/auth(;|$)/);

    const stored = await prisma.user.findUniqueOrThrow({ where: { email: 'ana@example.com' } });
    expect(stored.passwordHash).not.toBe(credentials.password);
  });

  it('normalizes the email and rejects duplicates with 409', async () => {
    await register();
    const res = await register({ email: '  ANA@Example.com ', password: 'OtraClave99' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_IN_USE');
  });

  it('rejects weak passwords and invalid emails with 400 and field details', async () => {
    const res = await register({ email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const paths = res.body.error.details.map((detail: { path: string }) => detail.path);
    expect(paths).toEqual(expect.arrayContaining(['email', 'password']));
  });

  it('rejects passwords without numbers', async () => {
    const res = await register({ email: 'ana@example.com', password: 'solamenteletras' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await register();
  });

  it('starts a session with valid credentials', async () => {
    const res = await login();

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('ana@example.com');
    expect(getSetCookie(res, 'access_token')).toBeDefined();
    expect(getSetCookie(res, 'refresh_token')).toBeDefined();
  });

  it('returns the same 401 for a wrong password and for an unknown email', async () => {
    const wrongPassword = await login({ ...credentials, password: 'Incorrecta1' });
    const unknownEmail = await login({ ...credentials, email: 'nadie@example.com' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('blocks the IP after 10 failed attempts', async () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      await login({ ...credentials, password: 'Incorrecta1' });
    }
    const res = await login();

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('TOO_MANY_REQUESTS');
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user when authenticated', async () => {
    const session = await register();
    const res = await request(app).get('/api/auth/me').set('Cookie', cookiesFrom(session));

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('ana@example.com');
  });

  it('returns 401 without a valid access token', async () => {
    const missing = await request(app).get('/api/auth/me');
    const forged = await request(app).get('/api/auth/me').set('Cookie', 'access_token=forged');

    expect(missing.status).toBe(401);
    expect(missing.body.error.code).toBe('UNAUTHENTICATED');
    expect(forged.status).toBe(401);
  });

  it('does not accept a refresh token as an access token', async () => {
    const session = await register();
    const refreshValue = cookiesFrom(session)
      .find((cookie) => cookie.startsWith('refresh_token='))
      ?.split('=')[1];

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `access_token=${refreshValue}`);

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  it('rotates the refresh token and issues new cookies', async () => {
    const session = await register();
    const res = await request(app).post('/api/auth/refresh').set('Cookie', cookiesFrom(session));

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('ana@example.com');
    expect(getSetCookie(res, 'refresh_token')).not.toBe(getSetCookie(session, 'refresh_token'));
  });

  it('revokes every session when a rotated refresh token is reused', async () => {
    const session = await register();
    const rotated = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookiesFrom(session));

    const reuse = await request(app).post('/api/auth/refresh').set('Cookie', cookiesFrom(session));
    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    expect(getSetCookie(reuse, 'refresh_token')).toMatch(/Expires=Thu, 01 Jan 1970/);

    // The legitimate token issued by the rotation is revoked as well.
    const afterReuse = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookiesFrom(rotated));
    expect(afterReuse.status).toBe(401);
  });

  it('returns 401 without a refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh');

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('revokes the refresh token and clears the cookies', async () => {
    const session = await register();
    const res = await request(app).post('/api/auth/logout').set('Cookie', cookiesFrom(session));

    expect(res.status).toBe(204);
    expect(getSetCookie(res, 'access_token')).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(getSetCookie(res, 'refresh_token')).toMatch(/Expires=Thu, 01 Jan 1970/);

    const refresh = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookiesFrom(session));
    expect(refresh.status).toBe(401);
  });

  it('succeeds even without a session', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(204);
  });
});
