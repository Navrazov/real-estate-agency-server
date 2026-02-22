import { Router } from 'express';
import { query, validationResult } from 'express-validator';
import { geocodingService } from './geocoding.service.js';
import { geocodeLimiter } from '../../middlewares/rate-limit.middleware.js';

const router = Router();

router.get(
  '/search',
  geocodeLimiter,
  query('q').trim().notEmpty().withMessage('Query is required'),
  query('limit').optional().isInt({ min: 1, max: 10 }),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const q = req.query.q as string;
      const limit = req.query.limit ? Number(req.query.limit) : 5;
      const result = await geocodingService.search(q, limit);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/reverse',
  geocodeLimiter,
  query('lat').isFloat({ min: -90, max: 90 }).withMessage('lat is invalid'),
  query('lng').isFloat({ min: -180, max: 180 }).withMessage('lng is invalid'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      const result = await geocodingService.reverse(lat, lng);
      if (!result) {
        return res.status(404).json({ error: 'Address not found' });
      }
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

export const geocodingRoutes = router;
