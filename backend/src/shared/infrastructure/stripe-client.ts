/**
 * Stripe Client Configuration
 *
 * Provides Stripe integration for subscription payments.
 */

import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * Initialize Stripe client with configuration from environment.
 */
export function initStripeClient(): Stripe {
  if (stripeClient) {
    return stripeClient;
  }

  if (!STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  stripeClient = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });

  return stripeClient;
}

/**
 * Get the existing Stripe client instance.
 * @throws Error if client is not initialized
 */
export function getStripeClient(): Stripe {
  if (!stripeClient) {
    throw new Error('Stripe client not initialized. Call initStripeClient() first.');
  }
  return stripeClient;
}

/**
 * Create Stripe Checkout Session for subscription
 *
 * @param userId - User ID
 * @param userEmail - User email
 * @param planId - Plan ID (e.g., 'plan_premium')
 * @param priceId - Stripe Price ID
 * @param successUrl - Success redirect URL
 * @param cancelUrl - Cancel redirect URL
 * @returns Checkout Session
 */
export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  planId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: userEmail,
    client_reference_id: userId,
    metadata: {
      userId,
      planId,
    },
    subscription_data: {
      metadata: {
        userId,
        planId,
      },
    },
  });

  return session;
}

/**
 * Create Stripe Customer Portal Session
 *
 * @param customerId - Stripe Customer ID
 * @param returnUrl - Return URL after portal session
 * @returns Portal Session
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripeClient();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Cancel Stripe Subscription
 *
 * @param subscriptionId - Stripe Subscription ID
 * @param immediately - Cancel immediately or at period end
 * @returns Updated Subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediately: boolean = false
): Promise<Stripe.Subscription> {
  const stripe = getStripeClient();

  if (immediately) {
    return stripe.subscriptions.cancel(subscriptionId);
  } else {
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }
}

/**
 * Retrieve Stripe Subscription
 *
 * @param subscriptionId - Stripe Subscription ID
 * @returns Subscription
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const stripe = getStripeClient();
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Construct Stripe event from webhook
 *
 * @param payload - Request body
 * @param signature - Stripe signature header
 * @returns Stripe Event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripeClient();

  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  return stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
}

/**
 * Get Stripe webhook secret
 */
export function getWebhookSecret(): string {
  return STRIPE_WEBHOOK_SECRET;
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!(STRIPE_SECRET_KEY && STRIPE_WEBHOOK_SECRET);
}
