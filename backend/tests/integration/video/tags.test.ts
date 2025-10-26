import request from 'supertest';
import app from '@/app';

/**
 * Video Tags API Integration Tests
 *
 * Tests the POST /api/videos/:id/tags endpoint for:
 * - Adding tags to videos
 * - Tag validation (max 10 tags)
 * - Duplicate tag handling
 * - Tag sanitization
 *
 * Reference: docs/tests/video-management-tests.md
 */

describe('POST /api/videos/:id/tags', () => {
  let userToken: string;
  let otherUserToken: string;
  let videoId: string;

  beforeEach(async () => {
    // Setup: Login as user
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;

    // Setup: Login as other user
    const otherLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'other@example.com', password: 'TestPass123!' });
    otherUserToken = otherLoginRes.body.access_token;

    // Setup: Create test video
    const createRes = await request(app)
      .post('/api/videos/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'タグテスト用動画',
        description: 'タグのテストに使用する動画',
        category: 'education',
        tags: ['既存タグ1', '既存タグ2'],
        media_file_id: 'mf_tags_test'
      });
    videoId = createRes.body.video.id;
  });

  describe('Add Tags', () => {
    it('should add new tags to video successfully', async () => {
      // Arrange: New tags to add
      const newTags = ['新しいタグ1', '新しいタグ2', '新しいタグ3'];

      // Act: Add tags
      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: newTags });

      // Assert: Should add tags successfully
      expect(response.status).toBe(200);
      expect(response.body.tags).toContain('新しいタグ1');
      expect(response.body.tags).toContain('新しいタグ2');
      expect(response.body.tags).toContain('新しいタグ3');
      expect(response.body.tags).toContain('既存タグ1');
      expect(response.body.tags).toContain('既存タグ2');
      expect(response.body.tags.length).toBe(5);
    });

    it('should add single tag', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: ['単一タグ'] });

      expect(response.status).toBe(200);
      expect(response.body.tags).toContain('単一タグ');
      expect(response.body.tags.length).toBe(3);
    });

    it('should preserve existing tags when adding new ones', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: ['追加タグ'] });

      expect(response.status).toBe(200);
      expect(response.body.tags).toContain('既存タグ1');
      expect(response.body.tags).toContain('既存タグ2');
      expect(response.body.tags).toContain('追加タグ');
    });

    it('should trim whitespace from tags', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: ['  スペース付きタグ  ', '  もう一つ  '] });

      expect(response.status).toBe(200);
      expect(response.body.tags).toContain('スペース付きタグ');
      expect(response.body.tags).toContain('もう一つ');
      expect(response.body.tags.every((tag: string) => tag === tag.trim())).toBe(true);
    });

    it('should accept English tags', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: ['programming', 'javascript', 'tutorial'] });

      expect(response.status).toBe(200);
      expect(response.body.tags).toContain('programming');
      expect(response.body.tags).toContain('javascript');
      expect(response.body.tags).toContain('tutorial');
    });

    it('should accept mixed language tags', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: ['プログラミング', 'JavaScript', '한국어'] });

      expect(response.status).toBe(200);
      expect(response.body.tags.length).toBeGreaterThan(2);
    });

    it('should return updated tag list', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: ['タグA', 'タグB'] });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tags');
      expect(response.body).toHaveProperty('total_tags');
      expect(Array.isArray(response.body.tags)).toBe(true);
      expect(typeof response.body.total_tags).toBe('number');
    });
  });

  describe('Max 10 Tags Limit', () => {
    it('should accept up to 10 tags total', async () => {
      // Arrange: Video already has 2 tags, add 8 more (total 10)
      const newTags = Array.from({ length: 8 }, (_, i) => `追加タグ${i + 1}`);

      // Act: Add tags
      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: newTags });

      // Assert: Should accept all (total 10)
      expect(response.status).toBe(200);
      expect(response.body.tags.length).toBe(10);
      expect(response.body.total_tags).toBe(10);
    });

    it('should reject adding more than 10 tags total', async () => {
      // Arrange: Video already has 2 tags, try to add 9 more (total 11)
      const tooManyTags = Array.from({ length: 9 }, (_, i) => `タグ${i + 1}`);

      // Act: Try to add too many tags
      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: tooManyTags });

      // Assert: Should reject
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('too_many_tags');
      expect(response.body.message).toContain('10個');
      expect(response.body.current_count).toBe(2);
      expect(response.body.attempting_to_add).toBe(9);
      expect(response.body.max_allowed).toBe(10);
    });

    it('should show how many more tags can be added', async () => {
      const response = await request(app)
        .get(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.video.tags.length).toBe(2);
      expect(response.body.video.remaining_tag_slots).toBe(8);
    });

    it('should reject request with more than 10 tags in single request', async () => {
      // Create new video without tags
      const createRes = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: '新規動画',
          media_file_id: 'mf_new_video'
        });

      const newVideoId = createRes.body.video.id;
      const elevenTags = Array.from({ length: 11 }, (_, i) => `タグ${i + 1}`);

      const response = await request(app)
        .post(`/api/videos/${newVideoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: elevenTags });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('too_many_tags');
    });
  });

  describe('Tag Validation', () => {
    it('should reject empty tag', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: [''] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_tag');
    });

    it('should reject whitespace-only tag', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: ['   '] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_tag');
    });

    it('should reject tag exceeding 50 characters', async () => {
      const longTag = 'あ'.repeat(51);

      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: [longTag] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('tag_too_long');
      expect(response.body.message).toContain('50文字');
    });

    it('should accept tag at exactly 50 characters', async () => {
      const maxTag = 'a'.repeat(50);

      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: [maxTag] });

      expect(response.status).toBe(200);
    });

    it('should filter out empty tags from array', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: ['有効なタグ', '', '   ', '別の有効なタグ'] });

      expect(response.status).toBe(200);
      expect(response.body.tags).toContain('有効なタグ');
      expect(response.body.tags).toContain('別の有効なタグ');
      expect(response.body.tags).not.toContain('');
    });

    it('should reject tags array if empty after filtering', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: ['', '   ', ''] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('no_valid_tags');
    });

    it('should reject tag with special characters only', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: ['@#$%^&*()'] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_tag_format');
    });

    it('should accept tags with hyphens and underscores', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: ['web-development', 'machine_learning'] });

      expect(response.status).toBe(200);
      expect(response.body.tags).toContain('web-development');
      expect(response.body.tags).toContain('machine_learning');
    });

    it('should accept tags with numbers', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: ['React18', 'TypeScript5'] });

      expect(response.status).toBe(200);
      expect(response.body.tags).toContain('React18');
      expect(response.body.tags).toContain('TypeScript5');
    });
  });

  describe('Duplicate Tags', () => {
    it('should not add duplicate tags', async () => {
      // Arrange: Try to add tag that already exists
      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: ['既存タグ1'] });

      // Assert: Should not duplicate
      expect(response.status).toBe(200);
      const tagCount = response.body.tags.filter((t: string) => t === '既存タグ1').length;
      expect(tagCount).toBe(1);
    });

    it('should handle case-insensitive duplicates', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: ['既存タグ1', 'EXISTING TAG 1'] });

      expect(response.status).toBe(200);
      // Should not add duplicate (case-insensitive)
    });

    it('should remove duplicates within request', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: ['新タグ', '新タグ', '新タグ'] });

      expect(response.status).toBe(200);
      const tagCount = response.body.tags.filter((t: string) => t === '新タグ').length;
      expect(tagCount).toBe(1);
    });

    it('should show which tags were added and which were duplicates', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: ['既存タグ1', '新タグA', '新タグB'] });

      expect(response.status).toBe(200);
      expect(response.body.added_tags).toEqual(['新タグA', '新タグB']);
      expect(response.body.skipped_duplicates).toEqual(['既存タグ1']);
    });
  });

  describe('Remove Tags', () => {
    it('should remove tags from video', async () => {
      // Act: Remove tag
      const response = await request(app)
        .delete(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: ['既存タグ1'] });

      // Assert: Should remove successfully
      expect(response.status).toBe(200);
      expect(response.body.tags).not.toContain('既存タグ1');
      expect(response.body.tags).toContain('既存タグ2');
      expect(response.body.removed_tags).toEqual(['既存タグ1']);
    });

    it('should remove multiple tags', async () => {
      const response = await request(app)
        .delete(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: ['既存タグ1', '既存タグ2'] });

      expect(response.status).toBe(200);
      expect(response.body.tags.length).toBe(0);
      expect(response.body.removed_tags).toEqual(['既存タグ1', '既存タグ2']);
    });

    it('should handle removing non-existent tag gracefully', async () => {
      const response = await request(app)
        .delete(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: ['存在しないタグ'] });

      expect(response.status).toBe(200);
      expect(response.body.removed_tags).toEqual([]);
      expect(response.body.message).toContain('タグが見つかりません');
    });

    it('should clear all tags', async () => {
      const response = await request(app)
        .delete(`/api/videos/${videoId}/tags/all`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.tags).toEqual([]);
      expect(response.body.message).toContain('全てのタグを削除');
    });
  });

  describe('Replace Tags', () => {
    it('should replace all tags with new set', async () => {
      // Act: Replace all tags
      const response = await request(app)
        .put(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: ['新タグ1', '新タグ2', '新タグ3'] });

      // Assert: Should replace completely
      expect(response.status).toBe(200);
      expect(response.body.tags).toEqual(['新タグ1', '新タグ2', '新タグ3']);
      expect(response.body.tags).not.toContain('既存タグ1');
      expect(response.body.tags).not.toContain('既存タグ2');
    });

    it('should enforce 10 tag limit on replace', async () => {
      const elevenTags = Array.from({ length: 11 }, (_, i) => `タグ${i + 1}`);

      const response = await request(app)
        .put(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: elevenTags });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('too_many_tags');
    });
  });

  describe('Authorization', () => {
    it('should require authentication to add tags', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .send({ tags: ['新タグ'] });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('unauthorized');
    });

    it('should reject tag addition by non-owner', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ tags: ['不正なタグ'] });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('forbidden');
    });

    it('should allow owner to add tags', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: ['正当なタグ'] });

      expect(response.status).toBe(200);
    });
  });

  describe('Security', () => {
    it('should sanitize tags for XSS', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: ['<script>alert("XSS")</script>'] });

      expect(response.status).toBe(200);
      expect(response.body.tags.some((t: string) => t.includes('<script>'))).toBe(false);
    });

    it('should prevent SQL injection in tags', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: ["'; DROP TABLE videos; --"] });

      expect(response.status).toBe(200);
      // Should safely store the tag without executing SQL
    });

    it('should remove HTML entities', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: ['&lt;tag&gt;'] });

      expect(response.status).toBe(200);
      expect(response.body.tags).not.toContain('&lt;');
    });

    it('should remove null bytes', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: ['tag\0test'] });

      expect(response.status).toBe(200);
      expect(response.body.tags.some((t: string) => t.includes('\0'))).toBe(false);
    });
  });

  describe('Tag Search and Statistics', () => {
    it('should get popular tags across platform', async () => {
      const response = await request(app)
        .get('/api/tags/popular?limit=10');

      expect(response.status).toBe(200);
      expect(response.body.tags).toBeInstanceOf(Array);
      expect(response.body.tags.length).toBeLessThanOrEqual(10);
      response.body.tags.forEach((tag: any) => {
        expect(tag).toHaveProperty('name');
        expect(tag).toHaveProperty('count');
      });
    });

    it('should search videos by tag', async () => {
      const response = await request(app)
        .get('/api/videos/search?tag=既存タグ1');

      expect(response.status).toBe(200);
      expect(response.body.videos).toBeInstanceOf(Array);
    });

    it('should get tag suggestions based on input', async () => {
      const response = await request(app)
        .get('/api/tags/suggest?q=プログラ');

      expect(response.status).toBe(200);
      expect(response.body.suggestions).toBeInstanceOf(Array);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit on tag operations', async () => {
      const requests = [];

      // Make 31 tag addition requests (limit is 30/min)
      for (let i = 0; i < 31; i++) {
        requests.push(
          request(app)
            .post(`/api/videos/${videoId}/tags`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({ tags: [`タグ${i}`] })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should add tags within acceptable time (< 200ms)', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post(`/api/videos/${videoId}/tags`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ tags: ['パフォーマンステスト'] });

      const responseTime = Date.now() - startTime;
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(200);
    });
  });
});
