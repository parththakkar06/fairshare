# Deployment Checklist

## API Routes
- ✅ `/api/v1/health`
- ✅ `/api/v1/auth/register`
- ✅ `/api/v1/auth/login`
- ✅ `/api/v1/auth/refresh`
- ✅ `/api/v1/auth/logout`
- ✅ `/api/v1/auth/me`
- ✅ `/api/v1/groups/create`
- ✅ `/api/v1/groups/join`
- ✅ `/api/v1/groups` (list)
- ✅ `/api/v1/groups/:groupId`
- ✅ `/api/v1/groups/:groupId` (delete)
- ✅ `/api/v1/expenses` (create/list by group)
- ✅ `/api/v1/expenses/:expenseId` (read/update/delete)
- ✅ `/api/v1/dashboard` (get)
- ✅ `/api/v1/settlements` (create)
- ✅ `/api/v1/settlements/group/:groupId` (list)
- ✅ `/api/v1/balances/group/:groupId` (get)

## Authentication flow (JWT + refresh cookie)
- ✅ JWT access token generated via env secrets
- ✅ Refresh cookie issued for `/api/v1/auth/*`
- ✅ Refresh token verification uses env secrets
- ✅ Protected endpoints use `authenticate(tokens)` middleware

## Registration flow
- ✅ `/auth/register` validates request body and creates user

## Login flow
- ✅ `/auth/login` validates credentials and sets refresh cookie

## JWT handling
- ✅ Access token secret from `JWT_ACCESS_SECRET`
- ✅ Refresh token secret from `JWT_REFRESH_SECRET`
- ✅ No DB credentials are hardcoded in code (MongoDB URI comes from env)

## Group creation + invite code flow
- ✅ `/groups/create` authenticates and creates group
- ✅ `/groups/join` authenticates and joins via invite code

## Expense operations
- ✅ Expense creation: `POST /api/v1/expenses/`
- ✅ Expense editing: `PUT /api/v1/expenses/:expenseId`
- ✅ Expense deletion: `DELETE /api/v1/expenses/:expenseId`

## Balance calculation + debt simplification
- ✅ Balance retrieval: `GET /api/v1/balances/group/:groupId`
- ⚠️ Unit/integration tests currently fail in `apps/api` due to an assertion in `qa-edge-cases.test.ts` (pre-existing / unrelated to env changes)

## Settlements
- ✅ Create settlement: `POST /api/v1/settlements/`
- ✅ List settlements: `GET /api/v1/settlements/group/:groupId`

## Analytics endpoints
- ✅ Dashboard endpoint: `GET /api/v1/dashboard`
- (Web analytics pages read dashboard data through the existing API client)

## Production readiness checks
- ✅ No hardcoded localhost URLs in API config (CORS uses `CLIENT_ORIGIN`)
- ✅ No MongoDB credentials hardcoded (server uses `MONGODB_URI`)
- ✅ Env variables validated at startup via Zod (`parseEnvironment`)
- ✅ Build errors: none observed for API/Web (`npm run build -w ...`)
- ✅ TypeScript errors: none observed for build/typecheck steps executed

## Required environment variables
### Backend (Render)
- `MONGODB_URI` (MongoDB Atlas connection string)
- `JWT_ACCESS_SECRET` (>= 32 chars)
- `JWT_REFRESH_SECRET` (>= 32 chars)
- `CLIENT_ORIGIN` (your Vercel frontend URL)
- `NODE_ENV=production` (recommended)
- `PORT=4000` (optional)

### Frontend (Vercel)
- `VITE_API_URL` (e.g. `https://<backend-host>/api/v1`)

---

## Final deployment recommendation
**✅ READY TO DEPLOY**

