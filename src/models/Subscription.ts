import mongoose, { Schema, Document } from 'mongoose';

export type SubscriptionPlan = 'free' | 'pro' | 'premium';

export interface ISubscription extends Document {
  userId: string;
  plan: SubscriptionPlan;
  startDate: Date;
  endDate: Date | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: String, required: true, index: true },
    plan: { type: String, enum: ['free', 'pro', 'premium'], default: 'free' },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

subscriptionSchema.index({ userId: 1, active: 1 });

export const SubscriptionModel = mongoose.model<ISubscription>('Subscription', subscriptionSchema);

// Plan limits
export const PLAN_LIMITS = {
  free: {
    maxActiveListings: 0,
    maxMonthlyListings: 0,
    maxVisibleListings: 5,
    canSeePhones: false,
    priorityPlacement: false,
    advancedStats: false,
  },
  pro: {
    maxActiveListings: 5,
    maxMonthlyListings: 30,
    maxVisibleListings: Infinity,
    canSeePhones: true,
    priorityPlacement: true,
    advancedStats: false,
  },
  premium: {
    maxActiveListings: Infinity,
    maxMonthlyListings: Infinity,
    maxVisibleListings: Infinity,
    canSeePhones: true,
    priorityPlacement: true,
    advancedStats: true,
  },
} as const;

export const PLAN_PRICES = {
  pro: {
    monthly: 1490,
    yearly: 1190,
    yearlyTotal: 14280,
  },
  premium: {
    monthly: 2490,
    yearly: 1990,
    yearlyTotal: 23880,
  },
} as const;
