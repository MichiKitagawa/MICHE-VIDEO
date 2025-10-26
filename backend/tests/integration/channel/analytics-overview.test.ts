import request from 'supertest';
import app from '@/app';

describe('GET /api/analytics/overview', () => {
  let creatorToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    creatorToken = loginRes.body.access_token;

    await request(app)
      .post('/api/creators/apply')
      .set('Authorization', `Bearer ${creatorToken}`);
  });

  it('should retrieve analytics overview (30d)', async () => {
    const response = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${creatorToken}`)
      .query({ period: '30d' });

    expect(response.status).toBe(200);
    expect(response.body.period).toBe('30d');
    expect(response.body.total_views).toBeGreaterThanOrEqual(0);
    expect(response.body.total_watch_time_hours).toBeGreaterThanOrEqual(0);
    expect(response.body.avg_view_duration_seconds).toBeGreaterThanOrEqual(0);
    expect(response.body.subscribers_gained).toBeGreaterThanOrEqual(0);
    expect(response.body.total_likes).toBeGreaterThanOrEqual(0);
    expect(response.body.views_change_percent).toBeDefined();
    expect(response.body.watch_time_change_percent).toBeDefined();
  });

  it('should retrieve analytics for different periods', async () => {
    const response7d = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${creatorToken}`)
      .query({ period: '7d' });

    const response90d = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${creatorToken}`)
      .query({ period: '90d' });

    expect(response7d.status).toBe(200);
    expect(response90d.status).toBe(200);
    expect(response7d.body.period).toBe('7d');
    expect(response90d.body.period).toBe('90d');
  });

  it('should require creator permission', async () => {
    const userRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'regular@example.com', password: 'TestPass123!' });

    const response = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${userRes.body.access_token}`);

    expect(response.status).toBe(403);
  });
});
