import request from 'supertest';
import app from '@/app';

/**
 * Short Bulk Delete API Integration Tests
 *
 * Tests the POST /api/shorts/bulk-delete endpoint
 * Reference: docs/tests/short-management-tests.md
 */

describe('POST /api/shorts/bulk-delete', () => {
  let accessToken: string;
  let otherUserToken: string;
  let shortIds: string[];

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    accessToken = loginRes.body.access_token;

    const otherLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'other@example.com', password: 'TestPass123!' });
    otherUserToken = otherLogin.body.access_token;

    shortIds = [];
    for (let i = 0; i < 3; i++) {
      const createRes = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: `テストショート ${i + 1}`,
          video_file: `mf_test_${i}`
        });
      shortIds.push(createRes.body.short.id);
    }
  });

  describe('Successful Bulk Deletion', () => {
    it('should delete multiple shorts', async () => {
      const response = await request(app)
        .post('/api/shorts/bulk-delete')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ short_ids: shortIds });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('3件');
      expect(response.body.deleted_count).toBe(3);
      expect(response.body.failed).toEqual([]);
    });

    it('should skip shorts not owned by user', async () => {
      const otherShortRes = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          title: '他人のショート',
          video_file: 'mf_other'
        });

      const response = await request(app)
        .post('/api/shorts/bulk-delete')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          short_ids: [shortIds[0], otherShortRes.body.short.id]
        });

      expect(response.status).toBe(200);
      expect(response.body.deleted_count).toBe(1);
      expect(response.body.failed.length).toBe(1);
      expect(response.body.failed[0].short_id).toBe(otherShortRes.body.short.id);
      expect(response.body.failed[0].reason).toContain('権限');
    });

    it('should handle non-existent shorts', async () => {
      const response = await request(app)
        .post('/api/shorts/bulk-delete')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          short_ids: [shortIds[0], 'short_nonexistent']
        });

      expect(response.status).toBe(200);
      expect(response.body.deleted_count).toBe(1);
      expect(response.body.failed.length).toBe(1);
    });
  });

  describe('Validation', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/shorts/bulk-delete')
        .send({ short_ids: shortIds });

      expect(response.status).toBe(401);
    });

    it('should reject empty short_ids array', async () => {
      const response = await request(app)
        .post('/api/shorts/bulk-delete')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ short_ids: [] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('short_ids_required');
    });

    it('should reject non-array short_ids', async () => {
      const response = await request(app)
        .post('/api/shorts/bulk-delete')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ short_ids: 'not-an-array' });

      expect(response.status).toBe(400);
    });

    it('should enforce maximum 50 shorts per request', async () => {
      const tooManyIds = Array(51).fill('short_').map((p, i) => `${p}${i}`);
      const response = await request(app)
        .post('/api/shorts/bulk-delete')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ short_ids: tooManyIds });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('too_many_shorts');
    });
  });
});
