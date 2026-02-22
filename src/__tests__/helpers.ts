import request from 'supertest';
import type { Express } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UserModel } from '../models/User.js';
import { SubscriptionModel } from '../models/Subscription.js';

const SALT_ROUNDS = 10;

let userCounter = 0;

export async function registerUser(
  app: Express,
  overrides: {
    phone?: string;
    password?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
  } = {},
) {
  userCounter++;
  const phone = overrides.phone ?? `+7999000${String(userCounter).padStart(4, '0')}`;
  const firstName = overrides.firstName ?? 'Test';
  const lastName = overrides.lastName ?? `User${userCounter}`;
  const name = overrides.name ?? `${firstName} ${lastName}`;
  const password = overrides.password ?? 'Password123!';
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await UserModel.create({
    phone,
    passwordHash,
    role: 'user',
    name,
    firstName,
    lastName,
    phoneVerified: true,
  });

  await SubscriptionModel.create({
    userId: user._id.toString(),
    plan: 'pro',
    active: true,
    startDate: new Date(),
    endDate: null,
  });

  const token = jwt.sign(
    { userId: user._id.toString(), role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn } as jwt.SignOptions,
  );

  return {
    token,
    user: {
      id: user._id.toString(),
      phone: user.phone,
      name: user.name,
      role: user.role,
    },
    password,
  };
}

export async function registerAdmin(app: Express) {
  userCounter++;
  const email = `admin${userCounter}-${Date.now()}@test.com`;
  const passwordHash = await bcrypt.hash('AdminPass123!', SALT_ROUNDS);
  const phone = `+7988000${String(userCounter).padStart(4, '0')}`;

  const user = await UserModel.create({
    email,
    phone,
    name: 'Admin User',
    passwordHash,
    role: 'admin',
    phoneVerified: true,
  });

  const token = jwt.sign(
    { userId: user._id.toString(), email: user.email, role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn } as jwt.SignOptions,
  );

  return {
    token,
    user: {
      id: user._id.toString(),
      phone: user.phone,
      name: user.name,
      role: user.role,
    },
  };
}

export async function createListing(
  app: Express,
  token: string,
  overrides: Record<string, unknown> = {},
) {
  const body = {
    title: overrides.title ?? 'Test Apartment',
    description: overrides.description ?? 'A nice test apartment in the city center',
    price: overrides.price ?? 100000,
    address: overrides.address ?? '123 Test Street',
    propertyType: overrides.propertyType ?? 'apartment',
    images: overrides.images ?? ['https://example.com/test-image.jpg'],
    rooms: overrides.rooms ?? 3,
    area: overrides.area ?? 75,
    ...overrides,
  };

  const res = await request(app)
    .post('/api/listings')
    .set('Authorization', `Bearer ${token}`)
    .send(body)
    .expect(201);

  return res.body;
}
