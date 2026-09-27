import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// .env and .env.test live in the repository root.
config({ path: process.env.NODE_ENV === 'test' ? '../.env.test' : '../.env', quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Prisma CLI (migrate, db seed) needs a session-mode connection: DIRECT_URL, never the transaction pooler.
    url: process.env.DIRECT_URL ?? '',
  },
});
