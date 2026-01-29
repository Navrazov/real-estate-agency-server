import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { env } from '../../config/env.js';
import { authMiddleware, AuthRequest } from '../../middlewares/auth.middleware.js';
import { checkNotBlocked } from '../../middlewares/blocked.middleware.js';

const router = Router();
const uploadDir = env.uploadDir;

try {
  fs.mkdirSync(uploadDir, { recursive: true });
} catch {}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /^image\/(jpeg|png|gif|webp)$/i;
    if (allowed.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only images (jpeg, png, gif, webp) allowed'));
  },
});

router.post(
  '/',
  authMiddleware,
  checkNotBlocked,
  upload.array('images', 10),
  (req: AuthRequest, res, next) => {
    try {
      const files = (req as unknown as { files: Express.Multer.File[] }).files;
      if (!files?.length) return res.status(400).json({ error: 'No images' });
      const base = `${req.protocol}://${req.get('host')}`;
      const urls = files.map((f) => `${base}/uploads/${f.filename}`);
      res.json({ urls });
    } catch (e) {
      next(e);
    }
  }
);

export const uploadRoutes = router;
