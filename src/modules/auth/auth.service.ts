import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { ROLES } from '../../config/constants.js';
import { UserModel, IUser } from '../../models/User.js';
import type { JwtPayload } from '../../middlewares/auth.middleware.js';
import type { LoginBody, RegisterBody, SendCodeBody, AuthResponse } from './auth.types.js';
import { sendCallVerification, sendTelegramCode } from '../../shared/sms.js';

const SALT_ROUNDS = 10;
const CODE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const COOLDOWN_MS = 60 * 1000; // 1 minute between requests per phone

// In-memory SMS code store: phone -> { code, expiresAt }
const smsCodeStore = new Map<string, { code: string; expiresAt: number }>();

// Per-phone rate limit: phone -> last request timestamp
const phoneCooldownStore = new Map<string, number>();

// Periodically clean expired codes every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [phone, entry] of smsCodeStore) {
    if (entry.expiresAt <= now) {
      smsCodeStore.delete(phone);
    }
  }
  for (const [phone, ts] of phoneCooldownStore) {
    if (now - ts > COOLDOWN_MS) {
      phoneCooldownStore.delete(phone);
    }
  }
}, CODE_EXPIRY_MS);

function createToken(user: IUser): string {
  const payload: JwtPayload = {
    userId: user._id.toString(),
    role: user.role,
  };
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

export const authService = {
  async sendCode(body: SendCodeBody): Promise<{ success: true; method: string }> {
    const { phone, method = 'call', checkExists = false } = body;

    // If checkExists flag is set, verify phone is not already registered
    if (checkExists) {
      const existingUser = await UserModel.findOne({ phone });
      if (existingUser) {
        throw Object.assign(new Error('Этот номер уже зарегистрирован'), { statusCode: 400 });
      }
    }

    // Per-phone cooldown check (1 minute)
    const lastRequest = phoneCooldownStore.get(phone);
    if (lastRequest) {
      const elapsed = Date.now() - lastRequest;
      if (elapsed < COOLDOWN_MS) {
        const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
        throw Object.assign(
          new Error(`Подождите ${remaining} сек. перед повторным запросом`),
          { statusCode: 429 }
        );
      }
    }

    phoneCooldownStore.set(phone, Date.now());

    let code: string;

    if (method === 'telegram') {
      code = String(Math.floor(1000 + Math.random() * 9000));
      await sendTelegramCode(phone, code);
    } else {
      code = await sendCallVerification(phone);
    }

    const expiresAt = Date.now() + CODE_EXPIRY_MS;
    smsCodeStore.set(phone, { code, expiresAt });

    return { success: true, method };
  },

  async verifyCode(phone: string, code: string): Promise<{ valid: true }> {
    const storedEntry = smsCodeStore.get(phone);
    if (!storedEntry || storedEntry.expiresAt <= Date.now()) {
      smsCodeStore.delete(phone);
      throw Object.assign(new Error('Код истёк. Запросите новый код.'), { statusCode: 400 });
    }
    if (storedEntry.code !== code) {
      throw Object.assign(new Error('Неверный код подтверждения'), { statusCode: 400 });
    }
    return { valid: true };
  },

  async register(body: RegisterBody): Promise<AuthResponse> {
    const { phone, password, firstName, lastName, code } = body;

    const storedEntry = smsCodeStore.get(phone);
    if (!storedEntry || storedEntry.expiresAt <= Date.now()) {
      smsCodeStore.delete(phone);
      throw Object.assign(new Error('Код не найден или истёк. Запросите новый код.'), { statusCode: 400 });
    }
    if (storedEntry.code !== code) {
      throw Object.assign(new Error('Неверный код подтверждения'), { statusCode: 400 });
    }

    smsCodeStore.delete(phone);

    const existingByPhone = await UserModel.findOne({ phone });
    if (existingByPhone) throw Object.assign(new Error('Этот номер уже зарегистрирован'), { statusCode: 400 });

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const role = ROLES.USER;
    const name = `${firstName} ${lastName}`;

    const user = await UserModel.create({
      phone,
      name,
      passwordHash,
      role,
      phoneVerified: true,
    });

    const token = createToken(user);
    return {
      token,
      user: {
        id: user._id.toString(),
        phone: user.phone,
        name: user.name,
        role: user.role,
        phoneVerified: user.phoneVerified,
      },
    };
  },

  async login(body: LoginBody): Promise<AuthResponse> {
    const { phone, password } = body;

    const user = await UserModel.findOne({ phone });

    if (!user) throw Object.assign(new Error('Неверный номер или пароль'), { statusCode: 401 });
    if (user.blocked) throw Object.assign(new Error('Аккаунт заблокирован'), { statusCode: 403 });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw Object.assign(new Error('Неверный номер или пароль'), { statusCode: 401 });

    const token = createToken(user);
    return {
      token,
      user: {
        id: user._id.toString(),
        phone: user.phone,
        name: user.name,
        role: user.role,
        phoneVerified: user.phoneVerified,
      },
    };
  },
};
