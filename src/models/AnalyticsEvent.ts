import mongoose, { Schema, Document } from 'mongoose';

export interface IAnalyticsEvent extends Document {
  event: string;
  userId?: string;
  data?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const analyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    event: { type: String, required: true, index: true },
    userId: { type: String, index: true },
    data: { type: Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

// Auto-delete events after 90 days
analyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const AnalyticsEventModel = mongoose.model<IAnalyticsEvent>('AnalyticsEvent', analyticsEventSchema);
