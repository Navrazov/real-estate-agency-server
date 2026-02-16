import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware.js';
import { userService } from '../modules/users/user.service.js';

export async function checkNotBlocked(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return next();
  const user = await userService.findById(req.user.userId);
  if (user?.blocked) {
    return res.status(403).json({ error: 'Аккаунт заблокирован' });
  }
  next();
}
