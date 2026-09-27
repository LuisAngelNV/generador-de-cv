import type { Response } from 'supertest';

function setCookieHeaders(res: Response): string[] {
  const header = res.headers['set-cookie'] as string[] | string | undefined;
  if (!header) return [];
  return Array.isArray(header) ? header : [header];
}

/** Raw Set-Cookie header for the given cookie, e.g. "access_token=...; Path=/api; HttpOnly". */
export function getSetCookie(res: Response, name: string): string | undefined {
  return setCookieHeaders(res).find((cookie) => cookie.startsWith(`${name}=`));
}

/** "name=value" pairs ready to be sent back in a Cookie header. */
export function cookiesFrom(res: Response): string[] {
  return setCookieHeaders(res)
    .map((cookie) => cookie.split(';')[0] ?? '')
    .filter((pair) => !pair.endsWith('='));
}
