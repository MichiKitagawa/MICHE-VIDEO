import request from 'supertest';
import app from '@/app';

describe('POST /api/upload/initiate', () => {
  let userToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    userToken = loginRes.body.access_token;
  });

  describe('Video Upload Initiation', () => {
    it('should initiate video upload successfully', async () => {
      const response = await request(app)
        .post('/api/upload/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          filename: 'my-video.mp4',
          filesize: 500 * 1024 * 1024, // 500MB
          mimetype: 'video/mp4',
          content_type: 'video'
        });

      expect(response.status).toBe(200);
      expect(response.body.upload_id).toBeDefined();
      expect(response.body.upload_url).toBeDefined();
      expect(response.body.upload_url).toContain('s3.amazonaws.com');
      expect(response.body.fields).toBeDefined();
      expect(response.body.fields.key).toBeDefined();
      expect(response.body.fields.key).toContain('videos/');
      expect(response.body.expires_in).toBe(3600); // 1 hour
    });

    it('should generate unique upload ID for each request', async () => {
      const response1 = await request(app)
        .post('/api/upload/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          filename: 'video1.mp4',
          filesize: 100 * 1024 * 1024,
          mimetype: 'video/mp4',
          content_type: 'video'
        });

      const response2 = await request(app)
        .post('/api/upload/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          filename: 'video2.mp4',
          filesize: 100 * 1024 * 1024,
          mimetype: 'video/mp4',
          content_type: 'video'
        });

      expect(response1.body.upload_id).not.toBe(response2.body.upload_id);
      expect(response1.body.fields.key).not.toBe(response2.body.fields.key);
    });

    it('should include required S3 fields', async () => {
      const response = await request(app)
        .post('/api/upload/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          filename: 'video.mp4',
          filesize: 200 * 1024 * 1024,
          mimetype: 'video/mp4',
          content_type: 'video'
        });

      expect(response.status).toBe(200);
      expect(response.body.fields).toHaveProperty('key');
      expect(response.body.fields).toHaveProperty('bucket');
      expect(response.body.fields).toHaveProperty('X-Amz-Algorithm');
      expect(response.body.fields).toHaveProperty('X-Amz-Credential');
      expect(response.body.fields).toHaveProperty('X-Amz-Date');
      expect(response.body.fields).toHaveProperty('Policy');
      expect(response.body.fields).toHaveProperty('X-Amz-Signature');
    });
  });

  describe('Short Upload Initiation', () => {
    it('should initiate short upload successfully', async () => {
      const response = await request(app)
        .post('/api/upload/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          filename: 'short.mp4',
          filesize: 50 * 1024 * 1024, // 50MB
          mimetype: 'video/mp4',
          content_type: 'short'
        });

      expect(response.status).toBe(200);
      expect(response.body.upload_id).toBeDefined();
      expect(response.body.fields.key).toContain('shorts/');
    });

    it('should reject short exceeding 200MB', async () => {
      const response = await request(app)
        .post('/api/upload/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          filename: 'short.mp4',
          filesize: 250 * 1024 * 1024, // 250MB
          mimetype: 'video/mp4',
          content_type: 'short'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('file_too_large');
      expect(response.body.message).toContain('200MB');
    });
  });

  describe('Validation', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/upload/initiate')
        .send({
          filename: 'video.mp4',
          filesize: 100 * 1024 * 1024,
          mimetype: 'video/mp4',
          content_type: 'video'
        });

      expect(response.status).toBe(401);
    });

    it('should reject file exceeding 5GB for video', async () => {
      const response = await request(app)
        .post('/api/upload/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          filename: 'large-video.mp4',
          filesize: 6 * 1024 * 1024 * 1024, // 6GB
          mimetype: 'video/mp4',
          content_type: 'video'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('file_too_large');
      expect(response.body.message).toContain('5GB');
    });

    it('should reject invalid file type', async () => {
      const response = await request(app)
        .post('/api/upload/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          filename: 'document.pdf',
          filesize: 10 * 1024 * 1024,
          mimetype: 'application/pdf',
          content_type: 'video'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_file_type');
    });

    it('should reject missing filename', async () => {
      const response = await request(app)
        .post('/api/upload/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          filesize: 100 * 1024 * 1024,
          mimetype: 'video/mp4',
          content_type: 'video'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('validation_error');
    });

    it('should reject missing filesize', async () => {
      const response = await request(app)
        .post('/api/upload/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          filename: 'video.mp4',
          mimetype: 'video/mp4',
          content_type: 'video'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('validation_error');
    });

    it('should reject zero-byte file', async () => {
      const response = await request(app)
        .post('/api/upload/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          filename: 'video.mp4',
          filesize: 0,
          mimetype: 'video/mp4',
          content_type: 'video'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('file_empty');
    });

    it('should reject invalid content type', async () => {
      const response = await request(app)
        .post('/api/upload/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          filename: 'video.mp4',
          filesize: 100 * 1024 * 1024,
          mimetype: 'video/mp4',
          content_type: 'invalid'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_content_type');
    });
  });

  describe('Storage Quota Check', () => {
    it('should check user storage quota before upload', async () => {
      // User with Free plan
      const freeUserRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'free@example.com', password: 'TestPass123!' });

      const response = await request(app)
        .post('/api/upload/initiate')
        .set('Authorization', `Bearer ${freeUserRes.body.access_token}`)
        .send({
          filename: 'video.mp4',
          filesize: 100 * 1024 * 1024,
          mimetype: 'video/mp4',
          content_type: 'video'
        });

      // Should succeed if within quota
      if (response.status === 200) {
        expect(response.body.upload_id).toBeDefined();
      } else if (response.status === 403) {
        expect(response.body.error).toBe('storage_quota_exceeded');
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit for upload initiation', async () => {
      const requests = [];

      // Make 21 requests (limit is 20/min)
      for (let i = 0; i < 21; i++) {
        requests.push(
          request(app)
            .post('/api/upload/initiate')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
              filename: `video${i}.mp4`,
              filesize: 100 * 1024 * 1024,
              mimetype: 'video/mp4',
              content_type: 'video'
            })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Security', () => {
    it('should sanitize filename', async () => {
      const response = await request(app)
        .post('/api/upload/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          filename: '../../../etc/passwd.mp4',
          filesize: 100 * 1024 * 1024,
          mimetype: 'video/mp4',
          content_type: 'video'
        });

      expect(response.status).toBe(200);
      expect(response.body.fields.key).not.toContain('..');
      expect(response.body.fields.key).not.toContain('etc/passwd');
    });

    it('should reject filename with null bytes', async () => {
      const response = await request(app)
        .post('/api/upload/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          filename: 'video\0.mp4',
          filesize: 100 * 1024 * 1024,
          mimetype: 'video/mp4',
          content_type: 'video'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_filename');
    });

    it('should generate signed URL with expiration', async () => {
      const response = await request(app)
        .post('/api/upload/initiate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          filename: 'video.mp4',
          filesize: 100 * 1024 * 1024,
          mimetype: 'video/mp4',
          content_type: 'video'
        });

      expect(response.status).toBe(200);
      expect(response.body.expires_in).toBe(3600);
      expect(response.body.fields['X-Amz-Date']).toBeDefined();
    });
  });
});
