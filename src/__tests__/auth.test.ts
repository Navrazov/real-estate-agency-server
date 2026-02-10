import request from 'supertest';
import app from '../app.js';
import { UserModel } from '../models/User.js';
import bcrypt from 'bcryptjs';
import { registerUser } from './helpers.js';

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a user with role "user"', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'newuser@test.com', password: 'Secret123!', name: 'New User' })
        .expect(201);

      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toMatchObject({
        email: 'newuser@test.com',
        name: 'New User',
        role: 'user',
      });
      expect(res.body.user).toHaveProperty('id');
    });

    it('should ignore role field even if role "admin" is sent', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'sneaky@test.com', password: 'Secret123!', name: 'Sneaky', role: 'admin' })
        .expect(201);

      expect(res.body.user.role).toBe('user');
    });

    it('should return 400 for missing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ password: 'Secret123!' })
        .expect(400);

      expect(res.body).toHaveProperty('errors');
    });

    it('should return 400 for duplicate email', async () => {
      await registerUser(app, { email: 'dupe@test.com' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'dupe@test.com', password: 'Secret123!' })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials and return token', async () => {
      await registerUser(app, { email: 'login@test.com', password: 'MyPass123!' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'MyPass123!' })
        .expect(200);

      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toMatchObject({
        email: 'login@test.com',
        role: 'user',
      });
    });

    it('should return 401 for wrong password', async () => {
      await registerUser(app, { email: 'wrongpw@test.com', password: 'CorrectPass1!' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'wrongpw@test.com', password: 'WrongPass1!' })
        .expect(401);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 401 for nonexistent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: 'Whatever1!' })
        .expect(401);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 403 for blocked user', async () => {
      const passwordHash = await bcrypt.hash('BlockedPass1!', 10);
      await UserModel.create({
        email: 'blocked@test.com',
        passwordHash,
        role: 'user',
        blocked: true,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'blocked@test.com', password: 'BlockedPass1!' })
        .expect(403);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/blocked/i);
    });
  });
});
