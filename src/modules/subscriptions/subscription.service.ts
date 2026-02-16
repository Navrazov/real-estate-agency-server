import { SubscriptionModel, PLAN_LIMITS, PLAN_PRICES } from '../../models/Subscription.js';
import type { SubscriptionPlan } from '../../models/Subscription.js';
import { ListingModel } from '../../models/Listing.js';
import { UserModel } from '../../models/User.js';

export const subscriptionService = {
  async getActivePlan(userId: string): Promise<{
    plan: SubscriptionPlan;
    expiresAt: string | null;
    limits: (typeof PLAN_LIMITS)[SubscriptionPlan];
  }> {
    // Admins get permanent premium
    const user = await UserModel.findById(userId).select('role').lean();
    if (user && (user.role === 'admin' || user.role === 'superadmin')) {
      return {
        plan: 'premium',
        expiresAt: null,
        limits: PLAN_LIMITS.premium,
      };
    }

    const sub = await SubscriptionModel.findOne({
      userId,
      active: true,
      $or: [
        { endDate: null },
        { endDate: { $gt: new Date() } },
      ],
    }).sort({ createdAt: -1 });

    const plan: SubscriptionPlan = sub?.plan === 'premium' ? 'premium' : sub?.plan === 'pro' ? 'pro' : 'free';
    return {
      plan,
      expiresAt: sub?.endDate?.toISOString() ?? null,
      limits: PLAN_LIMITS[plan],
    };
  },

  async activate(userId: string, plan: SubscriptionPlan, durationMonths: number): Promise<{
    plan: SubscriptionPlan;
    startDate: string;
    endDate: string;
  }> {
    // Deactivate current subscriptions
    await SubscriptionModel.updateMany({ userId, active: true }, { active: false });

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + durationMonths);

    const sub = await SubscriptionModel.create({
      userId,
      plan,
      startDate,
      endDate,
      active: true,
    });

    return {
      plan: sub.plan,
      startDate: sub.startDate.toISOString(),
      endDate: sub.endDate!.toISOString(),
    };
  },

  async cancel(userId: string): Promise<boolean> {
    const result = await SubscriptionModel.updateMany(
      { userId, active: true },
      { active: false }
    );
    return result.modifiedCount > 0;
  },

  async canCreateListing(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const { plan, limits } = await this.getActivePlan(userId);

    // Free users cannot publish at all
    if (plan === 'free') {
      return {
        allowed: false,
        reason: 'На бесплатном тарифе нельзя публиковать объявления. Оформите подписку Про или Премиум.',
      };
    }

    // Check active listings limit
    if (Number.isFinite(limits.maxActiveListings)) {
      const activeCount = await ListingModel.countDocuments({ authorId: userId, status: 'active' });
      if (activeCount >= limits.maxActiveListings) {
        return {
          allowed: false,
          reason: `Достигнут лимит активных объявлений (${limits.maxActiveListings}). Архивируйте или удалите старые объявления.`,
        };
      }
    }

    // Check monthly listings limit
    if (Number.isFinite(limits.maxMonthlyListings)) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const monthlyCount = await ListingModel.countDocuments({
        authorId: userId,
        createdAt: { $gte: startOfMonth },
      });
      if (monthlyCount >= limits.maxMonthlyListings) {
        return {
          allowed: false,
          reason: `Достигнут лимит объявлений за месяц (${limits.maxMonthlyListings}). Лимит обновится в следующем месяце.`,
        };
      }
    }

    return { allowed: true };
  },

  async canSeePhone(userId: string): Promise<boolean> {
    const { limits } = await this.getActivePlan(userId);
    return limits.canSeePhones;
  },

  getPlans() {
    return {
      free: {
        name: 'Бесплатный',
        price: 0,
        limits: PLAN_LIMITS.free,
        features: [
          'Последние 5 объявлений',
          'Просмотр без публикации',
          'Базовый поиск',
        ],
        restrictions: [
          'Нельзя публиковать объявления',
          'Номера телефонов скрыты',
          'Доступно только 5 последних объявлений',
        ],
      },
      pro: {
        name: 'Про',
        price: PLAN_PRICES.pro.monthly,
        yearlyPrice: PLAN_PRICES.pro.yearly,
        yearlyTotal: PLAN_PRICES.pro.yearlyTotal,
        limits: PLAN_LIMITS.pro,
        features: [
          'Все объявления доступны',
          'До 5 активных объявлений',
          'До 30 объявлений в месяц',
          'Просмотр номеров телефонов',
          'Приоритет в выдаче',
        ],
      },
      premium: {
        name: 'Премиум',
        price: PLAN_PRICES.premium.monthly,
        yearlyPrice: PLAN_PRICES.premium.yearly,
        yearlyTotal: PLAN_PRICES.premium.yearlyTotal,
        limits: PLAN_LIMITS.premium,
        features: [
          'Все объявления доступны',
          'Безлимит объявлений',
          'Просмотр номеров телефонов',
          'Приоритет в выдаче',
          'Расширенная статистика',
        ],
      },
    };
  },
};
