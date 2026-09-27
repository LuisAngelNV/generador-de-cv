import type { RequestHandler, Response } from 'express';
import { AppError } from '../lib/app-error';
import { readCookie } from '../lib/cookies';
import { ACCESS_TOKEN_COOKIE } from '../modules/auth/auth.cookies';
import { verifyAccessToken } from '../modules/auth/auth.tokens';

const unauthenticated = () => new AppError(401, 'UNAUTHENTICATED', 'Debes iniciar sesión');

/** Rejects the request with 401 unless it carries a valid access token cookie. */
export const requireAuth: RequestHandler = (req, res, next) => {
  const token = readCookie(req, ACCESS_TOKEN_COOKIE);
  const userId = token ? verifyAccessToken(token) : null;

  if (!userId) {
    next(unauthenticated());
    return;
  }

  res.locals.userId = userId;
  next();
};

/** Id of the authenticated user. Only valid in handlers placed after requireAuth. */
export function getAuthUserId(res: Response): string {
  const userId: unknown = res.locals.userId;
  if (typeof userId !== 'string') {
    throw unauthenticated();
  }
  return userId;
}
