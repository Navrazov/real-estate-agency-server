import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authMiddleware, adminOnly, AuthRequest } from '../../middlewares/auth.middleware.js';
import { checkNotBlocked } from '../../middlewares/blocked.middleware.js';
import { listingService } from './listing.service.js';
import { userService } from '../users/user.service.js';
import type { ListingsQuery } from './listing.types.js';
import type { PropertyType, ListingStatus } from '../../shared/types.js';

const router = Router();

const PROPERTY_TYPES = ['apartment', 'house', 'room', 'land', 'commercial'];
const LISTING_STATUSES = ['active', 'sold', 'rented'];

const createValidation = [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('description').trim().notEmpty().withMessage('Description required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be positive'),
  body('address').trim().notEmpty().withMessage('Address required'),
  body('propertyType').optional().isIn(PROPERTY_TYPES),
  body('rooms').optional().isInt({ min: 1, max: 50 }),
  body('area').optional().isFloat({ min: 1 }),
  body('floor').optional().isInt({ min: 0, max: 200 }),
  body('totalFloors').optional().isInt({ min: 1, max: 200 }),
  body('images').optional().isArray(),
  body('images.*').optional().isString(),
  body('lat').optional().isFloat(),
  body('lng').optional().isFloat(),
];

const updateValidation = [
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim().notEmpty(),
  body('price').optional().isFloat({ min: 0 }),
  body('address').optional().trim().notEmpty(),
  body('propertyType').optional().isIn(PROPERTY_TYPES),
  body('rooms').optional().isInt({ min: 1, max: 50 }),
  body('area').optional().isFloat({ min: 1 }),
  body('floor').optional().isInt({ min: 0, max: 200 }),
  body('totalFloors').optional().isInt({ min: 1, max: 200 }),
  body('images').optional().isArray(),
  body('images.*').optional().isString(),
  body('lat').optional().isFloat(),
  body('lng').optional().isFloat(),
  body('status').optional().isIn(LISTING_STATUSES),
];

function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return authMiddleware(req as AuthRequest, res, next);
  }
  next();
}

function parseNum(val: unknown): number | undefined {
  if (val == null) return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

router.get('/', optionalAuth, (req: AuthRequest, res) => {
  const q: ListingsQuery = {
    search: typeof req.query.search === 'string' ? req.query.search : undefined,
    propertyType: PROPERTY_TYPES.includes(req.query.propertyType as string)
      ? (req.query.propertyType as PropertyType)
      : undefined,
    status: LISTING_STATUSES.includes(req.query.status as string)
      ? (req.query.status as ListingStatus)
      : undefined,
    minPrice: parseNum(req.query.minPrice),
    maxPrice: parseNum(req.query.maxPrice),
    minRooms: parseNum(req.query.minRooms),
    maxRooms: parseNum(req.query.maxRooms),
    minArea: parseNum(req.query.minArea),
    maxArea: parseNum(req.query.maxArea),
    swLat: parseNum(req.query.swLat),
    swLng: parseNum(req.query.swLng),
    neLat: parseNum(req.query.neLat),
    neLng: parseNum(req.query.neLng),
    sortBy: ['price', 'date', 'views'].includes(req.query.sortBy as string)
      ? (req.query.sortBy as 'price' | 'date' | 'views')
      : undefined,
    sortOrder: ['asc', 'desc'].includes(req.query.sortOrder as string)
      ? (req.query.sortOrder as 'asc' | 'desc')
      : undefined,
    page: parseNum(req.query.page),
    limit: parseNum(req.query.limit),
  };
  const result = listingService.findAll(q, req.user?.userId);
  res.json(result);
});

router.get('/stats', adminOnly, (_req, res) => {
  const stats = listingService.getStats();
  res.json(stats);
});

router.get('/my', authMiddleware, checkNotBlocked, (req: AuthRequest, res) => {
  const listings = listingService.findByAuthor(req.user!.userId, req.user!.userId);
  res.json(listings);
});

router.get('/:id', optionalAuth, param('id').notEmpty(), (req: AuthRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const listing = listingService.findById(req.params.id, req.user?.userId, true);
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
      const user = userService.findById(req.user!.userId);
      const listing = listingService.create(
        req.user!.userId,
        req.body,
        user?.name ?? user?.email?.split('@')[0],
        user?.phone
      );
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
      const isAdmin = req.user!.role === 'admin';
      const listing = listingService.update(req.params.id, req.user!.userId, req.body, isAdmin);
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
