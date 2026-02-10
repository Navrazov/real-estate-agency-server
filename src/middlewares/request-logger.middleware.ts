import morgan from 'morgan';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

const stream = { write: (message: string) => logger.http(message.trim()) };
const format = env.nodeEnv === 'development' ? 'dev' : 'combined';

export const requestLogger = morgan(format, { stream });
