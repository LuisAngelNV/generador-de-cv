import { config } from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

// .env and .env.test live in the repository root (src/config and dist/config are both 3 levels deep).
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
config({ path: path.resolve(__dirname, '../../..', envFile), quiet: true });

const SECONDS_PER_UNIT = { s: 1, m: 60, h: 3600, d: 86400 } as const;

/** Parses durations like "15m" or "7d" into seconds. */
function duration(defaultValue: string) {
  return z
    .string()
    .regex(/^\d+[smhd]$/, 'Use a number followed by s, m, h or d (e.g. 15m, 7d)')
    .default(defaultValue)
    .transform((value) => {
      const unit = value.slice(-1) as keyof typeof SECONDS_PER_UNIT;
      return Number(value.slice(0, -1)) * SECONDS_PER_UNIT[unit];
    });
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.url(),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    /** In seconds */
    JWT_ACCESS_EXPIRES_IN: duration('15m'),
    /** In seconds */
    JWT_REFRESH_EXPIRES_IN: duration('7d'),
    CORS_ORIGIN: z.url(),
    /**
     * Number of reverse proxies in front of the API, so the client IP (used by the rate limits)
     * comes from X-Forwarded-For. 0 locally; 2 behind Netlify + Render.
     */
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    /** PDFs rendered at the same time; 1 on small instances (each render uses ~100 MB). */
    PDF_MAX_CONCURRENT: z.coerce.number().int().positive().default(2),
    /**
     * Chromium's sandbox needs kernel features that some container platforms do not offer.
     * Only disable it there: the page already has JavaScript and network access disabled.
     */
    PDF_DISABLE_SANDBOX: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
  })
  .refine((vars) => vars.JWT_ACCESS_SECRET !== vars.JWT_REFRESH_SECRET, {
    message: 'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different',
    path: ['JWT_REFRESH_SECRET'],
  })
  .refine((vars) => vars.NODE_ENV !== 'test' || !/supabase/i.test(vars.DATABASE_URL), {
    message: 'Tests must never run against Supabase: use the local database from .env.test',
    path: ['DATABASE_URL'],
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
}

export const env = parsed.data;
