import request from 'supertest';
import app from '@/app';

/**
 * Short Delete API Integration Tests
 *
 * Tests the DELETE /api/shorts/:id endpoint
 * Reference: docs/tests/short-management-tests.md
 */

describe('DELETE /api/shorts/:id', () => {
  let accessToken: string;
  let otherUserToken: string;
  let shortId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    accessToken = loginRes.body.access_token;

    const otherLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'other@example.com', password: 'TestPass123!' });
    otherUserToken = otherLogin.body.access_token;

    const createRes = await request(app)
      .post('/api/shorts/create')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'テストショート',
        video_file: 'mf_test'
      });
    shortId = createRes.body.short.id;
  });

  describe('Successful Deletion', () => {
    it('should delete short successfully', async () => {
      const response = await request(app)
        .delete(`/api/shorts/${shortId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('ショート動画を削除しました');
      expect(response.body.short_id).toBe(shortId);
    });

    it('should make short inaccessible after deletion', async () => {
      await request(app)
        .delete(`/api/shorts/${shortId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      const getRes = await request(app)
        .get(`/api/shorts/${shortId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(getRes.status).toBe(404);
    });
  });

  describe('Authorization', () => {
    it('should reject deletion by non-owner', async () => {
      const response = await request(app)
        .delete(`/api/shorts/${shortId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(response.status).toBe(403);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/shorts/${shortId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Not Found', () => {
    it('should return 404 when deleting non-existent short', async () => {
      const response = await request(app)
        .delete('/api/shorts/short_nonexistent')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 when deleting already deleted short', async () => {
      await request(app)
        .delete(`/api/shorts/${shortId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      const response = await request(app)
        .delete(`/api/shorts/${shortId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });
});
