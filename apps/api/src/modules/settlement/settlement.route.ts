import { Router } from 'express';

import { AppError } from '../../common/errors/app-error.js';
import { authenticate, type AuthenticatedRequest } from '../../common/middleware/authenticate.js';
import { rateLimit } from '../../common/middleware/rate-limit.js';
import { validateBody } from '../../common/middleware/validate-body.js';
import type { GroupService } from '../group/group.service.js';
import type { SettlementService } from './settlement.service.js';
import type { TokenService } from '../auth/token.service.js';
import { createSettlementBodySchema, type CreateSettlementBody } from './settlement.schemas.js';

interface SettlementRouterOptions {
  service: SettlementService;
  groupService: GroupService;
  tokens: TokenService;
}

export function createSettlementRouter({
  service,
  groupService,
  tokens,
}: SettlementRouterOptions): Router {
  const router = Router();
  const writeLimit = rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 120 });

  router.post(
    '/',
    writeLimit,
    authenticate(tokens),
    validateBody(createSettlementBodySchema),
    async (request, response, next) => {
      try {
        const auth = request as unknown as AuthenticatedRequest;
        const body = request.body as CreateSettlementBody;
        const settlement = await service.createSettlement(auth.auth.userId, {
          groupId: body.groupId,
          toUserId: body.toUserId,
          amount: body.amount,
          ...(body.note === undefined ? {} : { note: body.note }),
        });
        response.status(201).json({ settlement });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get('/group/:groupId', authenticate(tokens), async (request, response, next) => {
    try {
      const auth = request as unknown as AuthenticatedRequest;
      const groupId = String(request.params.groupId);
      const group = await groupService.getGroupById(groupId);

      if (!group.members.some((member) => member.userId === auth.auth.userId)) {
        throw new AppError(
          403,
          'FORBIDDEN',
          'You must be a member of this group to view settlements.',
        );
      }

      const settlements = await service.getSettlementsByGroup(groupId);
      response.status(200).json({ settlements });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
