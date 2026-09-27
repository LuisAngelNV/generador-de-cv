import { createApp } from './app';
import { env } from './config/env';
import { closePdfRenderer } from './lib/pdf-renderer';
import { prisma } from './lib/prisma';

const server = createApp().listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await Promise.all([prisma.$disconnect(), closePdfRenderer()]);
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
