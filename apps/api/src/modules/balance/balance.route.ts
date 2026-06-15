import { Router } from 'express';

import { authenticate, type AuthenticatedRequest } from '../../common/middleware/authenticate.js';
import type { BalanceService } from './balance.service.js';
import type { TokenService } from '../auth/token.service.js';

interface BalanceRouterOptions {
  service: BalanceService;
  tokens: TokenService;
}

export function createBalanceRouter({ service, tokens }: BalanceRouterOptions): Router {
  const router = Router();

  router.get('/group/:groupId', authenticate(tokens), async (request, response, next) => {
    try {
      const auth = request as unknown as AuthenticatedRequest;
      const groupId = String(request.params.groupId);
      const balance = await service.getGroupBalance(groupId, auth.auth.userId);
      response.status(200).json(balance);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
