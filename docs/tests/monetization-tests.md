# monetization機能テスト仕様書

**参照元**: `docs/specs/features/09-monetization.md`

---

## 1. 概要

### 1.1 テストの目的
monetization機能の品質保証とパフォーマンス検証を実施する。投げ銭、スーパーチャット、収益管理、出金機能について、Stripe/CCBill決済プロバイダー統合を含む包括的なテストを行う。

### 1.2 テスト範囲
- 投げ銭送信API（動画・ショート）
- スーパーチャット送信API（ライブ）
- 収益統計・履歴取得API
- 出金方法管理API
- 出金申請API
- 税務情報登録API
- 決済プロバイダー選択ロジック
- 手数料計算ロジック
- Stripe/CCBillモック連携
- セキュリティ（PCI DSS、データ暗号化）
- パフォーマンス基準

### 1.3 テスト環境
- Node.js 20+、TypeScript 5+
- PostgreSQL 15+
- Jest 29+、Supertest、Playwright
- Stripe Test Mode、CCBill Sandbox

---

## 2. ユニットテスト

### 2.1 手数料計算ロジックテスト

#### TC-001: プラットフォーム手数料計算（正常系）

```typescript
import { calculatePlatformFee, calculateNetAmount } from '@/lib/monetization/fees';

describe('Platform Fee Calculation', () => {
  it('should calculate 30% platform fee for tips', () => {
    const amount = 1000;
    const fee = calculatePlatformFee(amount, 'tip');

    expect(fee).toBe(300); // 30%
  });

  it('should calculate net amount after fee', () => {
    const amount = 1000;
    const platformFee = 300;
    const netAmount = calculateNetAmount(amount, platformFee);

    expect(netAmount).toBe(700);
  });

  it('should calculate 30% platform fee for superchat', () => {
    const amount = 5000;
    const fee = calculatePlatformFee(amount, 'superchat');

    expect(fee).toBe(1500); // 30%
  });

  it('should calculate 50% platform fee for subscription pool', () => {
    const amount = 2000;
    const fee = calculatePlatformFee(amount, 'subscription_pool');

    expect(fee).toBe(1000); // 50%
  });
});
```

#### TC-002: 出金手数料計算（正常系）

```typescript
import { calculateWithdrawalFee } from '@/lib/monetization/withdrawal';

describe('Withdrawal Fee Calculation', () => {
  it('should calculate ¥250 fee for bank transfer', () => {
    const amount = 10000;
    const fee = calculateWithdrawalFee(amount, 'bank_transfer');

    expect(fee).toBe(250);
  });

  it('should calculate ¥0 fee for PayPal', () => {
    const amount = 10000;
    const fee = calculateWithdrawalFee(amount, 'paypal');

    expect(fee).toBe(0);
  });

  it('should calculate net withdrawal amount', () => {
    const amount = 10000;
    const fee = 250;
    const netAmount = amount - fee;

    expect(netAmount).toBe(9750);
  });
});
```

### 2.2 決済プロバイダー選択ロジックテスト

#### TC-003: 決済プロバイダー自動選択（正常系）

```typescript
import { selectPaymentProvider } from '@/lib/monetization/payment-provider';

describe('Payment Provider Selection', () => {
  it('should select Stripe for non-adult content', () => {
    const provider = selectPaymentProvider({ is_adult: false });

    expect(provider).toBe('stripe');
  });

  it('should select CCBill for adult content', () => {
    const provider = selectPaymentProvider({ is_adult: true });

    expect(provider).toBe('ccbill');
  });

  it('should default to Stripe for undefined is_adult', () => {
    const provider = selectPaymentProvider({ is_adult: undefined });

    expect(provider).toBe('stripe');
  });
});
```

### 2.3 収益集計ロジックテスト

#### TC-004: 収益集計（正常系）

```typescript
import { aggregateEarnings } from '@/lib/monetization/earnings';

describe('Earnings Aggregation', () => {
  it('should aggregate earnings by source type', () => {
    const earnings = [
      { source_type: 'tip', net_amount: 700 },
      { source_type: 'superchat', net_amount: 3500 },
      { source_type: 'tip', net_amount: 350 },
      { source_type: 'subscription_pool', net_amount: 1000 }
    ];

    const result = aggregateEarnings(earnings);

    expect(result).toEqual({
      tips: 1050,
      superchat: 3500,
      subscription_pool: 1000,
      total: 5550
    });
  });

  it('should filter available balance', () => {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    const earnings = [
      { net_amount: 700, available_at: fourteenDaysAgo, status: 'available' },
      { net_amount: 500, available_at: tenDaysAgo, status: 'pending' }
    ];

    const availableBalance = earnings
      .filter(e => e.status === 'available' && e.available_at <= now)
      .reduce((sum, e) => sum + e.net_amount, 0);

    expect(availableBalance).toBe(700);
  });
});
```

### 2.4 入力バリデーションテスト

#### TC-005: 投げ銭バリデーション（異常系）

```typescript
import { validateTipAmount, validateTipMessage } from '@/lib/monetization/validation';

describe('Tip Validation', () => {
  it('should reject tip amount below minimum (¥100)', () => {
    expect(() => validateTipAmount(50)).toThrow('最小投げ銭額は¥100です');
  });

  it('should reject tip amount above maximum (¥10,000)', () => {
    expect(() => validateTipAmount(15000)).toThrow('最大投げ銭額は¥10,000です');
  });

  it('should accept valid tip amounts', () => {
    expect(() => validateTipAmount(100)).not.toThrow();
    expect(() => validateTipAmount(500)).not.toThrow();
    expect(() => validateTipAmount(10000)).not.toThrow();
  });

  it('should reject message exceeding 200 characters', () => {
    const longMessage = 'a'.repeat(201);
    expect(() => validateTipMessage(longMessage)).toThrow('メッセージは200文字以内です');
  });

  it('should accept message within 200 characters', () => {
    const validMessage = 'a'.repeat(200);
    expect(() => validateTipMessage(validMessage)).not.toThrow();
  });
});
```

#### TC-006: 出金バリデーション（異常系）

```typescript
import { validateWithdrawalAmount } from '@/lib/monetization/validation';

describe('Withdrawal Validation', () => {
  it('should reject withdrawal below minimum (¥5,000)', () => {
    const availableBalance = 10000;
    expect(() => validateWithdrawalAmount(3000, availableBalance)).toThrow('最低出金額は¥5,000です');
  });

  it('should reject withdrawal exceeding available balance', () => {
    const availableBalance = 10000;
    expect(() => validateWithdrawalAmount(15000, availableBalance)).toThrow('出金可能残高が不足しています');
  });

  it('should accept valid withdrawal amounts', () => {
    const availableBalance = 50000;
    expect(() => validateWithdrawalAmount(5000, availableBalance)).not.toThrow();
    expect(() => validateWithdrawalAmount(50000, availableBalance)).not.toThrow();
  });
});
```

---

## 3. 統合テスト

### 3.1 投げ銭API統合テスト

#### TC-101: POST /api/tips/send（正常系）

```typescript
import request from 'supertest';
import app from '@/app';

describe('POST /api/tips/send', () => {
  let viewerToken: string;
  let creatorToken: string;
  let videoId: string;

  beforeEach(async () => {
    // 視聴者ログイン
    const viewerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'viewer@example.com', password: 'TestPass123!' });
    viewerToken = viewerRes.body.access_token;

    // クリエイターログイン
    const creatorRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'TestPass123!' });
    creatorToken = creatorRes.body.access_token;

    // テスト動画作成
    const videoRes = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ title: 'テスト動画', is_adult: false });
    videoId = videoRes.body.video.id;
  });

  it('should send tip successfully (Stripe)', async () => {
    const response = await request(app)
      .post('/api/tips/send')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        content_id: videoId,
        content_type: 'video',
        amount: 1000,
        message: '素晴らしい動画でした！'
      });

    expect(response.status).toBe(201);
    expect(response.body.tip).toBeDefined();
    expect(response.body.tip.id).toMatch(/^tip_/);
    expect(response.body.tip.amount).toBe(1000);
    expect(response.body.tip.message).toBe('素晴らしい動画でした！');
    expect(response.body.tip.payment_provider).toBe('stripe');
    expect(response.body.tip.status).toBe('completed');
    expect(response.body.payment.transaction_id).toBeDefined();
    expect(response.body.payment.receipt_url).toContain('stripe.com');
  });

  it('should send tip with minimum amount (¥100)', async () => {
    const response = await request(app)
      .post('/api/tips/send')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        content_id: videoId,
        content_type: 'video',
        amount: 100
      });

    expect(response.status).toBe(201);
    expect(response.body.tip.amount).toBe(100);
  });

  it('should send tip with maximum amount (¥10,000)', async () => {
    const response = await request(app)
      .post('/api/tips/send')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        content_id: videoId,
        content_type: 'video',
        amount: 10000,
        message: '最高の動画をありがとう！'
      });

    expect(response.status).toBe(201);
    expect(response.body.tip.amount).toBe(10000);
  });

  it('should send tip without message (optional)', async () => {
    const response = await request(app)
      .post('/api/tips/send')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        content_id: videoId,
        content_type: 'video',
        amount: 500
      });

    expect(response.status).toBe(201);
    expect(response.body.tip.message).toBeUndefined();
  });
});
```

#### TC-102: POST /api/tips/send（異常系）

```typescript
describe('POST /api/tips/send - Error Cases', () => {
  it('should reject tip below minimum amount', async () => {
    const response = await request(app)
      .post('/api/tips/send')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        content_id: videoId,
        content_type: 'video',
        amount: 50
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_amount');
  });

  it('should reject tip above maximum amount', async () => {
    const response = await request(app)
      .post('/api/tips/send')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        content_id: videoId,
        content_type: 'video',
        amount: 15000
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_amount');
  });

  it('should reject message exceeding 200 characters', async () => {
    const longMessage = 'a'.repeat(201);
    const response = await request(app)
      .post('/api/tips/send')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        content_id: videoId,
        content_type: 'video',
        amount: 1000,
        message: longMessage
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('message_too_long');
  });

  it('should enforce rate limiting (5 tips per minute)', async () => {
    // 5回連続で投げ銭
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/tips/send')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          content_id: videoId,
          content_type: 'video',
          amount: 100
        });
    }

    // 6回目はレート制限エラー
    const response = await request(app)
      .post('/api/tips/send')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        content_id: videoId,
        content_type: 'video',
        amount: 100
      });

    expect(response.status).toBe(429);
    expect(response.body.error).toBe('rate_limit_exceeded');
  });

  it('should reject unauthorized request', async () => {
    const response = await request(app)
      .post('/api/tips/send')
      .send({
        content_id: videoId,
        content_type: 'video',
        amount: 1000
      });

    expect(response.status).toBe(401);
  });
});
```

### 3.2 収益統計API統合テスト

#### TC-103: GET /api/earnings/stats（正常系）

```typescript
describe('GET /api/earnings/stats', () => {
  it('should retrieve earnings statistics for creator', async () => {
    const response = await request(app)
      .get('/api/earnings/stats')
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(response.status).toBe(200);
    expect(response.body.available_balance).toBeGreaterThanOrEqual(0);
    expect(response.body.pending_balance).toBeGreaterThanOrEqual(0);
    expect(response.body.this_month_earnings).toBeGreaterThanOrEqual(0);
    expect(response.body.total_withdrawn).toBeGreaterThanOrEqual(0);
    expect(response.body.breakdown).toBeDefined();
    expect(response.body.breakdown.tips).toBeGreaterThanOrEqual(0);
    expect(response.body.breakdown.superchat).toBeGreaterThanOrEqual(0);
    expect(response.body.breakdown.subscription_pool).toBeGreaterThanOrEqual(0);
    expect(response.body.earnings_timeline).toBeInstanceOf(Array);
  });

  it('should reject non-creator access', async () => {
    const response = await request(app)
      .get('/api/earnings/stats')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('creator_only');
  });
});
```

#### TC-104: GET /api/earnings/history（正常系）

```typescript
describe('GET /api/earnings/history', () => {
  it('should retrieve earnings history with pagination', async () => {
    const response = await request(app)
      .get('/api/earnings/history')
      .set('Authorization', `Bearer ${creatorToken}`)
      .query({ page: 1, limit: 20 });

    expect(response.status).toBe(200);
    expect(response.body.earnings).toBeInstanceOf(Array);
    expect(response.body.pagination).toBeDefined();
    expect(response.body.pagination.total).toBeGreaterThanOrEqual(0);
    expect(response.body.pagination.page).toBe(1);
    expect(response.body.pagination.limit).toBe(20);
  });

  it('should filter earnings by source type', async () => {
    const response = await request(app)
      .get('/api/earnings/history')
      .set('Authorization', `Bearer ${creatorToken}`)
      .query({ source_type: 'tip' });

    expect(response.status).toBe(200);
    response.body.earnings.forEach((earning: any) => {
      expect(earning.source_type).toBe('tip');
    });
  });
});
```

### 3.3 出金関連API統合テスト

#### TC-105: POST /api/withdrawal/methods/add（正常系）

```typescript
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
    expect(response.body.method.branch_name).toBe('渋谷支店');
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
  });
});
```

#### TC-106: GET /api/withdrawal/methods（正常系）

```typescript
describe('GET /api/withdrawal/methods', () => {
  it('should retrieve withdrawal methods', async () => {
    const response = await request(app)
      .get('/api/withdrawal/methods')
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(response.status).toBe(200);
    expect(response.body.methods).toBeInstanceOf(Array);
    response.body.methods.forEach((method: any) => {
      expect(method.id).toBeDefined();
      expect(['bank_transfer', 'paypal', 'other']).toContain(method.type);
      if (method.type === 'bank_transfer') {
        expect(method.account_number).toMatch(/^\*{4}\d{4}$/); // マスク表示確認
      }
    });
  });
});
```

#### TC-107: POST /api/withdrawal/request（正常系）

```typescript
describe('POST /api/withdrawal/request', () => {
  let withdrawalMethodId: string;

  beforeEach(async () => {
    // 出金方法を追加
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
    expect(response.body.withdrawal.fee).toBe(250); // 銀行振込手数料
    expect(response.body.withdrawal.net_amount).toBe(44750);
    expect(response.body.withdrawal.status).toBe('pending');
    expect(response.body.withdrawal.estimated_completion).toBeDefined();
  });

  it('should reject withdrawal below minimum (¥5,000)', async () => {
    const response = await request(app)
      .post('/api/withdrawal/request')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        withdrawal_method_id: withdrawalMethodId,
        amount: 3000
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
        amount: 1000000
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('insufficient_balance');
  });
});
```

#### TC-108: GET /api/withdrawal/history（正常系）

```typescript
describe('GET /api/withdrawal/history', () => {
  it('should retrieve withdrawal history with pagination', async () => {
    const response = await request(app)
      .get('/api/withdrawal/history')
      .set('Authorization', `Bearer ${creatorToken}`)
      .query({ page: 1, limit: 20 });

    expect(response.status).toBe(200);
    expect(response.body.withdrawals).toBeInstanceOf(Array);
    expect(response.body.pagination).toBeDefined();
    response.body.withdrawals.forEach((withdrawal: any) => {
      expect(withdrawal.id).toBeDefined();
      expect(withdrawal.amount).toBeGreaterThan(0);
      expect(withdrawal.fee).toBeGreaterThanOrEqual(0);
      expect(withdrawal.net_amount).toBeLessThanOrEqual(withdrawal.amount);
      expect(['pending', 'processing', 'completed', 'failed']).toContain(withdrawal.status);
    });
  });
});
```

### 3.4 税務情報API統合テスト

#### TC-109: POST /api/tax-info/register（正常系）

```typescript
describe('POST /api/tax-info/register', () => {
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
  });
});
```

### 3.5 決済プロバイダーAPI統合テスト

#### TC-110: GET /api/payments/provider（正常系）

```typescript
describe('GET /api/payments/provider', () => {
  it('should return Stripe for non-adult content', async () => {
    const response = await request(app)
      .get('/api/payments/provider')
      .set('Authorization', `Bearer ${viewerToken}`)
      .query({ content_id: videoId, content_type: 'video' });

    expect(response.status).toBe(200);
    expect(response.body.payment_provider).toBe('stripe');
    expect(response.body.is_adult).toBe(false);
    expect(response.body.available_amounts).toEqual([100, 500, 1000, 5000, 10000]);
  });

  it('should return CCBill for adult content', async () => {
    // アダルト動画作成
    const adultVideoRes = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ title: 'アダルト動画', is_adult: true });
    const adultVideoId = adultVideoRes.body.video.id;

    const response = await request(app)
      .get('/api/payments/provider')
      .set('Authorization', `Bearer ${viewerToken}`)
      .query({ content_id: adultVideoId, content_type: 'video' });

    expect(response.status).toBe(200);
    expect(response.body.payment_provider).toBe('ccbill');
    expect(response.body.is_adult).toBe(true);
  });
});
```

---

## 4. E2Eテスト

### 4.1 投げ銭完全フロー

#### TC-201: 投げ銭送信から収益確認まで

```typescript
import { test, expect } from '@playwright/test';

test.describe('Monetization E2E - Tip Flow', () => {
  test('should complete full tip sending and earnings flow', async ({ page }) => {
    // 視聴者ログイン
    await page.goto('/login');
    await page.fill('input[name="email"]', 'viewer@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // 動画ページに遷移
    await page.goto('/video/vid_123456');
    await page.waitForSelector('video');

    // 投げ銭ボタンクリック
    await page.click('button:has-text("投げ銭")');

    // 金額選択モーダル
    await expect(page.locator('dialog')).toBeVisible();
    await page.click('button:has-text("¥1,000")');

    // メッセージ入力
    await page.fill('textarea[name="message"]', '素晴らしい動画でした！');

    // 決済確認
    await page.click('button:has-text("送信")');

    // 成功メッセージ確認
    await expect(page.locator('text=投げ銭を送信しました')).toBeVisible();

    // クリエイターでログイン
    await page.goto('/logout');
    await page.goto('/login');
    await page.fill('input[name="email"]', 'creator@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // 収益ダッシュボード確認
    await page.goto('/creation');
    await page.click('text=収益');

    // 収益統計確認
    await expect(page.locator('text=出金可能残高')).toBeVisible();
    await expect(page.locator('text=保留中残高')).toBeVisible();
    await expect(page.locator('text=今月の収益')).toBeVisible();

    // 収益履歴に投げ銭が表示されることを確認
    await expect(page.locator('text=投げ銭')).toBeVisible();
    await expect(page.locator('text=¥700')).toBeVisible(); // 手数料差し引き後
  });
});
```

### 4.2 出金完全フロー

#### TC-202: 出金方法登録から出金申請まで

```typescript
test.describe('Monetization E2E - Withdrawal Flow', () => {
  test('should complete full withdrawal registration and request flow', async ({ page }) => {
    // クリエイターログイン
    await page.goto('/login');
    await page.fill('input[name="email"]', 'creator@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // 設定画面に遷移
    await page.goto('/(tabs)/settings');
    await page.click('text=出金管理');

    // 出金方法追加
    await page.click('button:has-text("出金方法を追加")');

    // 銀行振込選択
    await page.click('button:has-text("銀行振込")');

    // 銀行情報入力
    await page.fill('input[name="bank_name"]', 'みずほ銀行');
    await page.fill('input[name="branch_name"]', '渋谷支店');
    await page.selectOption('select[name="account_type"]', 'checking');
    await page.fill('input[name="account_number"]', '1234567');
    await page.fill('input[name="account_holder"]', 'タナカ タロウ');

    // 登録
    await page.click('button:has-text("登録")');

    // 成功メッセージ確認
    await expect(page.locator('text=出金方法を追加しました')).toBeVisible();

    // 収益ダッシュボードに戻る
    await page.goto('/creation');
    await page.click('text=収益');

    // 出金ボタンクリック
    await page.click('button:has-text("出金する")');

    // 出金額入力
    await page.fill('input[name="amount"]', '45000');

    // 確認画面で手数料確認
    await expect(page.locator('text=手数料: ¥250')).toBeVisible();
    await expect(page.locator('text=振込額: ¥44,750')).toBeVisible();

    // 出金申請
    await page.click('button:has-text("出金申請")');

    // 成功メッセージ確認
    await expect(page.locator('text=出金申請を受け付けました')).toBeVisible();

    // 出金履歴に表示されることを確認
    await page.click('text=出金履歴');
    await expect(page.locator('text=¥45,000')).toBeVisible();
    await expect(page.locator('text=pending')).toBeVisible();
  });
});
```

---

## 5. セキュリティテスト

### 5.1 認証・認可テスト

#### TC-301: 認証なしアクセス拒否

```typescript
describe('Monetization Security - Authentication', () => {
  it('should reject unauthenticated tip sending', async () => {
    const response = await request(app)
      .post('/api/tips/send')
      .send({
        content_id: 'vid_123456',
        content_type: 'video',
        amount: 1000
      });

    expect(response.status).toBe(401);
  });

  it('should reject unauthenticated earnings stats access', async () => {
    const response = await request(app)
      .get('/api/earnings/stats');

    expect(response.status).toBe(401);
  });

  it('should reject unauthenticated withdrawal request', async () => {
    const response = await request(app)
      .post('/api/withdrawal/request')
      .send({ withdrawal_method_id: 'wm_123456', amount: 10000 });

    expect(response.status).toBe(401);
  });
});
```

#### TC-302: クリエイター権限テスト

```typescript
describe('Monetization Security - Creator Authorization', () => {
  it('should reject viewer access to earnings stats', async () => {
    const response = await request(app)
      .get('/api/earnings/stats')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('creator_only');
  });

  it('should reject viewer access to withdrawal endpoints', async () => {
    const response = await request(app)
      .post('/api/withdrawal/request')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ withdrawal_method_id: 'wm_123456', amount: 10000 });

    expect(response.status).toBe(403);
  });
});
```

### 5.2 入力サニタイゼーションテスト

#### TC-303: XSS対策

```typescript
describe('Monetization Security - XSS Prevention', () => {
  it('should sanitize tip message (XSS)', async () => {
    const response = await request(app)
      .post('/api/tips/send')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        content_id: videoId,
        content_type: 'video',
        amount: 1000,
        message: '<script>alert("XSS")</script>'
      });

    expect(response.status).toBe(201);
    expect(response.body.tip.message).not.toContain('<script>');
    expect(response.body.tip.message).not.toContain('</script>');
  });

  it('should sanitize withdrawal method fields', async () => {
    const response = await request(app)
      .post('/api/withdrawal/methods/add')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        type: 'bank_transfer',
        bank_name: '<script>alert("XSS")</script>',
        branch_name: '渋谷支店',
        account_type: 'checking',
        account_number: '1234567',
        account_holder: 'タナカ タロウ'
      });

    expect(response.status).toBe(201);
    expect(response.body.method.bank_name).not.toContain('<script>');
  });
});
```

### 5.3 データ保護テスト

#### TC-304: 口座番号マスク表示

```typescript
describe('Monetization Security - Data Protection', () => {
  it('should mask account number in withdrawal methods list', async () => {
    // 出金方法追加
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

    // 一覧取得
    const response = await request(app)
      .get('/api/withdrawal/methods')
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(response.status).toBe(200);
    const bankMethod = response.body.methods.find((m: any) => m.type === 'bank_transfer');
    expect(bankMethod.account_number).toMatch(/^\*{4}\d{4}$/);
    expect(bankMethod.account_number).not.toBe('1234567');
  });
});
```

### 5.4 レート制限テスト

#### TC-305: 投げ銭レート制限

```typescript
describe('Monetization Security - Rate Limiting', () => {
  it('should enforce 5 tips per minute limit', async () => {
    const responses = [];

    // 6回連続で投げ銭試行
    for (let i = 0; i < 6; i++) {
      const res = await request(app)
        .post('/api/tips/send')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          content_id: videoId,
          content_type: 'video',
          amount: 100
        });
      responses.push(res);
    }

    // 最初の5回は成功
    responses.slice(0, 5).forEach(res => {
      expect(res.status).toBe(201);
    });

    // 6回目はレート制限エラー
    expect(responses[5].status).toBe(429);
    expect(responses[5].body.error).toBe('rate_limit_exceeded');
  });

  it('should enforce daily tip limit (¥100,000)', async () => {
    // 10回 × ¥10,000 = ¥100,000を送信
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/api/tips/send')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          content_id: videoId,
          content_type: 'video',
          amount: 10000
        });
    }

    // 11回目は日次制限エラー
    const response = await request(app)
      .post('/api/tips/send')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        content_id: videoId,
        content_type: 'video',
        amount: 1000
      });

    expect(response.status).toBe(429);
    expect(response.body.error).toBe('daily_limit_exceeded');
  });
});
```

---

## 6. パフォーマンステスト

### 6.1 応答時間テスト

#### TC-401: 投げ銭送信パフォーマンス（< 2秒）

```typescript
describe('Monetization Performance - Tip Sending', () => {
  it('should complete tip sending within 2 seconds (P95)', async () => {
    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .post('/api/tips/send')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          content_id: videoId,
          content_type: 'video',
          amount: 1000
        });
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(2000); // 2秒以内
  });
});
```

#### TC-402: 収益統計取得パフォーマンス（< 500ms）

```typescript
describe('Monetization Performance - Earnings Stats', () => {
  it('should retrieve earnings stats within 500ms (P95)', async () => {
    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .get('/api/earnings/stats')
        .set('Authorization', `Bearer ${creatorToken}`);
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(500); // 500ms以内
  });
});
```

#### TC-403: 出金申請パフォーマンス（< 1秒）

```typescript
describe('Monetization Performance - Withdrawal Request', () => {
  it('should complete withdrawal request within 1 second (P95)', async () => {
    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await request(app)
        .post('/api/withdrawal/request')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          withdrawal_method_id: withdrawalMethodId,
          amount: 10000
        });
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(1000); // 1秒以内
  });
});
```

### 6.2 負荷テスト（k6）

#### TC-404: 投げ銭同時送信負荷テスト

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100, // 100並行ユーザー
  duration: '5m', // 5分間
  thresholds: {
    http_req_duration: ['p(95)<2000'], // P95 < 2秒
    http_req_failed: ['rate<0.01'], // エラー率 < 1%
  },
};

export default function () {
  const payload = JSON.stringify({
    content_id: 'vid_123456',
    content_type: 'video',
    amount: 1000,
    message: 'テスト投げ銭'
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.VIEWER_TOKEN}`,
    },
  };

  const res = http.post('http://localhost:3000/api/tips/send', payload, params);

  check(res, {
    'status is 201': (r) => r.status === 201,
    'response time < 2s': (r) => r.timings.duration < 2000,
    'transaction_id exists': (r) => JSON.parse(r.body).payment.transaction_id !== undefined,
  });

  sleep(1);
}
```

---

## 7. テストデータ

### 7.1 フィクスチャ

```typescript
export const monetizationTestData = {
  validTip: {
    content_id: 'vid_123456',
    content_type: 'video',
    amount: 1000,
    message: '素晴らしい動画でした！'
  },
  minimumTip: {
    content_id: 'vid_123456',
    content_type: 'video',
    amount: 100
  },
  maximumTip: {
    content_id: 'vid_123456',
    content_type: 'video',
    amount: 10000,
    message: '最高の動画をありがとう！'
  },
  invalidTipBelowMinimum: {
    content_id: 'vid_123456',
    content_type: 'video',
    amount: 50
  },
  invalidTipAboveMaximum: {
    content_id: 'vid_123456',
    content_type: 'video',
    amount: 15000
  },
  invalidTipLongMessage: {
    content_id: 'vid_123456',
    content_type: 'video',
    amount: 1000,
    message: 'a'.repeat(201)
  },
  validBankTransfer: {
    type: 'bank_transfer',
    bank_name: 'みずほ銀行',
    branch_name: '渋谷支店',
    account_type: 'checking',
    account_number: '1234567',
    account_holder: 'タナカ タロウ'
  },
  validPayPal: {
    type: 'paypal',
    paypal_email: 'creator@example.com'
  },
  validWithdrawal: {
    withdrawal_method_id: 'wm_123456',
    amount: 45000
  },
  invalidWithdrawalBelowMinimum: {
    withdrawal_method_id: 'wm_123456',
    amount: 3000
  },
  validIndividualTaxInfo: {
    entity_type: 'individual',
    individual_number: '123456789012',
    name: '田中太郎',
    address: '東京都渋谷区〇〇1-2-3'
  },
  validBusinessTaxInfo: {
    entity_type: 'business',
    business_number: '1234567890123',
    name: '株式会社サンプル',
    address: '東京都渋谷区〇〇1-2-3'
  }
};
```

### 7.2 モックデータ

```typescript
export const stripeMockResponse = {
  id: 'pi_123456789',
  object: 'payment_intent',
  amount: 1000,
  currency: 'jpy',
  status: 'succeeded',
  receipt_url: 'https://stripe.com/receipts/abc123'
};

export const ccbillMockResponse = {
  transactionId: 'ccb_987654321',
  status: 'approved',
  amount: 1000,
  currency: 'JPY'
};

export const earningsStatsMock = {
  available_balance: 45000,
  pending_balance: 12000,
  this_month_earnings: 23000,
  total_withdrawn: 180000,
  breakdown: {
    tips: 18000,
    superchat: 15000,
    subscription_pool: 12000
  },
  earnings_timeline: [
    {
      date: '2025-10-01',
      tips: 500,
      superchat: 1000,
      subscription_pool: 800
    },
    {
      date: '2025-10-02',
      tips: 700,
      superchat: 1200,
      subscription_pool: 900
    }
  ]
};
```

---

## 8. テストカバレッジ目標

- ユニットテスト: 85%以上（手数料計算、バリデーション、決済プロバイダー選択）
- 統合テスト: 主要API 100%（投げ銭、収益、出金、税務情報）
- E2Eテスト: クリティカルパス 100%（投げ銭フロー、出金フロー）
- セキュリティテスト: PCI DSS要件対応、データ暗号化、レート制限
- パフォーマンステスト: 投げ銭 < 2秒、収益統計 < 500ms、出金申請 < 1秒

---

## 9. 既知の課題・制約

- Stripe/CCBillのテストモード・サンドボックス利用必須
- 実際の決済フローは手動検証も併用
- 税務情報の暗号化テストは環境変数設定が必要
- 大量投げ銭のパフォーマンステストは専用環境で実施
- Webhook受信テストは ngrok などのトンネリングツールが必要
