import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { env } from '../../config/env.js';
import { authMiddleware, AuthRequest } from '../../middlewares/auth.middleware.js';
import { checkNotBlocked } from '../../middlewares/blocked.middleware.js';

const router = Router();
const uploadDir = env.uploadDir;

try {
  fs.mkdirSync(uploadDir, { recursive: true });
} catch {}

// Use memory storage so we can process with sharp before saving
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /^image\/(jpeg|png|gif|webp)$/i;
    if (allowed.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only images (jpeg, png, gif, webp) allowed'));
  },
});

const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;
const QUALITY = 80;

router.post(
  '/',
  authMiddleware,
  checkNotBlocked,
  upload.array('images', 10),
  async (req: AuthRequest, res, next) => {
    try {
      const files = (req as unknown as { files: Express.Multer.File[] }).files;
      if (!files?.length) return res.status(400).json({ error: 'No images' });

      const base = env.uploadsBaseUrl || `${req.protocol}://${req.get('host')}`;
      const urls: string[] = [];

      for (const file of files) {
        const name = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.webp`;
        const outputPath = path.join(uploadDir, name);

        // Resize and convert to WebP
        await sharp(file.buffer)
          .resize(MAX_WIDTH, MAX_HEIGHT, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: QUALITY })
          .toFile(outputPath);

        urls.push(`${base}/uploads/${name}`);
      }

      res.json({ urls });
    } catch (e) {
      next(e);
    }
  }
);

export const uploadRoutes = router;
