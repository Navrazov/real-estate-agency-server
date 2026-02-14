import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware, adminOnly, AuthRequest } from '../../middlewares/auth.middleware.js';
import { checkNotBlocked } from '../../middlewares/blocked.middleware.js';
import { listingService } from './listing.service.js';
import { userService } from '../users/user.service.js';
import type { ListingsQuery } from './listing.types.js';
import type { PropertyType, ApartmentType, ListingStatus, PaymentType } from '../../shared/types.js';

const router = Router();

const PROPERTY_TYPES = ['apartment', 'house', 'land', 'commercial'];
const APARTMENT_TYPES = ['new', 'secondary'];
const LISTING_STATUSES = ['pending', 'active', 'sold', 'rented'];
const PAYMENT_TYPES = ['cash', 'installment'];

const createValidation = [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('description').trim().notEmpty().withMessage('Description required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be positive'),
  body('address').trim().notEmpty().withMessage('Address required'),
  body('propertyType').optional().isIn(PROPERTY_TYPES),
  body('apartmentType').optional().isIn(APARTMENT_TYPES),
  body('developer').optional().trim(),
  body('complex').optional().trim(),
  body('rooms').optional().isInt({ min: 1, max: 50 }),
  body('area').optional().isFloat({ min: 1 }),
  body('floor').optional().isInt({ min: 0, max: 200 }),
  body('totalFloors').optional().isInt({ min: 1, max: 200 }),
  body('images').isArray({ min: 1 }).withMessage('At least one photo is required'),
  body('images.*').isString(),
  body('lat').optional().isFloat(),
  body('lng').optional().isFloat(),
];

const updateValidation = [
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim().notEmpty(),
  body('price').optional().isFloat({ min: 0 }),
  body('address').optional().trim().notEmpty(),
  body('propertyType').optional().isIn(PROPERTY_TYPES),
  body('apartmentType').optional().isIn(APARTMENT_TYPES),
  body('developer').optional().trim(),
  body('complex').optional().trim(),
  body('rooms').optional().isInt({ min: 1, max: 50 }),
  body('area').optional().isFloat({ min: 1 }),
  body('floor').optional().isInt({ min: 0, max: 200 }),
  body('totalFloors').optional().isInt({ min: 1, max: 200 }),
  body('images').optional().isArray({ min: 1 }).withMessage('At least one photo is required'),
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

router.get('/', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const q: ListingsQuery = {
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      propertyType: PROPERTY_TYPES.includes(req.query.propertyType as string)
        ? (req.query.propertyType as PropertyType)
        : undefined,
      apartmentType: APARTMENT_TYPES.includes(req.query.apartmentType as string)
        ? (req.query.apartmentType as ApartmentType)
        : undefined,
      paymentType: PAYMENT_TYPES.includes(req.query.paymentType as string)
        ? (req.query.paymentType as PaymentType)
        : undefined,
      developer: typeof req.query.developer === 'string' && req.query.developer ? req.query.developer : undefined,
      complex: typeof req.query.complex === 'string' && req.query.complex ? req.query.complex : undefined,
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
    const result = await listingService.findAll(q, req.user?.userId);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.get('/filter-options', async (_req, res, next) => {
  try {
    const options = await listingService.getFilterOptions();
    res.json(options);
  } catch (e) {
    next(e);
  }
});

router.get('/stats', authMiddleware, adminOnly, async (_req, res, next) => {
  try {
    const stats = await listingService.getStats();
    res.json(stats);
  } catch (e) {
    next(e);
  }
});

router.get('/moderation', authMiddleware, adminOnly, async (_req, res, next) => {
  try {
    const listings = await listingService.findPendingModeration();
    res.json(listings);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/moderate', authMiddleware, adminOnly, async (req: AuthRequest, res, next) => {
  try {
    const { action, note } = req.body;
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "approve" or "reject"' });
    }
    const listing = await listingService.moderate(req.params.id, req.user!.userId, action, note);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    res.json(listing);
  } catch (e) {
    next(e);
  }
});

router.get('/my', authMiddleware, checkNotBlocked, async (req: AuthRequest, res, next) => {
  try {
    const listings = await listingService.findByAuthor(req.user!.userId, req.user!.userId);
    res.json(listings);
  } catch (e) {
    next(e);
  }
});

router.get('/:id', optionalAuth, param('id').notEmpty(), async (req: AuthRequest, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const listing = await listingService.findById(req.params.id, req.user?.userId, true);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    res.json(listing);
  } catch (e) {
    next(e);
  }
});

router.post(
  '/',
  authMiddleware,
  checkNotBlocked,
  createValidation,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const user = await userService.findById(req.user!.userId);
      const listing = await listingService.create(
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
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const isAdmin = req.user!.role === 'admin';
      const listing = await listingService.update(req.params.id, req.user!.userId, req.body, isAdmin);
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
      const ok = await listingService.delete(req.params.id, req.user!.userId, isAdmin);
      if (!ok) return res.status(404).json({ error: 'Not found or not owner' });
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  }
);

export const listingRoutes = router;
