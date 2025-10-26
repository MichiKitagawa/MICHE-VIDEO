import request from 'supertest';
import app from '@/app';

describe('POST /api/shorts/:id/comments', () => {
  let accessToken: string;
  let shortId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    accessToken = loginRes.body.access_token;
    shortId = 'short_test123';
  });

  it('should post comment successfully', async () => {
    const response = await request(app)
      .post(`/api/shorts/${shortId}/comments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: '素晴らしいダンスですね!' });

    expect(response.status).toBe(201);
    expect(response.body.comment.content).toBe('素晴らしいダンスですね!');
  });

  it('should validate comment content length', async () => {
    const response = await request(app)
      .post(`/api/shorts/${shortId}/comments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: 'a'.repeat(501) });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('500文字');
  });

  it('should sanitize comment content (XSS)', async () => {
    const response = await request(app)
      .post(`/api/shorts/${shortId}/comments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: '<script>alert("XSS")</script>素晴らしい' });

    expect(response.status).toBe(201);
    expect(response.body.comment.content).not.toContain('<script>');
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post(`/api/shorts/${shortId}/comments`)
      .send({ content: 'コメント' });

    expect(response.status).toBe(401);
  });
});

describe('GET /api/shorts/:id/comments', () => {
  let accessToken: string;
  let shortId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'TestPass123!' });
    accessToken = loginRes.body.access_token;
    shortId = 'short_test123';
  });

  it('should get comments with pagination', async () => {
    const response = await request(app)
      .get(`/api/shorts/${shortId}/comments?page=1&limit=20`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.comments).toBeInstanceOf(Array);
    expect(response.body.pagination).toBeDefined();
  });

  it('should sort comments by created_at descending', async () => {
    const response = await request(app)
      .get(`/api/shorts/${shortId}/comments`);

    const comments = response.body.comments;
    if (comments.length > 1) {
      const first = new Date(comments[0].created_at);
      const second = new Date(comments[1].created_at);
      expect(first.getTime()).toBeGreaterThanOrEqual(second.getTime());
    }
  });

  it('should work without authentication', async () => {
    const response = await request(app)
      .get(`/api/shorts/${shortId}/comments`);

    expect(response.status).toBe(200);
  });
});
