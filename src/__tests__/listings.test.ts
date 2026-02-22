import request from 'supertest';
import app from '../app.js';
import { registerUser, registerAdmin, createListing } from './helpers.js';

describe('Listings API', () => {
  describe('GET /api/listings', () => {
    it('should return paginated response (empty)', async () => {
      const res = await request(app)
        .get('/api/listings')
        .expect(200);

      expect(res.body).toMatchObject({
        items: [],
        total: 0,
        page: 1,
        totalPages: 1,
      });
      expect(res.body).toHaveProperty('limit');
    });
  });

  describe('POST /api/listings', () => {
    it('should return 401 without auth', async () => {
      await request(app)
        .post('/api/listings')
        .send({
          title: 'Unauthorized Listing',
          description: 'Should fail',
          price: 50000,
          address: '456 No Auth St',
        })
        .expect(401);
    });

    it('should create listing with auth (201)', async () => {
      const { token } = await registerUser(app);

      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'My Apartment',
          description: 'Beautiful apartment in the center',
          price: 150000,
          address: '789 Auth Avenue',
          propertyType: 'apartment',
          images: ['https://example.com/image-1.jpg'],
          rooms: 2,
          area: 60,
        })
        .expect(201);

      expect(res.body).toMatchObject({
        title: 'My Apartment',
        price: 150000,
        address: '789 Auth Avenue',
        propertyType: 'apartment',
        status: 'pending',
      });
      expect(res.body).toHaveProperty('id');
    });
  });

  describe('GET /api/listings/:id', () => {
    it('should return the listing by id', async () => {
      const { token } = await registerUser(app);
      const listing = await createListing(app, token, { title: 'Fetch Me' });

      const res = await request(app)
        .get(`/api/listings/${listing.id}`)
        .expect(200);

      expect(res.body.title).toBe('Fetch Me');
      expect(res.body.id).toBe(listing.id);
    });
  });

  describe('PATCH /api/listings/:id', () => {
    it('should allow owner to update', async () => {
      const { token } = await registerUser(app);
      const listing = await createListing(app, token, { title: 'Original Title' });

      const res = await request(app)
        .patch(`/api/listings/${listing.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Title' })
        .expect(200);

      expect(res.body.title).toBe('Updated Title');
    });

    it('should return 404 for non-owner', async () => {
      const owner = await registerUser(app, { phone: '+79991230011' });
      const other = await registerUser(app, { phone: '+79991230012' });
      const listing = await createListing(app, owner.token);

      await request(app)
        .patch(`/api/listings/${listing.id}`)
        .set('Authorization', `Bearer ${other.token}`)
        .send({ title: 'Hijacked' })
        .expect(404);
    });
  });

  describe('DELETE /api/listings/:id', () => {
    it('should allow owner to delete (204)', async () => {
      const { token } = await registerUser(app);
      const listing = await createListing(app, token);

      await request(app)
        .delete(`/api/listings/${listing.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      // Verify it is gone
      await request(app)
        .get(`/api/listings/${listing.id}`)
        .expect(404);
    });

    it('should allow admin to delete any listing', async () => {
      const user = await registerUser(app);
      const listing = await createListing(app, user.token);

      const admin = await registerAdmin(app);

      await request(app)
        .delete(`/api/listings/${listing.id}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(204);

      // Verify it is gone
      await request(app)
        .get(`/api/listings/${listing.id}`)
        .expect(404);
    });
  });
});
