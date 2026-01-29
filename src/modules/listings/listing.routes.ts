import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware, adminOnly, AuthRequest } from '../../middlewares/auth.middleware.js';
import { checkNotBlocked } from '../../middlewares/blocked.middleware.js';
import { listingService } from './listing.service.js';

const router = Router();

const createValidation = [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('description').trim().notEmpty().withMessage('Description required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be positive'),
  body('address').trim().notEmpty().withMessage('Address required'),
  body('images').optional().isArray(),
  body('images.*').optional().isString(),
];

const updateValidation = [
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim().notEmpty(),
  body('price').optional().isFloat({ min: 0 }),
  body('address').optional().trim().notEmpty(),
  body('images').optional().isArray(),
  body('images.*').optional().isString(),
];

router.get('/', (_req, res) => {
  const listings = listingService.findAll();
  res.json(listings);
});

router.get('/:id', param('id').notEmpty(), (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const listing = listingService.findById(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  res.json(listing);
});

router.post(
  '/',
  authMiddleware,
  checkNotBlocked,
  createValidation,
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const listing = listingService.create(req.user!.userId, req.body);
      res.status(201).json(listing);
    } catch (e) {
      next(e);
    }
  }
);

router.patch(
  '/:id',
  authMiddleware,
  checkNotBlocked,
  param('id').notEmpty(),
  updateValidation,
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const listing = listingService.update(req.params.id, req.user!.userId, req.body);
      if (!listing) return res.status(404).json({ error: 'Not found or not owner' });
      res.json(listing);
    } catch (e) {
      next(e);
    }
  }
);

router.delete(
  '/:id',
  authMiddleware,
  checkNotBlocked,
  param('id').notEmpty(),
  async (req: AuthRequest, res, next) => {
    try {
      const isAdmin = req.user!.role === 'admin';
      const ok = listingService.delete(req.params.id, req.user!.userId, isAdmin);
      if (!ok) return res.status(404).json({ error: 'Not found or not owner' });
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  }
);

export const listingRoutes = router;
