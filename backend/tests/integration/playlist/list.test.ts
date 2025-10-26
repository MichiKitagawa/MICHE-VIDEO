import request from 'supertest';
import app from '@/app';

describe('GET /api/playlists/my-playlists', () => {
  let userToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;
  });

  it('should retrieve user playlists with pagination', async () => {
    const response = await request(app)
      .get('/api/playlists/my-playlists')
      .set('Authorization', `Bearer ${userToken}`)
      .query({ page: 1, limit: 20 });

    expect(response.status).toBe(200);
    expect(response.body.playlists).toBeInstanceOf(Array);
    expect(response.body.pagination).toBeDefined();
  });
});
