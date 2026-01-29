import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authService } from './auth.service.js';

const router = Router();

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password required'),
];

const registerValidation = [
  ...loginValidation,
  body('role').optional().isIn(['user', 'admin']),
];

router.post(
  '/register',
  registerValidation,
  async (req, res, next) => {
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
  loginValidation,
  async (req, res, next) => {
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
