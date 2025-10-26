import request from 'supertest';
import app from '@/app';

describe('Netflix Security - IP License Validation', () => {
  let creatorToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    creatorToken = loginRes.body.access_token;

    await request(app)
      .post('/api/creators/apply')
      .set('Authorization', `Bearer ${creatorToken}`);
  });

  it('should reject non-commercial IP license for Netflix', async () => {
    const ipRes = await request(app)
      .get('/api/ip-licenses')
      .set('Authorization', `Bearer ${creatorToken}`);

    const nonCommercialIP = ipRes.body.find((ip: any) => ip.license_type === '非商用のみ');

    if (nonCommercialIP) {
      const response = await request(app)
        .post('/api/netflix/content')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          type: 'movie',
          title: 'テスト映画',
          genres: ['ドラマ'],
          ip_license_id: nonCommercialIP.id
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('commercial_license_required');
    }
  });

  it('should reject inactive IP license', async () => {
    const response = await request(app)
      .post('/api/netflix/content')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        type: 'movie',
        title: 'テスト映画',
        genres: ['ドラマ'],
        ip_license_id: 'ip_inactive'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_ip_license');
  });
});
