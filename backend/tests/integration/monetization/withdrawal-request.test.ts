import request from 'supertest';
import app from '@/app';

/**
 * Withdrawal Request API Integration Tests
 * Tests POST /api/withdrawal/request endpoint  
 * Reference: docs/tests/monetization-tests.md (TC-107)
 */

describe('POST /api/withdrawal/request', () => {
  let creatorToken: string;
  let withdrawalMethodId: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    creatorToken = loginRes.body.access_token;

    const methodRes = await request(app)
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
    withdrawalMethodId = methodRes.body.method.id;
  });

  describe('Successful Withdrawal Request', () => {
    it('should create withdrawal request successfully', async () => {
      const response = await request(app)
        .post('/api/withdrawal/request')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          withdrawal_method_id: withdrawalMethodId,
          amount: 45000
        });

      expect(response.status).toBe(201);
      expect(response.body.withdrawal).toBeDefined();
      expect(response.body.withdrawal.id).toMatch(/^wd_/);
      expect(response.body.withdrawal.amount).toBe(45000);
      expect(response.body.withdrawal.fee).toBe(250);
      expect(response.body.withdrawal.net_amount).toBe(44750);
      expect(response.body.withdrawal.status).toBe('pending');
      expect(response.body.withdrawal.estimated_completion).toBeDefined();
    });

    it('should handle minimum withdrawal amount', async () => {
      const response = await request(app)
        .post('/api/withdrawal/request')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          withdrawal_method_id: withdrawalMethodId,
          amount: 1000
        });

      expect(response.status).toBe(201);
      expect(response.body.withdrawal.amount).toBe(1000);
    });
  });

  describe('Validation Errors', () => {
    it('should reject withdrawal below minimum (¥1,000)', async () => {
      const response = await request(app)
        .post('/api/withdrawal/request')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          withdrawal_method_id: withdrawalMethodId,
          amount: 500
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('amount_below_minimum');
    });

    it('should reject withdrawal exceeding available balance', async () => {
      const response = await request(app)
        .post('/api/withdrawal/request')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          withdrawal_method_id: withdrawalMethodId,
          amount: 10000000
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('insufficient_balance');
    });

    it('should reject invalid withdrawal method ID', async () => {
      const response = await request(app)
        .post('/api/withdrawal/request')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          withdrawal_method_id: 'wm_invalid',
          amount: 10000
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('withdrawal_method_not_found');
    });
  });

  describe('Authorization', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/withdrawal/request')
        .send({
          withdrawal_method_id: withdrawalMethodId,
          amount: 10000
        });

      expect(response.status).toBe(401);
    });

    it('should require creator role', async () => {
      const viewerRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'viewer@example.com', password: 'TestPass123!' });

      const response = await request(app)
        .post('/api/withdrawal/request')
        .set('Authorization', `Bearer ${viewerRes.body.access_token}`)
        .send({
          withdrawal_method_id: withdrawalMethodId,
          amount: 10000
        });

      expect(response.status).toBe(403);
    });
  });
});
