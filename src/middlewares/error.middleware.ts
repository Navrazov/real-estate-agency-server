import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

export function errorMiddleware(
  err: Error & { statusCode?: number },
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const status = err.statusCode ?? 500;
  const message = err.message || 'Internal server error';

  logger.error(`${req.method} ${req.url} → ${status}: ${message}`);
  if (status === 500) logger.error(err.stack || '');

  res.status(status).json({ error: message });
}
