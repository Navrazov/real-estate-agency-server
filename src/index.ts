import fs from 'fs';
import mongoose from 'mongoose';
import app from './app.js';
import { env } from './config/env.js';

try {
  fs.mkdirSync(env.uploadDir, { recursive: true });
} catch {}

mongoose
  .connect(env.mongoUri)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(env.port, () => {
      console.log(`Server running on http://localhost:${env.port}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
