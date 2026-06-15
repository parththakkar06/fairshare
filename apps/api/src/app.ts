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
import { MongooseGroupRepository } from './modules/group/group.repository.js';
import { GroupService } from './modules/group/group.service.js';
import { MongooseExpenseRepository } from './modules/expense/expense.repository.js';
import { ExpenseService } from './modules/expense/expense.service.js';
import { DashboardService } from './modules/dashboard/dashboard.service.js';
import { MongooseSettlementRepository } from './modules/settlement/settlement.repository.js';
import { SettlementService } from './modules/settlement/settlement.service.js';
import { BalanceService } from './modules/balance/balance.service.js';

interface CreateAppOptions {
  clientOrigin: string;
  environment?: 'development' | 'test' | 'production';
  jwtAccessSecret?: string;
  jwtRefreshSecret?: string;
  authRepository?: AuthRepository;
}

export function createApp({
  clientOrigin,
  environment = 'development',
  jwtAccessSecret = 'test-access-secret-that-is-at-least-32-characters',
  jwtRefreshSecret = 'test-refresh-secret-that-is-at-least-32-characters',
  authRepository = new MongooseAuthRepository(),
}: CreateAppOptions): Express {
  const app = express();
  const tokens = new TokenService({
    accessSecret: jwtAccessSecret,
    refreshSecret: jwtRefreshSecret,
  });
  const authService = new AuthService(authRepository, tokens);
  const groupService = new GroupService(new MongooseGroupRepository());
  const expenseService = new ExpenseService(new MongooseExpenseRepository(), groupService);
  const settlementService = new SettlementService(new MongooseSettlementRepository(), groupService);
  const dashboardService = new DashboardService(
    new MongooseGroupRepository(),
    new MongooseExpenseRepository(),
    new MongooseSettlementRepository(),
  );
  const balanceService = new BalanceService(
    new MongooseExpenseRepository(),
    new MongooseSettlementRepository(),
    new MongooseGroupRepository(),
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
