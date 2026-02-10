import request from 'supertest';
import type { Express } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UserModel } from '../models/User.js';

const SALT_ROUNDS = 10;

let userCounter = 0;

export async function registerUser(
  app: Express,
  overrides: { email?: string; password?: string; name?: string } = {},
) {
  userCounter++;
  const body = {
    email: overrides.email ?? `user${userCounter}-${Date.now()}@test.com`,
    password: overrides.password ?? 'Password123!',
    name: overrides.name ?? `Test User ${userCounter}`,
  };

  const res = await request(app)
    .post('/api/auth/register')
    .send(body)
    .expect(201);

  return res.body as { token: string; user: { id: string; email: string; name?: string; role: string } };
}

export async function registerAdmin(app: Express) {
  userCounter++;
  const email = `admin${userCounter}-${Date.now()}@test.com`;
  const passwordHash = await bcrypt.hash('AdminPass123!', SALT_ROUNDS);

  const user = await UserModel.create({
    email,
    name: 'Admin User',
    passwordHash,
    role: 'admin',
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
      email: user.email,
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
