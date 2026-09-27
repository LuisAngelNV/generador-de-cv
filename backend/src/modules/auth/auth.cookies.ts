import type { CookieOptions, Response } from 'express';
import { env } from '../../config/env';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

const baseOptions: CookieOptions = { httpOnly: true, secure: true, sameSite: 'strict' };
const accessOptions: CookieOptions = { ...baseOptions, path: '/api' };
// The refresh token is only sent to the auth endpoints.
const refreshOptions: CookieOptions = { ...baseOptions, path: '/api/auth' };

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
): void {
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...accessOptions,
    maxAge: env.JWT_ACCESS_EXPIRES_IN * 1000,
  });
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...refreshOptions,
    maxAge: env.JWT_REFRESH_EXPIRES_IN * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, accessOptions);
  res.clearCookie(REFRESH_TOKEN_COOKIE, refreshOptions);
}
