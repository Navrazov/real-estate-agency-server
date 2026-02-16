import { SubscriptionModel, PLAN_LIMITS, PLAN_PRICES } from '../../models/Subscription.js';
import type { SubscriptionPlan } from '../../models/Subscription.js';
import { ListingModel } from '../../models/Listing.js';

export const subscriptionService = {
  async getActivePlan(userId: string): Promise<{
    plan: SubscriptionPlan;
    expiresAt: string | null;
    limits: (typeof PLAN_LIMITS)[SubscriptionPlan];
  }> {
    const sub = await SubscriptionModel.findOne({
      userId,
      active: true,
      $or: [
        { endDate: null },
        { endDate: { $gt: new Date() } },
      ],
    }).sort({ createdAt: -1 });

    const plan: SubscriptionPlan = sub?.plan === 'pro' ? 'pro' : 'free';
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
    if (limits.maxListings === Infinity) return { allowed: true };

    const count = await ListingModel.countDocuments({ authorId: userId });
    if (count >= limits.maxListings) {
      return {
        allowed: false,
        reason: `На бесплатном тарифе можно создать не более ${limits.maxListings} объявлений. Перейдите на тариф Про.`,
      };
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
          `До ${PLAN_LIMITS.free.maxListings} объявлений`,
          `До ${PLAN_LIMITS.free.maxConversations} диалогов в месяц`,
          'Базовая статистика',
        ],
      },
      pro: {
        name: 'Про',
        price: PLAN_PRICES.pro.monthly,
        yearlyPrice: PLAN_PRICES.pro.yearly,
        yearlyTotal: PLAN_PRICES.pro.yearlyTotal,
        limits: PLAN_LIMITS.pro,
        features: [
          'Безлимит объявлений',
          'Безлимит диалогов',
          'Просмотр телефонов',
          'Приоритет в выдаче',
          'Расширенная статистика',
        ],
      },
    };
  },
};
