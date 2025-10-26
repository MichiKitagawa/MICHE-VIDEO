# サブスクリプション機能テスト仕様書

**参照元**: `docs/specs/features/02-subscription.md`

---

## 1. 概要

### 1.1 テストの目的
サブスクリプション管理（プラン変更、決済処理、Webhook処理）の正確性とStripe/CCBill統合の信頼性を保証する。

### 1.2 テスト範囲
- プラン一覧取得
- プランアップグレード・ダウングレード
- Stripe決済フロー
- CCBill決済フロー（アダルトコンテンツ）
- Webhookイベント処理（payment_intent.succeeded, subscription.canceled等）
- サブスクリプション状態管理（active, past_due, canceled）
- 日割り計算・返金処理

### 1.3 テスト環境
- Stripeテストモード (test keys)
- CCBill Sandboxアカウント
- PostgreSQL 15+ (subscriptions, payments, invoices)
- nock (HTTP mocking)
- stripe-mock (Webhookテスト)

---

## 2. ユニットテスト

### 2.1 プラン料金計算テスト

#### TC-001: 日割り計算（正常系）

**目的**: プランアップグレード時の日割り計算が正確であることを確認

**実装例** (Jest):
```typescript
import { calculateProration } from '@/lib/subscription/proration';

describe('Proration Calculation', () => {
  it('should calculate prorated amount correctly', () => {
    const currentPlan = { price: 980, billingCycle: 'monthly' };
    const newPlan = { price: 1980, billingCycle: 'monthly' };
    const daysRemaining = 15; // 15日残り
    const daysInMonth = 30;

    const prorated = calculateProration(currentPlan, newPlan, daysRemaining, daysInMonth);

    // (1980 - 980) * (15 / 30) = 500
    expect(prorated).toBe(500);
  });

  it('should return 0 for downgrade (credit applied)', () => {
    const currentPlan = { price: 1980, billingCycle: 'monthly' };
    const newPlan = { price: 980, billingCycle: 'monthly' };
    const daysRemaining = 15;
    const daysInMonth = 30;

    const prorated = calculateProration(currentPlan, newPlan, daysRemaining, daysInMonth);

    // ダウングレードはクレジット付与
    expect(prorated).toBe(0);
  });
});
```

---

### 2.2 Webhookシグネチャ検証

#### TC-002: Stripe Webhook署名検証（正常系・異常系）

**実装例**:
```typescript
import { verifyStripeWebhook } from '@/lib/stripe/webhook';

describe('Stripe Webhook Signature Verification', () => {
  const webhookSecret = 'whsec_test_secret';

  it('should verify valid webhook signature', () => {
    const payload = JSON.stringify({ type: 'payment_intent.succeeded' });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createStripeSignature(payload, timestamp, webhookSecret);

    const result = verifyStripeWebhook(payload, signature, webhookSecret);
    expect(result.valid).toBe(true);
  });

  it('should reject invalid signature', () => {
    const payload = JSON.stringify({ type: 'payment_intent.succeeded' });
    const invalidSignature = 't=123456,v1=invalidsignature';

    expect(() => {
      verifyStripeWebhook(payload, invalidSignature, webhookSecret);
    }).toThrow('Invalid signature');
  });

  it('should reject expired webhook (>5 minutes old)', () => {
    const payload = JSON.stringify({ type: 'payment_intent.succeeded' });
    const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 6分前
    const signature = createStripeSignature(payload, oldTimestamp, webhookSecret);

    expect(() => {
      verifyStripeWebhook(payload, signature, webhookSecret);
    }).toThrow('Webhook timestamp too old');
  });
});
```

---

## 3. 統合テスト

### 3.1 プラン一覧取得API

#### TC-101: プラン一覧取得（正常系）

**エンドポイント**: `GET /api/subscriptions/plans`

**実装例** (Supertest):
```typescript
import request from 'supertest';
import app from '@/app';

describe('GET /api/subscriptions/plans', () => {
  it('should return all subscription plans', async () => {
    const response = await request(app)
      .get('/api/subscriptions/plans');

    expect(response.status).toBe(200);
    expect(response.body.plans).toHaveLength(3);

    // Free plan
    const freePlan = response.body.plans.find(p => p.id === 'plan_free');
    expect(freePlan).toMatchObject({
      name: 'Free',
      price: 0,
      features: expect.arrayContaining([
        '基本動画視聴',
        '広告あり'
      ])
    });

    // Premium plan
    const premiumPlan = response.body.plans.find(p => p.id === 'plan_premium');
    expect(premiumPlan).toMatchObject({
      name: 'Premium',
      price: 980,
      features: expect.arrayContaining([
        '広告なし',
        'HD画質 (1080p)'
      ])
    });

    // Premium+ plan
    const premiumPlusPlan = response.body.plans.find(p => p.id === 'plan_premium_plus');
    expect(premiumPlusPlan).toMatchObject({
      name: 'Premium+',
      price: 1980,
      features: expect.arrayContaining([
        'アダルトコンテンツアクセス',
        '4K画質 (2160p)',
        'ライブストリーミング視聴'
      ])
    });
  });
});
```

---

### 3.2 プランアップグレードAPI

#### TC-111: Premium プランへのアップグレード（正常系）

**エンドポイント**: `POST /api/subscriptions/create-checkout`

**実装例**:
```typescript
describe('POST /api/subscriptions/create-checkout', () => {
  let accessToken: string;

  beforeEach(async () => {
    // Freeユーザーでログイン
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'free@example.com', password: 'FreePass123!' });
    accessToken = loginRes.body.access_token;
  });

  it('should create checkout session for Premium plan', async () => {
    // Stripeモック
    nock('https://api.stripe.com')
      .post('/v1/checkout/sessions')
      .reply(200, {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123'
      });

    const response = await request(app)
      .post('/api/subscriptions/create-checkout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        plan_id: 'plan_premium',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel'
      });

    expect(response.status).toBe(200);
    expect(response.body.checkout_url).toContain('stripe.com');
    expect(response.body.session_id).toBe('cs_test_123');
  });
});
```

---

#### TC-112: Premium+ プランへのアップグレード（CCBill）

**実装例**:
```typescript
describe('POST /api/subscriptions/create-ccbill-checkout', () => {
  it('should create CCBill checkout for Premium+ plan', async () => {
    const response = await request(app)
      .post('/api/subscriptions/create-ccbill-checkout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        plan_id: 'plan_premium_plus',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel'
      });

    expect(response.status).toBe(200);
    expect(response.body.checkout_url).toContain('ccbill.com');
    expect(response.body.form_data).toBeDefined();
    expect(response.body.form_data.clientAccnum).toBeDefined();
    expect(response.body.form_data.clientSubacc).toBeDefined();
  });
});
```

---

#### TC-113: プラン変更時の日割り計算

**実装例**:
```typescript
describe('POST /api/subscriptions/change - Prorated', () => {
  it('should apply prorated charge for mid-cycle upgrade', async () => {
    // 既存Premium契約を15日前に作成
    await createTestSubscription({
      userId: testUserId,
      planId: 'plan_premium',
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
    });

    nock('https://api.stripe.com')
      .post('/v1/subscriptions')
      .reply(200, (uri, requestBody) => {
        // Stripeが日割り計算を自動で行う
        return {
          id: 'sub_updated',
          status: 'active',
          plan: { id: 'plan_premium_plus' }
        };
      });

    const response = await request(app)
      .post('/api/subscriptions/change')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        new_plan_id: 'plan_premium_plus'
      });

    expect(response.status).toBe(200);
    expect(response.body.subscription.plan_id).toBe('plan_premium_plus');
  });
});
```

---

### 3.3 サブスクリプションキャンセルAPI

#### TC-121: サブスクリプションキャンセル（正常系）

**エンドポイント**: `POST /api/subscriptions/cancel`

**実装例**:
```typescript
describe('POST /api/subscriptions/cancel', () => {
  let premiumToken: string;

  beforeEach(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'premium@example.com', password: 'PremiumPass123!' });
    premiumToken = loginRes.body.access_token;
  });

  it('should cancel subscription at period end', async () => {
    nock('https://api.stripe.com')
      .post('/v1/subscriptions/sub_123')
      .reply(200, {
        id: 'sub_123',
        status: 'active',
        cancel_at_period_end: true
      });

    const response = await request(app)
      .post('/api/subscriptions/cancel')
      .set('Authorization', `Bearer ${premiumToken}`)
      .send({ reason: 'テスト理由' });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('サブスクリプションをキャンセルしました');
    expect(response.body.subscription.cancel_at_period_end).toBe(true);
  });
});
```

---

### 3.4 Stripe Webhook処理

#### TC-131: payment_intent.succeeded Webhook

**エンドポイント**: `POST /api/webhooks/stripe`

**実装例**:
```typescript
describe('POST /api/webhooks/stripe - payment_intent.succeeded', () => {
  it('should activate subscription on payment success', async () => {
    const webhookPayload = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_123',
          amount: 980,
          currency: 'jpy',
          metadata: {
            user_id: 'user_123',
            plan_id: 'premium'
          }
        }
      }
    };

    const signature = createStripeSignature(
      JSON.stringify(webhookPayload),
      Math.floor(Date.now() / 1000),
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    const response = await request(app)
      .post('/api/webhooks/stripe')
      .set('Stripe-Signature', signature)
      .send(webhookPayload);

    expect(response.status).toBe(200);

    // サブスクリプションがactiveになったか確認
    const subscription = await db.query(
      'SELECT * FROM subscriptions WHERE user_id = $1',
      ['user_123']
    );
    expect(subscription.rows[0].status).toBe('active');
    expect(subscription.rows[0].plan_id).toBe('premium');
  });
});
```

---

#### TC-132: payment_intent.payment_failed Webhook

**実装例**:
```typescript
describe('POST /api/webhooks/stripe - payment_intent.payment_failed', () => {
  it('should mark subscription as past_due on payment failure', async () => {
    const webhookPayload = {
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: 'pi_test_failed',
          metadata: {
            user_id: 'user_123',
            subscription_id: 'sub_123'
          }
        }
      }
    };

    const signature = createStripeSignature(
      JSON.stringify(webhookPayload),
      Math.floor(Date.now() / 1000),
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    const response = await request(app)
      .post('/api/webhooks/stripe')
      .set('Stripe-Signature', signature)
      .send(webhookPayload);

    expect(response.status).toBe(200);

    // ステータスがpast_dueになったか確認
    const subscription = await db.query(
      'SELECT * FROM subscriptions WHERE id = $1',
      ['sub_123']
    );
    expect(subscription.rows[0].status).toBe('past_due');

    // 支払い失敗通知メール送信確認
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('決済に失敗しました'),
      expect.anything()
    );
  });
});
```

---

#### TC-133: customer.subscription.deleted Webhook

**実装例**:
```typescript
describe('POST /api/webhooks/stripe - customer.subscription.deleted', () => {
  it('should cancel subscription and downgrade to Free', async () => {
    const webhookPayload = {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_stripe_123',
          customer: 'cus_test',
          metadata: {
            user_id: 'user_123'
          }
        }
      }
    };

    const signature = createStripeSignature(
      JSON.stringify(webhookPayload),
      Math.floor(Date.now() / 1000),
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    const response = await request(app)
      .post('/api/webhooks/stripe')
      .set('Stripe-Signature', signature)
      .send(webhookPayload);

    expect(response.status).toBe(200);

    // プランがFreeに戻ったか確認
    const user = await db.query('SELECT plan FROM users WHERE id = $1', ['user_123']);
    expect(user.rows[0].plan).toBe('Free');

    // サブスクリプションステータス
    const subscription = await db.query(
      'SELECT * FROM subscriptions WHERE provider_subscription_id = $1',
      ['sub_stripe_123']
    );
    expect(subscription.rows[0].status).toBe('canceled');
  });
});
```

---

### 3.5 CCBill Webhook処理

#### TC-141: CCBill NewSaleSuccess Webhook

**エンドポイント**: `POST /api/webhooks/ccbill`

**実装例**:
```typescript
describe('POST /api/webhooks/ccbill - NewSaleSuccess', () => {
  it('should activate subscription on CCBill payment success', async () => {
    const webhookPayload = {
      eventType: 'NewSaleSuccess',
      subscriptionId: 'ccb_sub_123',
      clientAccnum: process.env.CCBILL_ACCOUNT_NUMBER,
      amount: '19.80',
      currency: 'USD',
      email: 'premium-plus@example.com'
    };

    const response = await request(app)
      .post('/api/webhooks/ccbill')
      .send(webhookPayload);

    expect(response.status).toBe(200);

    // サブスクリプション確認
    const subscription = await db.query(
      'SELECT * FROM subscriptions WHERE provider_subscription_id = $1',
      ['ccb_sub_123']
    );
    expect(subscription.rows[0].status).toBe('active');
    expect(subscription.rows[0].provider).toBe('ccbill');
  });
});
```

---

## 4. E2Eテスト

### 4.1 完全な決済フロー

#### TC-201: StripeでPremiumにアップグレード（E2E）

**実装例** (Playwright):
```typescript
import { test, expect } from '@playwright/test';

test.describe('Subscription Upgrade Flow (Stripe)', () => {
  test('should upgrade to Premium plan', async ({ page }) => {
    // 1. ログイン
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'free@example.com');
    await page.fill('input[name="password"]', 'FreePass123!');
    await page.click('button[type="submit"]');

    // 2. 設定画面 → サブスクリプションタブ
    await page.click('button[aria-label="Settings"]');
    await page.click('text=サブスクリプション');

    // 3. Premiumプラン選択
    await page.click('button:has-text("Premiumにアップグレード")');

    // 4. 決済情報入力（Stripe Elements）
    const cardFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]');
    await cardFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
    await cardFrame.locator('input[name="exp-date"]').fill('12/34');
    await cardFrame.locator('input[name="cvc"]').fill('123');

    // 5. 支払い確定
    await page.click('button:has-text("¥980を支払う")');

    // 6. 成功メッセージ
    await expect(page.locator('text=Premiumプランにアップグレードしました')).toBeVisible();

    // 7. プラン表示確認
    await expect(page.locator('text=現在のプラン: Premium')).toBeVisible();
  });
});
```

---

## 5. セキュリティテスト

### 5.1 Webhook署名検証

#### TC-301: 無効な署名を拒否

**実装例**:
```typescript
describe('Webhook Security - Invalid Signature', () => {
  it('should reject webhook with invalid signature', async () => {
    const webhookPayload = {
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test' } }
    };

    const response = await request(app)
      .post('/api/webhooks/stripe')
      .set('Stripe-Signature', 'invalid_signature')
      .send(webhookPayload);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_signature');
  });
});
```

---

## 6. パフォーマンステスト

### 6.1 Webhook処理時間

#### TC-401: Webhook処理時間（200ms以内）

**実装例**:
```typescript
describe('Webhook Performance', () => {
  it('should process webhook within 200ms', async () => {
    const webhookPayload = {
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test', metadata: { user_id: 'user_123' } } }
    };

    const signature = createStripeSignature(
      JSON.stringify(webhookPayload),
      Math.floor(Date.now() / 1000),
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    const start = Date.now();
    await request(app)
      .post('/api/webhooks/stripe')
      .set('Stripe-Signature', signature)
      .send(webhookPayload);
    const end = Date.now();

    expect(end - start).toBeLessThan(200);
  });
});
```

---

## 7. テストデータ

### 7.1 Stripeテストカード

```typescript
export const stripeTestCards = {
  success: '4242424242424242',
  declined: '4000000000000002',
  insufficientFunds: '4000000000009995',
  requiresAuthentication: '4000002500003155'
};
```

### 7.2 サブスクリプションフィクスチャ

```typescript
export const testSubscriptions = {
  active: {
    plan_id: 'plan_premium',
    status: 'active',
    provider: 'stripe',
    provider_subscription_id: 'sub_test_123',
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  },
  past_due: {
    plan_id: 'plan_premium',
    status: 'past_due',
    provider: 'stripe',
    provider_subscription_id: 'sub_test_456'
  }
};
```

---

## 8. テストカバレッジ目標

- ユニットテスト: 85%以上
- 統合テスト: 全決済エンドポイント100%、全Webhookイベント100%
- E2Eテスト: Stripe/CCBill決済フロー各1件
- セキュリティテスト: Webhook署名検証、認可チェック

---

## 9. 既知の課題・制約

- Stripeテストモードでは一部機能制限あり
- CCBill Sandboxのレスポンス遅延
- Webhook再送信テストは手動確認推奨
- 日割り計算の月末処理（28/29/30/31日）のエッジケース
