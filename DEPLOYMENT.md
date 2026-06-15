# Deployment Instructions

## Overview
- **Frontend**: Vercel (apps/web)
- **Backend**: Render (apps/api)
- **Database**: MongoDB Atlas

## 1) MongoDB Atlas setup
1. Create a MongoDB Atlas cluster.
2. Create a database user (read/write).
3. In **Atlas → Database access**, create credentials.
4. In **Atlas → Connect → Drivers**, copy the **MongoDB connection string**.
   - It should be of the form:
     - `mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority`
5. Create a database (or use the db name in the URI) for the application.

## 2) Backend (Render) setup
1. Create a **Web Service** on Render for the backend using **`render.yaml`** as reference.
2. Configure environment variables in Render **Secrets**:
   - `NODE_ENV` = `production`
   - `PORT` = `4000` (or omit if you keep the default)
   - `MONGODB_URI` = your Atlas connection string
   - `JWT_ACCESS_SECRET` = a long random string (>= 32 chars)
   - `JWT_REFRESH_SECRET` = a long random string (>= 32 chars)
   - `CLIENT_ORIGIN` = the frontend URL (Vercel URL), e.g. `https://your-frontend.vercel.app`
3. Ensure health check path is `GET /api/v1/health`.
4. Deploy.

### Notes
- CORS is restricted by `CLIENT_ORIGIN`.
- Auth cookies use `secure` + `sameSite=none` in production; this requires HTTPS (Render + Vercel do this automatically).

## 3) Frontend (Vercel) setup
1. Create a Vercel project for the repo (frontend can be configured as the apps/web workspace).
2. Build command (Vercel can use defaults; recommended):
   - `npm ci && npm run build -w @splitwise/web`
3. Add environment variables in Vercel **Environment Variables**:
   - `VITE_API_URL` = your Render backend base URL, e.g.
     - `https://your-backend.onrender.com/api/v1`
4. Deploy.

## 4) Required environment variables summary
### Backend (Render)
- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CLIENT_ORIGIN`
- `NODE_ENV` (recommended)
- `PORT` (optional)

### Frontend (Vercel)
- `VITE_API_URL`

## 5) Production deployment order
1. MongoDB Atlas cluster + credentials
2. Deploy backend to Render (with `MONGODB_URI` etc.)
3. Deploy frontend to Vercel (with `VITE_API_URL` pointing to backend)

