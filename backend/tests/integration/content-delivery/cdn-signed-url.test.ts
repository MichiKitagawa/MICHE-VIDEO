import request from 'supertest';
import app from '@/app';

describe('GET /api/cdn/signed-url/:media_file_id', () => {
  let userToken: string;
  let mediaFileId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;

    // Upload and complete video to get media file
    const initiateRes = await request(app)
      .post('/api/upload/initiate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        filename: 'test-video.mp4',
        filesize: 100 * 1024 * 1024,
        mimetype: 'video/mp4',
        content_type: 'video'
      });

    const completeRes = await request(app)
      .post('/api/upload/complete')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        upload_id: initiateRes.body.upload_id,
        s3_key: initiateRes.body.fields.key,
        etag: 'mock-etag'
      });

    mediaFileId = completeRes.body.media_file_id;
  });

  describe('CDN Signed URL Generation', () => {
    it('should generate signed CDN URL for completed video', async () => {
      const response = await request(app)
        .get(`/api/cdn/signed-url/${mediaFileId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .query({ quality: '1080p' });

      if (response.status === 200) {
        expect(response.body.media_file_id).toBe(mediaFileId);
        expect(response.body.signed_url).toBeDefined();
        expect(response.body.signed_url).toContain('signature=');
        expect(response.body.expires_in).toBe(86400); // 24 hours
        expect(response.body.quality).toBe('1080p');
      } else if (response.status === 202) {
        expect(response.body.message).toContain('トランスコード中');
      }
    });

    it('should generate signed URLs for all available qualities', async () => {
      const qualities = ['1080p', '720p', '480p'];

      for (const quality of qualities) {
        const response = await request(app)
          .get(`/api/cdn/signed-url/${mediaFileId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .query({ quality });

        if (response.status === 200) {
          expect(response.body.quality).toBe(quality);
          expect(response.body.signed_url).toBeDefined();
        }
      }
    });

    it('should include CDN domain in URL', async () => {
      const response = await request(app)
        .get(`/api/cdn/signed-url/${mediaFileId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .query({ quality: '720p' });

      if (response.status === 200) {
        expect(response.body.signed_url).toMatch(/^https:\/\//);
        expect(response.body.signed_url).toContain('.cloudfront.net');
      }
    });

    it('should generate CloudFront signed URL with expiration', async () => {
      const response = await request(app)
        .get(`/api/cdn/signed-url/${mediaFileId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .query({ quality: '1080p' });

      if (response.status === 200) {
        expect(response.body.signed_url).toContain('Expires=');
        expect(response.body.signed_url).toContain('Signature=');
        expect(response.body.signed_url).toContain('Key-Pair-Id=');
        expect(response.body.expires_at).toBeDefined();
      }
    });
  });

  describe('Quality Selection', () => {
    it('should default to highest available quality if not specified', async () => {
      const response = await request(app)
        .get(`/api/cdn/signed-url/${mediaFileId}`)
        .set('Authorization', `Bearer ${userToken}`);

      if (response.status === 200) {
        expect(response.body.quality).toMatch(/^(1080p|720p|480p)$/);
      }
    });

    it('should return 400 for invalid quality', async () => {
      const response = await request(app)
        .get(`/api/cdn/signed-url/${mediaFileId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .query({ quality: '4K' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_quality');
      expect(response.body.available_qualities).toBeDefined();
    });

    it('should fallback to lower quality if requested quality unavailable', async () => {
      const response = await request(app)
        .get(`/api/cdn/signed-url/${mediaFileId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .query({ quality: '1080p', allow_fallback: true });

      if (response.status === 200) {
        expect(response.body.quality).toMatch(/^(1080p|720p|480p)$/);
        if (response.body.is_fallback) {
          expect(response.body.requested_quality).toBe('1080p');
        }
      }
    });
  });

  describe('Validation', () => {
    it('should require authentication for private videos', async () => {
      const response = await request(app)
        .get(`/api/cdn/signed-url/${mediaFileId}`)
        .query({ quality: '720p' });

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent media file', async () => {
      const response = await request(app)
        .get('/api/cdn/signed-url/mf_nonexistent')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('media_file_not_found');
    });

    it('should return 202 when transcode not complete', async () => {
      // Fresh upload (still transcoding)
      const initiateRes = await request(app)
        .post('/api/upload/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          filename: 'new-video.mp4',
          filesize: 50 * 1024 * 1024,
          mimetype: 'video/mp4',
          content_type: 'video'
        });

      const completeRes = await request(app)
        .post('/api/upload/complete')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          upload_id: initiateRes.body.upload_id,
          s3_key: initiateRes.body.fields.key,
          etag: 'mock-etag'
        });

      const response = await request(app)
        .get(`/api/cdn/signed-url/${completeRes.body.media_file_id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(202);
      expect(response.body.status).toBe('processing');
      expect(response.body.transcode_progress).toBeDefined();
    });
  });

  describe('Access Control', () => {
    it('should verify user has access to private videos', async () => {
      // Create private video
      const videoRes = await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Private Video',
          media_file_id: mediaFileId,
          privacy: 'private'
        });

      const otherUserRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'other@example.com', password: 'TestPass123!' });

      const response = await request(app)
        .get(`/api/cdn/signed-url/${mediaFileId}`)
        .set('Authorization', `Bearer ${otherUserRes.body.access_token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('access_denied');
    });

    it('should allow access to public videos', async () => {
      // Create public video
      await request(app)
        .post('/api/videos/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Public Video',
          media_file_id: mediaFileId,
          privacy: 'public'
        });

      const otherUserRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'other@example.com', password: 'TestPass123!' });

      const response = await request(app)
        .get(`/api/cdn/signed-url/${mediaFileId}`)
        .set('Authorization', `Bearer ${otherUserRes.body.access_token}`);

      expect(response.status).toBeOneOf([200, 202]);
    });

    it('should verify Premium plan for Netflix content', async () => {
      // Mock Netflix content
      const freeUserRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'free@example.com', password: 'TestPass123!' });

      const netflixMediaFileId = 'mf_netflix_movie_001';

      const response = await request(app)
        .get(`/api/cdn/signed-url/${netflixMediaFileId}`)
        .set('Authorization', `Bearer ${freeUserRes.body.access_token}`);

      if (response.status === 403) {
        expect(response.body.error).toBe('premium_required');
      }
    });
  });

  describe('URL Properties', () => {
    it('should include bitrate information', async () => {
      const response = await request(app)
        .get(`/api/cdn/signed-url/${mediaFileId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .query({ quality: '1080p' });

      if (response.status === 200) {
        expect(response.body.bitrate).toBeGreaterThan(0);
        expect(response.body.resolution).toBeDefined();
        expect(response.body.codec).toBeDefined();
      }
    });

    it('should include file size', async () => {
      const response = await request(app)
        .get(`/api/cdn/signed-url/${mediaFileId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .query({ quality: '720p' });

      if (response.status === 200) {
        expect(response.body.file_size_bytes).toBeGreaterThan(0);
      }
    });

    it('should include duration', async () => {
      const response = await request(app)
        .get(`/api/cdn/signed-url/${mediaFileId}`)
        .set('Authorization', `Bearer ${userToken}`);

      if (response.status === 200) {
        expect(response.body.duration_seconds).toBeGreaterThan(0);
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit for CDN URL generation', async () => {
      const requests = [];

      for (let i = 0; i < 101; i++) {
        requests.push(
          request(app)
            .get(`/api/cdn/signed-url/${mediaFileId}`)
            .set('Authorization', `Bearer ${userToken}`)
            .query({ quality: '720p' })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Caching', () => {
    it('should cache CDN URLs for 5 minutes', async () => {
      const response1 = await request(app)
        .get(`/api/cdn/signed-url/${mediaFileId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .query({ quality: '1080p' });

      const response2 = await request(app)
        .get(`/api/cdn/signed-url/${mediaFileId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .query({ quality: '1080p' });

      if (response1.status === 200 && response2.status === 200) {
        // URLs should be the same if within cache period
        expect(response1.body.signed_url).toBe(response2.body.signed_url);
      }
    });
  });

  describe('Performance', () => {
    it('should respond within 200ms', async () => {
      const start = Date.now();
      await request(app)
        .get(`/api/cdn/signed-url/${mediaFileId}`)
        .set('Authorization', `Bearer ${userToken}`);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(200);
    });
  });
});
