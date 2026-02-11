import { UserModel, IUser } from '../../models/User.js';
import { listingService } from '../listings/listing.service.js';
import { sendEmailVerificationCode } from '../../shared/email.js';
import { sendSmsCode } from '../../shared/sms.js';

export interface UpdateProfileBody {
  name?: string;
  phone?: string;
  avatar?: string;
}

const CODE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// In-memory verification code stores
const emailCodeStore = new Map<string, { code: string; expiresAt: number }>();
const phoneCodeStore = new Map<string, { code: string; expiresAt: number }>();

// Periodically clean expired codes every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of emailCodeStore) {
    if (entry.expiresAt <= now) emailCodeStore.delete(key);
  }
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
    const admins = await UserModel.countDocuments({ role: 'admin' });
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recent = await UserModel.countDocuments({ createdAt: { $gte: weekAgo } });
    return { total, blocked, admins, recentWeek: recent };
  },

  // ── Email verification code ──

  async sendEmailCode(userId: string, email: string): Promise<{ success: true }> {
    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
    const expiresAt = Date.now() + CODE_EXPIRY_MS;

    // Key combines userId + email so each user/email pair has its own code
    emailCodeStore.set(`${userId}:${email}`, { code, expiresAt });

    await sendEmailVerificationCode(email, code);
    return { success: true };
  },

  async verifyEmailCode(userId: string, email: string, code: string): Promise<IUser> {
    const key = `${userId}:${email}`;
    const storedEntry = emailCodeStore.get(key);

    if (!storedEntry || storedEntry.expiresAt <= Date.now()) {
      emailCodeStore.delete(key);
      throw Object.assign(new Error('No valid code found. Please request a new code.'), { statusCode: 400 });
    }
    if (storedEntry.code !== code) {
      throw Object.assign(new Error('Invalid verification code'), { statusCode: 400 });
    }

    emailCodeStore.delete(key);

    // Check if email is already taken by another user
    const existingUser = await UserModel.findOne({ email, _id: { $ne: userId } });
    if (existingUser) {
      throw Object.assign(new Error('Email already taken by another user'), { statusCode: 400 });
    }

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { email, emailVerified: true },
      { new: true },
    );
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
    return user;
  },

  // ── Phone verification code ──

  async sendPhoneCode(userId: string, phone: string): Promise<{ success: true }> {
    const code = String(Math.floor(1000 + Math.random() * 9000)); // 4-digit
    const expiresAt = Date.now() + CODE_EXPIRY_MS;

    phoneCodeStore.set(`${userId}:${phone}`, { code, expiresAt });

    await sendSmsCode(phone, code);
    return { success: true };
  },

  async verifyPhoneCode(userId: string, phone: string, code: string): Promise<IUser> {
    const key = `${userId}:${phone}`;
    const storedEntry = phoneCodeStore.get(key);

    if (!storedEntry || storedEntry.expiresAt <= Date.now()) {
      phoneCodeStore.delete(key);
      throw Object.assign(new Error('No valid code found. Please request a new code.'), { statusCode: 400 });
    }
    if (storedEntry.code !== code) {
      throw Object.assign(new Error('Invalid verification code'), { statusCode: 400 });
    }

    phoneCodeStore.delete(key);

    // Check if phone is already taken by another user
    const existingUser = await UserModel.findOne({ phone, _id: { $ne: userId } });
    if (existingUser) {
      throw Object.assign(new Error('Phone already taken by another user'), { statusCode: 400 });
    }

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { phone, phoneVerified: true },
      { new: true },
    );
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
    return user;
  },
};
