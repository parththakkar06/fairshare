import type { RequestHandler } from 'express';

import { AppError } from '../errors/app-error.js';
import type { TokenService } from '../../modules/auth/token.service.js';

export interface AuthenticatedRequest {
  auth: { userId: string };
}

export function authenticate(tokens: TokenService): RequestHandler {
  return (request, _response, next) => {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.'));
      return;
    }

    const payload = tokens.verifyAccessToken(authorization.slice(7));
    Object.assign(request, { auth: { userId: payload.sub } });
    next();
  };
}
