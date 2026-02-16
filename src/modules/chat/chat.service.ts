import { ConversationModel, IConversation } from '../../models/Conversation.js';
import { MessageModel } from '../../models/Message.js';
import { UserModel } from '../../models/User.js';
import { ListingModel } from '../../models/Listing.js';
import { isOnline } from './online.js';

class ChatService {
  async getOrCreateConversation(userId1: string, userId2: string, listingId?: string) {
    // One conversation per pair of users — listingId is NOT part of lookup
    const query = {
      $or: [
        { participants: [userId1, userId2] },
        { participants: [userId2, userId1] },
      ],
    };

    let conversation = await ConversationModel.findOne(query);
    const isNew = !conversation;
    if (!conversation) {
      conversation = await ConversationModel.create({
        participants: [userId1, userId2],
        listingId,
      });
    } else if (conversation.deletedFor?.length) {
      // Restore conversation for the user who is reopening it
      conversation.deletedFor = conversation.deletedFor.filter((id: string) => id !== userId1);
      await conversation.save();
    }

    let listingTitle: string | undefined;
    const lid = listingId || conversation.listingId;
    if (lid) {
      const listing = await ListingModel.findById(lid).select('title').lean();
      if (listing) listingTitle = listing.title;
    }

    return { id: conversation.id, participants: conversation.participants, listingId: lid, listingTitle, isNew };
  }

  async getConversations(userId: string) {
    const conversations = await ConversationModel.find({
      participants: userId,
      deletedFor: { $ne: userId },
    }).sort({ lastMessageAt: -1, createdAt: -1 });

    const result = [];
    for (const conv of conversations) {
      const otherUserId = conv.participants.find((p: string) => p !== userId);
      let otherUser: { id: string; name?: string; phone?: string; avatar?: string; lastSeen?: Date; online: boolean } | undefined;
      if (otherUserId) {
        const user = await UserModel.findById(otherUserId).select('phone name lastSeen avatar');
        if (user) {
          otherUser = { id: user.id, name: user.name, phone: user.phone, avatar: user.avatar, lastSeen: user.lastSeen, online: isOnline(user.id) };
        }
      }

      let listingTitle: string | undefined;
      if (conv.listingId) {
        const listing = await ListingModel.findById(conv.listingId).select('title').lean();
        if (listing) listingTitle = listing.title;
      }

      const unreadCount = await MessageModel.countDocuments({
        conversationId: conv.id,
        senderId: { $ne: userId },
        deletedFor: { $ne: userId },
        read: false,
      });

      // Get the last visible message for this user (respects deletedFor)
      const lastVisibleMsg = await MessageModel.findOne({
        conversationId: conv.id,
        deletedFor: { $ne: userId },
      }).sort({ createdAt: -1 });

      result.push({
        id: conv.id,
        participants: conv.participants,
        listingId: conv.listingId,
        listingTitle,
        lastMessage: lastVisibleMsg?.text || null,
        lastMessageAt: lastVisibleMsg?.createdAt || conv.lastMessageAt,
        otherUser,
        unreadCount,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      });
    }

    return result;
  }

  async getMessages(conversationId: string, userId: string, page = 1, limit = 50) {
    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation || !conversation.participants.includes(userId)) {
      throw new Error('Access denied');
    }

    const skip = (page - 1) * limit;
    const messages = await MessageModel.find({
      conversationId,
      deletedFor: { $ne: userId },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return messages.reverse();
  }

  async sendMessage(conversationId: string, senderId: string, text: string) {
    const message = await MessageModel.create({
      conversationId,
      senderId,
      text,
    });

    // Also clear deletedFor on conversation so both users see it again
    await ConversationModel.findByIdAndUpdate(conversationId, {
      lastMessage: text,
      lastMessageAt: new Date(),
      deletedFor: [],
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

  async deleteMessage(messageId: string, userId: string, forBoth: boolean) {
    const message = await MessageModel.findById(messageId);
    if (!message) return null;

    // Verify user is a participant of the conversation
    const conv = await ConversationModel.findById(message.conversationId);
    if (!conv || !conv.participants.includes(userId)) return null;

    if (forBoth) {
      await MessageModel.findByIdAndDelete(messageId);
      // If no messages left at all, delete the conversation
      const remaining = await MessageModel.countDocuments({ conversationId: conv.id });
      if (remaining === 0) {
        await ConversationModel.findByIdAndDelete(conv.id);
      } else {
        // Update lastMessage to the most recent remaining message
        const lastMsg = await MessageModel.findOne({ conversationId: conv.id })
          .sort({ createdAt: -1 });
        await ConversationModel.findByIdAndUpdate(conv.id, {
          lastMessage: lastMsg?.text || null,
          lastMessageAt: lastMsg?.createdAt || null,
        });
      }
    } else {
      await MessageModel.findByIdAndUpdate(messageId, {
        $addToSet: { deletedFor: userId },
      });
      // If no visible messages left for this user, soft-delete conversation
      const visibleCount = await MessageModel.countDocuments({
        conversationId: conv.id,
        deletedFor: { $ne: userId },
      });
      if (visibleCount === 0) {
        await ConversationModel.findByIdAndUpdate(conv.id, {
          $addToSet: { deletedFor: userId },
        });
      }
    }
    return { success: true };
  }

  async deleteConversation(conversationId: string, userId: string, forBoth: boolean) {
    const conv = await ConversationModel.findById(conversationId);
    if (!conv || !conv.participants.includes(userId)) return null;

    if (forBoth) {
      await MessageModel.deleteMany({ conversationId });
      await ConversationModel.findByIdAndDelete(conversationId);
    } else {
      // Soft delete: hide conversation and all messages for this user
      await ConversationModel.findByIdAndUpdate(conversationId, {
        $addToSet: { deletedFor: userId },
      });
      await MessageModel.updateMany(
        { conversationId },
        { $addToSet: { deletedFor: userId } }
      );
    }
    return { success: true };
  }

  async getUnreadCount(userId: string) {
    const conversations = await ConversationModel.find({
      participants: userId,
      deletedFor: { $ne: userId },
    }).select('_id');

    const conversationIds = conversations.map((c) => c.id);

    const count = await MessageModel.countDocuments({
      conversationId: { $in: conversationIds },
      senderId: { $ne: userId },
      deletedFor: { $ne: userId },
      read: false,
    });

    return count;
  }

  async getConversationById(id: string) {
    return ConversationModel.findById(id);
  }
}

export const chatService = new ChatService();
