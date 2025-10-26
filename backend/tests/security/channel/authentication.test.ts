import request from 'supertest';
import app from '@/app';

describe('Creator Security - Authentication', () => {
  it('should require authentication for creator application', async () => {
    const response = await request(app)
      .post('/api/creators/apply');

    expect(response.status).toBe(401);
  });

  it('should require creator permission for channel update', async () => {
    const userRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'regular@example.com', password: 'TestPass123!' });

    const response = await request(app)
      .patch('/api/channels/my-channel')
      .set('Authorization', `Bearer ${userRes.body.access_token}`)
      .send({ name: '新しいチャンネル名' });

    expect(response.status).toBe(403);
  });

  it('should require creator permission for analytics', async () => {
    const userRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'regular@example.com', password: 'TestPass123!' });

    const response = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${userRes.body.access_token}`);

    expect(response.status).toBe(403);
  });
});
