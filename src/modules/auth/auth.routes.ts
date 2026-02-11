import { Router, Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authService } from './auth.service.js';
import { authLimiter } from '../../middlewares/rate-limit.middleware.js';

const router = Router();

const loginValidation = [
  body('password').notEmpty().withMessage('Password required'),
  // At least one of email or phone must be provided - validated in custom check
  body().custom((_, { req }) => {
    const { email, phone } = req.body ?? {};
    if (!email && !phone) {
      throw new Error('Either email or phone is required');
    }
    return true;
  }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isString().trim(),
];

const registerValidation = [
  body('phone')
    .notEmpty().withMessage('Phone is required')
    .isString()
    .trim()
    .matches(/^\+?\d{7,15}$/).withMessage('Invalid phone format'),
  body('password').notEmpty().withMessage('Password required'),
  body('firstName').notEmpty().withMessage('First name is required').isString().trim(),
  body('lastName').notEmpty().withMessage('Last name is required').isString().trim(),
  body('code').notEmpty().withMessage('Verification code is required').isString().trim(),
];

const sendCodeValidation = [
  body('phone')
    .notEmpty().withMessage('Phone is required')
    .isString()
    .trim()
    .matches(/^\+?\d{7,15}$/).withMessage('Invalid phone format'),
];

router.post(
  '/send-code',
  authLimiter,
  sendCodeValidation,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const result = await authService.sendCode(req.body);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  '/verify-code',
  authLimiter,
  [
    body('phone')
      .notEmpty().withMessage('Phone is required')
      .isString()
      .trim()
      .matches(/^\+?\d{7,15}$/).withMessage('Invalid phone format'),
    body('code').notEmpty().withMessage('Code is required').isString().trim(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const result = await authService.verifyCode(req.body.phone, req.body.code);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

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
