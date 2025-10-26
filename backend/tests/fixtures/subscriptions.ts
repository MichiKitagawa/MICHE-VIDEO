/**
 * Subscription Test Fixtures
 *
 * Predefined subscription plans and test data
 */

export const subscriptionPlans = {
  free: {
    id: 'plan_free',
    name: 'Free',
    price: 0,
    currency: 'JPY',
    billingCycle: 'monthly' as const,
    features: [
      '基本動画視聴',
      '広告あり',
      '480p画質まで'
    ]
  },

  premium: {
    id: 'plan_premium',
    name: 'Premium',
    price: 980,
    currency: 'JPY',
    billingCycle: 'monthly' as const,
    stripeProductId: 'prod_premium_test',
    stripePriceId: 'price_premium_test',
    features: [
      '広告なし',
      'HD画質 (1080p)',
      'ダウンロード機能',
      '同時視聴2デバイス'
    ]
  },

  premiumPlus: {
    id: 'plan_premium_plus',
    name: 'Premium+',
    price: 1980,
    currency: 'JPY',
    billingCycle: 'monthly' as const,
    ccbillProductId: 'prod_premium_plus_test',
    features: [
      'アダルトコンテンツアクセス',
      '4K画質 (2160p)',
      'ライブストリーミング視聴',
      '同時視聴4デバイス',
      '優先サポート'
    ]
  }
};

export const testSubscriptions = {
  activeStripe: {
    planId: 'plan_premium',
    status: 'active' as const,
    provider: 'stripe' as const,
    providerSubscriptionId: 'sub_test_123',
    providerCustomerId: 'cus_test_123',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  },

  activeCCBill: {
    planId: 'plan_premium_plus',
    status: 'active' as const,
    provider: 'ccbill' as const,
    providerSubscriptionId: 'ccb_sub_456',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  },

  pastDue: {
    planId: 'plan_premium',
    status: 'past_due' as const,
    provider: 'stripe' as const,
    providerSubscriptionId: 'sub_test_past_due',
    providerCustomerId: 'cus_test_past_due',
    currentPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    currentPeriodEnd: new Date()
  },

  canceled: {
    planId: 'plan_premium',
    status: 'canceled' as const,
    provider: 'stripe' as const,
    providerSubscriptionId: 'sub_test_canceled',
    canceledAt: new Date(),
    currentPeriodEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
  }
};

export const stripeTestCards = {
  success: '4242424242424242',
  declined: '4000000000000002',
  insufficientFunds: '4000000000009995',
  requiresAuthentication: '4000002500003155',
  expiredCard: '4000000000000069'
};

export const stripeWebhookEvents = {
  checkoutCompleted: {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_123',
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
        metadata: {
          userId: 'user_123',
          planId: 'plan_premium'
        }
      }
    }
  },

  paymentSucceeded: {
    type: 'invoice.payment_succeeded',
    data: {
      object: {
        id: 'in_test_123',
        subscription: 'sub_test_123',
        amount_paid: 980,
        currency: 'jpy'
      }
    }
  },

  paymentFailed: {
    type: 'invoice.payment_failed',
    data: {
      object: {
        id: 'in_test_failed',
        subscription: 'sub_test_123',
        amount_due: 980,
        currency: 'jpy'
      }
    }
  },

  subscriptionDeleted: {
    type: 'customer.subscription.deleted',
    data: {
      object: {
        id: 'sub_test_123',
        customer: 'cus_test_123',
        status: 'canceled'
      }
    }
  }
};

export const ccbillWebhookEvents = {
  newSaleSuccess: {
    eventType: 'NewSaleSuccess',
    subscriptionId: 'ccb_sub_123',
    clientAccnum: '123456',
    clientSubacc: '0000',
    amount: '19.80',
    currency: 'USD',
    email: 'premium-plus@example.com'
  },

  renewalSuccess: {
    eventType: 'RenewalSuccess',
    subscriptionId: 'ccb_sub_123',
    amount: '19.80',
    currency: 'USD'
  },

  cancellation: {
    eventType: 'Cancellation',
    subscriptionId: 'ccb_sub_123',
    reason: 'User requested'
  }
};
