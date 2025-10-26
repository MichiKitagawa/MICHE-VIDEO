import request from 'supertest';
import app from '@/app';

describe('GET /api/notifications', () => {
  let userToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;
  });

  it('should retrieve notifications with pagination', async () => {
    const response = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${userToken}`)
      .query({ page: 1, limit: 20 });

    expect(response.status).toBe(200);
    expect(response.body.notifications).toBeInstanceOf(Array);
    expect(response.body.unread_count).toBeGreaterThanOrEqual(0);
  });

  it('should filter unread notifications', async () => {
    const response = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${userToken}`)
      .query({ unread_only: true });

    expect(response.status).toBe(200);
    response.body.notifications.forEach((n: any) => {
      expect(n.is_read).toBe(false);
    });
  });
});
