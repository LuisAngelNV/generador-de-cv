import { env } from '../../src/config/env';
import { prisma } from '../../src/lib/prisma';

/** Empties every table. env.ts already refuses to load a Supabase URL in the test environment. */
export async function resetDatabase(): Promise<void> {
  if (env.NODE_ENV !== 'test') {
    throw new Error('resetDatabase can only run with NODE_ENV=test');
  }
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "User", "RefreshToken", "Cv", "Experience", "Education", "Skill", "Language", "Project", "Certification" CASCADE',
  );
}
