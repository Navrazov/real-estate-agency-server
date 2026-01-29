import { store } from '../../shared/store.js';
import { User } from '../../shared/types.js';

export const userService = {
  findById(id: string): User | undefined {
    return store.users.get(id);
  },

  findAll(): User[] {
    return Array.from(store.users.values());
  },

  async setBlocked(userId: string, blocked: boolean): Promise<User | null> {
    const user = store.users.get(userId);
    if (!user) return null;
    user.blocked = blocked;
    store.users.set(userId, user);
    return user;
  },
};
