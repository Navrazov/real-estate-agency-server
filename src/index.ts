import fs from 'fs';
import app from './app.js';
import { env } from './config/env.js';

try {
  fs.mkdirSync(env.uploadDir, { recursive: true });
} catch {}

app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});
