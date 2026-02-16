import mongoose, { Schema, Document } from 'mongoose';

export interface INote extends Document {
  userId: string;
  listingId: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema<INote>(
  {
    userId: { type: String, required: true, index: true },
    listingId: { type: String, required: true, index: true },
    text: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: true }
);

noteSchema.index({ userId: 1, listingId: 1 });

export const NoteModel = mongoose.model<INote>('Note', noteSchema);
