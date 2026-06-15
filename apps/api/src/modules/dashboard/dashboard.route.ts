import { Router } from 'express';

import { authenticate, type AuthenticatedRequest } from '../../common/middleware/authenticate.js';
import type { DashboardService } from './dashboard.service.js';
import type { TokenService } from '../auth/token.service.js';

interface DashboardRouterOptions {
  service: DashboardService;
  tokens: TokenService;
}

export function createDashboardRouter({ service, tokens }: DashboardRouterOptions): Router {
  const router = Router();

  router.get('/', authenticate(tokens), async (request, response, next) => {
    try {
      const auth = request as unknown as AuthenticatedRequest;
      const dashboard = await service.getDashboardForUser(auth.auth.userId);
      response.status(200).json({ dashboard });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
