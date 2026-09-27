import type { Request, Response } from 'express';
import { readCookie } from '../../lib/cookies';
import { getAuthUserId } from '../../middlewares/require-auth';
import { clearAuthCookies, REFRESH_TOKEN_COOKIE, setAuthCookies } from './auth.cookies';
import type { LoginInput, RegisterInput } from './auth.schema';
import * as authService from './auth.service';

export async function register(req: Request, res: Response): Promise<void> {
  const session = await authService.register(req.body as RegisterInput);
  setAuthCookies(res, session);
  res.status(201).json({ user: session.user });
}

export async function login(req: Request, res: Response): Promise<void> {
  const session = await authService.login(req.body as LoginInput);
  setAuthCookies(res, session);
  res.json({ user: session.user });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const session = await authService.refresh(readCookie(req, REFRESH_TOKEN_COOKIE));
    setAuthCookies(res, session);
    res.json({ user: session.user });
  } catch (error) {
    clearAuthCookies(res);
    throw error;
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  await authService.logout(readCookie(req, REFRESH_TOKEN_COOKIE));
  clearAuthCookies(res);
  res.status(204).end();
}

export async function me(_req: Request, res: Response): Promise<void> {
  const user = await authService.getUser(getAuthUserId(res));
  res.json({ user });
}
