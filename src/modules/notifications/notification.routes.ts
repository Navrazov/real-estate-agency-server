import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from '../../middlewares/auth.middleware.js';
import { checkNotBlocked } from '../../middlewares/blocked.middleware.js';
import { notificationService } from './notification.service.js';

const router = Router();

// GET /api/notifications?page=1
router.get('/', authMiddleware, checkNotBlocked, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const result = await notificationService.getForUser(req.user!.userId, page);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', authMiddleware, checkNotBlocked, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const count = await notificationService.getUnreadCount(req.user!.userId);
    res.json({ count });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', authMiddleware, checkNotBlocked, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await notificationService.markAllRead(req.user!.userId);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authMiddleware, checkNotBlocked, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notification = await notificationService.markRead(req.params.id, req.user!.userId);
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json(notification);
  } catch (e) {
    next(e);
  }
});

export const notificationRoutes = router;
