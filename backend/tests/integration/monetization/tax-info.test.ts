import request from 'supertest';
import app from '@/app';

/**
 * Tax Information API Integration Tests
 * Tests POST /api/tax-info/register endpoint
 * Reference: docs/tests/monetization-tests.md (TC-109)
 */

describe('POST /api/tax-info/register', () => {
  let creatorToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    creatorToken = loginRes.body.access_token;
  });

  describe('Individual Tax Info', () => {
    it('should register individual tax info', async () => {
      const response = await request(app)
        .post('/api/tax-info/register')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          entity_type: 'individual',
          individual_number: '123456789012',
          name: '田中太郎',
          address: '東京都渋谷区〇〇1-2-3'
        });

      expect(response.status).toBe(201);
      expect(response.body.tax_info).toBeDefined();
      expect(response.body.tax_info.entity_type).toBe('individual');
      expect(response.body.tax_info.name).toBe('田中太郎');
      expect(response.body.tax_info.is_verified).toBe(false);
    });

    it('should validate individual number format', async () => {
      const response = await request(app)
        .post('/api/tax-info/register')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          entity_type: 'individual',
          individual_number: '123', // Invalid: too short
          name: '田中太郎',
          address: '東京都渋谷区〇〇1-2-3'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_individual_number');
    });
  });

  describe('Business Tax Info', () => {
    it('should register business tax info', async () => {
      const response = await request(app)
        .post('/api/tax-info/register')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          entity_type: 'business',
          business_number: '1234567890123',
          name: '株式会社サンプル',
          address: '東京都渋谷区〇〇1-2-3'
        });

      expect(response.status).toBe(201);
      expect(response.body.tax_info.entity_type).toBe('business');
      expect(response.body.tax_info.name).toBe('株式会社サンプル');
    });
  });

  describe('Security', () => {
    it('should sanitize name for XSS', async () => {
      const response = await request(app)
        .post('/api/tax-info/register')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          entity_type: 'individual',
          individual_number: '123456789012',
          name: '<script>alert("XSS")</script>田中',
          address: '東京都渋谷区〇〇1-2-3'
        });

      expect(response.status).toBe(201);
      expect(response.body.tax_info.name).not.toContain('<script>');
    });
  });
});
