import type { Server } from 'node:http';

import { createApp } from './app.js';
import { connectToDatabase, disconnectFromDatabase } from './config/database.js';
import { parseEnvironment } from './config/env.js';

const environment = parseEnvironment(process.env);
const app = createApp({
  clientOrigin: environment.CLIENT_ORIGIN,
  environment: environment.NODE_ENV,
  jwtAccessSecret: environment.JWT_ACCESS_SECRET,
  jwtRefreshSecret: environment.JWT_REFRESH_SECRET,
});

let server: Server | undefined;

async function startServer(): Promise<void> {
  // Fail fast with clear logs if required env is missing.
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is required but was not provided.');
    process.exit(1);
  }

  try {
    await connectToDatabase(process.env.MONGODB_URI);
  } catch (error: unknown) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }

  server = app.listen(environment.PORT, () => {
    console.info(`API listening on port ${environment.PORT}`);
  });
}

async function shutdown(signal: string): Promise<void> {
  console.info(`${signal} received. Shutting down gracefully.`);

  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()));
    });
  }

  await disconnectFromDatabase();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

startServer().catch((error: unknown) => {
  console.error('Failed to start API', error);
  process.exit(1);
});
