import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  participants: string[];
  listingId?: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: { type: [String], required: true },
    listingId: { type: String },
    lastMessage: { type: String },
    lastMessageAt: { type: Date },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ listingId: 1 });

export const ConversationModel = mongoose.model<IConversation>('Conversation', conversationSchema);
