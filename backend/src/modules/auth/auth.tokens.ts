import jwt from 'jsonwebtoken';
import { createHash } from 'node:crypto';
import { env } from '../../config/env';

const ALGORITHM = 'HS256';

export function signAccessToken(userId: string): string {
  return jwt.sign({}, env.JWT_ACCESS_SECRET, {
    algorithm: ALGORITHM,
    subject: userId,
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
}

/** Returns the user id, or null if the token is invalid or expired. */
export function verifyAccessToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: [ALGORITHM] });
    return typeof payload === 'object' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

/** The token id (jti) is the id of the RefreshToken row that tracks it. */
export function signRefreshToken(userId: string, tokenId: string): string {
  return jwt.sign({}, env.JWT_REFRESH_SECRET, {
    algorithm: ALGORITHM,
    subject: userId,
    jwtid: tokenId,
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
}

export function verifyRefreshToken(token: string): { userId: string; tokenId: string } | null {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: [ALGORITHM] });
    if (typeof payload !== 'object' || typeof payload.sub !== 'string' || !payload.jti) {
      return null;
    }
    return { userId: payload.sub, tokenId: payload.jti };
  } catch {
    return null;
  }
}

/** Refresh tokens are high-entropy, so a fast hash is enough to store them safely. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
