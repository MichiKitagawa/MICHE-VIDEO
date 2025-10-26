import request from 'supertest';
import app from '@/app';

/**
 * Short Creation API Integration Tests
 *
 * Tests the POST /api/shorts/create endpoint for:
 * - Successful short creation with metadata
 * - Duration validation (max 60 seconds)
 * - Title and description validation
 * - Tag normalization and validation
 * - Privacy settings
 * - Creator permission enforcement
 * - Category validation
 *
 * Reference: docs/tests/short-management-tests.md
 */

describe('POST /api/shorts/create', () => {
  let accessToken: string;
  let nonCreatorToken: string;
  let premiumPlusToken: string;
  let mediaFileId: string;

  beforeEach(async () => {
    // Setup: Login as creator user
    const creatorLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    accessToken = creatorLogin.body.access_token;

    // Setup: Login as non-creator user
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    nonCreatorToken = userLogin.body.access_token;

    // Setup: Login as Premium+ user
    const premiumLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'premium-plus@example.com', password: 'TestPass123!' });
    premiumPlusToken = premiumLogin.body.access_token;

    // Setup: Upload a video file for testing
    const uploadRes = await request(app)
      .post('/api/upload/complete')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        upload_id: 'upld_short_test',
        filename: 'short-video-30s.mp4',
        filesize: 50 * 1024 * 1024, // 50MB
        duration: 30
      });
    mediaFileId = uploadRes.body.media_file_id;
  });

  describe('Successful Short Creation', () => {
    it('should create short successfully', async () => {
      // Arrange: Valid short data
      const shortData = {
        title: '素晴らしいショート動画',
        description: '踊ってみた!',
        category: 'dance',
        tags: ['ダンス', '踊ってみた', 'TikTok'],
        privacy: 'public',
        is_adult: false,
        video_file: mediaFileId
      };

      // Act: Create short
      const response = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(shortData);

      // Assert: Should create successfully
      expect(response.status).toBe(201);
      expect(response.body.short).toBeDefined();
      expect(response.body.short.id).toMatch(/^short_/);
      expect(response.body.short.title).toBe('素晴らしいショート動画');
      expect(response.body.short.description).toBe('踊ってみた!');
      expect(response.body.short.category).toBe('dance');
      expect(response.body.short.tags).toEqual(expect.arrayContaining(['ダンス', '踊ってみた', 'tiktok']));
      expect(response.body.short.privacy).toBe('public');
      expect(response.body.short.status).toBe('processing');
      expect(response.body.upload_status.status).toBe('processing');
    });

    it('should create short with minimal fields', async () => {
      const response = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'シンプルショート',
          video_file: mediaFileId
        });

      expect(response.status).toBe(201);
      expect(response.body.short.title).toBe('シンプルショート');
      expect(response.body.short.privacy).toBe('public'); // Default
      expect(response.body.short.is_adult).toBe(false); // Default
    });

    it('should create private short', async () => {
      const response = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: '非公開ショート',
          privacy: 'private',
          video_file: mediaFileId
        });

      expect(response.status).toBe(201);
      expect(response.body.short.privacy).toBe('private');
    });

    it('should create unlisted short', async () => {
      const response = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: '限定公開ショート',
          privacy: 'unlisted',
          video_file: mediaFileId
        });

      expect(response.status).toBe(201);
      expect(response.body.short.privacy).toBe('unlisted');
    });

    it('should generate unique short IDs', async () => {
      const response1 = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'ショート1',
          video_file: mediaFileId
        });

      const response2 = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'ショート2',
          video_file: 'mf_different'
        });

      expect(response1.body.short.id).not.toBe(response2.body.short.id);
    });
  });

  describe('Duration Validation', () => {
    it('should reject short over 60 seconds', async () => {
      // Arrange: Video file with 75 second duration
      const longMediaFile = await request(app)
        .post('/api/upload/complete')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          upload_id: 'upld_long',
          filename: 'long-video.mp4',
          filesize: 80 * 1024 * 1024,
          duration: 75
        });

      // Act: Attempt to create short with long video
      const response = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Test Short',
          video_file: longMediaFile.body.media_file_id
        });

      // Assert: Should reject
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('duration_too_long');
      expect(response.body.message).toContain('60秒');
    });

    it('should accept short at exactly 60 seconds', async () => {
      const maxMediaFile = await request(app)
        .post('/api/upload/complete')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          upload_id: 'upld_max',
          filename: 'max-video.mp4',
          filesize: 70 * 1024 * 1024,
          duration: 60
        });

      const response = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: '60秒ショート',
          video_file: maxMediaFile.body.media_file_id
        });

      expect(response.status).toBe(201);
      expect(response.body.short.duration).toBe(60);
    });

    it('should accept 15 second short (Instagram Reels format)', async () => {
      const shortMediaFile = await request(app)
        .post('/api/upload/complete')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          upload_id: 'upld_15s',
          filename: 'short-15s.mp4',
          filesize: 20 * 1024 * 1024,
          duration: 15
        });

      const response = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: '15秒ショート',
          video_file: shortMediaFile.body.media_file_id
        });

      expect(response.status).toBe(201);
      expect(response.body.short.duration).toBe(15);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication', async () => {
      // Act: Attempt without token
      const response = await request(app)
        .post('/api/shorts/create')
        .send({
          title: 'Test Short',
          video_file: mediaFileId
        });

      // Assert: Should reject
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('unauthorized');
    });

    it('should require creator permissions', async () => {
      // Act: Attempt with non-creator token
      const response = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${nonCreatorToken}`)
        .send({
          title: 'Test Short',
          video_file: mediaFileId
        });

      // Assert: Should reject
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('forbidden');
      expect(response.body.message).toContain('クリエイター権限');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', 'Bearer invalid_token')
        .send({
          title: 'Test Short',
          video_file: mediaFileId
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Title Validation', () => {
    it('should validate title length', async () => {
      // Arrange: Title exceeding 200 characters
      const longTitle = 'あ'.repeat(201);

      // Act: Attempt creation
      const response = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: longTitle,
          video_file: mediaFileId
        });

      // Assert: Should reject
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('title_too_long');
      expect(response.body.message).toContain('200文字');
    });

    it('should require title', async () => {
      const response = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          video_file: mediaFileId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('validation_error');
      expect(response.body.message).toContain('title');
    });

    it('should reject empty title', async () => {
      const response = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: '',
          video_file: mediaFileId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('title_required');
    });

    it('should sanitize HTML in title', async () => {
      const response = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: '<script>alert("XSS")</script>安全なタイトル',
          video_file: mediaFileId
        });

      expect(response.status).toBe(201);
      expect(response.body.short.title).not.toContain('<script>');
      expect(response.body.short.title).toContain('安全なタイトル');
    });
  });

  describe('Category Validation', () => {
    it('should reject invalid category', async () => {
      // Act: Use invalid category
      const response = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Test Short',
          category: 'invalid_category',
          video_file: mediaFileId
        });

      // Assert: Should reject
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('category_invalid');
      expect(response.body.message).toContain('カテゴリ');
    });

    it('should accept valid categories', async () => {
      const validCategories = ['dance', 'comedy', 'beauty', 'gaming', 'food', 'music'];

      for (const category of validCategories) {
        const response = await request(app)
          .post('/api/shorts/create')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            title: `${category} short`,
            category,
            video_file: `mf_${category}`
          });

        expect(response.status).toBe(201);
        expect(response.body.short.category).toBe(category);
      }
    });

    it('should normalize category to lowercase', async () => {
      const response = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Test',
          category: 'DANCE',
          video_file: mediaFileId
        });

      expect(response.status).toBe(201);
      expect(response.body.short.category).toBe('dance');
    });
  });

  describe('Tag Validation', () => {
    it('should normalize and deduplicate tags', async () => {
      // Arrange: Tags with duplicates and mixed case
      const response = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'タグテスト',
          tags: ['Dance', 'dance', 'DANCE', 'Music'],
          video_file: mediaFileId
        });

      // Assert: Should normalize
      expect(response.status).toBe(201);
      expect(response.body.short.tags).toEqual(['dance', 'music']);
    });

    it('should reject more than 10 tags', async () => {
      const tags = Array(12).fill('tag').map((t, i) => `${t}${i}`);

      const response = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'タグ多すぎ',
          tags,
          video_file: mediaFileId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('too_many_tags');
    });

    it('should filter empty tags', async () => {
      const response = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Test',
          tags: ['valid', '', '  ', 'another'],
          video_file: mediaFileId
        });

      expect(response.status).toBe(201);
      expect(response.body.short.tags).toEqual(['valid', 'another']);
    });

    it('should sanitize XSS in tags', async () => {
      const response = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Test',
          tags: ['<script>alert(1)</script>', 'normal'],
          video_file: mediaFileId
        });

      expect(response.status).toBe(201);
      response.body.short.tags.forEach((tag: string) => {
        expect(tag).not.toContain('<script>');
      });
    });
  });

  describe('Privacy Settings', () => {
    it('should default to public privacy', async () => {
      const response = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'デフォルト設定',
          video_file: mediaFileId
        });

      expect(response.status).toBe(201);
      expect(response.body.short.privacy).toBe('public');
    });

    it('should accept all valid privacy settings', async () => {
      const privacySettings = ['public', 'private', 'unlisted'];

      for (const privacy of privacySettings) {
        const response = await request(app)
          .post('/api/shorts/create')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            title: `${privacy} short`,
            privacy,
            video_file: `mf_${privacy}`
          });

        expect(response.status).toBe(201);
        expect(response.body.short.privacy).toBe(privacy);
      }
    });

    it('should reject invalid privacy setting', async () => {
      const response = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Test',
          privacy: 'invalid',
          video_file: mediaFileId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('privacy_invalid');
    });
  });

  describe('Security', () => {
    it('should prevent XSS in description', async () => {
      const response = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Test',
          description: '<img src=x onerror="alert(1)">説明文',
          video_file: mediaFileId
        });

      expect(response.status).toBe(201);
      expect(response.body.short.description).not.toContain('onerror');
    });

    it('should prevent SQL injection in title', async () => {
      const response = await request(app)
        .post('/api/shorts/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: "'; DROP TABLE shorts; --",
          video_file: mediaFileId
        });

      expect(response.status).toBe(201);
      expect(response.body.short.title).not.toContain('DROP TABLE');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce daily short upload limit', async () => {
      // Arrange: Attempt to create 101 shorts (limit is 100/day for Premium+)
      const promises = [];

      for (let i = 0; i < 101; i++) {
        promises.push(
          request(app)
            .post('/api/shorts/create')
            .set('Authorization', `Bearer ${premiumPlusToken}`)
            .send({
              title: `Short ${i}`,
              video_file: `mf_${i}`
            })
        );
      }

      // Act: Execute all requests
      const responses = await Promise.all(promises);

      // Assert: Some should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
      expect(rateLimited[0].body.error).toBe('rate_limit_exceeded');
      expect(rateLimited[0].body.message).toContain('1日の投稿上限');
    });
  });
});
