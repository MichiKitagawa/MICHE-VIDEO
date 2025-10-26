import request from 'supertest';
import app from '@/app';

/**
 * Video View Recording API Integration Tests
 *
 * Tests POST /api/videos/:id/view for:
 * - Recording video views
 * - View count increment
 * - Duplicate prevention (24h window)
 * - Anonymous vs authenticated views
 *
 * Reference: docs/tests/video-playback-tests.md
 */

describe('POST /api/videos/:id/view', () => {
  let userToken: string;
  let videoId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;

    const createRes = await request(app)
      .post('/api/videos/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: '視聴テスト用動画',
        privacy: 'public',
        media_file_id: 'mf_view_test'
      });
    videoId = createRes.body.video.id;
  });

  describe('Record Video View', () => {
    it('should record video view for logged-in user', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/view`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('視聴');
      expect(response.body.video_id).toBe(videoId);
      expect(response.body.view_count).toBeGreaterThan(0);
    });

    it('should record view for anonymous user with session_id', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/view`)
        .send({ session_id: 'sess_anonymous_123' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('視聴');
    });

    it('should increment view count', async () => {
      const before = await request(app).get(`/api/videos/${videoId}`);
      const initialCount = before.body.video.view_count;

      await request(app)
        .post(`/api/videos/${videoId}/view`)
        .set('Authorization', `Bearer ${userToken}`);

      const after = await request(app).get(`/api/videos/${videoId}`);
      expect(after.body.video.view_count).toBe(initialCount + 1);
    });

    it('should return 404 for non-existent video', async () => {
      const response = await request(app)
        .post('/api/videos/vid_nonexistent/view')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
    });

    it('should track view timestamp', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/view`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.viewed_at).toBeDefined();
    });

    it('should record watch duration', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/view`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ watch_duration: 120 });

      expect(response.status).toBe(200);
    });
  });

  describe('Duplicate View Prevention', () => {
    it('should prevent duplicate views within 24 hours', async () => {
      await request(app)
        .post(`/api/videos/${videoId}/view`)
        .set('Authorization', `Bearer ${userToken}`);

      const response = await request(app)
        .post(`/api/videos/${videoId}/view`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('view_already_counted');
    });

    it('should allow different users to view same video', async () => {
      const otherLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'other@example.com', password: 'TestPass123!' });

      await request(app)
        .post(`/api/videos/${videoId}/view`)
        .set('Authorization', `Bearer ${userToken}`);

      const response = await request(app)
        .post(`/api/videos/${videoId}/view`)
        .set('Authorization', `Bearer ${otherLoginRes.body.access_token}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Anonymous Views', () => {
    it('should track anonymous views with session', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/view`)
        .send({ session_id: 'sess_test123' });

      expect(response.status).toBe(200);
    });

    it('should allow view without authentication or session', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/view`);

      expect(response.status).toBe(200);
    });

    it('should prevent duplicate anonymous views', async () => {
      const sessionId = 'sess_anon_test';

      await request(app)
        .post(`/api/videos/${videoId}/view`)
        .send({ session_id: sessionId });

      const response = await request(app)
        .post(`/api/videos/${videoId}/view`)
        .send({ session_id: sessionId });

      expect(response.status).toBe(409);
    });
  });

  describe('View Analytics', () => {
    it('should return view analytics', async () => {
      const response = await request(app)
        .get(`/api/videos/${videoId}/analytics`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.total_views).toBeDefined();
      expect(response.body.unique_viewers).toBeDefined();
    });

    it('should track view sources', async () => {
      const response = await request(app)
        .post(`/api/videos/${videoId}/view`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ referrer: 'search' });

      expect(response.status).toBe(200);
    });
  });

  describe('Security', () => {
    it('should prevent view count manipulation', async () => {
      const requests = [];
      for (let i = 0; i < 100; i++) {
        requests.push(
          request(app)
            .post(`/api/videos/${videoId}/view`)
            .send({ session_id: `sess_${i}` })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should validate video ID format', async () => {
      const response = await request(app)
        .post('/api/videos/invalid_id/view')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('Performance', () => {
    it('should record view within 200ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .post(`/api/videos/${videoId}/view`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(Date.now() - start).toBeLessThan(200);
      expect(response.status).toBe(200);
    });
  });
});
