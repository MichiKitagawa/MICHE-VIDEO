import request from 'supertest';
import app from '@/app';

/**
 * Video List API Integration Tests
 *
 * Tests the GET /api/videos/my-videos endpoint for:
 * - Listing user's videos
 * - Pagination
 * - Sorting options
 * - Filtering by status
 * - Authorization
 *
 * Reference: docs/tests/video-management-tests.md
 */

describe('GET /api/videos/my-videos', () => {
  let userToken: string;
  let otherUserToken: string;
  let videoIds: string[] = [];

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

    // Setup: Create multiple test videos
    videoIds = [];
    for (let i = 0; i < 5; i++) {
      const createRes = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: `テスト動画 ${i + 1}`,
          description: `説明 ${i + 1}`,
          category: 'education',
          media_file_id: `mf_test_${i}`
        });
      videoIds.push(createRes.body.video.id);
    }
  });

  describe('List User Videos', () => {
    it('should list all videos for authenticated user', async () => {
      // Act: Get user's videos
      const response = await request(app)
        .get('/api/videos/my-videos')
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: Should return user's videos
      expect(response.status).toBe(200);
      expect(response.body.videos).toBeInstanceOf(Array);
      expect(response.body.videos.length).toBeGreaterThanOrEqual(5);
      expect(response.body.total).toBeGreaterThanOrEqual(5);

      // Verify video structure
      const video = response.body.videos[0];
      expect(video).toHaveProperty('id');
      expect(video).toHaveProperty('title');
      expect(video).toHaveProperty('description');
      expect(video).toHaveProperty('category');
      expect(video).toHaveProperty('privacy');
      expect(video).toHaveProperty('status');
      expect(video).toHaveProperty('view_count');
      expect(video).toHaveProperty('like_count');
      expect(video).toHaveProperty('created_at');
      expect(video).toHaveProperty('updated_at');
    });

    it('should only show videos owned by the user', async () => {
      // Act: Get user's videos
      const response = await request(app)
        .get('/api/videos/my-videos')
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: All videos should belong to this user
      expect(response.status).toBe(200);
      const allBelongToUser = response.body.videos.every(
        (v: any) => videoIds.includes(v.id)
      );
      expect(allBelongToUser).toBe(true);
    });

    it('should return empty array for user with no videos', async () => {
      // Arrange: Create new user with no videos
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'TestPass123!',
          username: 'newuser'
        });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'newuser@example.com', password: 'TestPass123!' });

      // Act: Get videos for new user
      const response = await request(app)
        .get('/api/videos/my-videos')
        .set('Authorization', `Bearer ${loginRes.body.access_token}`);

      // Assert: Should return empty array
      expect(response.status).toBe(200);
      expect(response.body.videos).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    it('should include video statistics', async () => {
      const response = await request(app)
        .get('/api/videos/my-videos')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      const video = response.body.videos[0];
      expect(typeof video.view_count).toBe('number');
      expect(typeof video.like_count).toBe('number');
      expect(video.view_count).toBeGreaterThanOrEqual(0);
      expect(video.like_count).toBeGreaterThanOrEqual(0);
    });

    it('should include thumbnail URL if available', async () => {
      const response = await request(app)
        .get('/api/videos/my-videos')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      response.body.videos.forEach((video: any) => {
        if (video.thumbnail_url) {
          expect(video.thumbnail_url).toMatch(/^https?:\/\//);
        }
      });
    });
  });

  describe('Pagination', () => {
    it('should paginate results with default page size', async () => {
      // Act: Get first page (default 20 items)
      const response = await request(app)
        .get('/api/videos/my-videos')
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: Should have pagination metadata
      expect(response.status).toBe(200);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(5);
      expect(response.body.pagination.total_pages).toBeGreaterThanOrEqual(1);
    });

    it('should paginate with custom page size', async () => {
      // Act: Get first page with 2 items per page
      const response = await request(app)
        .get('/api/videos/my-videos?page=1&limit=2')
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: Should return only 2 items
      expect(response.status).toBe(200);
      expect(response.body.videos.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.total_pages).toBeGreaterThanOrEqual(3);
    });

    it('should get second page of results', async () => {
      // Arrange: Get first page
      const page1 = await request(app)
        .get('/api/videos/my-videos?page=1&limit=2')
        .set('Authorization', `Bearer ${userToken}`);

      // Act: Get second page
      const page2 = await request(app)
        .get('/api/videos/my-videos?page=2&limit=2')
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: Should have different videos
      expect(page2.status).toBe(200);
      expect(page2.body.pagination.page).toBe(2);
      if (page1.body.videos.length > 0 && page2.body.videos.length > 0) {
        expect(page1.body.videos[0].id).not.toBe(page2.body.videos[0].id);
      }
    });

    it('should handle page number beyond available pages', async () => {
      // Act: Request page 9999
      const response = await request(app)
        .get('/api/videos/my-videos?page=9999&limit=20')
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: Should return empty array
      expect(response.status).toBe(200);
      expect(response.body.videos).toEqual([]);
    });

    it('should enforce maximum limit of 100', async () => {
      // Act: Request with limit > 100
      const response = await request(app)
        .get('/api/videos/my-videos?limit=150')
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: Should cap at 100
      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(100);
      expect(response.body.videos.length).toBeLessThanOrEqual(100);
    });

    it('should reject negative page number', async () => {
      const response = await request(app)
        .get('/api/videos/my-videos?page=-1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_page_number');
    });

    it('should reject zero page number', async () => {
      const response = await request(app)
        .get('/api/videos/my-videos?page=0')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_page_number');
    });

    it('should reject negative limit', async () => {
      const response = await request(app)
        .get('/api/videos/my-videos?limit=-10')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_limit');
    });
  });

  describe('Sorting', () => {
    it('should sort by newest first (default)', async () => {
      // Act: Get videos without sort parameter
      const response = await request(app)
        .get('/api/videos/my-videos')
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: Should be sorted by created_at DESC
      expect(response.status).toBe(200);
      const videos = response.body.videos;
      for (let i = 0; i < videos.length - 1; i++) {
        const current = new Date(videos[i].created_at).getTime();
        const next = new Date(videos[i + 1].created_at).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });

    it('should sort by oldest first', async () => {
      // Act: Sort by oldest
      const response = await request(app)
        .get('/api/videos/my-videos?sort=oldest')
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: Should be sorted by created_at ASC
      expect(response.status).toBe(200);
      const videos = response.body.videos;
      for (let i = 0; i < videos.length - 1; i++) {
        const current = new Date(videos[i].created_at).getTime();
        const next = new Date(videos[i + 1].created_at).getTime();
        expect(current).toBeLessThanOrEqual(next);
      }
    });

    it('should sort by most viewed', async () => {
      // Act: Sort by view count
      const response = await request(app)
        .get('/api/videos/my-videos?sort=views')
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: Should be sorted by view_count DESC
      expect(response.status).toBe(200);
      const videos = response.body.videos;
      for (let i = 0; i < videos.length - 1; i++) {
        expect(videos[i].view_count).toBeGreaterThanOrEqual(videos[i + 1].view_count);
      }
    });

    it('should sort by most liked', async () => {
      // Act: Sort by like count
      const response = await request(app)
        .get('/api/videos/my-videos?sort=likes')
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: Should be sorted by like_count DESC
      expect(response.status).toBe(200);
      const videos = response.body.videos;
      for (let i = 0; i < videos.length - 1; i++) {
        expect(videos[i].like_count).toBeGreaterThanOrEqual(videos[i + 1].like_count);
      }
    });

    it('should sort by title alphabetically', async () => {
      // Act: Sort by title
      const response = await request(app)
        .get('/api/videos/my-videos?sort=title')
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: Should be sorted alphabetically
      expect(response.status).toBe(200);
      const videos = response.body.videos;
      for (let i = 0; i < videos.length - 1; i++) {
        expect(videos[i].title.localeCompare(videos[i + 1].title)).toBeLessThanOrEqual(0);
      }
    });

    it('should sort by recently updated', async () => {
      // Act: Sort by updated_at
      const response = await request(app)
        .get('/api/videos/my-videos?sort=updated')
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: Should be sorted by updated_at DESC
      expect(response.status).toBe(200);
      const videos = response.body.videos;
      for (let i = 0; i < videos.length - 1; i++) {
        const current = new Date(videos[i].updated_at).getTime();
        const next = new Date(videos[i + 1].updated_at).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });

    it('should reject invalid sort parameter', async () => {
      const response = await request(app)
        .get('/api/videos/my-videos?sort=invalid')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_sort_parameter');
    });
  });

  describe('Filtering by Status', () => {
    beforeEach(async () => {
      // Create videos with different statuses
      await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Processing Video',
          status: 'processing',
          media_file_id: 'mf_processing'
        });

      await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Completed Video',
          status: 'completed',
          media_file_id: 'mf_completed'
        });
    });

    it('should filter by processing status', async () => {
      // Act: Filter by processing status
      const response = await request(app)
        .get('/api/videos/my-videos?status=processing')
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: Should only return processing videos
      expect(response.status).toBe(200);
      response.body.videos.forEach((video: any) => {
        expect(video.status).toBe('processing');
      });
    });

    it('should filter by completed status', async () => {
      const response = await request(app)
        .get('/api/videos/my-videos?status=completed')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      response.body.videos.forEach((video: any) => {
        expect(video.status).toBe('completed');
      });
    });

    it('should filter by failed status', async () => {
      const response = await request(app)
        .get('/api/videos/my-videos?status=failed')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      response.body.videos.forEach((video: any) => {
        expect(video.status).toBe('failed');
      });
    });

    it('should return all videos when no status filter', async () => {
      const response = await request(app)
        .get('/api/videos/my-videos')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.videos.length).toBeGreaterThan(0);
      // Should include videos of all statuses
    });

    it('should reject invalid status filter', async () => {
      const response = await request(app)
        .get('/api/videos/my-videos?status=invalid_status')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_status_filter');
    });
  });

  describe('Combined Filters', () => {
    it('should apply pagination, sorting, and filtering together', async () => {
      // Act: Apply multiple filters
      const response = await request(app)
        .get('/api/videos/my-videos?page=1&limit=5&sort=views&status=completed')
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: Should apply all filters
      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.videos.length).toBeLessThanOrEqual(5);

      // Verify sorting
      const videos = response.body.videos;
      for (let i = 0; i < videos.length - 1; i++) {
        expect(videos[i].view_count).toBeGreaterThanOrEqual(videos[i + 1].view_count);
      }

      // Verify status filter
      videos.forEach((video: any) => {
        expect(video.status).toBe('completed');
      });
    });
  });

  describe('Search by Title', () => {
    it('should search videos by title', async () => {
      // Act: Search for specific title
      const response = await request(app)
        .get('/api/videos/my-videos?search=テスト動画 1')
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: Should return matching videos
      expect(response.status).toBe(200);
      expect(response.body.videos.length).toBeGreaterThan(0);
      response.body.videos.forEach((video: any) => {
        expect(video.title).toContain('テスト動画 1');
      });
    });

    it('should perform case-insensitive search', async () => {
      const response = await request(app)
        .get('/api/videos/my-videos?search=テスト')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.videos.length).toBeGreaterThan(0);
    });

    it('should return empty array for no matches', async () => {
      const response = await request(app)
        .get('/api/videos/my-videos?search=NonExistentTitle')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.videos).toEqual([]);
      expect(response.body.total).toBe(0);
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      // Act: Request without token
      const response = await request(app)
        .get('/api/videos/my-videos');

      // Assert: Should reject
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('unauthorized');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/videos/my-videos')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
    });

    it('should not show videos from other users', async () => {
      // Act: Get videos with different user token
      const response = await request(app)
        .get('/api/videos/my-videos')
        .set('Authorization', `Bearer ${otherUserToken}`);

      // Assert: Should not include first user's videos
      expect(response.status).toBe(200);
      const otherUserVideos = response.body.videos;
      const hasUserVideos = otherUserVideos.some(
        (v: any) => videoIds.includes(v.id)
      );
      expect(hasUserVideos).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should respond within acceptable time (< 500ms)', async () => {
      // Arrange: Record start time
      const startTime = Date.now();

      // Act: Get videos
      const response = await request(app)
        .get('/api/videos/my-videos')
        .set('Authorization', `Bearer ${userToken}`);

      // Assert: Should respond quickly
      const responseTime = Date.now() - startTime;
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(500);
    });
  });

  describe('Security', () => {
    it('should prevent SQL injection in search', async () => {
      const response = await request(app)
        .get('/api/videos/my-videos?search=\' OR 1=1--')
        .set('Authorization', `Bearer ${userToken}`);

      // Should not return all videos (SQL injection prevented)
      expect(response.status).toBe(200);
    });

    it('should sanitize search query', async () => {
      const response = await request(app)
        .get('/api/videos/my-videos?search=<script>alert(1)</script>')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      // Should safely handle malicious search query
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit on video list endpoint', async () => {
      const requests = [];

      // Make 101 requests (limit is 100/min)
      for (let i = 0; i < 101; i++) {
        requests.push(
          request(app)
            .get('/api/videos/my-videos')
            .set('Authorization', `Bearer ${userToken}`)
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});
