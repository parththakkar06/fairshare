import type { RequestHandler } from 'express';

import { AppError } from '../errors/app-error.js';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export function rateLimit({ windowMs, maxRequests }: RateLimitOptions): RequestHandler {
  const buckets = new Map<string, RateLimitBucket>();

  return (request, _response, next) => {
    if (process.env.NODE_ENV === 'test') {
      next();
      return;
    }
    const now = Date.now();
    const key = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;

    if (bucket.count > maxRequests) {
      next(new AppError(429, 'RATE_LIMIT_EXCEEDED', 'Too many requests. Please try again later.'));
      return;
    }

    next();
  };
}
