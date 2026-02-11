import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../../middlewares/auth.middleware.js';
import { checkNotBlocked } from '../../middlewares/blocked.middleware.js';
import { chatService } from './chat.service.js';

const router = Router();

// GET /api/chat/conversations
router.get('/conversations', authMiddleware, checkNotBlocked, async (req: AuthRequest, res: Response) => {
  try {
    const conversations = await chatService.getConversations(req.user!.userId);
    res.json(conversations);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// POST /api/chat/conversations
router.post('/conversations', authMiddleware, checkNotBlocked, async (req: AuthRequest, res: Response) => {
  try {
    const { participantId, listingId } = req.body;
    if (!participantId) {
      return res.status(400).json({ error: 'participantId is required' });
    }
    const conversation = await chatService.getOrCreateConversation(
      req.user!.userId,
      participantId,
      listingId
    );
    res.json(conversation);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// GET /api/chat/conversations/:id/messages
router.get('/conversations/:id/messages', authMiddleware, checkNotBlocked, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const messages = await chatService.getMessages(req.params.id, req.user!.userId, page);
    res.json(messages);
  } catch (err: any) {
    if (err.message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// POST /api/chat/conversations/:id/messages
router.post('/conversations/:id/messages', authMiddleware, checkNotBlocked, async (req: AuthRequest, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }
    const message = await chatService.sendMessage(req.params.id, req.user!.userId, text);
    res.json(message);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// PATCH /api/chat/conversations/:id/read
router.patch('/conversations/:id/read', authMiddleware, checkNotBlocked, async (req: AuthRequest, res: Response) => {
  try {
    await chatService.markAsRead(req.params.id, req.user!.userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// DELETE /api/chat/messages/:id
router.delete('/messages/:id', authMiddleware, checkNotBlocked, async (req: AuthRequest, res: Response) => {
  try {
    const forBoth = req.query.forBoth === 'true';
    const result = await chatService.deleteMessage(req.params.id, req.user!.userId, forBoth);
    if (!result) return res.status(404).json({ error: 'Message not found' });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// DELETE /api/chat/conversations/:id
router.delete('/conversations/:id', authMiddleware, checkNotBlocked, async (req: AuthRequest, res: Response) => {
  try {
    const forBoth = req.query.forBoth === 'true';
    const result = await chatService.deleteConversation(req.params.id, req.user!.userId, forBoth);
    if (!result) return res.status(404).json({ error: 'Conversation not found' });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// GET /api/chat/unread
router.get('/unread', authMiddleware, checkNotBlocked, async (req: AuthRequest, res: Response) => {
  try {
    const count = await chatService.getUnreadCount(req.user!.userId);
    res.json({ count });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

export const chatRoutes = router;
