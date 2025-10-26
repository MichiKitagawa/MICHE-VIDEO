/**
 * Webhook Signature Verification Unit Tests
 *
 * Tests for Stripe webhook signature verification
 * Reference: docs/tests/subscription-tests.md (TC-002)
 */

import { verifyStripeWebhook } from '@/modules/subscription/infrastructure/stripe-webhook';
import { createStripeSignature } from '../../helpers/stripe-helper';

describe('Stripe Webhook Signature Verification', () => {
  const webhookSecret = 'whsec_test_secret';

  describe('Valid Signatures', () => {
    it('should verify valid webhook signature', () => {
      const payload = JSON.stringify({ type: 'payment_intent.succeeded' });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createStripeSignature(payload, timestamp, webhookSecret);

      const result = verifyStripeWebhook(payload, signature, webhookSecret);

      expect(result.valid).toBe(true);
      expect(result.event).toBeDefined();
      expect(result.event.type).toBe('payment_intent.succeeded');
    });

    it('should verify webhook with recent timestamp', () => {
      const payload = JSON.stringify({ type: 'invoice.paid' });
      const timestamp = Math.floor(Date.now() / 1000) - 10; // 10 seconds ago
      const signature = createStripeSignature(payload, timestamp, webhookSecret);

      const result = verifyStripeWebhook(payload, signature, webhookSecret);

      expect(result.valid).toBe(true);
    });

    it('should verify webhook at tolerance boundary', () => {
      const payload = JSON.stringify({ type: 'customer.created' });
      const timestamp = Math.floor(Date.now() / 1000) - 299; // 299 seconds (within 5 min)
      const signature = createStripeSignature(payload, timestamp, webhookSecret);

      const result = verifyStripeWebhook(payload, signature, webhookSecret);

      expect(result.valid).toBe(true);
    });
  });

  describe('Invalid Signatures', () => {
    it('should reject invalid signature', () => {
      const payload = JSON.stringify({ type: 'payment_intent.succeeded' });
      const invalidSignature = 't=123456,v1=invalidsignature';

      expect(() => {
        verifyStripeWebhook(payload, invalidSignature, webhookSecret);
      }).toThrow('Invalid signature');
    });

    it('should reject tampered payload', () => {
      const payload = JSON.stringify({ type: 'payment_intent.succeeded' });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createStripeSignature(payload, timestamp, webhookSecret);

      const tamperedPayload = JSON.stringify({ type: 'payment_intent.failed' });

      expect(() => {
        verifyStripeWebhook(tamperedPayload, signature, webhookSecret);
      }).toThrow('Invalid signature');
    });

    it('should reject signature with wrong secret', () => {
      const payload = JSON.stringify({ type: 'payment_intent.succeeded' });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createStripeSignature(payload, timestamp, 'wrong_secret');

      expect(() => {
        verifyStripeWebhook(payload, signature, webhookSecret);
      }).toThrow('Invalid signature');
    });

    it('should reject malformed signature format', () => {
      const payload = JSON.stringify({ type: 'payment_intent.succeeded' });
      const malformedSignature = 'not-a-valid-signature-format';

      expect(() => {
        verifyStripeWebhook(payload, malformedSignature, webhookSecret);
      }).toThrow();
    });

    it('should reject signature without timestamp', () => {
      const payload = JSON.stringify({ type: 'payment_intent.succeeded' });
      const signatureWithoutTimestamp = 'v1=somesignature';

      expect(() => {
        verifyStripeWebhook(payload, signatureWithoutTimestamp, webhookSecret);
      }).toThrow();
    });
  });

  describe('Timestamp Validation', () => {
    it('should reject expired webhook (>5 minutes old)', () => {
      const payload = JSON.stringify({ type: 'payment_intent.succeeded' });
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 6 minutes ago
      const signature = createStripeSignature(payload, oldTimestamp, webhookSecret);

      expect(() => {
        verifyStripeWebhook(payload, signature, webhookSecret);
      }).toThrow('Webhook timestamp too old');
    });

    it('should reject webhook from future', () => {
      const payload = JSON.stringify({ type: 'payment_intent.succeeded' });
      const futureTimestamp = Math.floor(Date.now() / 1000) + 400; // 6 minutes in future
      const signature = createStripeSignature(payload, futureTimestamp, webhookSecret);

      expect(() => {
        verifyStripeWebhook(payload, signature, webhookSecret);
      }).toThrow('Webhook timestamp too far in future');
    });

    it('should accept webhook at exactly 5 minutes old', () => {
      const payload = JSON.stringify({ type: 'payment_intent.succeeded' });
      const timestamp = Math.floor(Date.now() / 1000) - 300; // Exactly 5 minutes
      const signature = createStripeSignature(payload, timestamp, webhookSecret);

      const result = verifyStripeWebhook(payload, signature, webhookSecret);

      expect(result.valid).toBe(true);
    });
  });

  describe('Payload Validation', () => {
    it('should reject invalid JSON payload', () => {
      const invalidPayload = 'not-valid-json{]';
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createStripeSignature(invalidPayload, timestamp, webhookSecret);

      expect(() => {
        verifyStripeWebhook(invalidPayload, signature, webhookSecret);
      }).toThrow();
    });

    it('should handle empty payload', () => {
      const emptyPayload = '{}';
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createStripeSignature(emptyPayload, timestamp, webhookSecret);

      const result = verifyStripeWebhook(emptyPayload, signature, webhookSecret);

      expect(result.valid).toBe(true);
      expect(result.event).toEqual({});
    });

    it('should handle large payloads', () => {
      const largePayload = JSON.stringify({
        type: 'invoice.paid',
        data: {
          object: {
            id: 'in_test',
            lines: {
              data: Array(1000).fill({ id: 'item', amount: 100 })
            }
          }
        }
      });

      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createStripeSignature(largePayload, timestamp, webhookSecret);

      const result = verifyStripeWebhook(largePayload, signature, webhookSecret);

      expect(result.valid).toBe(true);
    });
  });

  describe('Multiple Signatures', () => {
    it('should accept webhook with multiple valid signatures', () => {
      const payload = JSON.stringify({ type: 'payment_intent.succeeded' });
      const timestamp = Math.floor(Date.now() / 1000);

      // Stripe can send multiple signatures for v1 scheme
      const sig1 = createStripeSignature(payload, timestamp, webhookSecret);
      const sig2Parts = sig1.split(',');

      // Duplicate the signature
      const multiSig = sig2Parts[0] + ',' + sig2Parts[1] + ',' + sig2Parts[1];

      const result = verifyStripeWebhook(payload, multiSig, webhookSecret);

      expect(result.valid).toBe(true);
    });
  });

  describe('Security', () => {
    it('should use constant-time comparison', () => {
      const payload = JSON.stringify({ type: 'payment_intent.succeeded' });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createStripeSignature(payload, timestamp, webhookSecret);

      // Measure time for valid signature
      const validStart = Date.now();
      verifyStripeWebhook(payload, signature, webhookSecret);
      const validTime = Date.now() - validStart;

      // Measure time for invalid signature
      const invalidStart = Date.now();
      try {
        verifyStripeWebhook(payload, 't=' + timestamp + ',v1=invalid', webhookSecret);
      } catch (e) {
        // Expected
      }
      const invalidTime = Date.now() - invalidStart;

      // Times should be similar (within 10ms) to prevent timing attacks
      expect(Math.abs(validTime - invalidTime)).toBeLessThan(10);
    });

    it('should not leak secret in error messages', () => {
      const payload = JSON.stringify({ type: 'payment_intent.succeeded' });
      const timestamp = Math.floor(Date.now() / 1000);
      const invalidSignature = 't=' + timestamp + ',v1=invalid';

      try {
        verifyStripeWebhook(payload, invalidSignature, webhookSecret);
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).not.toContain(webhookSecret);
      }
    });
  });
});
