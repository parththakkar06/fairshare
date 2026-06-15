import { Router } from 'express';

import { authenticate, type AuthenticatedRequest } from '../../common/middleware/authenticate.js';
import { rateLimit } from '../../common/middleware/rate-limit.js';
import { validateBody } from '../../common/middleware/validate-body.js';
import type { AuthService } from '../auth/auth.service.js';
import type { GroupService } from './group.service.js';
import {
  createGroupSchema,
  joinGroupSchema,
  type CreateGroupInput,
  type JoinGroupInput,
} from './group.schemas.js';
import type { TokenService } from '../auth/token.service.js';

interface GroupRouterOptions {
  service: GroupService;
  authService: AuthService;
  tokens: TokenService;
}

export function createGroupRouter({ service, authService, tokens }: GroupRouterOptions): Router {
  const router = Router();
  const writeLimit = rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 60 });

  router.post(
    '/create',
    writeLimit,
    authenticate(tokens),
    validateBody(createGroupSchema),
    async (request, response, next) => {
      try {
        const auth = (request as unknown as AuthenticatedRequest).auth;
        const user = await authService.getUser(auth.userId);
        const body = request.body as CreateGroupInput;
        const group = await service.createGroup({
          name: body.name,
          type: body.type,
          createdBy: auth.userId,
          creator: {
            userId: auth.userId,
            name: user.name,
            email: user.email,
          },
        });
        response.status(201).json({ group });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/join',
    writeLimit,
    authenticate(tokens),
    validateBody(joinGroupSchema),
    async (request, response, next) => {
      try {
        const auth = (request as unknown as AuthenticatedRequest).auth;
        const user = await authService.getUser(auth.userId);
        const body = request.body as JoinGroupInput;
        const group = await service.joinGroup(body.inviteCode, {
          userId: auth.userId,
          name: user.name,
          email: user.email,
        });
        response.status(200).json({ group });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get('/', authenticate(tokens), async (request, response, next) => {
    try {
      const auth = (request as unknown as AuthenticatedRequest).auth;
      const groups = await service.getGroupsForUser(auth.userId);
      response.status(200).json({ groups });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:groupId', authenticate(tokens), async (request, response, next) => {
    try {
      const auth = (request as unknown as AuthenticatedRequest).auth;
      const groupId = String(request.params.groupId);
      const group = await service.getGroupForMember(groupId, auth.userId);
      response.status(200).json({ group });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:groupId', authenticate(tokens), async (request, response, next) => {
    try {
      const auth = (request as unknown as AuthenticatedRequest).auth;
      const groupId = String(request.params.groupId);
      await service.deleteGroup(groupId, auth.userId);
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
