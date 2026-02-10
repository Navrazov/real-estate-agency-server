import { NotificationModel, INotification } from '../../models/Notification.js';

class NotificationService {
  async create(
    userId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<INotification> {
    const notification = await NotificationModel.create({
      userId,
      type,
      title,
      body,
      data,
    });
    return notification;
  }

  async getForUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      NotificationModel.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      NotificationModel.countDocuments({ userId }),
    ]);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async markRead(id: string, userId: string) {
    const notification = await NotificationModel.findOneAndUpdate(
      { _id: id, userId },
      { read: true },
      { new: true }
    );
    return notification;
  }

  async markAllRead(userId: string) {
    await NotificationModel.updateMany(
      { userId, read: false },
      { read: true }
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return NotificationModel.countDocuments({ userId, read: false });
  }
}

export const notificationService = new NotificationService();
