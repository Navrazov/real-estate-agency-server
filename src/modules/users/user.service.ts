import { UserModel, IUser } from '../../models/User.js';
import { listingService } from '../listings/listing.service.js';

export interface UpdateProfileBody {
  name?: string;
  phone?: string;
  avatar?: string;
}

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
};
