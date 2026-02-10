import { Router, Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authService } from './auth.service.js';
import { authLimiter } from '../../middlewares/rate-limit.middleware.js';

const router = Router();

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password required'),
];

const registerValidation = [
  ...loginValidation,
];

router.post(
  '/register',
  authLimiter,
  registerValidation,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  '/login',
  authLimiter,
  loginValidation,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const result = await authService.login(req.body);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

router.get(
  '/verify-email',
  [query('token').notEmpty().withMessage('Token required')],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const result = await authService.verifyEmail(req.query.token as string);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  '/resend-verification',
  authLimiter,
  [body('email').isEmail().normalizeEmail()],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const result = await authService.resendVerification(req.body.email);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

export const authRoutes = router;
