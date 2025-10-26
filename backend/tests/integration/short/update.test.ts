import request from 'supertest';
import app from '@/app';

/**
 * Short Update API Integration Tests
 *
 * Tests the PATCH /api/shorts/:id endpoint
 * Reference: docs/tests/short-management-tests.md
 */

describe('PATCH /api/shorts/:id', () => {
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
        title: '元のタイトル',
        description: '元の説明',
        category: 'dance',
        tags: ['元のタグ'],
        privacy: 'public',
        video_file: 'mf_test'
      });
    shortId = createRes.body.short.id;
  });

  describe('Successful Updates', () => {
    it('should update short metadata', async () => {
      const response = await request(app)
        .patch(`/api/shorts/${shortId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: '更新されたタイトル',
          description: '更新された説明文',
          category: 'comedy',
          tags: ['新しいタグ', '更新']
        });

      expect(response.status).toBe(200);
      expect(response.body.short.title).toBe('更新されたタイトル');
      expect(response.body.short.description).toBe('更新された説明文');
      expect(response.body.short.category).toBe('comedy');
      expect(response.body.short.tags).toContain('新しいタグ');
      expect(response.body.short.updated_at).toBeDefined();
    });

    it('should update privacy setting', async () => {
      const response = await request(app)
        .patch(`/api/shorts/${shortId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ privacy: 'unlisted' });

      expect(response.status).toBe(200);
      expect(response.body.short.privacy).toBe('unlisted');
    });

    it('should normalize and deduplicate tags', async () => {
      const response = await request(app)
        .patch(`/api/shorts/${shortId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          tags: ['Dance', 'dance', 'DANCE', 'Music']
        });

      expect(response.status).toBe(200);
      expect(response.body.short.tags).toEqual(['dance', 'music']);
    });

    it('should update single field without affecting others', async () => {
      const response = await request(app)
        .patch(`/api/shorts/${shortId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: '新しいタイトルのみ' });

      expect(response.status).toBe(200);
      expect(response.body.short.title).toBe('新しいタイトルのみ');
      expect(response.body.short.category).toBe('dance'); // Unchanged
    });
  });

  describe('Authorization', () => {
    it('should reject update by non-owner', async () => {
      const response = await request(app)
        .patch(`/api/shorts/${shortId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ title: 'Unauthorized Update' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('forbidden');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .patch(`/api/shorts/${shortId}`)
        .send({ title: 'No Auth' });

      expect(response.status).toBe(401);
    });
  });

  describe('Validation', () => {
    it('should validate updated title length', async () => {
      const response = await request(app)
        .patch(`/api/shorts/${shortId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'a'.repeat(201) });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('title_too_long');
    });

    it('should validate category', async () => {
      const response = await request(app)
        .patch(`/api/shorts/${shortId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ category: 'invalid_category' });

      expect(response.status).toBe(400);
    });

    it('should reject more than 10 tags', async () => {
      const tags = Array(12).fill('tag').map((t, i) => `${t}${i}`);
      const response = await request(app)
        .patch(`/api/shorts/${shortId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ tags });

      expect(response.status).toBe(400);
    });
  });

  describe('Not Found', () => {
    it('should return 404 for non-existent short', async () => {
      const response = await request(app)
        .patch('/api/shorts/short_nonexistent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Update' });

      expect(response.status).toBe(404);
    });
  });

  describe('Security', () => {
    it('should sanitize XSS in title', async () => {
      const response = await request(app)
        .patch(`/api/shorts/${shortId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: '<script>alert(1)</script>Safe' });

      expect(response.status).toBe(200);
      expect(response.body.short.title).not.toContain('<script>');
    });
  });
});
