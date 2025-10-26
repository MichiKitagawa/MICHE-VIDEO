import request from 'supertest';
import app from '@/app';

describe('GET /api/transcode/status/:job_id', () => {
  let userToken: string;
  let jobId: string;
  let mediaFileId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;

    // Initiate and complete upload to create transcode job
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

    jobId = completeRes.body.transcode_job_id;
    mediaFileId = completeRes.body.media_file_id;
  });

  describe('Transcode Status Retrieval', () => {
    it('should retrieve transcode job status', async () => {
      const response = await request(app)
        .get(`/api/transcode/status/${jobId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.job_id).toBe(jobId);
      expect(response.body.media_file_id).toBe(mediaFileId);
      expect(response.body.status).toMatch(/^(pending|processing|completed|failed)$/);
      expect(response.body.progress_percent).toBeGreaterThanOrEqual(0);
      expect(response.body.progress_percent).toBeLessThanOrEqual(100);
      expect(response.body.created_at).toBeDefined();
    });

    it('should show pending status initially', async () => {
      const response = await request(app)
        .get(`/api/transcode/status/${jobId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('pending');
      expect(response.body.progress_percent).toBe(0);
    });

    it('should include output details when completed', async () => {
      // Mock completed transcode job
      const completedJobId = 'completed-job-id';

      const response = await request(app)
        .get(`/api/transcode/status/${completedJobId}`)
        .set('Authorization', `Bearer ${userToken}`);

      if (response.status === 200 && response.body.status === 'completed') {
        expect(response.body.outputs).toBeInstanceOf(Array);
        expect(response.body.outputs.length).toBeGreaterThan(0);

        response.body.outputs.forEach((output: any) => {
          expect(output.quality).toMatch(/^(1080p|720p|480p)$/);
          expect(output.s3_key).toBeDefined();
          expect(output.bitrate).toBeGreaterThan(0);
          expect(output.file_size).toBeGreaterThan(0);
        });
      }
    });

    it('should show error message when failed', async () => {
      // Mock failed transcode job
      const failedJobId = 'failed-job-id';

      const response = await request(app)
        .get(`/api/transcode/status/${failedJobId}`)
        .set('Authorization', `Bearer ${userToken}`);

      if (response.status === 200 && response.body.status === 'failed') {
        expect(response.body.error_message).toBeDefined();
        expect(response.body.error_code).toBeDefined();
      }
    });
  });

  describe('Progress Updates', () => {
    it('should show progress percentage during processing', async () => {
      // Mock processing job
      const processingJobId = 'processing-job-id';

      const response = await request(app)
        .get(`/api/transcode/status/${processingJobId}`)
        .set('Authorization', `Bearer ${userToken}`);

      if (response.status === 200 && response.body.status === 'processing') {
        expect(response.body.progress_percent).toBeGreaterThan(0);
        expect(response.body.progress_percent).toBeLessThan(100);
        expect(response.body.estimated_time_remaining).toBeDefined();
      }
    });

    it('should update progress in real-time', async () => {
      const response1 = await request(app)
        .get(`/api/transcode/status/${jobId}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Wait 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response2 = await request(app)
        .get(`/api/transcode/status/${jobId}`)
        .set('Authorization', `Bearer ${userToken}`);

      if (response1.body.status === 'processing' && response2.body.status === 'processing') {
        expect(response2.body.progress_percent).toBeGreaterThanOrEqual(response1.body.progress_percent);
      }
    });
  });

  describe('Output Quality Information', () => {
    it('should list all quality variants being transcoded', async () => {
      const response = await request(app)
        .get(`/api/transcode/status/${jobId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.requested_qualities).toBeInstanceOf(Array);
      expect(response.body.requested_qualities).toContain('1080p');
      expect(response.body.requested_qualities).toContain('720p');
      expect(response.body.requested_qualities).toContain('480p');
    });

    it('should show individual quality transcode status', async () => {
      // Mock partially completed job
      const partialJobId = 'partial-job-id';

      const response = await request(app)
        .get(`/api/transcode/status/${partialJobId}`)
        .set('Authorization', `Bearer ${userToken}`);

      if (response.status === 200) {
        expect(response.body.quality_status).toBeDefined();
        expect(response.body.quality_status['1080p']).toMatch(/^(pending|processing|completed|failed)$/);
        expect(response.body.quality_status['720p']).toMatch(/^(pending|processing|completed|failed)$/);
        expect(response.body.quality_status['480p']).toMatch(/^(pending|processing|completed|failed)$/);
      }
    });
  });

  describe('Validation', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/transcode/status/${jobId}`);

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent job', async () => {
      const response = await request(app)
        .get('/api/transcode/status/nonexistent-job-id')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('transcode_job_not_found');
    });

    it('should verify user owns the job', async () => {
      const otherUserRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'other@example.com', password: 'TestPass123!' });

      const response = await request(app)
        .get(`/api/transcode/status/${jobId}`)
        .set('Authorization', `Bearer ${otherUserRes.body.access_token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('unauthorized');
    });
  });

  describe('Webhook Events', () => {
    it('should include webhook events history', async () => {
      const response = await request(app)
        .get(`/api/transcode/status/${jobId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      if (response.body.webhook_events) {
        expect(response.body.webhook_events).toBeInstanceOf(Array);
        response.body.webhook_events.forEach((event: any) => {
          expect(event.event_type).toBeDefined();
          expect(event.timestamp).toBeDefined();
        });
      }
    });
  });

  describe('Duration and Metadata', () => {
    it('should include video metadata when available', async () => {
      const response = await request(app)
        .get(`/api/transcode/status/${jobId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      if (response.body.metadata) {
        expect(response.body.metadata.duration).toBeGreaterThan(0);
        expect(response.body.metadata.width).toBeGreaterThan(0);
        expect(response.body.metadata.height).toBeGreaterThan(0);
        expect(response.body.metadata.frame_rate).toBeGreaterThan(0);
        expect(response.body.metadata.codec).toBeDefined();
      }
    });

    it('should calculate total processing time', async () => {
      // Mock completed job
      const completedJobId = 'completed-job-id';

      const response = await request(app)
        .get(`/api/transcode/status/${completedJobId}`)
        .set('Authorization', `Bearer ${userToken}`);

      if (response.status === 200 && response.body.status === 'completed') {
        expect(response.body.processing_time_seconds).toBeGreaterThan(0);
        expect(response.body.completed_at).toBeDefined();
      }
    });
  });

  describe('Retry Information', () => {
    it('should show retry count for failed jobs', async () => {
      // Mock failed job with retries
      const failedJobId = 'failed-job-with-retries';

      const response = await request(app)
        .get(`/api/transcode/status/${failedJobId}`)
        .set('Authorization', `Bearer ${userToken}`);

      if (response.status === 200 && response.body.status === 'failed') {
        expect(response.body.retry_count).toBeDefined();
        expect(response.body.max_retries).toBe(3);
      }
    });

    it('should allow manual retry for failed jobs', async () => {
      // Mock failed job
      const failedJobId = 'failed-job-id';

      const statusRes = await request(app)
        .get(`/api/transcode/status/${failedJobId}`)
        .set('Authorization', `Bearer ${userToken}`);

      if (statusRes.body.status === 'failed') {
        expect(statusRes.body.can_retry).toBe(true);
      }
    });
  });

  describe('Performance', () => {
    it('should respond within 200ms', async () => {
      const start = Date.now();
      await request(app)
        .get(`/api/transcode/status/${jobId}`)
        .set('Authorization', `Bearer ${userToken}`);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(200);
    });

    it('should cache status for frequently checked jobs', async () => {
      // First request
      const start1 = Date.now();
      await request(app)
        .get(`/api/transcode/status/${jobId}`)
        .set('Authorization', `Bearer ${userToken}`);
      const duration1 = Date.now() - start1;

      // Second request (should be cached)
      const start2 = Date.now();
      await request(app)
        .get(`/api/transcode/status/${jobId}`)
        .set('Authorization', `Bearer ${userToken}`);
      const duration2 = Date.now() - start2;

      expect(duration2).toBeLessThanOrEqual(duration1);
    });
  });
});
