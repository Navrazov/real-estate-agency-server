import { Router } from 'express';
import { body, param } from 'express-validator';
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
    name: user.name,
    phone: user.phone,
    avatar: user.avatar,
    role: user.role,
    blocked: user.blocked,
    favorites: user.favorites ?? [],
    createdAt: user.createdAt,
  });
});

router.patch('/me', (req: AuthRequest, res) => {
  const user = userService.updateProfile(req.user!.userId, req.body);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    avatar: user.avatar,
    role: user.role,
  });
});

router.get('/favorites', (req: AuthRequest, res) => {
  const favorites = userService.getFavorites(req.user!.userId);
  res.json(favorites);
});

router.post('/favorites/:listingId', param('listingId').notEmpty(), (req: AuthRequest, res) => {
  const result = userService.toggleFavorite(req.user!.userId, req.params.listingId);
  if (!result) return res.status(404).json({ error: 'User not found' });
  res.json(result);
});

router.get('/', adminOnly, (_req, res) => {
  const users = userService.findAll().map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    blocked: u.blocked,
    createdAt: u.createdAt,
  }));
  res.json(users);
});

router.get('/stats', adminOnly, (_req, res) => {
  const stats = userService.getStats();
  res.json(stats);
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
