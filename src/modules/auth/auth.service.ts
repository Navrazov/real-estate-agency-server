import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { ROLES } from '../../config/constants.js';
import { UserModel, IUser } from '../../models/User.js';
import type { JwtPayload } from '../../middlewares/auth.middleware.js';
import type { LoginBody, RegisterBody, AuthResponse } from './auth.types.js';

const SALT_ROUNDS = 10;

function createToken(user: IUser): string {
  const payload: JwtPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

export const authService = {
  async register(body: RegisterBody): Promise<AuthResponse> {
    const existing = await UserModel.findOne({ email: body.email });
    if (existing) throw Object.assign(new Error('Email already registered'), { statusCode: 400 });

    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);
    const role = body.role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.USER;

    const user = await UserModel.create({
      email: body.email,
      name: body.name,
      passwordHash,
      role,
    });

    const token = createToken(user);
    return {
      token,
      user: { id: user._id.toString(), email: user.email, name: user.name, role: user.role },
    };
  },

  async login(body: LoginBody): Promise<AuthResponse> {
    const user = await UserModel.findOne({ email: body.email });
    if (!user) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    if (user.blocked) throw Object.assign(new Error('Account is blocked'), { statusCode: 403 });

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });

    const token = createToken(user);
    return {
      token,
      user: { id: user._id.toString(), email: user.email, name: user.name, role: user.role },
    };
  },
};
