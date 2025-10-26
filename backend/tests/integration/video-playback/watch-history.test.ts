import request from 'supertest';
import app from '@/app';

describe('GET /api/users/watch-history', () => {
  let userToken: string;

  beforeEach(async () => {
    const loginRes = await request(app).post('/api/auth/login').send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;
  });

  it('should get user watch history', async () => {
    const response = await request(app).get('/api/users/watch-history').set('Authorization', `Bearer ${userToken}`);
    expect(response.status).toBe(200);
    expect(response.body.history).toBeInstanceOf(Array);
  });

  it('should include progress information', async () => {
    const response = await request(app).get('/api/users/watch-history').set('Authorization', `Bearer ${userToken}`);
    if (response.body.history.length > 0) {
      expect(response.body.history[0]).toHaveProperty('progress_seconds');
      expect(response.body.history[0]).toHaveProperty('duration_seconds');
    }
    expect(response.status).toBe(200);
  });

  it('should require authentication', async () => {
    const response = await request(app).get('/api/users/watch-history');
    expect(response.status).toBe(401);
  });
});
