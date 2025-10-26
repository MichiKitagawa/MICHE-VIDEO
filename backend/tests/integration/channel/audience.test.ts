import request from 'supertest';
import app from '@/app';

describe('GET /api/analytics/audience', () => {
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

  it('should retrieve audience demographics', async () => {
    const response = await request(app)
      .get('/api/analytics/audience')
      .set('Authorization', `Bearer ${creatorToken}`)
      .query({ period: '30d' });

    expect(response.status).toBe(200);
    expect(response.body.age_distribution).toBeDefined();
    expect(response.body.age_distribution['18-24']).toBeGreaterThanOrEqual(0);
    expect(response.body.gender_distribution).toBeDefined();
    expect(response.body.gender_distribution.male).toBeGreaterThanOrEqual(0);
    expect(response.body.top_regions).toBeInstanceOf(Array);
    expect(response.body.devices).toBeDefined();
    expect(response.body.devices.mobile).toBeGreaterThanOrEqual(0);
  });
});
