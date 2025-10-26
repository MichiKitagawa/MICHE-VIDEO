import request from 'supertest';
import app from '@/app';

/**
 * Video Creation API Integration Tests
 *
 * Tests the POST /api/videos/create endpoint for:
 * - Successful video creation
 * - Validation of required fields
 * - Plan-based quality limits
 * - Duplicate detection
 * - Error handling
 *
 * Reference: docs/tests/video-management-tests.md
 */

describe('POST /api/videos/create', () => {
  let userToken: string;
  let premiumUserToken: string;
  let freeUserToken: string;
  let mediaFileId: string;

  beforeEach(async () => {
    // Setup: Login as regular user
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;

    // Setup: Login as premium user
    const premiumLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'premium@example.com', password: 'TestPass123!' });
    premiumUserToken = premiumLoginRes.body.access_token;

    // Setup: Login as free user
    const freeLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'free@example.com', password: 'TestPass123!' });
    freeUserToken = freeLoginRes.body.access_token;

    // Setup: Create a media file for testing
    const uploadRes = await request(app)
      .post('/api/upload/complete')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        upload_id: 'upld_test123',
        filename: 'test-video.mp4',
        filesize: 500 * 1024 * 1024
      });
    mediaFileId = uploadRes.body.media_file_id;
  });

  describe('Successful Video Creation', () => {
    it('should create video successfully with all required fields', async () => {
      // Arrange: Valid video creation data
      const videoData = {
        title: '素晴らしい動画タイトル',
        description: 'これは詳細な動画の説明です。',
        category: 'education',
        tags: ['プログラミング', 'TypeScript', 'Web開発'],
        privacy: 'public',
        is_adult: false,
        media_file_id: mediaFileId
      };

      // Act: Create video
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send(videoData);

      // Assert: Should create successfully
      expect(response.status).toBe(201);
      expect(response.body.video).toMatchObject({
        title: '素晴らしい動画タイトル',
        description: 'これは詳細な動画の説明です。',
        category: 'education',
        privacy: 'public',
        is_adult: false,
        status: 'processing'
      });
      expect(response.body.video.id).toBeDefined();
      expect(response.body.video.id).toMatch(/^vid_/);
      expect(response.body.video.user_id).toBeDefined();
      expect(response.body.video.created_at).toBeDefined();
      expect(response.body.video.tags).toEqual(['プログラミング', 'TypeScript', 'Web開発']);
    });

    it('should create video with minimal required fields', async () => {
      // Arrange: Minimal video data
      const videoData = {
        title: 'シンプルなタイトル',
        media_file_id: mediaFileId
      };

      // Act: Create video with defaults
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send(videoData);

      // Assert: Should use default values
      expect(response.status).toBe(201);
      expect(response.body.video.title).toBe('シンプルなタイトル');
      expect(response.body.video.description).toBe('');
      expect(response.body.video.category).toBe('other');
      expect(response.body.video.privacy).toBe('public');
      expect(response.body.video.is_adult).toBe(false);
      expect(response.body.video.tags).toEqual([]);
    });

    it('should create private video', async () => {
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: '非公開動画',
          privacy: 'private',
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(201);
      expect(response.body.video.privacy).toBe('private');
    });

    it('should create unlisted video', async () => {
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: '限定公開動画',
          privacy: 'unlisted',
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(201);
      expect(response.body.video.privacy).toBe('unlisted');
    });

    it('should create video with adult content flag', async () => {
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'アダルトコンテンツ',
          is_adult: true,
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(201);
      expect(response.body.video.is_adult).toBe(true);
    });

    it('should create video with Japanese title and description', async () => {
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: '日本語のタイトルテスト',
          description: 'これは日本語の説明文です。絵文字も使えます 🎬',
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(201);
      expect(response.body.video.title).toBe('日本語のタイトルテスト');
      expect(response.body.video.description).toContain('日本語');
    });

    it('should generate unique video ID for each creation', async () => {
      const response1 = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: '動画1',
          media_file_id: mediaFileId
        });

      const response2 = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: '動画2',
          media_file_id: mediaFileId
        });

      expect(response1.body.video.id).not.toBe(response2.body.video.id);
    });
  });

  describe('Missing Required Fields', () => {
    it('should reject video creation without media_file_id', async () => {
      // Arrange: Missing media_file_id
      const videoData = {
        title: 'タイトルのみ'
      };

      // Act: Attempt to create without media file
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send(videoData);

      // Assert: Should fail validation
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('validation_error');
      expect(response.body.message).toContain('media_file_id');
    });

    it('should reject video creation without title', async () => {
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('validation_error');
      expect(response.body.message).toContain('title');
    });

    it('should reject empty title', async () => {
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: '',
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('title_required');
    });

    it('should reject whitespace-only title', async () => {
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: '   ',
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('title_required');
    });
  });

  describe('Invalid Title Validation', () => {
    it('should reject title exceeding 200 characters', async () => {
      // Arrange: Title too long
      const longTitle = 'あ'.repeat(201);

      // Act: Attempt creation with long title
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: longTitle,
          media_file_id: mediaFileId
        });

      // Assert: Should reject
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('title_too_long');
      expect(response.body.message).toContain('200文字');
    });

    it('should accept title at exactly 200 characters', async () => {
      const maxTitle = 'a'.repeat(200);

      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: maxTitle,
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(201);
    });

    it('should sanitize HTML in title', async () => {
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: '<script>alert("XSS")</script>安全なタイトル',
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(201);
      expect(response.body.video.title).not.toContain('<script>');
      expect(response.body.video.title).toContain('安全なタイトル');
    });
  });

  describe('Invalid Description Validation', () => {
    it('should reject description exceeding 5000 characters', async () => {
      const longDescription = 'a'.repeat(5001);

      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'タイトル',
          description: longDescription,
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('description_too_long');
      expect(response.body.message).toContain('5000文字');
    });

    it('should accept description at exactly 5000 characters', async () => {
      const maxDescription = 'a'.repeat(5000);

      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'タイトル',
          description: maxDescription,
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(201);
    });

    it('should sanitize HTML in description', async () => {
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'タイトル',
          description: '<script>alert("XSS")</script>安全な説明',
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(201);
      expect(response.body.video.description).not.toContain('<script>');
    });
  });

  describe('Duplicate Detection', () => {
    it('should allow same title for different users', async () => {
      // Arrange: Create video with user1
      await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: '同じタイトル',
          media_file_id: mediaFileId
        });

      // Act: Create video with same title but different user
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${premiumUserToken}`)
        .send({
          title: '同じタイトル',
          media_file_id: mediaFileId
        });

      // Assert: Should allow (different users)
      expect(response.status).toBe(201);
    });

    it('should prevent duplicate media_file_id usage', async () => {
      // Arrange: Create first video
      await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: '最初の動画',
          media_file_id: mediaFileId
        });

      // Act: Attempt to create another video with same media_file_id
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: '二番目の動画',
          media_file_id: mediaFileId
        });

      // Assert: Should reject duplicate media file
      expect(response.status).toBe(409);
      expect(response.body.error).toBe('media_file_already_used');
    });
  });

  describe('Plan-Based Quality Limits', () => {
    it('should allow 4K quality for Premium users', async () => {
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${premiumUserToken}`)
        .send({
          title: '4K動画',
          max_quality: '4k',
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(201);
      expect(response.body.video.max_quality).toBe('4k');
    });

    it('should restrict Free users to 720p quality', async () => {
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({
          title: 'Free動画',
          max_quality: '4k', // Attempting 4K
          media_file_id: mediaFileId
        });

      // Should create but downgrade quality to 720p
      expect(response.status).toBe(201);
      expect(response.body.video.max_quality).toBe('720p');
      expect(response.body.warning).toContain('プランの制限');
    });

    it('should allow Basic users up to 1080p quality', async () => {
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`) // Basic user
        .send({
          title: '1080p動画',
          max_quality: '1080p',
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(201);
      expect(response.body.video.max_quality).toBe('1080p');
    });
  });

  describe('Invalid Category', () => {
    it('should reject invalid category', async () => {
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'タイトル',
          category: 'invalid_category',
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('category_invalid');
    });

    it('should normalize category to lowercase', async () => {
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'タイトル',
          category: 'EDUCATION',
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(201);
      expect(response.body.video.category).toBe('education');
    });
  });

  describe('Tag Validation', () => {
    it('should accept up to 10 tags', async () => {
      const tags = Array.from({ length: 10 }, (_, i) => `タグ${i + 1}`);

      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'タイトル',
          tags,
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(201);
      expect(response.body.video.tags).toHaveLength(10);
    });

    it('should reject more than 10 tags', async () => {
      const tags = Array.from({ length: 11 }, (_, i) => `タグ${i + 1}`);

      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'タイトル',
          tags,
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('too_many_tags');
      expect(response.body.message).toContain('10個');
    });

    it('should trim whitespace from tags', async () => {
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'タイトル',
          tags: ['  タグ1  ', '  タグ2  '],
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(201);
      expect(response.body.video.tags).toEqual(['タグ1', 'タグ2']);
    });

    it('should remove duplicate tags', async () => {
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'タイトル',
          tags: ['タグ1', 'タグ2', 'タグ1'],
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(201);
      expect(response.body.video.tags).toEqual(['タグ1', 'タグ2']);
    });

    it('should remove empty tags', async () => {
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'タイトル',
          tags: ['タグ1', '', '   ', 'タグ2'],
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(201);
      expect(response.body.video.tags).toEqual(['タグ1', 'タグ2']);
    });
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/videos/create')
        .send({
          title: 'タイトル',
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('unauthorized');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', 'Bearer invalid_token')
        .send({
          title: 'タイトル',
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(401);
    });

    it('should reject expired token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyX2lkIiwiZXhwIjoxfQ.invalid';

      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({
          title: 'タイトル',
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Security', () => {
    it('should prevent XSS in title', async () => {
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: '<img src=x onerror="alert(1)">タイトル',
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(201);
      expect(response.body.video.title).not.toContain('onerror');
      expect(response.body.video.title).not.toContain('<img');
    });

    it('should prevent SQL injection in title', async () => {
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: "'; DROP TABLE videos; --",
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(201);
      // Title should be sanitized
      expect(response.body.video.title).not.toContain('DROP TABLE');
    });

    it('should sanitize tags for XSS', async () => {
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'タイトル',
          tags: ['<script>alert(1)</script>'],
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(201);
      expect(response.body.video.tags[0]).not.toContain('<script>');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit for video creation', async () => {
      const requests = [];

      // Attempt to create 11 videos rapidly (limit is 10/hour)
      for (let i = 0; i < 11; i++) {
        requests.push(
          request(app)
            .post('/api/videos/create')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
              title: `動画${i}`,
              media_file_id: `mf_${i}`
            })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
      expect(rateLimited[0].body.error).toBe('rate_limit_exceeded');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Simulate database error by using invalid media_file_id format
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'タイトル',
          media_file_id: null
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should return detailed error for validation failures', async () => {
      const response = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: '',
          description: 'a'.repeat(5001),
          category: 'invalid',
          tags: Array(20).fill('tag'),
          media_file_id: mediaFileId
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(Array.isArray(response.body.errors)).toBe(true);
    });
  });
});
