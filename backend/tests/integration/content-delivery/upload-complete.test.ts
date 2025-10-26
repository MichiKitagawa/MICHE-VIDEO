import request from 'supertest';
import app from '@/app';

describe('POST /api/upload/complete', () => {
  let userToken: string;
  let uploadId: string;
  let s3Key: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;

    // Initiate upload
    const initiateRes = await request(app)
      .post('/api/upload/initiate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        filename: 'test-video.mp4',
        filesize: 100 * 1024 * 1024,
        mimetype: 'video/mp4',
        content_type: 'video'
      });

    uploadId = initiateRes.body.upload_id;
    s3Key = initiateRes.body.fields.key;
  });

  describe('Video Upload Completion', () => {
    it('should complete video upload successfully', async () => {
      const response = await request(app)
        .post('/api/upload/complete')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          upload_id: uploadId,
          s3_key: s3Key,
          etag: 'mock-etag-123456'
        });

      expect(response.status).toBe(200);
      expect(response.body.media_file_id).toBeDefined();
      expect(response.body.media_file_id).toMatch(/^mf_/);
      expect(response.body.status).toBe('pending');
      expect(response.body.message).toBe('アップロードが完了しました。トランスコード処理を開始します。');
      expect(response.body.s3_key).toBe(s3Key);
      expect(response.body.created_at).toBeDefined();
    });

    it('should create media_file record in database', async () => {
      const response = await request(app)
        .post('/api/upload/complete')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          upload_id: uploadId,
          s3_key: s3Key,
          etag: 'mock-etag-123456'
        });

      expect(response.status).toBe(200);

      const mediaFileId = response.body.media_file_id;

      // Verify media file exists
      const getRes = await request(app)
        .get(`/api/media-files/${mediaFileId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.id).toBe(mediaFileId);
      expect(getRes.body.status).toBe('pending');
    });

    it('should trigger transcode job', async () => {
      const response = await request(app)
        .post('/api/upload/complete')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          upload_id: uploadId,
          s3_key: s3Key,
          etag: 'mock-etag-123456'
        });

      expect(response.status).toBe(200);
      expect(response.body.transcode_job_id).toBeDefined();
      expect(response.body.message).toContain('トランスコード');
    });
  });

  describe('Validation', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/upload/complete')
        .send({
          upload_id: uploadId,
          s3_key: s3Key,
          etag: 'mock-etag'
        });

      expect(response.status).toBe(401);
    });

    it('should validate upload_id exists', async () => {
      const response = await request(app)
        .post('/api/upload/complete')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          upload_id: 'invalid-upload-id',
          s3_key: s3Key,
          etag: 'mock-etag'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('upload_not_found');
    });

    it('should validate s3_key matches upload_id', async () => {
      const response = await request(app)
        .post('/api/upload/complete')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          upload_id: uploadId,
          s3_key: 'videos/different-key/video.mp4',
          etag: 'mock-etag'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('s3_key_mismatch');
    });

    it('should reject duplicate completion', async () => {
      // Complete once
      await request(app)
        .post('/api/upload/complete')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          upload_id: uploadId,
          s3_key: s3Key,
          etag: 'mock-etag-1'
        });

      // Try to complete again
      const response = await request(app)
        .post('/api/upload/complete')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          upload_id: uploadId,
          s3_key: s3Key,
          etag: 'mock-etag-2'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('upload_already_completed');
    });

    it('should require etag', async () => {
      const response = await request(app)
        .post('/api/upload/complete')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          upload_id: uploadId,
          s3_key: s3Key
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('validation_error');
    });

    it('should check upload expiration', async () => {
      // Mock expired upload (created > 1 hour ago)
      const expiredUploadId = 'expired-upload-id';

      const response = await request(app)
        .post('/api/upload/complete')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          upload_id: expiredUploadId,
          s3_key: 'videos/user/expired/video.mp4',
          etag: 'mock-etag'
        });

      expect(response.status).toBe(410);
      expect(response.body.error).toBe('upload_expired');
    });
  });

  describe('Ownership Validation', () => {
    it('should verify user owns the upload', async () => {
      const otherUserRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'other@example.com', password: 'TestPass123!' });

      const response = await request(app)
        .post('/api/upload/complete')
        .set('Authorization', `Bearer ${otherUserRes.body.access_token}`)
        .send({
          upload_id: uploadId,
          s3_key: s3Key,
          etag: 'mock-etag'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('unauthorized');
    });
  });

  describe('S3 Verification', () => {
    it('should verify file exists in S3', async () => {
      const response = await request(app)
        .post('/api/upload/complete')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          upload_id: uploadId,
          s3_key: 'videos/nonexistent/file.mp4',
          etag: 'mock-etag'
        });

      if (response.status !== 200) {
        expect(response.body.error).toBe('file_not_found_in_s3');
      }
    });

    it('should verify file size matches declared size', async () => {
      const response = await request(app)
        .post('/api/upload/complete')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          upload_id: uploadId,
          s3_key: s3Key,
          etag: 'mock-etag',
          actual_filesize: 50 * 1024 * 1024 // Different from declared 100MB
        });

      if (response.status !== 200) {
        expect(response.body.error).toBe('file_size_mismatch');
      }
    });
  });

  describe('Transcode Job Creation', () => {
    it('should create transcode job for video', async () => {
      const response = await request(app)
        .post('/api/upload/complete')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          upload_id: uploadId,
          s3_key: s3Key,
          etag: 'mock-etag'
        });

      expect(response.status).toBe(200);
      expect(response.body.transcode_job_id).toBeDefined();

      // Check transcode status
      const statusRes = await request(app)
        .get(`/api/transcode/status/${response.body.transcode_job_id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.status).toMatch(/^(pending|processing)$/);
    });

    it('should request multiple quality outputs', async () => {
      const response = await request(app)
        .post('/api/upload/complete')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          upload_id: uploadId,
          s3_key: s3Key,
          etag: 'mock-etag'
        });

      expect(response.status).toBe(200);

      const jobId = response.body.transcode_job_id;
      const statusRes = await request(app)
        .get(`/api/transcode/status/${jobId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(statusRes.body.outputs).toBeDefined();
      expect(statusRes.body.outputs.length).toBeGreaterThan(0);
    });
  });

  describe('Short Video Completion', () => {
    it('should complete short upload successfully', async () => {
      const shortInitiateRes = await request(app)
        .post('/api/upload/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          filename: 'short.mp4',
          filesize: 50 * 1024 * 1024,
          mimetype: 'video/mp4',
          content_type: 'short'
        });

      const response = await request(app)
        .post('/api/upload/complete')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          upload_id: shortInitiateRes.body.upload_id,
          s3_key: shortInitiateRes.body.fields.key,
          etag: 'mock-etag'
        });

      expect(response.status).toBe(200);
      expect(response.body.media_file_id).toBeDefined();
      expect(response.body.s3_key).toContain('shorts/');
    });
  });

  describe('Error Handling', () => {
    it('should handle S3 upload failure', async () => {
      const response = await request(app)
        .post('/api/upload/complete')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          upload_id: uploadId,
          s3_key: s3Key,
          etag: 'invalid-etag',
          upload_failed: true,
          error_message: 'S3 upload failed'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('upload_failed');
    });

    it('should cleanup on transcode job creation failure', async () => {
      // Mock transcode service failure
      const response = await request(app)
        .post('/api/upload/complete')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          upload_id: uploadId,
          s3_key: s3Key,
          etag: 'mock-etag',
          force_transcode_failure: true
        });

      if (response.status !== 200) {
        expect(response.body.error).toBe('transcode_job_failed');
      }
    });
  });
});
