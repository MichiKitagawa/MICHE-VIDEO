/**
 * Stripe Test Helper Functions
 *
 * Utilities for mocking Stripe API calls and creating webhook signatures
 */

import crypto from 'crypto';

/**
 * Create a valid Stripe webhook signature
 *
 * @param payload - The webhook payload (stringified JSON)
 * @param timestamp - Unix timestamp
 * @param secret - Webhook signing secret
 */
export function createStripeSignature(
  payload: string,
  timestamp: number,
  secret: string
): string {
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return `t=${timestamp},v1=${signature}`;
}

/**
 * Create a mock Stripe checkout session response
 */
export function createMockCheckoutSession(
  customerId: string,
  subscriptionId: string,
  planId: string
) {
  return {
    id: 'cs_test_' + Math.random().toString(36).substring(7),
    object: 'checkout.session',
    customer: customerId,
    subscription: subscriptionId,
    url: `https://checkout.stripe.com/pay/cs_test_${Math.random().toString(36).substring(7)}`,
    metadata: {
      planId
    },
    payment_status: 'unpaid',
    status: 'open'
  };
}

/**
 * Create a mock Stripe subscription response
 */
export function createMockSubscription(
  customerId: string,
  priceId: string,
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' = 'active'
) {
  const now = Math.floor(Date.now() / 1000);

  return {
    id: 'sub_test_' + Math.random().toString(36).substring(7),
    object: 'subscription',
    customer: customerId,
    status,
    items: {
      data: [{
        id: 'si_test',
        price: {
          id: priceId,
          unit_amount: 980,
          currency: 'jpy'
        }
      }]
    },
    current_period_start: now,
    current_period_end: now + (30 * 24 * 60 * 60),
    cancel_at_period_end: false
  };
}

/**
 * Create a mock Stripe customer response
 */
export function createMockCustomer(email: string) {
  return {
    id: 'cus_test_' + Math.random().toString(36).substring(7),
    object: 'customer',
    email,
    created: Math.floor(Date.now() / 1000)
  };
}

/**
 * Create a mock Stripe payment intent response
 */
export function createMockPaymentIntent(
  amount: number,
  currency: string = 'jpy',
  status: 'succeeded' | 'failed' = 'succeeded'
) {
  return {
    id: 'pi_test_' + Math.random().toString(36).substring(7),
    object: 'payment_intent',
    amount,
    currency,
    status,
    created: Math.floor(Date.now() / 1000)
  };
}

/**
 * Verify Stripe webhook signature (for testing the verification logic)
 */
export function verifyStripeWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const parts = signature.split(',');
    const timestamp = parseInt(parts[0].split('=')[1]);
    const signatures = parts.slice(1).map(p => p.split('=')[1]);

    // Check timestamp is within 5 minutes
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 300) {
      return false;
    }

    // Verify signature
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    return signatures.includes(expectedSignature);
  } catch (error) {
    return false;
  }
}
