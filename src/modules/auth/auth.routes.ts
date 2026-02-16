import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { authService } from './auth.service.js';
import { authLimiter } from '../../middlewares/rate-limit.middleware.js';

const router = Router();

const loginValidation = [
  body('phone')
    .notEmpty().withMessage('Укажите номер телефона')
    .isString()
    .trim(),
  body('password').notEmpty().withMessage('Укажите пароль'),
];

const registerValidation = [
  body('phone')
    .notEmpty().withMessage('Укажите номер телефона')
    .isString()
    .trim()
    .matches(/^\+?\d{7,15}$/).withMessage('Неверный формат номера'),
  body('password').notEmpty().withMessage('Укажите пароль'),
  body('firstName').notEmpty().withMessage('Укажите имя').isString().trim(),
  body('lastName').notEmpty().withMessage('Укажите фамилию').isString().trim(),
  body('code').notEmpty().withMessage('Укажите код подтверждения').isString().trim(),
];

const sendCodeValidation = [
  body('phone')
    .notEmpty().withMessage('Укажите номер телефона')
    .isString()
    .trim()
    .matches(/^\+?\d{7,15}$/).withMessage('Неверный формат номера'),
  body('method')
    .optional()
    .isIn(['call', 'telegram']).withMessage('Метод должен быть "call" или "telegram"'),
  body('checkExists')
    .optional()
    .isBoolean(),
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
      .notEmpty().withMessage('Укажите номер телефона')
      .isString()
      .trim()
      .matches(/^\+?\d{7,15}$/).withMessage('Неверный формат номера'),
    body('code').notEmpty().withMessage('Укажите код').isString().trim(),
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

export const authRoutes = router;
