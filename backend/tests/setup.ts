import { closePdfRenderer } from '../src/lib/pdf-renderer';
import { prisma } from '../src/lib/prisma';

afterAll(async () => {
  await Promise.all([prisma.$disconnect(), closePdfRenderer()]);
});
