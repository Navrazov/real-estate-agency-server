import { ConversationModel, IConversation } from '../../models/Conversation.js';
import { MessageModel } from '../../models/Message.js';
import { UserModel } from '../../models/User.js';

class ChatService {
  async getOrCreateConversation(userId1: string, userId2: string, listingId?: string) {
    // Check both participant orderings
    const query: any = {
      $or: [
        { participants: [userId1, userId2] },
        { participants: [userId2, userId1] },
      ],
    };
    if (listingId) {
      query.listingId = listingId;
    }

    let conversation = await ConversationModel.findOne(query);
    if (!conversation) {
      conversation = await ConversationModel.create({
        participants: [userId1, userId2],
        listingId,
      });
    }
    return conversation;
  }

  async getConversations(userId: string) {
    const conversations = await ConversationModel.find({
      participants: userId,
    }).sort({ lastMessageAt: -1, createdAt: -1 });

    const result = [];
    for (const conv of conversations) {
      const otherUserId = conv.participants.find((p: string) => p !== userId);
      let otherUser: { id: string; name?: string; email: string } | undefined;
      if (otherUserId) {
        const user = await UserModel.findById(otherUserId).select('email name');
        if (user) {
          otherUser = { id: user.id, name: user.name, email: user.email };
        }
      }

      const unreadCount = await MessageModel.countDocuments({
        conversationId: conv.id,
        senderId: { $ne: userId },
        read: false,
      });

      result.push({
        id: conv.id,
        participants: conv.participants,
        listingId: conv.listingId,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        otherUser,
        unreadCount,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      });
    }

    return result;
  }

  async getMessages(conversationId: string, userId: string, page = 1, limit = 50) {
    // Check that user is a participant
    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation || !conversation.participants.includes(userId)) {
      throw new Error('Access denied');
    }

    const skip = (page - 1) * limit;
    const messages = await MessageModel.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Return in ascending order
    return messages.reverse();
  }

  async sendMessage(conversationId: string, senderId: string, text: string) {
    const message = await MessageModel.create({
      conversationId,
      senderId,
      text,
    });

    await ConversationModel.findByIdAndUpdate(conversationId, {
      lastMessage: text,
      lastMessageAt: new Date(),
    });

    return message;
  }

  async markAsRead(conversationId: string, userId: string) {
    await MessageModel.updateMany(
      {
        conversationId,
        senderId: { $ne: userId },
        read: false,
      },
      { read: true }
    );
  }

  async getUnreadCount(userId: string) {
    // Find all conversations where user is a participant
    const conversations = await ConversationModel.find({
      participants: userId,
    }).select('_id');

    const conversationIds = conversations.map((c) => c.id);

    const count = await MessageModel.countDocuments({
      conversationId: { $in: conversationIds },
      senderId: { $ne: userId },
      read: false,
    });

    return count;
  }

  async getConversationById(id: string) {
    return ConversationModel.findById(id);
  }
}

export const chatService = new ChatService();
