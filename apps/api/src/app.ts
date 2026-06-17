import cors from 'cors';
import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { errorHandler } from './common/middleware/error-handler.js';
import { notFoundHandler } from './common/middleware/not-found.js';
import { apiRouter } from './routes/index.js';
import { MongooseAuthRepository, type AuthRepository } from './modules/auth/auth.repository.js';
import { AuthService } from './modules/auth/auth.service.js';
import { TokenService } from './modules/auth/token.service.js';
import { MongooseGroupRepository, type GroupRepository } from './modules/group/group.repository.js';
import { GroupService } from './modules/group/group.service.js';
import { MongooseExpenseRepository, type ExpenseRepository } from './modules/expense/expense.repository.js';
import { ExpenseService } from './modules/expense/expense.service.js';
import { DashboardService } from './modules/dashboard/dashboard.service.js';
import { MongooseSettlementRepository, type SettlementRepository } from './modules/settlement/settlement.repository.js';
import { SettlementService } from './modules/settlement/settlement.service.js';
import { BalanceService } from './modules/balance/balance.service.js';
import { GroupMutex } from './common/utils/group-mutex.js';

interface CreateAppOptions {
  clientOrigin: string;
  environment?: 'development' | 'test' | 'production';
  jwtAccessSecret?: string;
  jwtRefreshSecret?: string;
  authRepository?: AuthRepository;
  groupRepository?: GroupRepository;
  expenseRepository?: ExpenseRepository;
  settlementRepository?: SettlementRepository;
}

export function createApp({
  clientOrigin,
  environment = 'development',
  jwtAccessSecret = 'test-access-secret-that-is-at-least-32-characters',
  jwtRefreshSecret = 'test-refresh-secret-that-is-at-least-32-characters',
  authRepository = new MongooseAuthRepository(),
  groupRepository,
  expenseRepository,
  settlementRepository,
}: CreateAppOptions): Express {
  const app = express();
  const tokens = new TokenService({
    accessSecret: jwtAccessSecret,
    refreshSecret: jwtRefreshSecret,
  });

  const groupMutex = new GroupMutex();
  const finalGroupRepo = groupRepository ?? new MongooseGroupRepository();
  const finalExpenseRepo = expenseRepository ?? new MongooseExpenseRepository();
  const finalSettlementRepo = settlementRepository ?? new MongooseSettlementRepository();

  const authService = new AuthService(authRepository, tokens);
  const groupService = new GroupService(finalGroupRepo, finalExpenseRepo, finalSettlementRepo, groupMutex);
  const expenseService = new ExpenseService(finalExpenseRepo, groupService, groupMutex);
  const settlementService = new SettlementService(finalSettlementRepo, groupService, finalExpenseRepo, groupMutex);
  const dashboardService = new DashboardService(
    finalGroupRepo,
    finalExpenseRepo,
    finalSettlementRepo,
  );
  const balanceService = new BalanceService(
    finalExpenseRepo,
    finalSettlementRepo,
    finalGroupRepo,
  );

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: clientOrigin, credentials: true }));
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  if (environment !== 'test') {
    app.use(morgan(environment === 'production' ? 'combined' : 'dev'));
  }

  app.use(
    '/api/v1',
    apiRouter({
      authService,
      tokens,
      groupService,
      expenseService,
      dashboardService,
      settlementService,
      balanceService,
      isProduction: environment === 'production',
    }),
  );
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
