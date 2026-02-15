import fs from 'fs';
import { createServer } from 'http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { initChatSocket } from './modules/chat/chat.socket.js';
import { setIo } from './shared/socket.js';

try {
  fs.mkdirSync(env.uploadDir, { recursive: true });
  fs.mkdirSync('logs', { recursive: true });
} catch {}

const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

setIo(io);
initChatSocket(io);

mongoose
  .connect(env.mongoUri)
  .then(() => {
    logger.info('Connected to MongoDB');
    server.listen(env.port, () => {
      logger.info(`Server running on http://localhost:${env.port}`);
    });
  })
  .catch((err) => {
    logger.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  });
