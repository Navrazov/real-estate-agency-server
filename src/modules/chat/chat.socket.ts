import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { chatService } from './chat.service.js';
import type { JwtPayload } from '../../middlewares/auth.middleware.js';

export function initChatSocket(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
      socket.data.userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    socket.join(userId); // Join personal room

    socket.on('send_message', async (data: { conversationId: string; text: string }) => {
      try {
        const message = await chatService.sendMessage(data.conversationId, userId, data.text);
        // Get the conversation to find the other participant
        const conv = await chatService.getConversationById(data.conversationId);
        if (conv) {
          const receiverId = conv.participants.find((p: string) => p !== userId);
          if (receiverId) {
            io.to(receiverId).emit('new_message', { ...message.toObject(), conversationId: data.conversationId });
            // Send updated unread count to receiver
            const unreadCount = await chatService.getUnreadCount(receiverId);
            io.to(receiverId).emit('unread_count', { count: unreadCount });
          }
        }
        socket.emit('message_sent', message.toObject());
      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('mark_read', async (data: { conversationId: string }) => {
      await chatService.markAsRead(data.conversationId, userId);
      // Send updated unread count back to the user
      const unreadCount = await chatService.getUnreadCount(userId);
      socket.emit('unread_count', { count: unreadCount });
    });

    socket.on('typing', async (data: { conversationId: string }) => {
      // Forward typing indicator to conversation partner
      try {
        const conv = await chatService.getConversationById(data.conversationId);
        if (conv) {
          const receiverId = conv.participants.find((p: string) => p !== userId);
          if (receiverId) {
            io.to(receiverId).emit('typing', { conversationId: data.conversationId, userId });
          }
        }
      } catch {
        // Ignore typing errors
      }
    });
  });
}
