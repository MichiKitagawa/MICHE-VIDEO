import request from 'supertest';
import app from '@/app';

describe('Netflix Security - Authentication and Plan', () => {
  it('should require authentication for content details', async () => {
    const response = await request(app)
      .get('/api/netflix/nc_123456');

    expect(response.status).toBe(401);
  });

  it('should require Premium plan for Netflix content', async () => {
    const freeUserRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'free@example.com', password: 'TestPass123!' });

    const netflixRes = await request(app)
      .get('/api/netflix')
      .query({ type: 'movie', limit: 1 });

    const movieId = netflixRes.body.contents[0].id;

    const response = await request(app)
      .get(`/api/netflix/${movieId}`)
      .set('Authorization', `Bearer ${freeUserRes.body.access_token}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('premium_required');
  });

  it('should require Premium+ for adult content', async () => {
    const premiumRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'premium@example.com', password: 'TestPass123!' });

    await request(app)
      .post('/api/subscriptions/subscribe')
      .set('Authorization', `Bearer ${premiumRes.body.access_token}`)
      .send({ plan: 'premium' });

    const adultNetflixRes = await request(app)
      .get('/api/netflix')
      .query({ type: 'all' });

    const adultContent = adultNetflixRes.body.contents.find((c: any) => c.is_adult);

    if (adultContent) {
      const response = await request(app)
        .get(`/api/netflix/${adultContent.id}`)
        .set('Authorization', `Bearer ${premiumRes.body.access_token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('premium_plus_required');
    }
  });
});
