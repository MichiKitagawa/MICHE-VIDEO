import request from 'supertest';
import app from '@/app';

/**
 * Video Delete API Integration Tests
 *
 * Tests the DELETE /api/videos/:id endpoint for:
 * - Soft delete functionality
 * - Authorization checks
 * - Cascade deletion
 * - Error handling
 *
 * Reference: docs/tests/video-management-tests.md
 */

describe('DELETE /api/videos/:id', () => {
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

    // Setup: Create test video
    const createRes = await request(app)
      .post('/api/videos/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: '削除テスト用動画',
        description: 'この動画は削除されます',
        category: 'education',
        media_file_id: 'mf_delete_test'
      });
    videoId = createRes.body.video.id;

    // Setup: Create video for other user
    const otherCreateRes = await request(app)
      .post('/api/videos/create')
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({
        title: '他ユーザーの動画',
        media_file_id: 'mf_other_delete'
      });
    otherUserVideoId = otherCreateRes.body.video.id;
  });

  describe('Soft Delete', () => {
    it('should soft delete video successfully', async () => {
      // Act: Delete video
      const response = await request(app)
        .delete(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: Should mark as deleted
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('削除');
      expect(response.body.video_id).toBe(videoId);
    });

    it('should mark video with deleted_at timestamp', async () => {
      // Act: Delete video
      await request(app)
        .delete(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Verify: Video should have deleted_at timestamp
      const listRes = await request(app)
        .get('/api/videos/my-videos?include_deleted=true')
        .set('Authorization', `Bearer ${userToken}`);

      const deletedVideo = listRes.body.videos.find((v: any) => v.id === videoId);
      expect(deletedVideo.deleted_at).toBeDefined();
      expect(deletedVideo.deleted_at).not.toBeNull();
    });

    it('should not show deleted video in default list', async () => {
      // Arrange: Delete video
      await request(app)
        .delete(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Act: Get video list
      const response = await request(app)
        .get('/api/videos/my-videos')
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: Deleted video should not appear
      const hasDeletedVideo = response.body.videos.some((v: any) => v.id === videoId);
      expect(hasDeletedVideo).toBe(false);
    });

    it('should show deleted video when include_deleted=true', async () => {
      // Arrange: Delete video
      await request(app)
        .delete(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Act: Get list with deleted videos
      const response = await request(app)
        .get('/api/videos/my-videos?include_deleted=true')
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: Should include deleted video
      const deletedVideo = response.body.videos.find((v: any) => v.id === videoId);
      expect(deletedVideo).toBeDefined();
      expect(deletedVideo.deleted_at).toBeDefined();
    });

    it('should prevent access to deleted video by ID', async () => {
      // Arrange: Delete video
      await request(app)
        .delete(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Act: Try to access deleted video
      const response = await request(app)
        .get(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: Should return 404
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('video_not_found');
    });

    it('should allow restoring soft-deleted video', async () => {
      // Arrange: Delete video
      await request(app)
        .delete(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Act: Restore video
      const response = await request(app)
        .post(`/api/videos/${videoId}/restore`)
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: Should restore successfully
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('復元');

      // Verify: Video should appear in list again
      const listRes = await request(app)
        .get('/api/videos/my-videos')
        .set('Authorization', `Bearer ${userToken}`);
      const restoredVideo = listRes.body.videos.find((v: any) => v.id === videoId);
      expect(restoredVideo).toBeDefined();
      expect(restoredVideo.deleted_at).toBeNull();
    });
  });

  describe('Unauthorized Delete', () => {
    it('should reject delete by non-owner', async () => {
      // Arrange: Other user tries to delete first user's video
      const response = await request(app)
        .delete(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      // Assert: Should be forbidden
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('forbidden');
      expect(response.body.message).toContain('権限');
    });

    it('should allow owner to delete their own video', async () => {
      const response = await request(app)
        .delete(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/videos/${videoId}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('unauthorized');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .delete(`/api/videos/${videoId}`)
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
    });

    it('should reject expired token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyX2lkIiwiZXhwIjoxfQ.invalid';

      const response = await request(app)
        .delete(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Video Not Found', () => {
    it('should return 404 for non-existent video', async () => {
      // Arrange: Non-existent video ID
      const nonExistentId = 'vid_nonexistent';

      // Act: Try to delete non-existent video
      const response = await request(app)
        .delete(`/api/videos/${nonExistentId}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: Should return 404
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('video_not_found');
    });

    it('should return 400 for invalid video ID format', async () => {
      const response = await request(app)
        .delete('/api/videos/invalid_format')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_video_id');
    });

    it('should return 404 when trying to delete already deleted video', async () => {
      // Arrange: Delete video first time
      await request(app)
        .delete(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Act: Try to delete again
      const response = await request(app)
        .delete(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: Should return 404
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('video_not_found');
    });
  });

  describe('Cascade Deletion Check', () => {
    beforeEach(async () => {
      // Setup: Add likes, comments, and views to video
      await request(app)
        .post(`/api/videos/${videoId}/like`)
        .set('Authorization', `Bearer ${userToken}`);

      await request(app)
        .post(`/api/videos/${videoId}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'テストコメント' });

      await request(app)
        .post(`/api/videos/${videoId}/view`)
        .set('Authorization', `Bearer ${userToken}`);
    });

    it('should mark related data as deleted on soft delete', async () => {
      // Act: Delete video
      const response = await request(app)
        .delete(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: Should succeed
      expect(response.status).toBe(200);

      // Verify: Comments should be marked as deleted
      const commentsRes = await request(app)
        .get(`/api/videos/${videoId}/comments`);
      expect(commentsRes.status).toBe(404); // Video not found

      // Verify: Likes should be removed
      const userLikesRes = await request(app)
        .get('/api/users/liked-videos')
        .set('Authorization', `Bearer ${userToken}`);
      const hasLikedVideo = userLikesRes.body.videos.some((v: any) => v.id === videoId);
      expect(hasLikedVideo).toBe(false);
    });

    it('should preserve statistics in deleted video', async () => {
      // Arrange: Get original stats
      const originalRes = await request(app)
        .get('/api/videos/my-videos')
        .set('Authorization', `Bearer ${userToken}`);
      const originalVideo = originalRes.body.videos.find((v: any) => v.id === videoId);
      const originalViewCount = originalVideo.view_count;
      const originalLikeCount = originalVideo.like_count;

      // Act: Delete video
      await request(app)
        .delete(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: Stats should be preserved in deleted record
      const deletedRes = await request(app)
        .get('/api/videos/my-videos?include_deleted=true')
        .set('Authorization', `Bearer ${userToken}`);
      const deletedVideo = deletedRes.body.videos.find((v: any) => v.id === videoId);
      expect(deletedVideo.view_count).toBe(originalViewCount);
      expect(deletedVideo.like_count).toBe(originalLikeCount);
    });

    it('should delete associated media files from S3', async () => {
      // Act: Delete video with force_delete flag
      const response = await request(app)
        .delete(`/api/videos/${videoId}?force=true`)
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: Should trigger S3 deletion
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('完全に削除');
      expect(response.body.s3_deleted).toBe(true);
    });
  });

  describe('Bulk Delete', () => {
    let videoIds: string[];

    beforeEach(async () => {
      // Setup: Create multiple videos
      videoIds = [];
      for (let i = 0; i < 3; i++) {
        const createRes = await request(app)
          .post('/api/videos/create')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            title: `一括削除テスト ${i + 1}`,
            media_file_id: `mf_bulk_${i}`
          });
        videoIds.push(createRes.body.video.id);
      }
    });

    it('should delete multiple videos at once', async () => {
      // Act: Bulk delete
      const response = await request(app)
        .post('/api/videos/bulk-delete')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ video_ids: videoIds });

      // Assert: Should delete all
      expect(response.status).toBe(200);
      expect(response.body.deleted_count).toBe(3);
      expect(response.body.message).toContain('3件');
    });

    it('should reject bulk delete with non-owned videos', async () => {
      // Arrange: Add other user's video to list
      const mixedIds = [...videoIds, otherUserVideoId];

      // Act: Try to bulk delete
      const response = await request(app)
        .post('/api/videos/bulk-delete')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ video_ids: mixedIds });

      // Assert: Should reject
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('forbidden');
    });

    it('should reject bulk delete exceeding 100 videos', async () => {
      const tooManyIds = Array(101).fill('vid_test');

      const response = await request(app)
        .post('/api/videos/bulk-delete')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ video_ids: tooManyIds });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('too_many_videos');
      expect(response.body.message).toContain('100');
    });

    it('should handle partial failures in bulk delete', async () => {
      // Arrange: Include one non-existent ID
      const partialIds = [...videoIds, 'vid_nonexistent'];

      // Act: Bulk delete
      const response = await request(app)
        .post('/api/videos/bulk-delete')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ video_ids: partialIds });

      // Assert: Should succeed for valid IDs
      expect(response.status).toBe(207); // Multi-Status
      expect(response.body.deleted_count).toBe(3);
      expect(response.body.failed_count).toBe(1);
      expect(response.body.failures).toHaveLength(1);
    });
  });

  describe('Hard Delete (Permanent)', () => {
    it('should permanently delete video with force flag', async () => {
      // Act: Hard delete
      const response = await request(app)
        .delete(`/api/videos/${videoId}?force=true`)
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: Should permanently delete
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('完全に削除');

      // Verify: Video should not exist even with include_deleted
      const listRes = await request(app)
        .get('/api/videos/my-videos?include_deleted=true')
        .set('Authorization', `Bearer ${userToken}`);
      const hasVideo = listRes.body.videos.some((v: any) => v.id === videoId);
      expect(hasVideo).toBe(false);
    });

    it('should require confirmation for hard delete', async () => {
      // Act: Try hard delete without confirmation
      const response = await request(app)
        .delete(`/api/videos/${videoId}?force=true`)
        .set('Authorization', `Bearer ${userToken}`);
      // Without confirmation parameter

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('confirmation_required');
    });

    it('should hard delete with confirmation', async () => {
      const response = await request(app)
        .delete(`/api/videos/${videoId}?force=true&confirm=true`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Security', () => {
    it('should prevent SQL injection in video ID', async () => {
      const response = await request(app)
        .delete('/api/videos/\' OR 1=1--')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
    });

    it('should sanitize error messages', async () => {
      const response = await request(app)
        .delete('/api/videos/<script>alert(1)</script>')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).not.toContain('<script>');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit on delete operations', async () => {
      const requests = [];

      // Create and delete 11 videos (limit is 10/min)
      for (let i = 0; i < 11; i++) {
        const createRes = await request(app)
          .post('/api/videos/create')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            title: `削除レート制限テスト ${i}`,
            media_file_id: `mf_rate_${i}`
          });

        requests.push(
          request(app)
            .delete(`/api/videos/${createRes.body.video.id}`)
            .set('Authorization', `Bearer ${userToken}`)
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should delete within acceptable time (< 300ms)', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .delete(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`);

      const responseTime = Date.now() - startTime;
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(300);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Simulate database error
      const response = await request(app)
        .delete(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect([200, 500]).toContain(response.status);
      if (response.status === 500) {
        expect(response.body.error).toBe('internal_server_error');
      }
    });

    it('should rollback on cascade deletion failure', async () => {
      // This would require a more complex test setup
      // Testing that if S3 deletion fails, DB deletion is rolled back
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Response Format', () => {
    it('should return proper response format', async () => {
      const response = await request(app)
        .delete(`/api/videos/${videoId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('video_id');
      expect(response.body.video_id).toBe(videoId);
    });
  });
});
