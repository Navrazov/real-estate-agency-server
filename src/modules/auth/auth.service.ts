import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { ROLES } from '../../config/constants.js';
import { UserModel, IUser } from '../../models/User.js';
import type { JwtPayload } from '../../middlewares/auth.middleware.js';
import type { LoginBody, RegisterBody, SendCodeBody, AuthResponse } from './auth.types.js';

const SALT_ROUNDS = 10;
const CODE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// In-memory SMS code store: phone -> { code, expiresAt }
const smsCodeStore = new Map<string, { code: string; expiresAt: number }>();

// Periodically clean expired codes every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [phone, entry] of smsCodeStore) {
    if (entry.expiresAt <= now) {
      smsCodeStore.delete(phone);
    }
  }
}, CODE_EXPIRY_MS);

function createToken(user: IUser): string {
  const payload: JwtPayload = {
    userId: user._id.toString(),
    email: user.email ?? '',
    role: user.role,
  };
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

function isPhoneInput(input: string): boolean {
  // Starts with '+' or is digits only
  return /^\+/.test(input) || /^\d+$/.test(input);
}

export const authService = {
  async sendCode(body: SendCodeBody): Promise<{ success: true }> {
    const { phone } = body;

    // Generate random 4-digit code
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const expiresAt = Date.now() + CODE_EXPIRY_MS;

    smsCodeStore.set(phone, { code, expiresAt });

    // In production this would send an SMS; for now just log it
    console.log(`[SMS] Code for ${phone}: ${code}`);

    return { success: true };
  },

  async register(body: RegisterBody): Promise<AuthResponse> {
    const { phone, password, firstName, lastName, email, code, avatar } = body;

    // Verify SMS code
    const storedEntry = smsCodeStore.get(phone);
    if (!storedEntry || storedEntry.expiresAt <= Date.now()) {
      smsCodeStore.delete(phone);
      throw Object.assign(new Error('No valid code found for this phone. Please request a new code.'), { statusCode: 400 });
    }
    if (storedEntry.code !== code) {
      throw Object.assign(new Error('Invalid verification code'), { statusCode: 400 });
    }

    // Code is valid - remove it so it can't be reused
    smsCodeStore.delete(phone);

    // Check for existing user by phone
    const existingByPhone = await UserModel.findOne({ phone });
    if (existingByPhone) throw Object.assign(new Error('Phone already registered'), { statusCode: 400 });

    // Check for existing user by email if provided
    if (email) {
      const existingByEmail = await UserModel.findOne({ email });
      if (existingByEmail) throw Object.assign(new Error('Email already registered'), { statusCode: 400 });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const role = ROLES.USER;
    const name = `${firstName} ${lastName}`;

    const user = await UserModel.create({
      phone,
      email: email || undefined,
      name,
      avatar: avatar || undefined,
      passwordHash,
      role,
      phoneVerified: true,
      emailVerified: false,
    });

    const token = createToken(user);
    return {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
      },
    };
  },

  async login(body: LoginBody): Promise<AuthResponse> {
    const { email, phone, password } = body;

    // Determine which identifier was provided
    const identifier = email || phone || '';
    let user: IUser | null = null;

    if (phone || isPhoneInput(identifier)) {
      // Login by phone
      user = await UserModel.findOne({ phone: phone || identifier });
    } else {
      // Login by email
      user = await UserModel.findOne({ email: email || identifier });
    }

    if (!user) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    if (user.blocked) throw Object.assign(new Error('Account is blocked'), { statusCode: 403 });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });

    const token = createToken(user);
    return {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
      },
    };
  },

  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await UserModel.findOne({
      verificationToken: token,
      verificationTokenExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      throw Object.assign(new Error('Invalid or expired verification token'), { statusCode: 400 });
    }

    user.emailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiresAt = undefined;
    await user.save();

    return { message: 'Email verified successfully' };
  },

  async resendVerification(email: string): Promise<{ message: string }> {
    // Keep for backward compatibility but importing sendVerificationEmail is optional now
    const { sendVerificationEmail } = await import('../../shared/email.js');

    const user = await UserModel.findOne({ email });
    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    if (user.emailVerified) {
      throw Object.assign(new Error('Email already verified'), { statusCode: 400 });
    }

    const { randomUUID } = await import('crypto');
    const verificationToken = randomUUID();
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.verificationToken = verificationToken;
    user.verificationTokenExpiresAt = verificationTokenExpiresAt;
    await user.save();

    await sendVerificationEmail(user.email!, verificationToken);

    return { message: 'Verification email sent' };
  },
};
