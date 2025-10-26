import request from 'supertest';
import app from '@/app';

/**
 * Withdrawal Methods API Integration Tests
 * Tests POST/GET /api/withdrawal/methods endpoints
 * Reference: docs/tests/monetization-tests.md (TC-105, TC-106)
 */

describe('Withdrawal Methods API', () => {
  let creatorToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    creatorToken = loginRes.body.access_token;
  });

  describe('POST /api/withdrawal/methods/add', () => {
    it('should add bank transfer withdrawal method', async () => {
      const response = await request(app)
        .post('/api/withdrawal/methods/add')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          type: 'bank_transfer',
          bank_name: 'みずほ銀行',
          branch_name: '渋谷支店',
          account_type: 'checking',
          account_number: '1234567',
          account_holder: 'タナカ タロウ'
        });

      expect(response.status).toBe(201);
      expect(response.body.method).toBeDefined();
      expect(response.body.method.id).toMatch(/^wm_/);
      expect(response.body.method.type).toBe('bank_transfer');
      expect(response.body.method.bank_name).toBe('みずほ銀行');
      expect(response.body.method.is_verified).toBe(false);
    });

    it('should add PayPal withdrawal method', async () => {
      const response = await request(app)
        .post('/api/withdrawal/methods/add')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          type: 'paypal',
          paypal_email: 'creator@example.com'
        });

      expect(response.status).toBe(201);
      expect(response.body.method.type).toBe('paypal');
      expect(response.body.method.paypal_email).toBe('creator@example.com');
    });

    it('should sanitize bank name for XSS', async () => {
      const response = await request(app)
        .post('/api/withdrawal/methods/add')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          type: 'bank_transfer',
          bank_name: '<script>alert("XSS")</script>銀行',
          branch_name: '支店',
          account_type: 'checking',
          account_number: '1234567',
          account_holder: 'タナカ タロウ'
        });

      expect(response.status).toBe(201);
      expect(response.body.method.bank_name).not.toContain('<script>');
    });
  });

  describe('GET /api/withdrawal/methods', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/withdrawal/methods/add')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          type: 'bank_transfer',
          bank_name: 'みずほ銀行',
          branch_name: '渋谷支店',
          account_type: 'checking',
          account_number: '1234567',
          account_holder: 'タナカ タロウ'
        });
    });

    it('should retrieve withdrawal methods', async () => {
      const response = await request(app)
        .get('/api/withdrawal/methods')
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.methods).toBeInstanceOf(Array);
      expect(response.body.methods.length).toBeGreaterThan(0);
    });

    it('should mask account number in list', async () => {
      const response = await request(app)
        .get('/api/withdrawal/methods')
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(response.status).toBe(200);
      const bankMethod = response.body.methods.find((m: any) => m.type === 'bank_transfer');
      expect(bankMethod.account_number).toMatch(/^\*{3,}\d{4}$/);
    });
  });
});
