import { Router, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../../middlewares/auth.middleware.js';
import { checkNotBlocked } from '../../middlewares/blocked.middleware.js';
import { noteService } from './note.service.js';

const router = Router();

// Get all notes for current user
router.get(
  '/',
  authMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const notes = await noteService.getAllByUser(req.user!.userId);
      res.json(notes);
    } catch (e) {
      next(e);
    }
  }
);

// Get notes for a specific listing
router.get(
  '/listing/:listingId',
  authMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const notes = await noteService.getByListing(req.user!.userId, req.params.listingId);
      res.json(notes);
    } catch (e) {
      next(e);
    }
  }
);

// Create note
router.post(
  '/',
  authMiddleware,
  checkNotBlocked,
  [
    body('listingId').notEmpty().withMessage('Listing ID required'),
    body('text').notEmpty().withMessage('Text required').isLength({ max: 2000 }),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const note = await noteService.create(
        req.user!.userId,
        req.body.listingId,
        req.body.text
      );
      res.status(201).json(note);
    } catch (e) {
      next(e);
    }
  }
);

// Update note
router.patch(
  '/:id',
  authMiddleware,
  checkNotBlocked,
  [body('text').notEmpty().withMessage('Text required').isLength({ max: 2000 })],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const note = await noteService.update(req.params.id, req.user!.userId, req.body.text);
      if (!note) return res.status(404).json({ error: 'Note not found' });
      res.json(note);
    } catch (e) {
      next(e);
    }
  }
);

// Delete note
router.delete(
  '/:id',
  authMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const deleted = await noteService.delete(req.params.id, req.user!.userId);
      if (!deleted) return res.status(404).json({ error: 'Note not found' });
      res.json({ deleted: true });
    } catch (e) {
      next(e);
    }
  }
);

export const noteRoutes = router;
