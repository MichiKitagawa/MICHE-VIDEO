# 09. 収益化仕様書

## 1. 概要

### 1.1 機能の目的
クリエイターが動画・ショート・ライブ配信から収益を得られる仕組みを提供する。投げ銭（Tips）、スーパーチャット、収益追跡、出金機能を実装し、Stripe（一般コンテンツ）とCCBill（アダルトコンテンツ）の2つの決済プロバイダーを統合する。

### 1.2 対応フロントエンド画面
- `/creation` - 収益ダッシュボード
- `/(tabs)/settings` - 出金管理タブ
- `/video/[id]` - 投げ銭ボタン（動画）
- `/short/[id]` - 投げ銭ボタン（ショート）
- `/live/[id]` - スーパーチャット（ライブ）

### 1.3 関連機能
- `02-subscription.md` - 決済プロバイダー統合（Stripe/CCBill）
- `05-video-playback.md` - 動画再生
- `07-short-playback.md` - ショート再生
- `08-live-streaming.md` - ライブ配信・スーパーチャット

---

## 2. ユースケース

### 2.1 主要ユーザーフロー

#### フロー1: 投げ銭（動画・ショート）
```
1. 視聴者が動画/ショート視聴中に投げ銭ボタンクリック
2. 金額選択モーダル表示（¥100, ¥500, ¥1,000, ¥5,000, ¥10,000）
3. メッセージ入力（オプション、最大200文字）
4. 決済方法選択（自動：一般→Stripe、アダルト→CCBill）
5. 決済確認画面
6. POST /api/tips/send
7. 決済処理（Stripe/CCBill）
8. 成功時:
   - クリエイターに収益加算
   - 視聴者に領収書メール送信
   - クリエイターに通知送信
9. 失敗時: エラーメッセージ表示、再試行可能
```

#### フロー2: スーパーチャット（ライブ配信）
```
1. 視聴者がライブ配信視聴中にスーパーチャットボタンクリック
2. 金額選択モーダル表示（¥100, ¥500, ¥1,000, ¥5,000, ¥10,000）
3. メッセージ入力（必須、最大200文字）
4. 決済確認画面
5. POST /api/live/:id/superchat
6. 決済処理（Stripe/CCBill）
7. 成功時:
   - チャット欄に目立つ形で表示（色付き、ピン留め）
   - クリエイターに収益加算
   - 通知音・アニメーション表示
   - 視聴者に領収書メール送信
8. 失敗時: エラーメッセージ表示、再試行可能
```

#### フロー3: 収益確認
```
1. クリエイターが /creation の「収益」タブにアクセス
2. GET /api/earnings/stats → 収益統計取得
3. ダッシュボード表示:
   - 出金可能残高
   - 保留中残高
   - 今月の収益
   - 累計出金額
   - 収益内訳（投げ銭、スーパーチャット、サブスク分配）
4. 収益グラフ表示（日別、月別）
```

#### フロー4: 出金申請
```
1. クリエイターが「出金する」ボタンクリック
2. GET /api/withdrawal/methods → 出金方法一覧取得
3. 出金方法選択（銀行振込、PayPal）
4. 出金額入力（最低¥5,000、最大: 出金可能残高）
5. 確認画面表示（手数料¥250表示）
6. POST /api/withdrawal/request
7. 出金申請受付
8. ステータス: pending → processing → completed
9. 振込完了後、メール通知
```

#### フロー5: 出金方法登録
```
1. クリエイターが「出金方法を追加」ボタンクリック
2. 出金方法選択（銀行振込 or PayPal）
3. 銀行振込の場合:
   - 銀行名、支店名、口座種別、口座番号、口座名義入力
4. PayPalの場合:
   - PayPalメールアドレス入力
5. POST /api/withdrawal/methods/add
6. 本人確認（マイナンバー or 法人番号）
7. 確認後、出金方法として登録
```

### 2.2 エッジケース
- 決済失敗時の再試行
- 出金可能残高不足
- 税務情報未登録での出金試行
- 決済プロバイダーの変更（Stripe ↔ CCBill）
- 高額スーパーチャットのスパム

---

## 3. データモデル

### 3.1 テーブル定義

#### `earnings` テーブル
```sql
CREATE TABLE earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type VARCHAR(20) NOT NULL, -- 'tip', 'superchat', 'subscription_pool'
  source_id VARCHAR(100), -- video_id, short_id, live_stream_id, subscription_id
  amount INTEGER NOT NULL, -- 円単位
  platform_fee INTEGER NOT NULL, -- プラットフォーム手数料（30%）
  net_amount INTEGER NOT NULL, -- 手数料差し引き後
  payment_provider VARCHAR(20), -- 'stripe', 'ccbill'
  transaction_id VARCHAR(255),
  status VARCHAR(20) NOT NULL, -- 'pending', 'available', 'withdrawn'
  available_at TIMESTAMP, -- 出金可能日（14日後）
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_earnings_user_id (user_id),
  INDEX idx_earnings_source_type (source_type),
  INDEX idx_earnings_status (status),
  INDEX idx_earnings_available_at (available_at)
);
```

#### `tips` テーブル
```sql
CREATE TABLE tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type VARCHAR(20) NOT NULL, -- 'video', 'short', 'live'
  content_id UUID NOT NULL,
  amount INTEGER NOT NULL, -- 円単位
  message TEXT,
  payment_provider VARCHAR(20) NOT NULL,
  transaction_id VARCHAR(255),
  status VARCHAR(20) NOT NULL, -- 'pending', 'completed', 'failed', 'refunded'
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_tips_from_user_id (from_user_id),
  INDEX idx_tips_to_user_id (to_user_id),
  INDEX idx_tips_content (content_type, content_id),
  INDEX idx_tips_created_at (created_at DESC)
);
```

#### `withdrawal_methods` テーブル
```sql
CREATE TABLE withdrawal_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'bank_transfer', 'paypal', 'other'

  -- 銀行振込の場合
  bank_name VARCHAR(100),
  branch_name VARCHAR(100),
  account_type VARCHAR(20), -- 'checking', 'savings'
  account_number VARCHAR(20), -- 暗号化保存
  account_holder VARCHAR(100),

  -- PayPalの場合
  paypal_email VARCHAR(255),

  -- その他の場合
  metadata JSONB, -- For 'other' type additional information

  is_verified BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_withdrawal_methods_user_id (user_id)
);
```

#### `withdrawal_requests` テーブル
```sql
CREATE TABLE withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  withdrawal_method_id UUID NOT NULL REFERENCES withdrawal_methods(id),
  amount INTEGER NOT NULL, -- 円単位
  fee INTEGER NOT NULL, -- 手数料
  net_amount INTEGER NOT NULL, -- 実際の振込額
  status VARCHAR(20) NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
  requested_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  error_message TEXT,

  INDEX idx_withdrawal_requests_user_id (user_id),
  INDEX idx_withdrawal_requests_status (status),
  INDEX idx_withdrawal_requests_requested_at (requested_at DESC)
);
```

#### `tax_info` テーブル
```sql
CREATE TABLE tax_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type VARCHAR(20) NOT NULL, -- 'individual', 'business'
  individual_number VARCHAR(255), -- マイナンバー（暗号化保存）
  business_number VARCHAR(255), -- 法人番号（暗号化保存）
  name VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id),
  INDEX idx_tax_info_user_id (user_id)
);
```

### 3.2 リレーション図
```
users (1) ─── (N) earnings
  │
  ├─── (N) tips (from_user)
  ├─── (N) tips (to_user)
  │
  ├─── (N) withdrawal_methods
  │
  ├─── (N) withdrawal_requests
  │
  └─── (1) tax_info
```

---

## 4. API仕様

### 4.1 投げ銭送信

**エンドポイント**: `POST /api/tips/send`

**認証**: 必須（Bearer Token）

**リクエスト**:
```json
{
  "content_id": "vid_123456",
  "content_type": "video",
  "amount": 1000,
  "message": "素晴らしい動画でした！"
}
```

**レスポンス** (201 Created):
```json
{
  "tip": {
    "id": "tip_123456",
    "content_id": "vid_123456",
    "content_type": "video",
    "amount": 1000,
    "message": "素晴らしい動画でした！",
    "payment_provider": "stripe",
    "status": "completed",
    "created_at": "2025-10-25T12:00:00Z"
  },
  "payment": {
    "transaction_id": "txn_abc123",
    "receipt_url": "https://stripe.com/receipts/xxx"
  }
}
```

**エラーレスポンス**:
- `400 Bad Request` - 金額が不正（最小¥100）
- `402 Payment Required` - 決済失敗
- `429 Too Many Requests` - 投げ銭レート制限超過

---

### 4.2 収益統計取得

**エンドポイント**: `GET /api/earnings/stats`

**認証**: 必須（Bearer Token、クリエイター権限）

**レスポンス** (200 OK):
```json
{
  "available_balance": 45000,
  "pending_balance": 12000,
  "this_month_earnings": 23000,
  "total_withdrawn": 180000,
  "breakdown": {
    "tips": 18000,
    "superchat": 15000,
    "subscription_pool": 12000
  },
  "earnings_timeline": [
    {
      "date": "2025-10-01",
      "tips": 500,
      "superchat": 1000,
      "subscription_pool": 800
    }
  ]
}
```

---

### 4.3 収益履歴取得

**エンドポイント**: `GET /api/earnings/history`

**認証**: 必須（Bearer Token、クリエイター権限）

**クエリパラメータ**:
- `page` (integer): ページ番号（デフォルト: 1）
- `limit` (integer): 取得件数（デフォルト: 20）
- `source_type` (string): フィルター（`tip`, `superchat`, `subscription_pool`）

**レスポンス** (200 OK):
```json
{
  "earnings": [
    {
      "id": "earn_123456",
      "source_type": "tip",
      "source_id": "vid_123456",
      "source_title": "素晴らしい動画タイトル",
      "amount": 1000,
      "platform_fee": 300,
      "net_amount": 700,
      "status": "available",
      "available_at": "2025-11-08T12:00:00Z",
      "created_at": "2025-10-25T12:00:00Z"
    }
  ],
  "pagination": {
    "total": 234,
    "page": 1,
    "limit": 20
  }
}
```

---

### 4.4 投げ銭履歴取得（送信者）

**エンドポイント**: `GET /api/tips/sent`

**認証**: 必須（Bearer Token）

**クエリパラメータ**:
- `page` (integer): ページ番号（デフォルト: 1）
- `limit` (integer): 取得件数（デフォルト: 20）

**レスポンス** (200 OK):
```json
{
  "tips": [
    {
      "id": "tip_123456",
      "content_id": "vid_123456",
      "content_title": "素晴らしい動画タイトル",
      "content_thumbnail": "https://cdn.example.com/thumbnails/vid_123456.jpg",
      "creator_name": "田中太郎",
      "amount": 1000,
      "message": "素晴らしい動画でした！",
      "payment_provider": "stripe",
      "created_at": "2025-10-25T12:00:00Z",
      "status": "completed"
    }
  ],
  "pagination": {
    "total": 12,
    "page": 1,
    "limit": 20
  }
}
```

---

### 4.5 出金方法一覧取得

**エンドポイント**: `GET /api/withdrawal/methods`

**認証**: 必須（Bearer Token、クリエイター権限）

**レスポンス** (200 OK):
```json
{
  "methods": [
    {
      "id": "wm_123456",
      "type": "bank_transfer",
      "bank_name": "みずほ銀行",
      "branch_name": "渋谷支店",
      "account_type": "checking",
      "account_number": "****1234",
      "account_holder": "タナカ タロウ",
      "is_verified": true,
      "is_default": true,
      "created_at": "2025-10-01T12:00:00Z"
    }
  ]
}
```

---

### 4.6 出金方法追加

**エンドポイント**: `POST /api/withdrawal/methods/add`

**認証**: 必須（Bearer Token、クリエイター権限）

**リクエスト（銀行振込）**:
```json
{
  "type": "bank_transfer",
  "bank_name": "みずほ銀行",
  "branch_name": "渋谷支店",
  "account_type": "checking",
  "account_number": "1234567",
  "account_holder": "タナカ タロウ"
}
```

**リクエスト（PayPal）**:
```json
{
  "type": "paypal",
  "paypal_email": "tanaka@example.com"
}
```

**レスポンス** (201 Created):
```json
{
  "method": {
    "id": "wm_123456",
    "type": "bank_transfer",
    "bank_name": "みずほ銀行",
    "branch_name": "渋谷支店",
    "is_verified": false,
    "created_at": "2025-10-25T12:00:00Z"
  },
  "message": "出金方法を追加しました。本人確認を完了してください。"
}
```

---

### 4.7 出金申請

**エンドポイント**: `POST /api/withdrawal/request`

**認証**: 必須（Bearer Token、クリエイター権限）

**リクエスト**:
```json
{
  "withdrawal_method_id": "wm_123456",
  "amount": 45000
}
```

**レスポンス** (201 Created):
```json
{
  "withdrawal": {
    "id": "wd_123456",
    "amount": 45000,
    "fee": 250,
    "net_amount": 44750,
    "status": "pending",
    "requested_at": "2025-10-25T12:00:00Z",
    "estimated_completion": "2025-10-30T12:00:00Z"
  },
  "message": "出金申請を受け付けました。5営業日以内に振り込まれます。"
}
```

**エラーレスポンス**:
- `400 Bad Request` - 最低出金額未満（¥5,000）
- `400 Bad Request` - 出金可能残高不足
- `403 Forbidden` - 税務情報未登録

---

### 4.8 出金履歴取得

**エンドポイント**: `GET /api/withdrawal/history`

**認証**: 必須（Bearer Token、クリエイター権限）

**クエリパラメータ**:
- `page` (integer): ページ番号（デフォルト: 1）
- `limit` (integer): 取得件数（デフォルト: 20）

**レスポンス** (200 OK):
```json
{
  "withdrawals": [
    {
      "id": "wd_123456",
      "amount": 45000,
      "fee": 250,
      "net_amount": 44750,
      "method_type": "bank_transfer",
      "method_display": "みずほ銀行 渋谷支店",
      "status": "completed",
      "requested_at": "2025-10-25T12:00:00Z",
      "processed_at": "2025-10-28T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 8,
    "page": 1,
    "limit": 20
  }
}
```

---

### 4.9 税務情報登録

**エンドポイント**: `POST /api/tax-info/register`

**認証**: 必須（Bearer Token、クリエイター権限）

**リクエスト（個人）**:
```json
{
  "entity_type": "individual",
  "individual_number": "123456789012",
  "name": "田中太郎",
  "address": "東京都渋谷区〇〇1-2-3"
}
```

**リクエスト（法人）**:
```json
{
  "entity_type": "business",
  "business_number": "1234567890123",
  "name": "株式会社サンプル",
  "address": "東京都渋谷区〇〇1-2-3"
}
```

**レスポンス** (201 Created):
```json
{
  "tax_info": {
    "id": "tax_123456",
    "entity_type": "individual",
    "name": "田中太郎",
    "is_verified": false,
    "created_at": "2025-10-25T12:00:00Z"
  },
  "message": "税務情報を登録しました。確認後、出金が可能になります。"
}
```

---

### 4.10 決済プロバイダー自動選択

**エンドポイント**: `GET /api/payments/provider`

**認証**: 必須（Bearer Token）

**クエリパラメータ**:
- `content_id` (string): コンテンツID
- `content_type` (string): コンテンツタイプ（`video`, `short`, `live`）

**レスポンス** (200 OK):
```json
{
  "content_id": "vid_123456",
  "content_type": "video",
  "is_adult": false,
  "payment_provider": "stripe",
  "available_amounts": [100, 500, 1000, 5000, 10000]
}
```

---

## 5. ビジネスルール

### 5.1 手数料構造

#### プラットフォーム手数料
- 投げ銭: 30%
- スーパーチャット: 30%
- サブスク分配: 50%（残り50%はクリエイターに分配）

#### 出金手数料
- 銀行振込: ¥250/回
- PayPal: ¥0（PayPal側の手数料のみ）

### 5.2 出金ルール

#### 最低出金額
- ¥5,000

#### 出金可能タイミング
- 収益発生から14日後
- 保留期間中は「保留中残高」として表示

#### 出金処理期間
- 銀行振込: 5営業日以内
- PayPal: 3営業日以内

### 5.3 投げ銭・スーパーチャット

#### 金額
- ¥100, ¥500, ¥1,000, ¥5,000, ¥10,000

#### メッセージ
- 投げ銭: 最大200文字（オプション）
- スーパーチャット: 最大200文字（必須）

#### レート制限
- 投げ銭: 1分間に5回まで
- スーパーチャット: 1分間に3回まで

### 5.4 決済プロバイダー選択

```typescript
function selectPaymentProvider(contentType: string, contentId: string): 'stripe' | 'ccbill' {
  const content = getContent(contentType, contentId);
  if (content.is_adult) {
    return 'ccbill'; // アダルトコンテンツ → CCBill
  }
  return 'stripe'; // 一般コンテンツ → Stripe
}
```

### 5.5 エラーハンドリング

#### 決済失敗
```json
{
  "error": "payment_failed",
  "message": "決済に失敗しました",
  "details": {
    "reason": "card_declined",
    "retry": true
  }
}
```

#### 出金可能残高不足
```json
{
  "error": "insufficient_balance",
  "message": "出金可能残高が不足しています",
  "details": {
    "available_balance": 3000,
    "requested_amount": 5000,
    "minimum_amount": 5000
  }
}
```

### 5.6 境界値

- 最小投げ銭額: ¥100
- 最大投げ銭額: ¥10,000/回
- 1日の投げ銭上限: ¥100,000
- 最小出金額: ¥5,000
- 最大出金額: 出金可能残高

### 5.7 エッジケース

#### 決済プロバイダー変更時の収益
- Stripe → CCBill: 別々に管理、出金時に統合
- CCBill → Stripe: 別々に管理、出金時に統合

#### 税務情報未登録
- ¥100,000以上の出金: 税務情報登録必須
- ¥100,000未満: 税務情報なしで出金可能

#### 返金処理
- 投げ銭: 30日以内は返金可能
- スーパーチャット: 返金不可（ライブ配信の性質上）

---

## 6. 非機能要件

### 6.1 パフォーマンス
- 投げ銭送信: 2秒以内（決済処理含む）
- 収益統計取得: 500ms以内（P95）
- 出金申請: 1秒以内（P95）

### 6.2 セキュリティ
- PCI DSS準拠（カード情報はStripe/CCBillで管理）
- 税務情報の暗号化保存（AES-256）
- 口座番号のマスク表示（****1234）
- 2段階認証（出金時）

### 6.3 可用性
- SLA: 99.9%
- 決済失敗時の自動リトライ（3回）
- Webhook受信失敗時のリトライ（指数バックオフ）

---

## 7. 実装上の注意点

### 7.1 外部サービス連携
- Stripe: `stripe-node` SDK使用
- CCBill: Webhook API（REST形式）
- 税務情報: マイナンバーカードAPI（将来対応）

### 7.2 技術的制約
- Stripeテストモード/本番モードの環境変数分離
- CCBillアカウントID・Saltsの環境変数管理
- Webhook Secret署名検証
- 税務情報の暗号化キー管理

### 7.3 既知の課題
- CCBillは日本円直接サポートなし（USD換算表示）
- 投げ銭のリアルタイム反映（Webhook遅延）
- 税務情報のマイナンバーAPI未対応（手動入力のみ）

---

## 8. 関連ドキュメント
- `specs/features/02-subscription.md` - 決済プロバイダー統合
- `specs/features/08-live-streaming.md` - スーパーチャット
- `specs/references/payment-integration.md` - Stripe/CCBill詳細統合仕様
- `specs/architecture/security.md` - PCI DSS対応
