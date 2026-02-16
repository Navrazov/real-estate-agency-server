import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../../middlewares/auth.middleware.js';
import { checkNotBlocked } from '../../middlewares/blocked.middleware.js';
import { subscriptionService } from './subscription.service.js';

const router = Router();

// Get available plans
router.get('/plans', (_req, res) => {
  res.json(subscriptionService.getPlans());
});

// Get current subscription
router.get(
  '/me',
  authMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await subscriptionService.getActivePlan(req.user!.userId);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

// Activate subscription (stub — in production, integrate with payment gateway)
router.post(
  '/activate',
  authMiddleware,
  checkNotBlocked,
  [
    body('plan').isIn(['pro', 'premium']).withMessage('Invalid plan'),
    body('duration').isIn([1, 12]).withMessage('Duration must be 1 or 12 months'),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { plan, duration } = req.body;
      // TODO: Integrate with payment gateway (YooKassa / CloudPayments)
      // For now, activate directly for testing
      const result = await subscriptionService.activate(req.user!.userId, plan, duration);
      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

// Cancel subscription
router.post(
  '/cancel',
  authMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const cancelled = await subscriptionService.cancel(req.user!.userId);
      res.json({ cancelled });
    } catch (e) {
      next(e);
    }
  }
);

export const subscriptionRoutes = router;
