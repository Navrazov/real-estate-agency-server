import { UserModel, IUser } from '../../models/User.js';
import { listingService } from '../listings/listing.service.js';
import { sendCallVerification } from '../../shared/sms.js';

export interface UpdateProfileBody {
  name?: string;
  phone?: string;
  avatar?: string;
}

const CODE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// In-memory verification code store for phone changes
const phoneCodeStore = new Map<string, { code: string; expiresAt: number }>();

// Periodically clean expired codes every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of phoneCodeStore) {
    if (entry.expiresAt <= now) phoneCodeStore.delete(key);
  }
}, CODE_EXPIRY_MS);

export const userService = {
  async findById(id: string): Promise<IUser | null> {
    return UserModel.findById(id);
  },

  async findAll(): Promise<IUser[]> {
    return UserModel.find();
  },

  async findAdmins(): Promise<IUser[]> {
    return UserModel.find({ role: { $in: ['admin', 'superadmin'] } });
  },

  async updateProfile(userId: string, body: UpdateProfileBody): Promise<IUser | null> {
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.phone !== undefined) update.phone = body.phone;
    if (body.avatar !== undefined) update.avatar = body.avatar;
    return UserModel.findByIdAndUpdate(userId, update, { new: true });
  },

  async setBlocked(userId: string, blocked: boolean): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(userId, { blocked }, { new: true });
  },

  async setRole(userId: string, role: string): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(userId, { role }, { new: true });
  },

  async toggleFavorite(userId: string, listingId: string): Promise<{ favorites: string[]; isFavorite: boolean } | null> {
    const user = await UserModel.findById(userId);
    if (!user) return null;
    if (!user.favorites) user.favorites = [];
    const idx = user.favorites.indexOf(listingId);
    const isFavorite = idx === -1;
    if (isFavorite) {
      user.favorites.push(listingId);
    } else {
      user.favorites.splice(idx, 1);
    }
    await user.save();
    return { favorites: user.favorites, isFavorite };
  },

  async getFavorites(userId: string) {
    const user = await UserModel.findById(userId);
    if (!user) return [];
    const favorites = user.favorites ?? [];
    const results = await Promise.all(
      favorites.map((id) => listingService.findById(id, userId))
    );
    return results.filter(Boolean);
  },

  async getStats() {
    const total = await UserModel.countDocuments();
    const blocked = await UserModel.countDocuments({ blocked: true });
    const admins = await UserModel.countDocuments({ role: { $in: ['admin', 'superadmin'] } });
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recent = await UserModel.countDocuments({ createdAt: { $gte: weekAgo } });
    return { total, blocked, admins, recentWeek: recent };
  },

  // ── Phone verification code ──

  async sendPhoneCode(userId: string, phone: string): Promise<{ success: true }> {
    const code = await sendCallVerification(phone);
    const expiresAt = Date.now() + CODE_EXPIRY_MS;

    phoneCodeStore.set(`${userId}:${phone}`, { code, expiresAt });

    return { success: true };
  },

  async verifyPhoneCode(userId: string, phone: string, code: string): Promise<IUser> {
    const key = `${userId}:${phone}`;
    const storedEntry = phoneCodeStore.get(key);

    if (!storedEntry || storedEntry.expiresAt <= Date.now()) {
      phoneCodeStore.delete(key);
      throw Object.assign(new Error('Код не найден или истёк. Запросите новый код.'), { statusCode: 400 });
    }
    if (storedEntry.code !== code) {
      throw Object.assign(new Error('Неверный код подтверждения'), { statusCode: 400 });
    }

    phoneCodeStore.delete(key);

    const existingUser = await UserModel.findOne({ phone, _id: { $ne: userId } });
    if (existingUser) {
      throw Object.assign(new Error('Этот номер уже привязан к другому аккаунту'), { statusCode: 400 });
    }

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { phone, phoneVerified: true },
      { new: true },
    );
    if (!user) throw Object.assign(new Error('Пользователь не найден'), { statusCode: 404 });
    return user;
  },
};
