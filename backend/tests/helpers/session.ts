import type { Express } from 'express';
import request from 'supertest';
import { cookiesFrom } from './cookies';

/** Registers a user and returns the cookies of its session. */
export async function signUp(app: Express, email: string, name = 'Ana'): Promise<string[]> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'Secreta123', name });
  if (res.status !== 201) {
    throw new Error(`Sign up failed with ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return cookiesFrom(res);
}
