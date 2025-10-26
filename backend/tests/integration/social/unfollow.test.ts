import request from 'supertest';
import app from '@/app';

describe('DELETE /api/users/:user_id/follow', () => {
  let user1Token: string;
  let user2Id: string;

  beforeEach(async () => {
    const user1Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user1@example.com', password: 'TestPass123!' });
    user1Token = user1Res.body.access_token;

    const user2Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user2@example.com', password: 'TestPass123!' });
    user2Id = user2Res.body.user.id;

    await request(app)
      .post(`/api/users/${user2Id}/follow`)
      .set('Authorization', `Bearer ${user1Token}`);
  });

  it('should unfollow user successfully', async () => {
    const response = await request(app)
      .delete(`/api/users/${user2Id}/follow`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('フォローを解除しました');
    expect(response.body.is_following).toBe(false);
  });

  it('should reject unfollow non-followed user', async () => {
    await request(app)
      .delete(`/api/users/${user2Id}/follow`)
      .set('Authorization', `Bearer ${user1Token}`);

    const response = await request(app)
      .delete(`/api/users/${user2Id}/follow`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('not_following');
  });
});
