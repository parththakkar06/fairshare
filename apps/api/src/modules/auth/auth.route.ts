import type { CookieOptions, Request } from 'express';
import { Router } from 'express';

import { AppError } from '../../common/errors/app-error.js';
import { authenticate, type AuthenticatedRequest } from '../../common/middleware/authenticate.js';
import { rateLimit } from '../../common/middleware/rate-limit.js';
import { validateBody } from '../../common/middleware/validate-body.js';
import type { AuthService } from './auth.service.js';
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from './auth.schemas.js';
import type { TokenService } from './token.service.js';

const REFRESH_COOKIE = 'splitwise_refresh';

interface AuthRouterOptions {
  service: AuthService;
  tokens: TokenService;
  isProduction: boolean;
}

export function createAuthRouter({ service, tokens, isProduction }: AuthRouterOptions): Router {
  const router = Router();
  const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 30 });
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
  const clearCookieOptions: CookieOptions = {
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    path: cookieOptions.path,
  };

  router.post(
    '/register',
    authLimit,
    validateBody(registerSchema),
    async (request, response, next) => {
      try {
        const session = await service.register(request.body as RegisterInput);
        response.cookie(REFRESH_COOKIE, session.refreshToken, cookieOptions);
        response.status(201).json({ user: session.user, accessToken: session.accessToken });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post('/login', authLimit, validateBody(loginSchema), async (request, response, next) => {
    try {
      const session = await service.login(request.body as LoginInput);
      response.cookie(REFRESH_COOKIE, session.refreshToken, cookieOptions);
      response.status(200).json({ user: session.user, accessToken: session.accessToken });
    } catch (error) {
      next(error);
    }
  });

  router.post('/refresh', authLimit, async (request, response, next) => {
    try {
      const refreshToken = getRefreshToken(request);
      const session = await service.refresh(refreshToken);
      response.cookie(REFRESH_COOKIE, session.refreshToken, cookieOptions);
      response.status(200).json({ user: session.user, accessToken: session.accessToken });
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout', async (request, response, next) => {
    try {
      await service.logout(readCookie(request, REFRESH_COOKIE));
      response.clearCookie(REFRESH_COOKIE, clearCookieOptions);
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.get('/me', authenticate(tokens), async (request, response, next) => {
    try {
      const { userId } = (request as Request & AuthenticatedRequest).auth;
      response.status(200).json({ user: await service.getUser(userId) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function getRefreshToken(request: Request): string {
  const token = readCookie(request, REFRESH_COOKIE);
  if (!token) {
    throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.');
  }
  return token;
}

function readCookie(request: Request, name: string): string | undefined {
  const cookies: unknown = request.cookies;
  if (typeof cookies !== 'object' || cookies === null) return undefined;
  const value = (cookies as Record<string, unknown>)[name];
  return typeof value === 'string' ? value : undefined;
}
