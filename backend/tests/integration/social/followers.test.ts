import request from 'supertest';
import app from '@/app';

describe('GET /api/users/:user_id/followers', () => {
  it('should retrieve followers list with pagination', async () => {
    const response = await request(app)
      .get('/api/users/usr_123/followers')
      .query({ page: 1, limit: 20 });

    expect(response.status).toBe(200);
    expect(response.body.followers).toBeInstanceOf(Array);
    expect(response.body.pagination).toBeDefined();
  });
});
