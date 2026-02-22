import request from 'supertest';
import app from '../app.js';
import { registerUser, registerAdmin, createListing } from './helpers.js';

describe('Users API', () => {
  describe('GET /api/users/me', () => {
    it('should return user profile', async () => {
      const { token, user } = await registerUser(app, { name: 'Profile User' });

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id: user.id,
        phone: user.phone,
        name: 'Profile User',
        role: 'user',
      });
      expect(res.body).toHaveProperty('favorites');
    });
  });

  describe('PATCH /api/users/me', () => {
    it('should update name', async () => {
      const { token } = await registerUser(app, { name: 'Old Name' });

      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name' })
        .expect(200);

      expect(res.body.name).toBe('New Name');
    });
  });

  describe('GET /api/users', () => {
    it('should return 403 for regular user', async () => {
      const { token } = await registerUser(app);

      await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should return list for admin', async () => {
      // Create a regular user first so the list is not empty
      await registerUser(app, { phone: '+79991230021' });

      const admin = await registerAdmin(app);

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2); // admin + regular user
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('phone');
      expect(res.body[0]).toHaveProperty('role');
    });
  });

  describe('POST /api/users/favorites/:listingId', () => {
    it('should toggle favorite', async () => {
      const { token } = await registerUser(app);
      const listing = await createListing(app, token);

      // First toggle: add to favorites
      const res1 = await request(app)
        .post(`/api/users/favorites/${listing.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res1.body.isFavorite).toBe(true);
      expect(res1.body.favorites).toContain(listing.id);

      // Second toggle: remove from favorites
      const res2 = await request(app)
        .post(`/api/users/favorites/${listing.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res2.body.isFavorite).toBe(false);
      expect(res2.body.favorites).not.toContain(listing.id);
    });
  });
});
