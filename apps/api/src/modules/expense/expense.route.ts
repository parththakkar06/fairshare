import { Router } from 'express';

import { authenticate, type AuthenticatedRequest } from '../../common/middleware/authenticate.js';
import { rateLimit } from '../../common/middleware/rate-limit.js';
import { validateBody } from '../../common/middleware/validate-body.js';
import type { ExpenseService } from './expense.service.js';
import type { TokenService } from '../auth/token.service.js';
import {
  createExpenseSchema,
  updateExpenseSchema,
  type CreateExpenseInput,
  type UpdateExpenseInput,
} from './expense.schemas.js';

interface ExpenseRouterOptions {
  service: ExpenseService;
  tokens: TokenService;
}

export function createExpenseRouter({ service, tokens }: ExpenseRouterOptions): Router {
  const router = Router();
  const writeLimit = rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 120 });

  router.post(
    '/',
    writeLimit,
    authenticate(tokens),
    validateBody(createExpenseSchema),
    async (request, response, next) => {
      try {
        const auth = request as unknown as AuthenticatedRequest;
        const body = request.body as CreateExpenseInput;
        const expense = await service.createExpense(auth.auth.userId, body);
        response.status(201).json({ expense });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get('/group/:groupId', authenticate(tokens), async (request, response, next) => {
    try {
      const auth = request as unknown as AuthenticatedRequest;
      const groupId = String(request.params.groupId);
      const expenses = await service.getExpensesByGroup(groupId, auth.auth.userId);
      response.status(200).json({ expenses });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:expenseId', authenticate(tokens), async (request, response, next) => {
    try {
      const auth = request as unknown as AuthenticatedRequest;
      const expenseId = String(request.params.expenseId);
      const expense = await service.getExpenseById(expenseId, auth.auth.userId);
      response.status(200).json({ expense });
    } catch (error) {
      next(error);
    }
  });

  router.put(
    '/:expenseId',
    writeLimit,
    authenticate(tokens),
    validateBody(updateExpenseSchema),
    async (request, response, next) => {
      try {
        const auth = request as unknown as AuthenticatedRequest;
        const expenseId = String(request.params.expenseId);
        const body = request.body as UpdateExpenseInput;
        const expense = await service.updateExpense(expenseId, auth.auth.userId, body);
        response.status(200).json({ expense });
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    '/:expenseId',
    writeLimit,
    authenticate(tokens),
    async (request, response, next) => {
      try {
        const auth = request as unknown as AuthenticatedRequest;
        const expenseId = String(request.params.expenseId);
        await service.deleteExpense(expenseId, auth.auth.userId);
        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
