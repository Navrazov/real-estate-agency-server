import mongoose, { Schema, Document } from 'mongoose';

export type SubscriptionPlan = 'free' | 'pro';

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
    plan: { type: String, enum: ['free', 'pro'], default: 'free' },
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
    maxListings: 3,
    maxConversations: 5,
    canSeePhones: false,
    priorityPlacement: false,
    advancedStats: false,
  },
  pro: {
    maxListings: Infinity,
    maxConversations: Infinity,
    canSeePhones: true,
    priorityPlacement: true,
    advancedStats: true,
  },
} as const;

export const PLAN_PRICES = {
  pro: {
    monthly: 1490,
    yearly: 990, // per month when paid yearly
    yearlyTotal: 11880,
  },
} as const;
