import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { env } from '../../config/env';
import { Prisma } from '../../generated/prisma/client';
import { AppError } from '../../lib/app-error';
import { prisma } from '../../lib/prisma';
import type { LoginInput, RegisterInput } from './auth.schema';
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from './auth.tokens';

// The minimum cost in tests only, where every case signs up users and security is irrelevant.
const BCRYPT_ROUNDS = env.NODE_ENV === 'test' ? 4 : 12;

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export interface Session {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

const invalidCredentials = () =>
  new AppError(401, 'INVALID_CREDENTIALS', 'El email o la contraseña no son correctos');

const invalidRefreshToken = () =>
  new AppError(401, 'INVALID_REFRESH_TOKEN', 'La sesión ha caducado, vuelve a iniciar sesión');

// Compared against when the email does not exist, so both cases take the same time.
let dummyPasswordHash: Promise<string> | undefined;
function getDummyPasswordHash(): Promise<string> {
  dummyPasswordHash ??= bcrypt.hash(randomUUID(), BCRYPT_ROUNDS);
  return dummyPasswordHash;
}

async function createSession(user: PublicUser): Promise<Session> {
  const tokenId = randomUUID();
  const refreshToken = signRefreshToken(user.id, tokenId);

  await prisma.refreshToken.create({
    data: {
      id: tokenId,
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + env.JWT_REFRESH_EXPIRES_IN * 1000),
    },
  });

  return { user, accessToken: signAccessToken(user.id), refreshToken };
}

async function revokeAllUserTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function register(input: RegisterInput): Promise<Session> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  try {
    const user = await prisma.user.create({
      data: { email: input.email, name: input.name ?? null, passwordHash },
      select: publicUserSelect,
    });
    return await createSession(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(409, 'EMAIL_IN_USE', 'Ya existe una cuenta con este email');
    }
    throw error;
  }
}

export async function login(input: LoginInput): Promise<Session> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { ...publicUserSelect, passwordHash: true },
  });

  const passwordMatches = await bcrypt.compare(
    input.password,
    user?.passwordHash ?? (await getDummyPasswordHash()),
  );

  if (!user || !passwordMatches) {
    throw invalidCredentials();
  }

  const { passwordHash: _, ...publicUser } = user;
  return createSession(publicUser);
}

/**
 * Rotates the refresh token: the current one is revoked and a new session is issued.
 * Reusing an already revoked token revokes every session of the user, since it means
 * the token has probably been stolen.
 */
export async function refresh(refreshToken: string | undefined): Promise<Session> {
  const payload = refreshToken ? verifyRefreshToken(refreshToken) : null;
  if (!refreshToken || !payload) {
    throw invalidRefreshToken();
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { id: payload.tokenId },
    select: { userId: true, tokenHash: true, revokedAt: true, expiresAt: true },
  });

  if (!stored || stored.tokenHash !== hashToken(refreshToken) || stored.userId !== payload.userId) {
    throw invalidRefreshToken();
  }

  if (stored.revokedAt) {
    await revokeAllUserTokens(stored.userId);
    throw invalidRefreshToken();
  }

  if (stored.expiresAt <= new Date()) {
    throw invalidRefreshToken();
  }

  // Only one concurrent request can revoke the token; the others are treated as reuse.
  const { count } = await prisma.refreshToken.updateMany({
    where: { id: payload.tokenId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) {
    await revokeAllUserTokens(stored.userId);
    throw invalidRefreshToken();
  }

  const user = await prisma.user.findUnique({
    where: { id: stored.userId },
    select: publicUserSelect,
  });
  if (!user) {
    throw invalidRefreshToken();
  }

  return createSession(user);
}

/** Revokes the given refresh token. Invalid or missing tokens are ignored. */
export async function logout(refreshToken: string | undefined): Promise<void> {
  const payload = refreshToken ? verifyRefreshToken(refreshToken) : null;
  if (!refreshToken || !payload) {
    return;
  }

  await prisma.refreshToken.updateMany({
    where: { id: payload.tokenId, tokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  if (!user) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Debes iniciar sesión');
  }
  return user;
}
