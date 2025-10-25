# 02. サブスクリプション管理仕様書

## 1. 概要

### 1.1 機能の目的
3段階のサブスクリプションプラン（Free/Premium/Premium+）を管理し、Stripe（一般コンテンツ）とCCBill（アダルトコンテンツ）の2つの決済プロバイダーを統合する。

### 1.2 対応フロントエンド画面
- `/(tabs)/settings` - プラン管理タブ
- `/terms` - 利用規約
- `/privacy` - プライバシーポリシー
- 全画面 - プラン制限による機能制御

### 1.3 関連機能
- `01-authentication.md` - ユーザー認証（サブスク情報取得）
- `05-video-playback.md` - Netflix動画アクセス制御
- `07-short-playback.md` - アダルトショートアクセス制御
- `08-live-streaming.md` - ライブ配信権限

---

## 2. ユースケース

### 2.1 主要ユーザーフロー

#### フロー1: プラン変更（Free → Premium）
```
1. ユーザーが設定画面でPremiumプランを選択
2. Stripe決済ページにリダイレクト
3. カード情報入力・決済
4. Stripe Webhook → サーバーがサブスク作成を記録
5. ユーザーをダッシュボードにリダイレクト
6. Premium機能が即座に利用可能
```

#### フロー2: プラン変更（Premium → Premium+）
```
1. ユーザーが設定画面でPremium+プランを選択
2. 年齢確認モーダル表示（18歳以上確認）
3. チェックボックスにチェック・確認ボタンクリック
4. 決済プロバイダー変更警告表示（Stripe → CCBill）
5. CCBill決済ページにリダイレクト
6. カード情報入力・決済（年齢確認を含む）
7. CCBill Webhook → サーバーがサブスク作成、Stripeサブスクをキャンセル
8. ユーザーをダッシュボードにリダイレクト
9. アダルトコンテンツアクセス権付与
```

#### フロー3: サブスクリプションキャンセル
```
1. ユーザーが設定画面で「サブスクをキャンセル」をクリック
2. 確認ダイアログ表示
3. 確認後、POST /api/subscriptions/cancel
4. 決済プロバイダーでサブスクキャンセル（期間終了時）
5. current_period_endまで引き続き利用可能
6. 期間終了後にFreeプランに降格
```

#### フロー4: 決済失敗・リトライ
```
1. 決済プロバイダーが定期決済を試行
2. カード期限切れ等で失敗
3. Webhook受信 → ユーザーに通知メール送信
4. 3日間の猶予期間（引き続き利用可能）
5. 猶予期間中にユーザーがカード情報更新
6. 決済リトライ成功 → サブスク継続
7. 猶予期間終了でも未解決 → Freeプランに降格
```

### 2.2 エッジケース
- Stripe → CCBillへの変更時の日割り計算
- CCBill → Stripeへの変更時の処理
- 決済失敗時の猶予期間中のアクセス権
- Webhookの遅延・重複受信
- サブスク有効期限切れ直後のAPI呼び出し

---

## 3. データモデル

### 3.1 テーブル定義

#### `subscription_plans` テーブル
```sql
CREATE TABLE subscription_plans (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL, -- 円単位
  billing_interval VARCHAR(20) NOT NULL, -- 'month', 'year'
  payment_provider VARCHAR(20) NOT NULL, -- 'stripe', 'ccbill', 'free'
  features JSONB NOT NULL,
  has_adult_access BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 初期データ
INSERT INTO subscription_plans VALUES
('plan_free', 'Free', 'Free', '無料プラン', 0, 'month', 'free',
 '{"general_videos": true, "netflix_videos": false, "adult_videos": false, "live_streaming": false}',
 false, true, 1),
('plan_premium', 'Premium', 'Premium', 'プレミアムプラン', 980, 'month', 'stripe',
 '{"general_videos": true, "netflix_videos": true, "adult_videos": false, "live_streaming": true, "hd_quality": true, "ad_free": true}',
 false, true, 2),
('plan_premium_plus', 'Premium+', 'Premium+', 'プレミアム+プラン', 1980, 'month', 'ccbill',
 '{"general_videos": true, "netflix_videos": true, "adult_videos": true, "live_streaming": true, "hd_quality": true, "ad_free": true, "priority_support": true}',
 true, true, 3);
```

#### `user_subscriptions` テーブル
```sql
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL REFERENCES subscription_plans(id),
  payment_provider VARCHAR(20) NOT NULL, -- 'stripe', 'ccbill', 'free'
  external_subscription_id VARCHAR(255), -- Stripe/CCBillのサブスクID
  external_customer_id VARCHAR(255), -- Stripe/CCBillの顧客ID
  status VARCHAR(20) NOT NULL, -- 'active', 'canceled', 'past_due', 'unpaid'
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- 制約
  UNIQUE(user_id, plan_id, status),
  INDEX idx_user_subscriptions_user_id (user_id),
  INDEX idx_user_subscriptions_status (status),
  INDEX idx_user_subscriptions_external_id (external_subscription_id)
);
```

#### `subscription_payment_history` テーブル
```sql
CREATE TABLE subscription_payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  payment_provider VARCHAR(20) NOT NULL,
  external_payment_id VARCHAR(255),
  amount INTEGER NOT NULL, -- 円単位
  currency VARCHAR(3) DEFAULT 'JPY',
  status VARCHAR(20) NOT NULL, -- 'succeeded', 'failed', 'pending', 'refunded'
  payment_method_type VARCHAR(50), -- 'card', 'wallet', etc.
  failure_reason TEXT,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_payment_history_subscription_id (user_subscription_id),
  INDEX idx_payment_history_status (status),
  INDEX idx_payment_history_external_id (external_payment_id)
);
```

#### `payment_methods` テーブル
```sql
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_provider VARCHAR(20) NOT NULL,
  external_payment_method_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'card'
  card_brand VARCHAR(20), -- 'visa', 'mastercard', 'amex', 'jcb'
  card_last4 VARCHAR(4),
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_payment_methods_user_id (user_id),
  INDEX idx_payment_methods_external_id (external_payment_method_id)
);
```

### 3.2 リレーション図
```
subscription_plans (1) ─── (N) user_subscriptions
                                    │
users (1) ──────────────────────────┤
  │                                 │
  └─── (N) payment_methods          │
                                    │
                            (1) ─── (N) subscription_payment_history
```

---

## 4. API仕様

### 4.1 プラン一覧取得

**エンドポイント**: `GET /api/subscriptions/plans`

**認証**: 不要

**レスポンス** (200 OK):
```json
[
  {
    "id": "plan_free",
    "name": "Free",
    "name_en": "Free",
    "price": 0,
    "currency": "JPY",
    "billing_cycle": "monthly",
    "features": ["一般動画視聴"],
    "feature_flags": {
      "general_videos": true,
      "netflix_videos": false,
      "adult_videos": false,
      "hd_quality": false,
      "ad_free": false
    },
    "has_netflix_access": false,
    "has_adult_access": false,
    "has_ads": true,
    "is_current": false,
    "payment_provider": null,
    "next_billing_date": null,
    "device_limit": 1
  },
  {
    "id": "plan_premium",
    "name": "プレミアムプラン",
    "name_en": "Premium",
    "price": 980,
    "currency": "JPY",
    "billing_cycle": "monthly",
    "features": ["Netflix型コンテンツ視聴", "広告なし", "1080p 配信", "ライブ配信", "2デバイス同時視聴"],
    "feature_flags": {
      "general_videos": true,
      "netflix_videos": true,
      "adult_videos": false,
      "hd_quality": true,
      "ad_free": true
    },
    "has_netflix_access": true,
    "has_adult_access": false,
    "has_ads": false,
    "is_current": false,
    "payment_provider": "stripe",
    "next_billing_date": "2025-11-01",
    "device_limit": 2
  },
  {
    "id": "plan_premium_plus",
    "name": "プレミアム+プラン",
    "name_en": "Premium+",
    "price": 1980,
    "currency": "JPY",
    "billing_cycle": "monthly",
    "features": ["Netflix型コンテンツ視聴", "アダルトコンテンツ視聴", "広告なし", "1080p 配信", "ライブ配信", "優先サポート", "5デバイス同時視聴"],
    "feature_flags": {
      "general_videos": true,
      "netflix_videos": true,
      "adult_videos": true,
      "hd_quality": true,
      "ad_free": true,
      "priority_support": true
    },
    "has_netflix_access": true,
    "has_adult_access": true,
    "has_ads": false,
    "is_current": false,
    "payment_provider": "ccbill",
    "next_billing_date": "2025-11-01",
    "device_limit": 5
  }
]
```

**Note**: For the Free plan, `payment_provider` is `null` since no payment is required.

---

### 4.2 現在のサブスクリプション取得

**エンドポイント**: `GET /api/subscriptions/current`

**認証**: 必須（Bearer Token）

**レスポンス** (200 OK):
```json
{
  "plan_id": "plan_premium",
  "plan_name": "Premium",
  "status": "active",
  "payment_provider": "stripe",
  "current_period_start": "2025-10-01T00:00:00Z",
  "current_period_end": "2025-11-01T00:00:00Z",
  "cancel_at_period_end": false,
  "features": {
    "general_videos": true,
    "netflix_videos": true,
    "adult_videos": false
  }
}
```

**Note**: The following endpoints support both frontend and backend patterns for compatibility:
- Backend pattern: `POST /api/subscriptions/create-checkout`
- Frontend pattern (alias): `POST /api/payment/stripe/checkout`

Both patterns are functionally identical and can be used interchangeably.

---

### 4.3 サブスクリプション作成（Stripe Checkout URL取得）

**エンドポイント**: `POST /api/subscriptions/create-checkout`
**エイリアス**: `POST /api/payment/stripe/checkout`

**認証**: 必須（Bearer Token）

**リクエスト**:
```json
{
  "plan_id": "plan_premium"
}
```

**レスポンス** (200 OK):
```json
{
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_xxx",
  "session_id": "cs_test_xxx"
}
```

---

### 4.4 サブスクリプション作成（CCBill）

**エンドポイント**: `POST /api/subscriptions/create-ccbill-checkout`
**エイリアス**: `POST /api/payment/ccbill/checkout`

**認証**: 必須（Bearer Token）

**リクエスト**:
```json
{
  "plan_id": "plan_premium_plus",
  "age_confirmed": true
}
```

**レスポンス** (200 OK):
```json
{
  "checkout_url": "https://bill.ccbill.com/jpost/signup.cgi?xxx",
  "subscription_type_id": "xxx"
}
```

**エラーレスポンス**:
- `400 Bad Request` - 年齢確認未チェック

---

### 4.5 サブスクリプション変更

**エンドポイント**: `POST /api/subscriptions/change`

**認証**: 必須（Bearer Token）

**リクエスト**:
```json
{
  "new_plan_id": "plan_premium_plus"
}
```

**レスポンス** (200 OK):
```json
{
  "message": "プランを変更しました",
  "subscription": {
    "plan_id": "plan_premium_plus",
    "status": "active",
    "current_period_end": "2025-11-01T00:00:00Z"
  }
}
```

**Note**: 決済プロバイダー変更が必要な場合は、新規チェックアウトURLを返す。

---

### 4.6 サブスクリプションキャンセル

**エンドポイント**: `POST /api/subscriptions/cancel`

**認証**: 必須（Bearer Token）

**レスポンス** (200 OK):
```json
{
  "message": "サブスクリプションをキャンセルしました",
  "subscription": {
    "plan_id": "plan_premium",
    "status": "active",
    "cancel_at_period_end": true,
    "current_period_end": "2025-11-01T00:00:00Z"
  }
}
```

---

### 4.7 決済履歴取得

**エンドポイント**: `GET /api/subscriptions/payment-history`

**認証**: 必須（Bearer Token）

**レスポンス** (200 OK):
```json
[
  {
    "id": "pay_xxx",
    "amount": 980,
    "currency": "JPY",
    "status": "succeeded",
    "payment_method": "Visa ****1234",
    "paid_at": "2025-10-01T00:00:00Z"
  },
  {
    "id": "pay_yyy",
    "amount": 980,
    "currency": "JPY",
    "status": "failed",
    "failure_reason": "カードの有効期限が切れています",
    "paid_at": null,
    "created_at": "2025-09-01T00:00:00Z"
  }
]
```

---

### 4.8 Stripe Webhook

**エンドポイント**: `POST /api/webhooks/stripe`

**認証**: Stripe署名検証

**処理イベント**:
- `checkout.session.completed` - サブスク作成
- `invoice.payment_succeeded` - 決済成功
- `invoice.payment_failed` - 決済失敗
- `customer.subscription.updated` - サブスク更新
- `customer.subscription.deleted` - サブスク削除

---

### 4.9 CCBill Webhook

**エンドポイント**: `POST /api/webhooks/ccbill`

**認証**: CCBill署名検証

**処理イベント**:
- `NewSaleSuccess` - 新規サブスク作成
- `RenewalSuccess` - 更新成功
- `RenewalFailure` - 更新失敗
- `Cancellation` - キャンセル
- `Chargeback` - チャージバック

---

## 5. ビジネスルール

### 5.1 プラン構成

| プラン | 月額 | 決済プロバイダー | 一般動画 | Netflix動画 | アダルト動画 | ライブ配信 |
|-------|------|----------------|---------|-----------|------------|----------|
| Free | ¥0 | - | ✅ | ❌ | ❌ | ❌ |
| Premium | ¥980 | Stripe | ✅ | ✅ | ❌ | ✅ |
| Premium+ | ¥1,980 | CCBill | ✅ | ✅ | ✅ | ✅ |

### 5.2 プラン変更ルール

#### アップグレード
- Free → Premium: 即座に反映、日割り計算なし
- Premium → Premium+: 決済プロバイダー変更、Stripeサブスクキャンセル、CCBill新規作成

#### ダウングレード
- Premium → Free: 期間終了時に反映
- Premium+ → Premium: 決済プロバイダー変更、CCBillサブスクキャンセル、Stripe新規作成
- Premium+ → Free: 期間終了時に反映

### 5.3 決済プロバイダー選択ロジック

```typescript
function selectPaymentProvider(planId: string): 'stripe' | 'ccbill' {
  if (planId === 'plan_premium_plus') {
    return 'ccbill'; // アダルトコンテンツ → CCBill
  }
  return 'stripe'; // 一般コンテンツ → Stripe
}
```

### 5.4 年齢確認要件

- Premium+プランへの変更時、18歳以上確認必須
- CCBillはクレジットカード情報で年齢確認を実施
- フロントエンドで確認チェックボックス必須

### 5.5 決済失敗時の処理

1. 決済失敗イベント受信
2. ユーザーに通知メール送信
3. 3日間の猶予期間設定（`status: 'past_due'`）
4. 猶予期間中は引き続きサービス利用可能
5. 猶予期間終了: `status: 'unpaid'` → Freeプランに降格

### 5.6 サブスク有効期限判定

```sql
-- 現在アクティブなサブスクを取得
SELECT * FROM user_subscriptions
WHERE user_id = $1
  AND status = 'active'
  AND current_period_end > NOW();
```

### 5.7 エラーハンドリング

- `400 Bad Request` - 無効なプランID、年齢確認未チェック
- `402 Payment Required` - 決済失敗
- `409 Conflict` - 既に同じプランに加入済み
- `500 Internal Server Error` - Webhook処理失敗

### 5.8 境界値

- プラン変更: 1回/日（頻繁な変更防止）
- Webhook処理: べき等性保証（重複イベント対応）
- 決済リトライ: 3回まで（3日間）

### 5.9 エッジケース

#### プロバイダー変更時の日割り計算
- Stripe → CCBill: Stripeで返金なし、CCBillで即時課金
- CCBill → Stripe: CCBillで返金なし、Stripeで即時課金

#### Webhook遅延
- Webhook受信前のAPI呼び出し: キャッシュされた古いプラン情報返却
- Webhook受信後: キャッシュ無効化、最新情報取得

#### 有効期限切れ直後
- `current_period_end`の1分後までは猶予（時刻同期のズレ考慮）

---

## 6. 非機能要件

### 6.1 パフォーマンス
- プラン一覧取得: 100ms以内
- サブスク状態取得: 200ms以内（キャッシュ利用）
- Webhook処理: 5秒以内（非同期ジョブ化）

### 6.2 セキュリティ
- Webhook署名検証必須
- HTTPS必須
- PCI DSS準拠（カード情報はStripe/CCBillで管理、自前保存しない）
- 年齢確認ログ保存（法的要件）

### 6.3 可用性
- SLA: 99.9%
- Webhook失敗時のリトライ: 指数バックオフ（1分、5分、15分）
- Stripe/CCBillダッシュボードで手動確認可能

---

## 7. 実装上の注意点

### 7.1 外部サービス連携
- Stripe: `stripe-node` SDK使用
- CCBill: Webhook API（REST形式）
- Webhook受信URL: 固定IPまたはドメイン必須

### 7.2 技術的制約
- Stripeテストモード/本番モードの環境変数分離
- CCBillアカウントID・Saltsの環境変数管理
- Webhook Secret署名検証

### 7.3 既知の課題
- Stripe → CCBill変更時の返金処理なし（ユーザー負担）
- CCBillは日本円直接サポートなし（USD換算表示）
- Webhook重複イベント対応（べき等性実装必須）

---

## 8. 関連ドキュメント
- `specs/references/payment-integration.md` - Stripe/CCBill詳細統合仕様
- `specs/references/business-rules.md` - 課金ルール詳細
- `specs/architecture/security.md` - PCI DSS対応
