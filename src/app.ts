import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/users/user.routes.js';
import { listingRoutes } from './modules/listings/listing.routes.js';
import { uploadRoutes } from './modules/upload/upload.routes.js';
import { chatRoutes } from './modules/chat/chat.routes.js';
import { notificationRoutes } from './modules/notifications/notification.routes.js';
import { analyticsRoutes } from './modules/analytics/analytics.routes.js';
import { sitemapRoutes } from './modules/sitemap/sitemap.routes.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { globalLimiter } from './middlewares/rate-limit.middleware.js';
import { requestLogger } from './middlewares/request-logger.middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set('trust proxy', true);
app.use(cors());
app.use(express.json());
app.use(globalLimiter);
app.use(requestLogger);
app.use('/uploads', express.static(path.resolve(process.cwd(), env.uploadDir)));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use(sitemapRoutes);

app.use(errorMiddleware);

export default app;
