import request from 'supertest';
import app from '@/app';

describe('PATCH /api/notifications/:id/read', () => {
  let userToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;
  });

  it('should mark notification as read', async () => {
    const listRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${userToken}`);

    const unreadNotif = listRes.body.notifications.find((n: any) => !n.is_read);

    if (unreadNotif) {
      const response = await request(app)
        .patch(`/api/notifications/${unreadNotif.id}/read`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('通知を既読にしました');
    }
  });
});
