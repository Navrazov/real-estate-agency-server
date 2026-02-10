import { Router } from 'express';
import { param } from 'express-validator';
import { authMiddleware, adminOnly, AuthRequest } from '../../middlewares/auth.middleware.js';
import { checkNotBlocked } from '../../middlewares/blocked.middleware.js';
import { userService } from './user.service.js';

const router = Router();

router.use(authMiddleware);
router.use(checkNotBlocked);

router.get('/me', async (req: AuthRequest, res, next) => {
  try {
    const user = await userService.findById(req.user!.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      blocked: user.blocked,
      favorites: user.favorites ?? [],
      createdAt: user.createdAt,
    });
  } catch (e) {
    next(e);
  }
});

router.patch('/me', async (req: AuthRequest, res, next) => {
  try {
    const user = await userService.updateProfile(req.user!.userId, req.body);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
    });
  } catch (e) {
    next(e);
  }
});

router.get('/favorites', async (req: AuthRequest, res, next) => {
  try {
    const favorites = await userService.getFavorites(req.user!.userId);
    res.json(favorites);
  } catch (e) {
    next(e);
  }
});

router.post('/favorites/:listingId', param('listingId').notEmpty(), async (req: AuthRequest, res, next) => {
  try {
    const result = await userService.toggleFavorite(req.user!.userId, req.params.listingId);
    if (!result) return res.status(404).json({ error: 'User not found' });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.get('/', authMiddleware, adminOnly, async (_req, res, next) => {
  try {
    const users = (await userService.findAll()).map((u) => ({
      id: u._id.toString(),
      email: u.email,
      name: u.name,
      role: u.role,
      blocked: u.blocked,
      createdAt: u.createdAt,
    }));
    res.json(users);
  } catch (e) {
    next(e);
  }
});

router.get('/stats', authMiddleware, adminOnly, async (_req, res, next) => {
  try {
    const stats = await userService.getStats();
    res.json(stats);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/role', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be "user" or "admin"' });
    }
    const user = await userService.setRole(id, role);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user._id.toString(), role: user.role });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/block', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    const blocked = req.body.blocked === true;
    const user = await userService.setBlocked(id, blocked);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user._id.toString(), blocked: user.blocked });
  } catch (e) {
    next(e);
  }
});

export const userRoutes = router;
