import { randomUUID } from 'node:crypto';

import jwt from 'jsonwebtoken';

import { AppError } from '../../common/errors/app-error.js';

interface TokenPayload extends jwt.JwtPayload {
  sub: string;
  type: 'access' | 'refresh';
}

interface TokenServiceOptions {
  accessSecret: string;
  refreshSecret: string;
}

export class TokenService {
  constructor(private readonly options: TokenServiceOptions) {}

  createAccessToken(userId: string): string {
    return jwt.sign({ type: 'access' }, this.options.accessSecret, {
      subject: userId,
      expiresIn: '15m',
      jwtid: randomUUID(),
    });
  }

  createRefreshToken(userId: string): string {
    return jwt.sign({ type: 'refresh' }, this.options.refreshSecret, {
      subject: userId,
      expiresIn: '7d',
      jwtid: randomUUID(),
    });
  }

  verifyAccessToken(token: string): TokenPayload {
    return this.verify(token, this.options.accessSecret, 'access');
  }

  verifyRefreshToken(token: string): TokenPayload {
    return this.verify(token, this.options.refreshSecret, 'refresh');
  }

  private verify(token: string, secret: string, expectedType: TokenPayload['type']): TokenPayload {
    try {
      const payload = jwt.verify(token, secret);

      if (
        typeof payload === 'string' ||
        typeof payload.sub !== 'string' ||
        payload.type !== expectedType
      ) {
        throw new Error('Invalid token payload');
      }

      return payload as TokenPayload;
    } catch {
      throw new AppError(401, 'INVALID_TOKEN', 'Your session is invalid or has expired.');
    }
  }
}
