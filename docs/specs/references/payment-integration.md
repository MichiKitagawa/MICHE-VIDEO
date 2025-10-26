# Payment Integration Reference

## Overview

This document provides comprehensive technical details for integrating Stripe (general content) and CCBill (adult content) payment providers across the video platform. It covers checkout flows, webhook handling, subscription management, tips/SuperChat processing, and error handling.

**Payment Providers**: 2
- **Stripe**: General content (Premium plan, general tips/SuperChat)
- **CCBill**: Adult content (Premium+ plan, adult tips/SuperChat)

**Integration Types**: Subscriptions, One-time payments (tips/SuperChat), Webhooks

---

## 1. Payment Provider Selection

### 1.1 Decision Logic

```typescript
function selectPaymentProvider(
  contentType: 'subscription' | 'tip' | 'superchat',
  metadata?: { planId?: string; contentId?: string; isAdult?: boolean }
): 'stripe' | 'ccbill' {

  // Subscription payments
  if (contentType === 'subscription') {
    if (metadata?.planId === 'plan_premium_plus') {
      return 'ccbill'; // Premium+ requires CCBill (adult access)
    }
    return 'stripe'; // Free/Premium uses Stripe
  }

  // Tip/SuperChat payments
  if (contentType === 'tip' || contentType === 'superchat') {
    if (metadata?.isAdult) {
      return 'ccbill'; // Adult content tips/SuperChat → CCBill
    }
    return 'stripe'; // General content → Stripe
  }

  return 'stripe'; // Default fallback
}
```

### 1.2 Provider Characteristics

| Feature | Stripe | CCBill |
|---------|--------|--------|
| **Content Type** | General (non-adult) | Adult content |
| **Currency** | JPY (native) | USD (converted from JPY) |
| **Subscription Plans** | Free, Premium | Premium+ |
| **One-time Payments** | General content tips/SuperChat | Adult content tips/SuperChat |
| **Payment Methods** | Credit card, Apple Pay, Google Pay | Credit card only |
| **3D Secure** | Supported | Supported |
| **Refunds** | Supported | Supported |
| **Dashboard** | stripe.com/dashboard | admin.ccbill.com |
| **Test Mode** | Yes (test keys) | Yes (test account) |

---

## 2. Stripe Integration

### 2.1 Configuration

**Environment Variables**:
```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_live_xxx  # Production
STRIPE_SECRET_KEY_TEST=sk_test_xxx  # Testing
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_PUBLISHABLE_KEY_TEST=pk_test_xxx

# Webhook Secrets
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

**SDK Installation**:
```bash
npm install stripe
```

**Initialization**:
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
});
```

### 2.2 Subscription Checkout Flow

**Step 1: Create Checkout Session**:
```typescript
async function createStripeCheckoutSession(
  userId: string,
  planId: 'plan_premium',
  successUrl: string,
  cancelUrl: string
) {
  // Get or create Stripe customer
  const customer = await getOrCreateStripeCustomer(userId);

  // Get plan price ID from database
  const plan = await db.query(
    'SELECT stripe_price_id FROM subscription_plans WHERE id = $1',
    [planId]
  );

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: plan.stripe_price_id, // e.g., price_xxx
        quantity: 1,
      },
    ],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      user_id: userId,
      plan_id: planId,
    },
  });

  return {
    checkout_url: session.url,
    session_id: session.id,
  };
}
```

**Step 2: Get or Create Customer**:
```typescript
async function getOrCreateStripeCustomer(userId: string) {
  // Check if customer exists in database
  const user = await db.query(
    'SELECT stripe_customer_id FROM users WHERE id = $1',
    [userId]
  );

  if (user.stripe_customer_id) {
    return await stripe.customers.retrieve(user.stripe_customer_id);
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: {
      user_id: userId,
    },
  });

  // Save customer ID
  await db.query(
    'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
    [customer.id, userId]
  );

  return customer;
}
```

**Step 3: Handle Success Redirect**:
```typescript
// Client-side (Expo Router)
import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';

export default function CheckoutSuccess() {
  const router = useRouter();
  const { session_id } = useLocalSearchParams<{ session_id?: string }>();

  useEffect(() => {
    if (session_id) {
      // Poll for subscription activation
      const interval = setInterval(async () => {
        const response = await fetch('/api/subscriptions/current');
        const subscription = await response.json();

        if (subscription.status === 'active') {
          clearInterval(interval);
          router.push('/(tabs)/videos?subscription_activated=true');
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [session_id]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
      <Text>Processing your subscription...</Text>
    </View>
  );
}
```

### 2.3 One-Time Payment (Tips/SuperChat)

**Create Payment Intent**:
```typescript
async function createTipPaymentIntent(
  userId: string,
  contentId: string,
  amount: number, // in JPY
  metadata: { message?: string }
) {
  const customer = await getOrCreateStripeCustomer(userId);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount, // Stripe expects smallest currency unit (¥1000 = 1000)
    currency: 'jpy',
    customer: customer.id,
    payment_method_types: ['card'],
    metadata: {
      user_id: userId,
      content_id: contentId,
      type: 'tip',
      message: metadata.message || '',
    },
  });

  return {
    client_secret: paymentIntent.client_secret,
    payment_intent_id: paymentIntent.id,
  };
}
```

**Client-Side Confirmation**:
```typescript
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function TipPaymentForm({ clientSecret, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement)!,
      },
    });

    if (result.error) {
      // Show error message
      console.error(result.error.message);
    } else if (result.paymentIntent?.status === 'succeeded') {
      onSuccess(result.paymentIntent.id);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit" disabled={!stripe}>
        Send Tip
      </button>
    </form>
  );
}
```

### 2.4 Stripe Webhooks

**Webhook Endpoint**:
```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';

// Disable body parser for raw body access
export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      buf.toString(),
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Handle the event
  try {
    await handleStripeWebhook(event);
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook handler failed:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}
```

**Event Handlers**:
```typescript
async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const planId = session.metadata?.plan_id;
  const subscriptionId = session.subscription as string;

  if (!userId || !planId) {
    throw new Error('Missing metadata in checkout session');
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Create user subscription record
  await db.query(`
    INSERT INTO user_subscriptions (
      user_id, plan_id, payment_provider,
      external_subscription_id, external_customer_id,
      status, current_period_start, current_period_end
    ) VALUES ($1, $2, 'stripe', $3, $4, $5, $6, $7)
    ON CONFLICT (user_id, plan_id, status) DO UPDATE
    SET external_subscription_id = $3,
        current_period_start = $6,
        current_period_end = $7,
        updated_at = NOW()
  `, [
    userId,
    planId,
    subscription.id,
    subscription.customer,
    'active',
    new Date(subscription.current_period_start * 1000),
    new Date(subscription.current_period_end * 1000),
  ]);

  // Update user plan
  await db.query(
    'UPDATE users SET current_plan_id = $1 WHERE id = $2',
    [planId, userId]
  );

  // Send confirmation email
  await sendSubscriptionConfirmationEmail(userId, planId);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) return; // Not a subscription invoice

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata?.user_id;

  // Record payment history
  await db.query(`
    INSERT INTO subscription_payment_history (
      user_subscription_id, payment_provider, external_payment_id,
      amount, currency, status, payment_method_type, paid_at
    ) VALUES (
      (SELECT id FROM user_subscriptions WHERE external_subscription_id = $1),
      'stripe', $2, $3, $4, 'succeeded', $5, $6
    )
  `, [
    subscriptionId,
    invoice.payment_intent,
    invoice.amount_paid,
    invoice.currency.toUpperCase(),
    invoice.payment_method_types?.[0] || 'card',
    new Date(invoice.status_transitions.paid_at! * 1000),
  ]);

  // Update subscription period
  await db.query(`
    UPDATE user_subscriptions
    SET current_period_start = $1,
        current_period_end = $2,
        status = 'active',
        updated_at = NOW()
    WHERE external_subscription_id = $3
  `, [
    new Date(subscription.current_period_start * 1000),
    new Date(subscription.current_period_end * 1000),
    subscriptionId,
  ]);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata?.user_id;

  // Update subscription status to past_due
  await db.query(`
    UPDATE user_subscriptions
    SET status = 'past_due',
        updated_at = NOW()
    WHERE external_subscription_id = $1
  `, [subscriptionId]);

  // Send payment failed notification
  await sendPaymentFailedEmail(userId, invoice.hosted_invoice_url);

  // Record failed payment
  await db.query(`
    INSERT INTO subscription_payment_history (
      user_subscription_id, payment_provider, external_payment_id,
      amount, currency, status, failure_reason
    ) VALUES (
      (SELECT id FROM user_subscriptions WHERE external_subscription_id = $1),
      'stripe', $2, $3, $4, 'failed', $5
    )
  `, [
    subscriptionId,
    invoice.payment_intent,
    invoice.amount_due,
    invoice.currency.toUpperCase(),
    invoice.last_finalization_error?.message || 'Payment failed',
  ]);
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const userId = paymentIntent.metadata?.user_id;
  const contentId = paymentIntent.metadata?.content_id;
  const type = paymentIntent.metadata?.type; // 'tip' or 'superchat'

  if (type === 'tip' || type === 'superchat') {
    // Calculate platform fee (30%)
    const amount = paymentIntent.amount; // JPY
    const platformFee = Math.floor(amount * 0.3);
    const netAmount = amount - platformFee;

    // Get content creator
    const content = await db.query(
      'SELECT user_id FROM videos WHERE id = $1',
      [contentId]
    );

    // Create earnings record
    await db.query(`
      INSERT INTO earnings (
        user_id, source_type, source_id, amount,
        platform_fee, net_amount, payment_provider,
        transaction_id, status, available_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'stripe', $7, 'pending', NOW() + INTERVAL '14 days')
    `, [
      content.user_id,
      type,
      contentId,
      amount,
      platformFee,
      netAmount,
      paymentIntent.id,
    ]);

    // Create tip record
    await db.query(`
      INSERT INTO tips (
        from_user_id, to_user_id, content_type, content_id,
        amount, message, payment_provider, transaction_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'stripe', $7, 'completed')
    `, [
      userId,
      content.user_id,
      'video',
      contentId,
      amount,
      paymentIntent.metadata?.message || '',
      paymentIntent.id,
    ]);

    // Send notification to creator
    await sendTipNotification(content.user_id, amount, paymentIntent.metadata?.message);
  }
}
```

### 2.5 Subscription Management

**Cancel Subscription**:
```typescript
async function cancelStripeSubscription(userId: string) {
  const userSub = await db.query(`
    SELECT external_subscription_id
    FROM user_subscriptions
    WHERE user_id = $1 AND status = 'active' AND payment_provider = 'stripe'
  `, [userId]);

  if (!userSub) {
    throw new Error('No active Stripe subscription found');
  }

  // Cancel at period end (don't cancel immediately)
  await stripe.subscriptions.update(userSub.external_subscription_id, {
    cancel_at_period_end: true,
  });

  // Update database
  await db.query(`
    UPDATE user_subscriptions
    SET cancel_at_period_end = TRUE,
        canceled_at = NOW()
    WHERE external_subscription_id = $1
  `, [userSub.external_subscription_id]);
}
```

**Change Subscription Plan**:
```typescript
async function changeStripePlan(userId: string, newPlanId: string) {
  const userSub = await db.query(`
    SELECT external_subscription_id
    FROM user_subscriptions
    WHERE user_id = $1 AND status = 'active' AND payment_provider = 'stripe'
  `, [userId]);

  const newPlan = await db.query(
    'SELECT stripe_price_id FROM subscription_plans WHERE id = $1',
    [newPlanId]
  );

  // Update subscription in Stripe
  const subscription = await stripe.subscriptions.retrieve(userSub.external_subscription_id);

  await stripe.subscriptions.update(subscription.id, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPlan.stripe_price_id,
      },
    ],
    proration_behavior: 'create_prorations', // Pro-rate charges
  });

  // Update database
  await db.query(`
    UPDATE user_subscriptions
    SET plan_id = $1
    WHERE external_subscription_id = $2
  `, [newPlanId, subscription.id]);
}
```

---

## 3. CCBill Integration

### 3.1 Configuration

**Environment Variables**:
```bash
# CCBill Account Details
CCBILL_ACCOUNT_ID=123456
CCBILL_SUBACCOUNT_ID=0001
CCBILL_FLEXFORMS_ID=abc123def456
CCBILL_SALT=your_salt_key

# Webhook Settings
CCBILL_DATALINK_USERNAME=username
CCBILL_DATALINK_PASSWORD=password
```

### 3.2 Subscription Checkout Flow

**Create CCBill Checkout URL**:
```typescript
function createCCBillCheckoutUrl(
  userId: string,
  planId: 'plan_premium_plus',
  email: string
): string {
  const baseUrl = 'https://bill.ccbill.com/jpost/signup.cgi';

  // CCBill form parameters
  const params = new URLSearchParams({
    clientAccnum: process.env.CCBILL_ACCOUNT_ID!,
    clientSubacc: process.env.CCBILL_SUBACCOUNT_ID!,
    formName: process.env.CCBILL_FLEXFORMS_ID!,

    // Subscription details
    subscriptionTypeId: '0', // Recurring subscription
    initialPrice: '19.80', // USD (¥1,980 / 100 JPY/USD rate)
    initialPeriod: '30',
    recurringPrice: '19.80',
    recurringPeriod: '30',
    numRebills: '99', // Unlimited rebills

    // Customer info
    email: email,

    // Metadata
    custom_user_id: userId,
    custom_plan_id: planId,

    // Return URLs
    redirectUrl: `${process.env.APP_URL}/subscription/success`,
    cancelUrl: `${process.env.APP_URL}/subscription/cancel`,
  });

  return `${baseUrl}?${params.toString()}`;
}
```

**Note on Currency**: CCBill does not support JPY directly. Convert JPY to USD at checkout:
```typescript
function convertJPYtoUSD(amountJPY: number): string {
  const exchangeRate = 100; // Example: ¥100 = $1 USD
  const amountUSD = amountJPY / exchangeRate;
  return amountUSD.toFixed(2);
}
```

### 3.3 CCBill Webhooks (Postbacks)

**Webhook Endpoint**:
```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify webhook signature
  const isValid = verifyCCBillSignature(req.body, req.headers['x-ccbill-signature'] as string);

  if (!isValid) {
    console.error('CCBill webhook signature verification failed');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    await handleCCBillWebhook(req.body);
    res.status(200).send('OK');
  } catch (err) {
    console.error('CCBill webhook handler failed:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

function verifyCCBillSignature(body: any, signature: string): boolean {
  const data = `${body.subscriptionId}${body.timestamp}${process.env.CCBILL_SALT}`;
  const hash = crypto.createHash('md5').update(data).digest('hex');
  return hash === signature;
}
```

**Event Handlers**:
```typescript
async function handleCCBillWebhook(data: any) {
  const eventType = data.eventType;

  switch (eventType) {
    case 'NewSaleSuccess':
      await handleCCBillNewSale(data);
      break;

    case 'RenewalSuccess':
      await handleCCBillRenewal(data);
      break;

    case 'RenewalFailure':
      await handleCCBillRenewalFailure(data);
      break;

    case 'Cancellation':
      await handleCCBillCancellation(data);
      break;

    case 'Chargeback':
      await handleCCBillChargeback(data);
      break;

    default:
      console.log(`Unhandled CCBill event: ${eventType}`);
  }
}

async function handleCCBillNewSale(data: any) {
  const userId = data.X_user_id; // custom_user_id from checkout URL
  const planId = data.X_plan_id; // custom_plan_id
  const subscriptionId = data.subscriptionId;
  const customerId = data.clientAccnum;

  // Create subscription record
  await db.query(`
    INSERT INTO user_subscriptions (
      user_id, plan_id, payment_provider,
      external_subscription_id, external_customer_id,
      status, current_period_start, current_period_end
    ) VALUES ($1, $2, 'ccbill', $3, $4, 'active', NOW(), NOW() + INTERVAL '30 days')
  `, [userId, planId, subscriptionId, customerId]);

  // Update user plan
  await db.query(
    'UPDATE users SET current_plan_id = $1, has_adult_access = TRUE WHERE id = $2',
    [planId, userId]
  );

  // Cancel existing Stripe subscription (if upgrading from Premium)
  await cancelExistingStripeSubscription(userId);

  // Send confirmation email
  await sendSubscriptionConfirmationEmail(userId, planId);
}

async function handleCCBillRenewal(data: any) {
  const subscriptionId = data.subscriptionId;
  const amount = parseFloat(data.billedAmount);

  // Record payment
  await db.query(`
    INSERT INTO subscription_payment_history (
      user_subscription_id, payment_provider, external_payment_id,
      amount, currency, status, paid_at
    ) VALUES (
      (SELECT id FROM user_subscriptions WHERE external_subscription_id = $1),
      'ccbill', $2, $3, 'USD', 'succeeded', NOW()
    )
  `, [subscriptionId, data.transactionId, Math.round(amount * 100)]);

  // Update subscription period
  await db.query(`
    UPDATE user_subscriptions
    SET current_period_start = NOW(),
        current_period_end = NOW() + INTERVAL '30 days',
        status = 'active'
    WHERE external_subscription_id = $1
  `, [subscriptionId]);
}

async function handleCCBillRenewalFailure(data: any) {
  const subscriptionId = data.subscriptionId;

  // Update status to past_due
  await db.query(`
    UPDATE user_subscriptions
    SET status = 'past_due'
    WHERE external_subscription_id = $1
  `, [subscriptionId]);

  // Send notification
  const userSub = await db.query(
    'SELECT user_id FROM user_subscriptions WHERE external_subscription_id = $1',
    [subscriptionId]
  );

  await sendPaymentFailedEmail(userSub.user_id, null);
}

async function handleCCBillCancellation(data: any) {
  const subscriptionId = data.subscriptionId;

  // Update subscription
  await db.query(`
    UPDATE user_subscriptions
    SET cancel_at_period_end = TRUE,
        canceled_at = NOW()
    WHERE external_subscription_id = $1
  `, [subscriptionId]);
}
```

### 3.4 CCBill One-Time Payments (Tips/SuperChat)

**CCBill does not support one-time payments easily**. For tips/SuperChat on adult content:

**Option 1**: Use Stripe for tips/SuperChat (even on adult content)
- Stripe allows general payments (not subscriptions) for adult platforms
- Adult content creators must accept Stripe for tips

**Option 2**: Use CCBill FlexForms for one-time charges
```typescript
function createCCBillTipUrl(
  userId: string,
  creatorId: string,
  amount: number, // JPY
  message: string
): string {
  const amountUSD = convertJPYtoUSD(amount);

  const params = new URLSearchParams({
    clientAccnum: process.env.CCBILL_ACCOUNT_ID!,
    clientSubacc: process.env.CCBILL_SUBACCOUNT_ID!,
    formName: process.env.CCBILL_FLEXFORMS_ID!,

    // One-time payment
    subscriptionTypeId: '1', // One-time purchase
    initialPrice: amountUSD,
    initialPeriod: '2', // 2 days access (minimum)
    recurringPrice: '0',
    numRebills: '0',

    // Metadata
    custom_user_id: userId,
    custom_creator_id: creatorId,
    custom_message: message,
    custom_type: 'tip',

    redirectUrl: `${process.env.APP_URL}/tip/success`,
  });

  return `https://bill.ccbill.com/jpost/signup.cgi?${params.toString()}`;
}
```

**Recommended**: Use Stripe for all tips/SuperChat to avoid CCBill complexity and currency conversion issues.

---

## 4. Dual Payment Provider Handling

### 4.1 Switching Providers

**Upgrading: Premium (Stripe) → Premium+ (CCBill)**:
```typescript
async function upgradeToPremiumPlus(userId: string) {
  // 1. Get current Stripe subscription
  const stripeSubscription = await db.query(`
    SELECT external_subscription_id, current_period_end
    FROM user_subscriptions
    WHERE user_id = $1 AND payment_provider = 'stripe' AND status = 'active'
  `, [userId]);

  if (stripeSubscription) {
    // 2. Cancel Stripe subscription (at period end)
    await stripe.subscriptions.update(stripeSubscription.external_subscription_id, {
      cancel_at_period_end: true,
    });

    await db.query(`
      UPDATE user_subscriptions
      SET cancel_at_period_end = TRUE
      WHERE external_subscription_id = $1
    `, [stripeSubscription.external_subscription_id]);
  }

  // 3. Create CCBill checkout URL
  const user = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
  const checkoutUrl = createCCBillCheckoutUrl(userId, 'plan_premium_plus', user.email);

  return { checkout_url: checkoutUrl };
}
```

**Downgrading: Premium+ (CCBill) → Premium (Stripe)**:
```typescript
async function downgradeToPremium(userId: string) {
  // 1. Cancel CCBill subscription via API
  const ccbillSub = await db.query(`
    SELECT external_subscription_id
    FROM user_subscriptions
    WHERE user_id = $1 AND payment_provider = 'ccbill' AND status = 'active'
  `, [userId]);

  if (ccbillSub) {
    // CCBill cancellation via Datalink API
    await cancelCCBillSubscription(ccbillSub.external_subscription_id);

    await db.query(`
      UPDATE user_subscriptions
      SET cancel_at_period_end = TRUE,
          canceled_at = NOW()
      WHERE external_subscription_id = $1
    `, [ccbillSub.external_subscription_id]);
  }

  // 2. Create Stripe checkout session
  const checkoutSession = await createStripeCheckoutSession(
    userId,
    'plan_premium',
    `${process.env.APP_URL}/subscription/success`,
    `${process.env.APP_URL}/subscription/cancel`
  );

  return checkoutSession;
}

async function cancelCCBillSubscription(subscriptionId: string) {
  // CCBill Datalink API to cancel subscription
  const response = await fetch('https://datalink.ccbill.com/data/main.cgi', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      clientAccnum: process.env.CCBILL_ACCOUNT_ID!,
      clientSubacc: process.env.CCBILL_SUBACCOUNT_ID!,
      username: process.env.CCBILL_DATALINK_USERNAME!,
      password: process.env.CCBILL_DATALINK_PASSWORD!,
      action: 'cancelSubscription',
      subscriptionId: subscriptionId,
    }),
  });

  const result = await response.text();

  if (!result.includes('success')) {
    throw new Error('Failed to cancel CCBill subscription');
  }
}
```

### 4.2 Earnings Consolidation

**Withdrawals combine Stripe + CCBill earnings**:
```typescript
async function getAvailableBalance(userId: string) {
  const result = await db.query(`
    SELECT
      SUM(net_amount) FILTER (WHERE payment_provider = 'stripe') AS stripe_balance,
      SUM(net_amount) FILTER (WHERE payment_provider = 'ccbill') AS ccbill_balance
    FROM earnings
    WHERE user_id = $1 AND status = 'available' AND available_at <= NOW()
  `, [userId]);

  const stripeBalance = result.stripe_balance || 0;
  const ccbillBalance = result.ccbill_balance || 0;

  return {
    total: stripeBalance + ccbillBalance,
    stripe: stripeBalance,
    ccbill: ccbillBalance,
  };
}
```

---

## 5. Error Handling & Retry Logic

### 5.1 Payment Failures

**Stripe Payment Intent Failed**:
```typescript
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const userId = paymentIntent.metadata?.user_id;
  const contentId = paymentIntent.metadata?.content_id;

  // Log failure
  console.error(`Payment failed: ${paymentIntent.id}`, {
    user_id: userId,
    content_id: contentId,
    error: paymentIntent.last_payment_error?.message,
  });

  // Send notification
  await sendPaymentFailedNotification(userId, paymentIntent.last_payment_error?.message);
}
```

**CCBill Renewal Failure**:
- 3-day grace period (handled by CCBill automatically)
- Send email notifications on day 1, 2, 3
- If still unpaid after 3 days, webhook sends `RenewalFailure`
- Subscription status → `past_due` → `expired` (downgrade to Free)

### 5.2 Webhook Retry

**Stripe Webhook Retry**:
- Stripe automatically retries failed webhooks for up to 3 days
- Exponential backoff: 1h, 2h, 4h, 8h, 16h, 24h, 48h

**CCBill Webhook Retry**:
- CCBill does NOT retry webhooks automatically
- Implement manual polling as fallback:

```typescript
// Daily cron job to check CCBill subscription status
async function syncCCBillSubscriptions() {
  const activeSubs = await db.query(`
    SELECT id, external_subscription_id, user_id
    FROM user_subscriptions
    WHERE payment_provider = 'ccbill' AND status = 'active'
  `);

  for (const sub of activeSubs) {
    // Query CCBill Datalink API
    const status = await getCCBillSubscriptionStatus(sub.external_subscription_id);

    if (status.isCanceled && !sub.cancel_at_period_end) {
      // Missed webhook, update database
      await db.query(`
        UPDATE user_subscriptions
        SET cancel_at_period_end = TRUE,
            canceled_at = NOW()
        WHERE id = $1
      `, [sub.id]);
    }
  }
}
```

### 5.3 Idempotency

**Prevent Duplicate Webhook Processing**:
```typescript
async function handleStripeWebhook(event: Stripe.Event) {
  // Check if event already processed
  const existing = await db.query(
    'SELECT id FROM webhook_events WHERE external_id = $1',
    [event.id]
  );

  if (existing) {
    console.log(`Webhook already processed: ${event.id}`);
    return; // Idempotent return
  }

  // Process event
  await processWebhookEvent(event);

  // Store event ID
  await db.query(
    'INSERT INTO webhook_events (external_id, provider, type, processed_at) VALUES ($1, $2, $3, NOW())',
    [event.id, 'stripe', event.type]
  );
}
```

---

## 6. Testing

### 6.1 Stripe Test Mode

**Test Cards**:
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
Insufficient funds: 4000 0000 0000 9995
```

**Trigger Test Webhooks**:
```bash
stripe trigger checkout.session.completed
stripe trigger invoice.payment_succeeded
stripe trigger customer.subscription.deleted
```

### 6.2 CCBill Test Mode

**Test Account**:
- Use CCBill test account ID
- Test form: `https://sandbox.ccbill.com`
- Test card: Provided by CCBill support

**Test Webhooks**:
- Use Postman to manually send webhook POST requests
- Verify signature with test salt

---

## Related Documents

- `specs/features/02-subscription.md` - Subscription feature spec
- `specs/features/09-monetization.md` - Monetization feature spec
- `specs/references/business-rules.md` - Pricing and fees
- `specs/references/error-codes.md` - Payment error codes
- `specs/references/api-endpoints.md` - Payment API endpoints
