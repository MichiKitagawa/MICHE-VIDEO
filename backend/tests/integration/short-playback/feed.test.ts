import request from 'supertest';
import app from '@/app';

describe('GET /api/shorts/feed', () => {
  let accessToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    accessToken = loginRes.body.access_token;
  });

  it('should get personalized short feed', async () => {
    const response = await request(app)
      .get('/api/shorts/feed?page=1&limit=20')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.shorts).toBeInstanceOf(Array);
    expect(response.body.shorts.length).toBeLessThanOrEqual(20);
    expect(response.body.pagination).toBeDefined();
  });

  it('should return short with complete metadata', async () => {
    const response = await request(app)
      .get('/api/shorts/feed?limit=1')
      .set('Authorization', `Bearer ${accessToken}`);

    const short = response.body.shorts[0];
    expect(short.id).toBeDefined();
    expect(short.video_url).toMatch(/\.m3u8$/);
    expect(short.thumbnail_url).toBeDefined();
    expect(short.user_name).toBeDefined();
  });

  it('should filter adult content for non-Premium+ users', async () => {
    const response = await request(app)
      .get('/api/shorts/feed?limit=50')
      .set('Authorization', `Bearer ${accessToken}`);

    response.body.shorts.forEach((short: any) => {
      expect(short.is_adult).toBe(false);
    });
  });

  it('should support category filtering', async () => {
    const response = await request(app)
      .get('/api/shorts/feed?category=dance&limit=20')
      .set('Authorization', `Bearer ${accessToken}`);

    response.body.shorts.forEach((short: any) => {
      expect(short.category).toBe('dance');
    });
  });

  it('should work without authentication (generic feed)', async () => {
    const response = await request(app)
      .get('/api/shorts/feed?limit=10');

    expect(response.status).toBe(200);
    expect(response.body.shorts).toBeInstanceOf(Array);
  });
});
