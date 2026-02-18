import mongoose, { Schema, Document } from 'mongoose';
import type { Role } from '../config/constants.js';

export interface IUser extends Document {
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  passwordHash: string;
  role: Role;
  blocked: boolean;
  phoneHidden: boolean;
  favorites: string[];
  emailVerified: boolean;
  phoneVerified: boolean;
  phoneCode?: string;
  phoneCodeExpiresAt?: Date;
  verificationToken?: string;
  verificationTokenExpiresAt?: Date;
  lastSeen?: Date;
  birthDate?: Date;
  telegramId?: string;
  // Agent verification
  verified: boolean;
  agency?: string;
  verificationDocUrl?: string;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, unique: true, sparse: true, lowercase: true },
    name: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    phone: { type: String, unique: true, sparse: true },
    avatar: { type: String },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
    blocked: { type: Boolean, default: false },
    phoneHidden: { type: Boolean, default: false },
    favorites: { type: [String], default: [] },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    phoneCode: { type: String },
    phoneCodeExpiresAt: { type: Date },
    verificationToken: { type: String },
    verificationTokenExpiresAt: { type: Date },
    lastSeen: { type: Date },
    birthDate: { type: Date },
    telegramId: { type: String, unique: true, sparse: true },
    // Agent verification
    verified: { type: Boolean, default: false },
    agency: { type: String },
    verificationDocUrl: { type: String },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<IUser>('User', userSchema);
