import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

import { AppError } from '../errors/app-error.js';

export function validateBody(schema: ZodType): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      next(
        new AppError(400, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', {
          fields: result.error.flatten().fieldErrors,
        }),
      );
      return;
    }

    request.body = result.data;
    next();
  };
}
