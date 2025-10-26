import request from 'supertest';
import app from '@/app';

describe('GET /api/feed/activity', () => {
  let userToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;
  });

  it('should retrieve activity feed', async () => {
    const response = await request(app)
      .get('/api/feed/activity')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.activities).toBeInstanceOf(Array);
  });
});
