import mongoose, { Schema, Document } from 'mongoose';
import type { Role } from '../config/constants.js';

export interface IUser extends Document {
  email: string;
  name?: string;
  phone?: string;
  avatar?: string;
  passwordHash: string;
  role: Role;
  blocked: boolean;
  favorites: string[];
  emailVerified: boolean;
  verificationToken?: string;
  verificationTokenExpiresAt?: Date;
  lastSeen?: Date;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String },
    phone: { type: String },
    avatar: { type: String },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    blocked: { type: Boolean, default: false },
    favorites: { type: [String], default: [] },
    emailVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    verificationTokenExpiresAt: { type: Date },
    lastSeen: { type: Date },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<IUser>('User', userSchema);
