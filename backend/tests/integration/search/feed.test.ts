import request from 'supertest';
import app from '@/app';

describe('GET /api/recommendations/feed', () => {
  let userToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;
  });

  it('should retrieve personalized recommendations', async () => {
    const response = await request(app)
      .get('/api/recommendations/feed')
      .set('Authorization', `Bearer ${userToken}`)
      .query({ page: 1, limit: 20 });

    expect(response.status).toBe(200);
    expect(response.body.recommendations).toBeInstanceOf(Array);
    expect(response.body.recommendations.length).toBeLessThanOrEqual(20);
    expect(response.body.pagination).toBeDefined();
    expect(response.body.pagination.page).toBe(1);
    expect(response.body.pagination.limit).toBe(20);
    expect(response.body.pagination.has_more).toBeDefined();

    response.body.recommendations.forEach((rec: any) => {
      expect(rec.video).toBeDefined();
      expect(rec.video.id).toBeDefined();
      expect(rec.video.title).toBeDefined();
      expect(rec.reason).toMatch(/^(watch_history|liked_videos|followed_channels|trending|category)$/);
      expect(rec.reason_text).toBeDefined();
      expect(rec.score).toBeGreaterThan(0);
      expect(rec.score).toBeLessThanOrEqual(1.0);
    });
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .get('/api/recommendations/feed');

    expect(response.status).toBe(401);
  });

  it('should support pagination', async () => {
    const page1 = await request(app)
      .get('/api/recommendations/feed')
      .set('Authorization', `Bearer ${userToken}`)
      .query({ page: 1, limit: 10 });

    const page2 = await request(app)
      .get('/api/recommendations/feed')
      .set('Authorization', `Bearer ${userToken}`)
      .query({ page: 2, limit: 10 });

    expect(page1.status).toBe(200);
    expect(page2.status).toBe(200);
    expect(page1.body.recommendations[0].video.id).not.toBe(page2.body.recommendations[0].video.id);
  });
});
