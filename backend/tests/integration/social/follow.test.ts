import request from 'supertest';
import app from '@/app';

/**
 * Follow API Integration Tests
 * Tests POST /api/users/:user_id/follow
 * Reference: docs/tests/social-tests.md (TC-101)
 */

describe('POST /api/users/:user_id/follow', () => {
  let user1Token: string;
  let user2Token: string;
  let user2Id: string;

  beforeEach(async () => {
    const user1Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user1@example.com', password: 'TestPass123!' });
    user1Token = user1Res.body.access_token;

    const user2Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user2@example.com', password: 'TestPass123!' });
    user2Token = user2Res.body.access_token;
    user2Id = user2Res.body.user.id;
  });

  it('should follow user successfully', async () => {
    const response = await request(app)
      .post(`/api/users/${user2Id}/follow`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('フォローしました');
    expect(response.body.is_following).toBe(true);
  });

  it('should reject self-follow', async () => {
    const response = await request(app)
      .post(`/api/users/${user1Id}/follow`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('cannot_follow_self');
  });

  it('should reject duplicate follow', async () => {
    await request(app)
      .post(`/api/users/${user2Id}/follow`)
      .set('Authorization', `Bearer ${user1Token}`);

    const response = await request(app)
      .post(`/api/users/${user2Id}/follow`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('already_following');
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post(`/api/users/${user2Id}/follow`);

    expect(response.status).toBe(401);
  });
});
