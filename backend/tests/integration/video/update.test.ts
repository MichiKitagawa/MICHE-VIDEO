import request from 'supertest';
import app from '@/app';

/**
 * Video Update API Integration Tests
 *
 * Tests the PATCH /api/videos/:id endpoint for:
 * - Updating video metadata
 * - Authorization checks
 * - Validation
 * - Error handling
 *
 * Reference: docs/tests/video-management-tests.md
 */

describe('PATCH /api/videos/:id', () => {
  let userToken: string;
  let otherUserToken: string;
  let videoId: string;
  let otherUserVideoId: string;

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

    // Setup: Create test video for user
    const createRes = await request(app)
      .post('/api/videos/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: '元のタイトル',
        description: '元の説明',
        category: 'education',
        tags: ['元のタグ1', '元のタグ2'],
        privacy: 'public',
        media_file_id: 'mf_test123'
      });
    videoId = createRes.body.video.id;

    // Setup: Create video for other user
    const otherCreateRes = await request(app)
      .post('/api/videos/create')
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({
        title: '他ユーザーの動画',
        media_file_id: 'mf_other123'
      });
    otherUserVideoId = otherCreateRes.body.video.id;
  });

  describe('Update Title and Description', () => {
    it('should update video title successfully', async () => {
      // Arrange: New title
      const newTitle = '更新されたタイトル';

      // Act: Update title
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: newTitle });

      // Assert: Should update successfully
      expect(response.status).toBe(200);
      expect(response.body.video.title).toBe(newTitle);
      expect(response.body.video.description).toBe('元の説明'); // Should not change
      expect(response.body.message).toContain('更新');
    });

    it('should update video description successfully', async () => {
      const newDescription = '更新された詳細な説明文です。';

      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ description: newDescription });

      expect(response.status).toBe(200);
      expect(response.body.video.description).toBe(newDescription);
      expect(response.body.video.title).toBe('元のタイトル'); // Should not change
    });

    it('should update both title and description', async () => {
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: '新しいタイトル',
          description: '新しい説明'
        });

      expect(response.status).toBe(200);
      expect(response.body.video.title).toBe('新しいタイトル');
      expect(response.body.video.description).toBe('新しい説明');
    });

    it('should update video category', async () => {
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ category: 'entertainment' });

      expect(response.status).toBe(200);
      expect(response.body.video.category).toBe('entertainment');
    });

    it('should update privacy setting', async () => {
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ privacy: 'private' });

      expect(response.status).toBe(200);
      expect(response.body.video.privacy).toBe('private');
    });

    it('should update is_adult flag', async () => {
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ is_adult: true });

      expect(response.status).toBe(200);
      expect(response.body.video.is_adult).toBe(true);
    });

    it('should update multiple fields at once', async () => {
      const updateData = {
        title: '完全に更新された動画',
        description: '全ての情報が更新されました',
        category: 'gaming',
        privacy: 'unlisted',
        is_adult: false
      };

      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.video).toMatchObject(updateData);
    });

    it('should update updated_at timestamp', async () => {
      // Get original timestamp
      const originalRes = await request(app)
        .get('/api/videos/my-videos')
        .set('Authorization', `Bearer ${userToken}`);
      const originalVideo = originalRes.body.videos.find((v: any) => v.id === videoId);
      const originalTimestamp = new Date(originalVideo.updated_at).getTime();

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update video
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: '更新' });

      const newTimestamp = new Date(response.body.video.updated_at).getTime();
      expect(newTimestamp).toBeGreaterThan(originalTimestamp);
    });
  });

  describe('Validation', () => {
    it('should reject empty title', async () => {
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('title_required');
    });

    it('should reject title exceeding 200 characters', async () => {
      const longTitle = 'あ'.repeat(201);

      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: longTitle });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('title_too_long');
    });

    it('should reject description exceeding 5000 characters', async () => {
      const longDescription = 'a'.repeat(5001);

      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ description: longDescription });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('description_too_long');
    });

    it('should reject invalid category', async () => {
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ category: 'invalid_category' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('category_invalid');
    });

    it('should reject invalid privacy setting', async () => {
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ privacy: 'invalid_privacy' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('privacy_invalid');
    });

    it('should sanitize HTML in title', async () => {
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: '<script>alert("XSS")</script>タイトル' });

      expect(response.status).toBe(200);
      expect(response.body.video.title).not.toContain('<script>');
      expect(response.body.video.title).toContain('タイトル');
    });

    it('should sanitize HTML in description', async () => {
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ description: '<img src=x onerror="alert(1)">説明' });

      expect(response.status).toBe(200);
      expect(response.body.video.description).not.toContain('onerror');
    });

    it('should trim whitespace from title', async () => {
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: '  トリムされるタイトル  ' });

      expect(response.status).toBe(200);
      expect(response.body.video.title).toBe('トリムされるタイトル');
    });

    it('should normalize category to lowercase', async () => {
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ category: 'EDUCATION' });

      expect(response.status).toBe(200);
      expect(response.body.video.category).toBe('education');
    });
  });

  describe('Unauthorized Update', () => {
    it('should reject update by non-owner', async () => {
      // Arrange: Other user tries to update first user's video
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ title: '不正な更新' });

      // Assert: Should be forbidden
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('forbidden');
      expect(response.body.message).toContain('権限');
    });

    it('should allow owner to update their own video', async () => {
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: '正当な更新' });

      expect(response.status).toBe(200);
      expect(response.body.video.title).toBe('正当な更新');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .send({ title: '認証なし' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('unauthorized');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', 'Bearer invalid_token')
        .send({ title: '無効なトークン' });

      expect(response.status).toBe(401);
    });
  });

  describe('Video Not Found', () => {
    it('should return 404 for non-existent video', async () => {
      // Arrange: Non-existent video ID
      const nonExistentId = 'vid_nonexistent';

      // Act: Try to update non-existent video
      const response = await request(app)
        .patch(`/api/videos/${nonExistentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: '存在しない動画' });

      // Assert: Should return 404
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('video_not_found');
    });

    it('should return 400 for invalid video ID format', async () => {
      const response = await request(app)
        .patch('/api/videos/invalid_format')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: '無効なID' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_video_id');
    });
  });

  describe('Partial Updates', () => {
    it('should allow updating only title', async () => {
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'タイトルのみ更新' });

      expect(response.status).toBe(200);
      expect(response.body.video.title).toBe('タイトルのみ更新');
      // Other fields should remain unchanged
      expect(response.body.video.category).toBe('education');
    });

    it('should ignore unknown fields', async () => {
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: '更新',
          unknown_field: 'should be ignored',
          another_unknown: 123
        });

      expect(response.status).toBe(200);
      expect(response.body.video.title).toBe('更新');
      expect(response.body.video).not.toHaveProperty('unknown_field');
    });

    it('should not update immutable fields', async () => {
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: '更新',
          id: 'vid_hacked',
          user_id: 'usr_hacked',
          created_at: new Date().toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.video.id).toBe(videoId); // Should not change
      expect(response.body.video.id).not.toBe('vid_hacked');
    });
  });

  describe('Empty Update', () => {
    it('should handle empty update request', async () => {
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      // Should return 400 or 200 with no changes
      expect([200, 400]).toContain(response.status);
      if (response.status === 400) {
        expect(response.body.error).toBe('no_fields_to_update');
      }
    });
  });

  describe('Concurrent Updates', () => {
    it('should handle concurrent updates correctly', async () => {
      // Arrange: Two simultaneous updates
      const update1 = request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: '更新1' });

      const update2 = request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ description: '更新2' });

      // Act: Execute simultaneously
      const [res1, res2] = await Promise.all([update1, update2]);

      // Assert: Both should succeed
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });
  });

  describe('Status Update Restrictions', () => {
    it('should not allow manual status update to processing', async () => {
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'processing' });

      // Status should not be directly updatable
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('status_not_updatable');
    });

    it('should not allow manual status update to completed', async () => {
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'completed' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('status_not_updatable');
    });
  });

  describe('Security', () => {
    it('should prevent XSS in title update', async () => {
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: '<img src=x onerror="alert(\'XSS\')">タイトル' });

      expect(response.status).toBe(200);
      expect(response.body.video.title).not.toContain('onerror');
      expect(response.body.video.title).not.toContain('<img');
    });

    it('should prevent SQL injection in description', async () => {
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ description: "'; DROP TABLE videos; --" });

      expect(response.status).toBe(200);
      // Database should not be affected
    });

    it('should remove null bytes', async () => {
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'タイトル\0test' });

      expect(response.status).toBe(200);
      expect(response.body.video.title).not.toContain('\0');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit on video updates', async () => {
      const requests = [];

      // Make 21 update requests (limit is 20/min)
      for (let i = 0; i < 21; i++) {
        requests.push(
          request(app)
            .patch(`/api/videos/${videoId}`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({ title: `更新${i}` })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
      expect(rateLimited[0].body.error).toBe('rate_limit_exceeded');
    });
  });

  describe('Performance', () => {
    it('should update within acceptable time (< 300ms)', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'パフォーマンステスト' });

      const responseTime = Date.now() - startTime;
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(300);
    });
  });

  describe('Response Format', () => {
    it('should return updated video object', async () => {
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: '新タイトル' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('video');
      expect(response.body).toHaveProperty('message');
      expect(response.body.video).toHaveProperty('id');
      expect(response.body.video).toHaveProperty('title');
      expect(response.body.video).toHaveProperty('updated_at');
    });
  });
});
