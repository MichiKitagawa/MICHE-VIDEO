# 01. 認証・認可仕様書

## 1. 概要

### 1.1 機能の目的
ユーザーの登録、ログイン、セッション管理、権限制御を提供し、プラットフォーム全体のセキュリティ基盤を構築する。

### 1.2 対応フロントエンド画面
- `/login` - ログイン画面
- `/register` - ユーザー登録画面
- `/(tabs)/settings` - プロフィール編集、アカウント設定
- 全画面 - 認証状態の管理（Header、ナビゲーションガード）

### 1.3 関連機能
- `02-subscription.md` - サブスクプラン情報の取得
- `04-video-management.md` - 動画投稿権限
- `08-live-streaming.md` - ライブ配信権限
- `09-monetization.md` - 収益管理アクセス

---

## 2. ユースケース

### 2.1 主要ユーザーフロー

#### フロー1: 新規ユーザー登録
```
1. ユーザーが /register にアクセス
2. メールアドレス、パスワード、ユーザー名を入力
3. POST /api/auth/register
4. メール確認リンクを送信（オプション）
5. ログイン状態でダッシュボードにリダイレクト
6. JWTトークン発行（Cookieまたはローカルストレージ）
```

#### フロー2: ログイン
```
1. ユーザーが /login にアクセス
2. メールアドレス、パスワードを入力
3. POST /api/auth/login
4. JWTトークン発行
5. ダッシュボードにリダイレクト
```

#### フロー3: トークンリフレッシュ
```
1. JWTトークンの有効期限が近づく（残り5分未満）
2. POST /api/auth/refresh（リフレッシュトークン使用）
3. 新しいアクセストークン発行
4. フロントエンドでトークン更新
```

#### フロー4: ログアウト
```
1. ユーザーがログアウトボタンをクリック
2. POST /api/auth/logout
3. サーバー側でリフレッシュトークン無効化
4. フロントエンドでトークン削除
5. /login にリダイレクト
```

### 2.2 エッジケース
- 既に登録済みのメールアドレスでの登録試行
- パスワード忘れ・リセット
- 複数デバイスでの同時ログイン
- トークン期限切れ時のAPI呼び出し
- メール確認未完了でのログイン試行

---

## 3. データモデル

### 3.1 テーブル定義

#### `users` テーブル
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url VARCHAR(500),
  is_email_verified BOOLEAN DEFAULT FALSE,
  is_creator BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP,

  -- インデックス
  INDEX idx_users_email (email),
  INDEX idx_users_created_at (created_at)
);
```

#### `user_sessions` テーブル
```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(255) NOT NULL,
  device_info JSONB,  -- {device_type, os, browser, ip_address}
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_accessed_at TIMESTAMP DEFAULT NOW(),
  is_revoked BOOLEAN DEFAULT FALSE,

  -- インデックス
  INDEX idx_sessions_user_id (user_id),
  INDEX idx_sessions_expires_at (expires_at),
  INDEX idx_sessions_refresh_token (refresh_token_hash)
);
```

#### `email_verifications` テーブル
```sql
CREATE TABLE email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verification_code VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),

  -- インデックス
  INDEX idx_email_verifications_user_id (user_id),
  INDEX idx_email_verifications_code (verification_code)
);
```

#### `password_resets` テーブル
```sql
CREATE TABLE password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reset_token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),

  -- インデックス
  INDEX idx_password_resets_user_id (user_id),
  INDEX idx_password_resets_token (reset_token_hash)
);
```

### 3.2 リレーション図
```
users (1) ─── (N) user_sessions
  │
  ├─── (N) email_verifications
  │
  └─── (N) password_resets
```

---

## 4. API仕様

### 4.1 ユーザー登録

**エンドポイント**: `POST /api/auth/register`

**リクエスト**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "田中太郎",
  "display_name": "たなか"
}
```

**レスポンス** (201 Created):
```json
{
  "user": {
    "id": "usr_123456",
    "email": "user@example.com",
    "name": "田中太郎",
    "display_name": "たなか",
    "avatar_url": null,
    "is_email_verified": false,
    "created_at": "2025-10-25T12:00:00Z"
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4=",
    "expires_in": 86400
  }
}
```

**エラーレスポンス**:
- `400 Bad Request` - バリデーションエラー
- `409 Conflict` - メールアドレス既に使用済み

---

### 4.2 ログイン

**エンドポイント**: `POST /api/auth/login`

**リクエスト**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**レスポンス** (200 OK):
```json
{
  "user": {
    "id": "usr_123456",
    "email": "user@example.com",
    "name": "田中太郎",
    "display_name": "たなか",
    "avatar_url": "https://cdn.example.com/avatars/usr_123456.jpg",
    "is_email_verified": true,
    "subscription_plan": {
      "id": "plan_premium",
      "name": "Premium",
      "price": 980
    }
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4=",
    "expires_in": 86400
  }
}
```

**エラーレスポンス**:
- `401 Unauthorized` - メールアドレスまたはパスワードが間違っている
- `403 Forbidden` - アカウントが停止されている

---

### 4.3 トークンリフレッシュ

**エンドポイント**: `POST /api/auth/refresh`

**リクエスト**:
```json
{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4="
}
```

**レスポンス** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 86400
}
```

**エラーレスポンス**:
- `401 Unauthorized` - リフレッシュトークンが無効または期限切れ

---

### 4.4 ログアウト

**エンドポイント**: `POST /api/auth/logout`

**認証**: 必須（Bearer Token）

**リクエスト**:
```json
{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4="
}
```

**レスポンス** (200 OK):
```json
{
  "message": "ログアウトしました"
}
```

---

### 4.5 現在のユーザー取得

**エンドポイント**: `GET /api/auth/me`

**認証**: 必須（Bearer Token）

**レスポンス** (200 OK):
```json
{
  "id": "usr_123456",
  "email": "user@example.com",
  "name": "田中太郎",
  "display_name": "たなか",
  "bio": "動画クリエイターです",
  "avatar_url": "https://cdn.example.com/avatars/usr_123456.jpg",
  "is_email_verified": true,
  "is_creator": true,
  "subscription": {
    "plan_id": "plan_premium",
    "plan_name": "Premium",
    "status": "active",
    "current_period_end": "2025-11-25T12:00:00Z"
  },
  "created_at": "2025-01-01T00:00:00Z"
}
```

---

### 4.6 プロフィール更新

**エンドポイント**: `PATCH /api/auth/profile`

**認証**: 必須（Bearer Token）

**リクエスト**:
```json
{
  "name": "田中太郎",
  "display_name": "たなかたろう",
  "bio": "動画クリエイターです。よろしくお願いします。",
  "avatar_url": "https://cdn.example.com/avatars/new.jpg"
}
```

**レスポンス** (200 OK):
```json
{
  "id": "usr_123456",
  "email": "user@example.com",
  "name": "田中太郎",
  "display_name": "たなかたろう",
  "bio": "動画クリエイターです。よろしくお願いします。",
  "avatar_url": "https://cdn.example.com/avatars/new.jpg",
  "updated_at": "2025-10-25T12:30:00Z"
}
```

---

### 4.7 パスワード変更

**エンドポイント**: `POST /api/auth/change-password`

**認証**: 必須（Bearer Token）

**リクエスト**:
```json
{
  "current_password": "OldPass123!",
  "new_password": "NewSecurePass456!"
}
```

**レスポンス** (200 OK):
```json
{
  "message": "パスワードを変更しました"
}
```

**エラーレスポンス**:
- `401 Unauthorized` - 現在のパスワードが間違っている
- `400 Bad Request` - 新しいパスワードがバリデーションに失敗

---

### 4.8 パスワードリセット要求

**エンドポイント**: `POST /api/auth/request-password-reset`

**リクエスト**:
```json
{
  "email": "user@example.com"
}
```

**レスポンス** (200 OK):
```json
{
  "message": "パスワードリセットメールを送信しました"
}
```

**Note**: セキュリティのため、メールアドレスが存在しない場合も同じレスポンスを返す。

---

### 4.9 パスワードリセット実行

**エンドポイント**: `POST /api/auth/reset-password`

**リクエスト**:
```json
{
  "reset_token": "abc123def456ghi789",
  "new_password": "NewSecurePass456!"
}
```

**レスポンス** (200 OK):
```json
{
  "message": "パスワードをリセットしました"
}
```

**エラーレスポンス**:
- `400 Bad Request` - トークンが無効または期限切れ

---

## 5. ビジネスルール

### 5.1 バリデーション

#### メールアドレス
- RFC 5322準拠
- 最大255文字
- 既に登録済みの場合はエラー

#### パスワード
- 最小8文字、最大64文字
- 英大文字、英小文字、数字、記号のうち3種類以上を含む
- よくあるパスワード（password123等）は禁止

#### ユーザー名
- 最小2文字、最大100文字
- Unicode対応（日本語可）
- 重複可能

#### 表示名
- 最大100文字
- Unicode対応（日本語可）
- 省略可能（nullの場合はnameを使用）

#### 自己紹介
- 最大500文字
- Unicode対応
- 省略可能

### 5.2 JWT構造

#### アクセストークン
```json
{
  "sub": "usr_123456",
  "email": "user@example.com",
  "name": "田中太郎",
  "role": "user",
  "plan_id": "plan_premium",
  "has_adult_access": false,
  "iat": 1730000000,
  "exp": 1730086400
}
```

**有効期限**: 24時間

#### リフレッシュトークン
- ランダム生成（256bit）
- SHA-256でハッシュ化してDB保存
- 有効期限: 30日
- 1ユーザーあたり最大5セッション（古いものから削除）

### 5.3 セッション管理

#### 同時ログイン制限
- Free: 1デバイスのみ
- Premium: 2デバイスまで
- Premium+: 3デバイスまで

新規ログイン時、上限を超える場合は最も古いセッションを無効化。

#### セッション有効期限
- アクティブ: 30日間
- 非アクティブ（14日間操作なし）: 自動ログアウト

### 5.4 権限制御

#### ロール定義
- `user` - 一般ユーザー（デフォルト）
- `creator` - コンテンツクリエイター（動画投稿可能）
- `admin` - 管理者（全権限）

#### 権限マトリックス
| 操作 | user | creator | admin |
|------|------|---------|-------|
| 動画視聴 | ✅ | ✅ | ✅ |
| 動画投稿 | ❌ | ✅ | ✅ |
| ライブ配信 | ❌ | ✅ | ✅ |
| ユーザー管理 | ❌ | ❌ | ✅ |
| コンテンツ削除 | ❌ | 自分のみ | ✅ |

### 5.5 エラーハンドリング

#### 認証エラー
- `401 Unauthorized` - トークンなし、無効、期限切れ
- `403 Forbidden` - 権限不足、アカウント停止

#### バリデーションエラー
```json
{
  "error": "validation_failed",
  "message": "入力内容に誤りがあります",
  "details": [
    {
      "field": "email",
      "message": "有効なメールアドレスを入力してください"
    },
    {
      "field": "password",
      "message": "パスワードは8文字以上である必要があります"
    }
  ]
}
```

### 5.6 境界値

- パスワード試行回数: 5回/15分（超過で15分間ロック）
- メール送信: 3通/時間（認証メール、パスワードリセット）
- API呼び出し: 100リクエスト/分（認証系エンドポイント）

### 5.7 エッジケース

#### メール確認未完了ユーザー
- ログイン可能
- 動画視聴可能
- 動画投稿・ライブ配信は不可（メール確認必須）

#### 複数デバイスログイン時のトークンリフレッシュ
- デバイスAでリフレッシュしてもデバイスBのセッションは維持
- 各デバイスが独立したリフレッシュトークンを保持

#### サブスクプラン変更時の権限
- 即時反映（JWTは次回リフレッシュ時に更新）
- ダウングレード時: 現在の視聴は継続可能、新規視聴は制限

---

## 6. 非機能要件

### 6.1 パフォーマンス
- ログインレスポンスタイム: 500ms以内（P95）
- トークンリフレッシュ: 200ms以内（P95）
- 同時ログイン処理: 1000req/sec

### 6.2 セキュリティ

#### パスワードハッシュ
- アルゴリズム: bcrypt
- コストファクター: 12

#### トークン生成
- アクセストークン: HMAC-SHA256署名
- リフレッシュトークン: 暗号論的に安全な乱数生成

#### HTTPS必須
- 全APIエンドポイントでTLS 1.3以上

#### CORS設定
- 許可オリジン: フロントエンドドメインのみ
- 資格情報付きリクエスト許可

### 6.3 可用性
- SLA: 99.9%
- セッションストア: Redis（レプリケーション構成）
- DB: PostgreSQL（マスター・スレーブ構成）

---

## 7. 実装上の注意点

### 7.1 外部サービス連携
- メール送信: SendGrid / AWS SES
- セッションストア: Redis
- DB: PostgreSQL 14以上

### 7.2 技術的制約
- JWTシークレットキーは環境変数で管理（`.env`にコミットしない）
- リフレッシュトークンはハッシュ化してDB保存
- パスワードは平文で保存しない（bcryptハッシュのみ）

### 7.3 既知の課題
- JWTは即座に無効化できない（有効期限まで有効）
  - 対策: ブラックリスト管理（Redis）またはアクセストークン短命化
- 複数デバイスでのリアルタイム同期
  - 対策: WebSocket通知またはポーリング

---

## 8. 関連ドキュメント
- `specs/references/authentication.md` - 認証詳細仕様
- `specs/references/data-models.md` - users, user_sessionsテーブル詳細
- `specs/references/api-endpoints.md` - 全APIエンドポイント一覧
- `specs/architecture/security.md` - セキュリティアーキテクチャ
