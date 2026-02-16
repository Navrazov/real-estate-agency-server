import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { chatService } from './chat.service.js';
import { notificationService } from '../notifications/notification.service.js';
import type { JwtPayload } from '../../middlewares/auth.middleware.js';
import { setOnline, setOffline } from './online.js';
import { UserModel } from '../../models/User.js';

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

    setOnline(userId);
    UserModel.findByIdAndUpdate(userId, { lastSeen: new Date() }).catch(() => {});
    // Broadcast online status to all connected clients
    io.emit('user_online', { userId });

    socket.on('disconnect', () => {
      setOffline(userId);
      const now = new Date().toISOString();
      UserModel.findByIdAndUpdate(userId, { lastSeen: new Date() }).catch(() => {});
      // Broadcast offline status to all connected clients
      io.emit('user_offline', { userId, lastSeen: now });
    });

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
            // Create notification for new message
            const sender = await UserModel.findById(userId).lean();
            const senderName = sender?.name || sender?.phone || 'Пользователь';
            await notificationService.create(
              receiverId,
              'new_message',
              'Новое сообщение',
              `${senderName}: ${data.text.length > 100 ? data.text.slice(0, 100) + '...' : data.text}`,
              { conversationId: data.conversationId }
            );
            const notifCount = await notificationService.getUnreadCount(receiverId);
            io.to(receiverId).emit('notifications_count', { count: notifCount });
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
      // Notify the sender that their messages have been read
      const conv = await chatService.getConversationById(data.conversationId);
      if (conv) {
        const senderId = conv.participants.find((p: string) => p !== userId);
        if (senderId) {
          io.to(senderId).emit('messages_read', { conversationId: data.conversationId });
        }
      }
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
