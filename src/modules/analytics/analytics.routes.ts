import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware, adminOnly, AuthRequest } from '../../middlewares/auth.middleware.js';
import { analyticsService } from './analytics.service.js';

const router = Router();

// Helper: optional auth for track endpoint
function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return authMiddleware(req as AuthRequest, res, next);
  }
  next();
}

// POST /api/analytics/track - public
router.post('/track', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { event, data } = req.body;
    if (!event || typeof event !== 'string') {
      return res.status(400).json({ error: 'Event name is required' });
    }
    const userId = req.user?.userId;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    await analyticsService.track(event, userId, data, ip, userAgent);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// GET /api/analytics/overview?days=30 - admin only
router.get('/overview', authMiddleware, adminOnly, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const days = Math.max(1, parseInt(req.query.days as string) || 30);
    const overview = await analyticsService.getOverview(days);
    res.json(overview);
  } catch (e) {
    next(e);
  }
});

// GET /api/analytics/users/growth?days=30 - admin only
router.get('/users/growth', authMiddleware, adminOnly, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const days = Math.max(1, parseInt(req.query.days as string) || 30);
    const growth = await analyticsService.getUserGrowth(days);
    res.json(growth);
  } catch (e) {
    next(e);
  }
});

// GET /api/analytics/search?days=30 - admin only
router.get('/search', authMiddleware, adminOnly, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const days = Math.max(1, parseInt(req.query.days as string) || 30);
    const searchData = await analyticsService.getSearchAnalytics(days);
    res.json(searchData);
  } catch (e) {
    next(e);
  }
});

export const analyticsRoutes = router;
