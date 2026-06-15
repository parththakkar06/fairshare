import { createHash, timingSafeEqual } from 'node:crypto';

import bcrypt from 'bcrypt';

import { AppError } from '../../common/errors/app-error.js';
import type { AuthRepository } from './auth.repository.js';
import type { PublicUser, SessionResult, StoredUser } from './auth.types.js';
import type { TokenService } from './token.service.js';

const DUMMY_PASSWORD_HASH = '$2b$12$1nz6Cgo0hzDObvE7SXTUb.0i.4r.PYaNz88RhWbfbemgFdFum0xKa';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly tokens: TokenService,
  ) {}

  async register(input: RegisterInput): Promise<SessionResult> {
    const email = input.email.trim().toLowerCase();
    const existingUser = await this.repository.findByEmail(email);

    if (existingUser) {
      throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'An account with this email exists.');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    try {
      const user = await this.repository.create({
        name: input.name.trim(),
        email,
        passwordHash,
      });

      return this.createSession(user);
    } catch (error: unknown) {
      if (isDuplicateKeyError(error)) {
        throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'An account with this email exists.');
      }
      throw error;
    }
  }

  async login(input: LoginInput): Promise<SessionResult> {
    const user = await this.repository.findByEmail(input.email.trim().toLowerCase());
    const passwordMatches = await bcrypt.compare(
      input.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }

    return this.createSession(user);
  }

  async refresh(refreshToken: string): Promise<SessionResult> {
    const payload = this.tokens.verifyRefreshToken(refreshToken);
    const user = await this.repository.findById(payload.sub);

    if (
      !user?.refreshTokenHash ||
      !tokenHashesMatch(user.refreshTokenHash, hashToken(refreshToken))
    ) {
      throw new AppError(401, 'INVALID_TOKEN', 'Your session is invalid or has expired.');
    }

    return this.createSession(user);
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;

    try {
      const payload = this.tokens.verifyRefreshToken(refreshToken);
      await this.repository.updateRefreshTokenHash(payload.sub, null);
    } catch {
      // Logout remains idempotent when a stale or malformed cookie is supplied.
    }
  }

  async getUser(userId: string): Promise<PublicUser> {
    const user = await this.repository.findById(userId);

    if (!user) {
      throw new AppError(401, 'INVALID_TOKEN', 'Your session is invalid or has expired.');
    }

    return toPublicUser(user);
  }

  private async createSession(user: StoredUser): Promise<SessionResult> {
    const refreshToken = this.tokens.createRefreshToken(user.id);
    await this.repository.updateRefreshTokenHash(user.id, hashToken(refreshToken));

    return {
      user: toPublicUser(user),
      accessToken: this.tokens.createAccessToken(user.id),
      refreshToken,
    };
  }
}

function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function tokenHashesMatch(storedHash: string, candidateHash: string): boolean {
  const stored = Buffer.from(storedHash, 'hex');
  const candidate = Buffer.from(candidateHash, 'hex');
  return stored.length === candidate.length && timingSafeEqual(stored, candidate);
}

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11_000;
}
