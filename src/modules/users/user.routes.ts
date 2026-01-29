import { Router } from 'express';
import { authMiddleware, adminOnly, AuthRequest } from '../../middlewares/auth.middleware.js';
import { checkNotBlocked } from '../../middlewares/blocked.middleware.js';
import { userService } from './user.service.js';

const router = Router();

router.use(authMiddleware);
router.use(checkNotBlocked);

router.get('/me', (req: AuthRequest, res) => {
  const user = userService.findById(req.user!.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    id: user.id,
    email: user.email,
    role: user.role,
    blocked: user.blocked,
  });
});

router.get('/', adminOnly, (_req, res) => {
  const users = userService.findAll().map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role,
    blocked: u.blocked,
    createdAt: u.createdAt,
  }));
  res.json(users);
});

router.patch('/:id/block', adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    const blocked = req.body.blocked === true;
    const user = await userService.setBlocked(id, blocked);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user.id, blocked: user.blocked });
  } catch (e) {
    next(e);
  }
});

export const userRoutes = router;
