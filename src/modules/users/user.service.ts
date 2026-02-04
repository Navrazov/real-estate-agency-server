import { store } from '../../shared/store.js';
import { User } from '../../shared/types.js';
import { listingService } from '../listings/listing.service.js';

export interface UpdateProfileBody {
  name?: string;
  phone?: string;
  avatar?: string;
}

export const userService = {
  findById(id: string): User | undefined {
    return store.users.get(id);
  },

  findAll(): User[] {
    return Array.from(store.users.values());
  },

  updateProfile(userId: string, body: UpdateProfileBody): User | null {
    const user = store.users.get(userId);
    if (!user) return null;
    if (body.name !== undefined) user.name = body.name;
    if (body.phone !== undefined) user.phone = body.phone;
    if (body.avatar !== undefined) user.avatar = body.avatar;
    store.users.set(userId, user);
    return user;
  },

  async setBlocked(userId: string, blocked: boolean): Promise<User | null> {
    const user = store.users.get(userId);
    if (!user) return null;
    user.blocked = blocked;
    store.users.set(userId, user);
    return user;
  },

  toggleFavorite(userId: string, listingId: string): { favorites: string[]; isFavorite: boolean } | null {
    const user = store.users.get(userId);
    if (!user) return null;
    if (!user.favorites) user.favorites = [];
    const idx = user.favorites.indexOf(listingId);
    const isFavorite = idx === -1;
    if (isFavorite) {
      user.favorites.push(listingId);
    } else {
      user.favorites.splice(idx, 1);
    }
    store.users.set(userId, user);
    return { favorites: user.favorites, isFavorite };
  },

  getFavorites(userId: string) {
    const user = store.users.get(userId);
    if (!user) return [];
    const favorites = user.favorites ?? [];
    return favorites
      .map((id) => listingService.findById(id, userId))
      .filter(Boolean);
  },

  getStats() {
    const users = Array.from(store.users.values());
    const total = users.length;
    const blocked = users.filter((u) => u.blocked).length;
    const admins = users.filter((u) => u.role === 'admin').length;
    const recent = users.filter((u) => {
      const d = new Date(u.createdAt);
      const now = new Date();
      return now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
    }).length;
    return { total, blocked, admins, recentWeek: recent };
  },
};
