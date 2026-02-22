import request from 'supertest';
import app from '../app.js';
import { UserModel } from '../models/User.js';
import bcrypt from 'bcryptjs';
import { registerUser } from './helpers.js';

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('should return 400 for missing phone', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ password: 'Secret123!' })
        .expect(400);

      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials and return token', async () => {
      const created = await registerUser(app, {
        phone: '+79991230001',
        password: 'MyPass123!',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ phone: '+79991230001', password: created.password })
        .expect(200);

      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toMatchObject({
        phone: '+79991230001',
        role: 'user',
      });
    });

    it('should return 401 for wrong password', async () => {
      await registerUser(app, { phone: '+79991230002', password: 'CorrectPass1!' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ phone: '+79991230002', password: 'WrongPass1!' })
        .expect(401);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 401 for nonexistent phone', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ phone: '+79991239999', password: 'Whatever1!' })
        .expect(401);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 403 for blocked user', async () => {
      const passwordHash = await bcrypt.hash('BlockedPass1!', 10);
      await UserModel.create({
        phone: '+79991230003',
        passwordHash,
        role: 'user',
        blocked: true,
        phoneVerified: true,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ phone: '+79991230003', password: 'BlockedPass1!' })
        .expect(403);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/заблокирован/i);
    });
  });
});
