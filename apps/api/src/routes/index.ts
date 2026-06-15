import { Router } from 'express';

import { healthRouter } from './health.route.js';
import { createAuthRouter } from '../modules/auth/auth.route.js';
import { createGroupRouter } from '../modules/group/group.route.js';
import { createExpenseRouter } from '../modules/expense/expense.route.js';
import { createDashboardRouter } from '../modules/dashboard/dashboard.route.js';
import { createSettlementRouter } from '../modules/settlement/settlement.route.js';
import { createBalanceRouter } from '../modules/balance/balance.route.js';
import type { AuthService } from '../modules/auth/auth.service.js';
import type { TokenService } from '../modules/auth/token.service.js';
import type { GroupService } from '../modules/group/group.service.js';
import type { ExpenseService } from '../modules/expense/expense.service.js';
import type { DashboardService } from '../modules/dashboard/dashboard.service.js';
import type { SettlementService } from '../modules/settlement/settlement.service.js';
import type { BalanceService } from '../modules/balance/balance.service.js';

interface ApiRouterOptions {
  authService: AuthService;
  tokens: TokenService;
  groupService: GroupService;
  expenseService: ExpenseService;
  dashboardService: DashboardService;
  settlementService: SettlementService;
  balanceService: BalanceService;
  isProduction: boolean;
}

export function apiRouter(options: ApiRouterOptions): Router {
  const router = Router();
  router.use('/health', healthRouter);
  router.use(
    '/auth',
    createAuthRouter({
      service: options.authService,
      tokens: options.tokens,
      isProduction: options.isProduction,
    }),
  );
  router.use(
    '/groups',
    createGroupRouter({
      service: options.groupService,
      authService: options.authService,
      tokens: options.tokens,
    }),
  );
  router.use(
    '/expenses',
    createExpenseRouter({ service: options.expenseService, tokens: options.tokens }),
  );
  router.use(
    '/dashboard',
    createDashboardRouter({ service: options.dashboardService, tokens: options.tokens }),
  );
  router.use(
    '/settlements',
    createSettlementRouter({
      service: options.settlementService,
      groupService: options.groupService,
      tokens: options.tokens,
    }),
  );
  router.use(
    '/balances',
    createBalanceRouter({ service: options.balanceService, tokens: options.tokens }),
  );
  return router;
}
