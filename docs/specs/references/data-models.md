# データモデル仕様書

## 1. 概要

本ドキュメントは、動画配信プラットフォームの全データモデル（テーブル定義）を包括的に記載する。各テーブルのスキーマ、インデックス、制約、リレーション、および設計上の注意点を含む。

---

## 2. テーブル一覧

### 2.1 認証・ユーザー管理
- `users` - ユーザー基本情報
- `user_sessions` - セッション管理
- `email_verifications` - メール確認
- `password_resets` - パスワードリセット

### 2.2 サブスクリプション・決済
- `subscription_plans` - サブスクプラン定義
- `user_subscriptions` - ユーザーのサブスク情報
- `subscription_payment_history` - 決済履歴
- `payment_methods` - 決済方法

### 2.3 コンテンツ配信
- `media_files` - メディアファイル管理
- `transcoding_jobs` - トランスコードジョブ
- `cdn_urls` - CDN URL管理

### 2.4 動画管理
- `videos` - 動画メタデータ
- `video_tags` - 動画タグ
- `video_categories` - 動画カテゴリマスタ
- `video_versions` - 動画バージョン履歴

### 2.5 動画再生・インタラクション
- `video_views` - 動画視聴記録
- `video_likes` - いいね
- `video_comments` - コメント
- `watch_history` - 視聴履歴
- `video_recommendations` - おすすめ動画

### 2.6 ショート動画
- `shorts` - ショート動画メタデータ
- `short_tags` - ショートタグ
- `short_categories` - ショートカテゴリマスタ
- `short_versions` - ショートバージョン履歴
- `short_views` - ショート視聴記録
- `short_likes` - ショートいいね
- `short_comments` - ショートコメント
- `short_watch_history` - ショート視聴履歴
- `short_recommendations` - おすすめショート

### 2.7 ライブ配信
- `live_streams` - ライブ配信メタデータ
- `live_chat_messages` - ライブチャット
- `live_viewers` - ライブ視聴者
- `live_stream_stats` - ライブ統計

### 2.8 収益化
- `earnings` - 収益記録
- `tips` - 投げ銭
- `withdrawal_methods` - 出金方法
- `withdrawal_requests` - 出金申請
- `tax_info` - 税務情報

### 2.9 ソーシャル機能
- `follows` - フォロー関係
- `notifications` - 通知
- `user_stats` - ユーザー統計
- `activity_feed` - アクティビティフィード
- `notification_settings` - 通知設定

### 2.10 プレイリスト
- `playlists` - プレイリストメタデータ
- `playlist_videos` - プレイリスト内動画
- `playlist_views` - プレイリスト視聴記録

### 2.11 Netflix コンテンツ
- `netflix_contents` - Netflix コンテンツメタデータ
- `netflix_genres` - Netflix ジャンル
- `seasons` - シーズン
- `episodes` - エピソード
- `ip_licenses` - IP 権利管理
- `netflix_watch_history` - Netflix 視聴履歴

---

## 3. テーブル詳細定義

### 3.1 認証・ユーザー管理

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

  INDEX idx_users_email (email),
  INDEX idx_users_created_at (created_at)
);
```

**説明**: ユーザーの基本情報を格納。パスワードはbcryptでハッシュ化して保存。

**制約**:
- `email`: RFC 5322準拠、最大255文字、ユニーク必須
- `password_hash`: bcryptハッシュ（コストファクター12）
- `name`: 最小2文字、最大100文字
- `display_name`: 最大100文字、省略可能（nullの場合はnameを使用）
- `bio`: 最大500文字

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

  INDEX idx_sessions_user_id (user_id),
  INDEX idx_sessions_expires_at (expires_at),
  INDEX idx_sessions_refresh_token (refresh_token_hash)
);
```

**説明**: JWT リフレッシュトークンのセッション管理。

**制約**:
- リフレッシュトークンはSHA-256でハッシュ化して保存
- 1ユーザーあたり最大5セッション（古いものから削除）
- 有効期限: 30日

#### `email_verifications` テーブル

```sql
CREATE TABLE email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verification_code VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_email_verifications_user_id (user_id),
  INDEX idx_email_verifications_code (verification_code)
);
```

**説明**: メール確認用の認証コード管理。

#### `password_resets` テーブル

```sql
CREATE TABLE password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reset_token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_password_resets_user_id (user_id),
  INDEX idx_password_resets_token (reset_token_hash)
);
```

**説明**: パスワードリセット用トークン管理。

---

### 3.2 サブスクリプション・決済

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

**説明**: サブスクプランの定義（Free/Premium/Premium+）。

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

  UNIQUE(user_id, plan_id, status),
  INDEX idx_user_subscriptions_user_id (user_id),
  INDEX idx_user_subscriptions_status (status),
  INDEX idx_user_subscriptions_external_id (external_subscription_id)
);
```

**説明**: ユーザーのサブスク情報。Stripe/CCBillの外部IDを保持。

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

**説明**: サブスク決済の履歴。

#### `payment_methods` テーブル

```sql
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_provider VARCHAR(20) NOT NULL,
  external_payment_method_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'card', 'paypal', 'bank_transfer'
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

**説明**: ユーザーの決済方法（カード情報はStripe/CCBillで管理）。

---

### 3.3 コンテンツ配信

#### `media_files` テーブル

```sql
CREATE TABLE media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type VARCHAR(20) NOT NULL, -- 'video', 'short', 'live'
  content_id UUID, -- videos.id, shorts.id, live_streams.id
  file_type VARCHAR(20) NOT NULL, -- 'original', 'transcoded', 'thumbnail'
  storage_provider VARCHAR(20) DEFAULT 's3',
  storage_path VARCHAR(500) NOT NULL,
  file_size BIGINT, -- bytes
  duration INTEGER, -- seconds
  resolution VARCHAR(20), -- '1920x1080', '1280x720', etc.
  bitrate INTEGER, -- kbps
  codec VARCHAR(50),
  mime_type VARCHAR(100),
  status VARCHAR(20) NOT NULL, -- 'uploading', 'uploaded', 'processing', 'ready', 'failed'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_media_files_user_id (user_id),
  INDEX idx_media_files_content (content_type, content_id),
  INDEX idx_media_files_status (status)
);
```

**説明**: アップロードされたメディアファイルの管理。

#### `transcoding_jobs` テーブル

```sql
CREATE TABLE transcoding_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_file_id UUID NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
  job_type VARCHAR(20) NOT NULL, -- 'video', 'audio', 'thumbnail'
  target_resolution VARCHAR(20), -- '1080p', '720p', '480p', '360p'
  target_bitrate INTEGER, -- kbps
  status VARCHAR(20) NOT NULL, -- 'queued', 'processing', 'completed', 'failed'
  external_job_id VARCHAR(255), -- AWS MediaConvert Job ID
  progress INTEGER DEFAULT 0, -- 0-100
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_transcoding_jobs_media_file_id (media_file_id),
  INDEX idx_transcoding_jobs_status (status)
);
```

**説明**: トランスコードジョブの状態管理。

#### `cdn_urls` テーブル

```sql
CREATE TABLE cdn_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_file_id UUID NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
  url VARCHAR(1000) NOT NULL,
  signed_url VARCHAR(2000),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_cdn_urls_media_file_id (media_file_id),
  INDEX idx_cdn_urls_expires_at (expires_at)
);
```

**説明**: CDN配信URLの管理。署名付きURL。

---

### 3.4 動画管理

#### `videos` テーブル

```sql
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  duration INTEGER NOT NULL, -- 秒数
  thumbnail_url VARCHAR(500),

  -- プライバシー・権限
  privacy VARCHAR(20) DEFAULT 'public', -- 'public', 'unlisted', 'private'
  is_adult BOOLEAN DEFAULT FALSE,

  -- 統計情報
  view_count BIGINT DEFAULT 0,
  like_count BIGINT DEFAULT 0,
  comment_count BIGINT DEFAULT 0,

  -- メディアファイル参照
  media_file_id UUID REFERENCES media_files(id),

  -- タイムスタンプ
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP,

  -- インデックス
  INDEX idx_videos_user_id (user_id),
  INDEX idx_videos_category (category),
  INDEX idx_videos_privacy (privacy),
  INDEX idx_videos_is_adult (is_adult),
  INDEX idx_videos_created_at (created_at),
  INDEX idx_videos_view_count (view_count DESC)
);
```

**説明**: 動画のメタデータ管理。

#### `video_tags` テーブル

```sql
CREATE TABLE video_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  tag VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(video_id, tag),
  INDEX idx_video_tags_video_id (video_id),
  INDEX idx_video_tags_tag (tag)
);
```

**説明**: 動画タグ（最大30個）。

#### `video_categories` テーブル

```sql
CREATE TABLE video_categories (
  id VARCHAR(50) PRIMARY KEY,
  name_ja VARCHAR(50) NOT NULL,
  name_en VARCHAR(50) NOT NULL,
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

-- 初期データ
INSERT INTO video_categories VALUES
('entertainment', 'エンターテイメント', 'Entertainment', 'play-circle', 1, true),
('music', '音楽', 'Music', 'musical-notes', 2, true),
('gaming', 'ゲーム', 'Gaming', 'game-controller', 3, true),
('education', '教育', 'Education', 'school', 4, true),
('news', 'ニュース', 'News', 'newspaper', 5, true),
('sports', 'スポーツ', 'Sports', 'basketball', 6, true),
('technology', 'テクノロジー', 'Technology', 'laptop', 7, true),
('lifestyle', 'ライフスタイル', 'Lifestyle', 'cafe', 8, true),
('adult', 'アダルト', 'Adult', 'warning', 9, true);
```

**説明**: 動画カテゴリマスタデータ。

#### `video_versions` テーブル

```sql
CREATE TABLE video_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title VARCHAR(200),
  description TEXT,
  updated_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(video_id, version_number),
  INDEX idx_video_versions_video_id (video_id)
);
```

**説明**: 動画メタデータのバージョン履歴。

---

### 3.5 動画再生・インタラクション

#### `video_views` テーブル

```sql
CREATE TABLE video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- 未ログインの場合はNULL
  session_id VARCHAR(100), -- 未ログインユーザー識別用
  ip_address VARCHAR(45),
  user_agent TEXT,
  viewed_at TIMESTAMP DEFAULT NOW(),
  watch_duration INTEGER, -- 視聴時間（秒）

  INDEX idx_video_views_video_id (video_id),
  INDEX idx_video_views_user_id (user_id),
  INDEX idx_video_views_viewed_at (viewed_at)
);
```

**説明**: 動画視聴記録。視聴回数カウント用。

#### `video_likes` テーブル

```sql
CREATE TABLE video_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(video_id, user_id),
  INDEX idx_video_likes_video_id (video_id),
  INDEX idx_video_likes_user_id (user_id)
);
```

**説明**: 動画いいね。1ユーザー1動画につき1いいね。

#### `video_comments` テーブル

```sql
CREATE TABLE video_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES video_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,

  INDEX idx_video_comments_video_id (video_id),
  INDEX idx_video_comments_user_id (user_id),
  INDEX idx_video_comments_parent_id (parent_comment_id),
  INDEX idx_video_comments_created_at (created_at DESC)
);
```

**説明**: 動画コメント。返信機能（parent_comment_id）。

#### `watch_history` テーブル

```sql
CREATE TABLE watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  progress_seconds INTEGER DEFAULT 0, -- 視聴進捗（秒）
  duration_seconds INTEGER, -- 動画の総時間（秒）
  last_watched_at TIMESTAMP DEFAULT NOW(),
  completed BOOLEAN DEFAULT FALSE, -- 最後まで視聴したか

  UNIQUE(user_id, video_id),
  INDEX idx_watch_history_user_id (user_id),
  INDEX idx_watch_history_video_id (video_id),
  INDEX idx_watch_history_last_watched_at (last_watched_at DESC)
);
```

**説明**: 視聴履歴と進捗保存。

#### `video_recommendations` テーブル

```sql
CREATE TABLE video_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  recommended_video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  score FLOAT NOT NULL, -- おすすめスコア（0.0-1.0）
  reason VARCHAR(50), -- 'category', 'tag', 'user_history', 'trending'
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(video_id, recommended_video_id),
  INDEX idx_video_recommendations_video_id (video_id),
  INDEX idx_video_recommendations_score (score DESC)
);
```

**説明**: おすすめ動画の事前計算結果。

---

### 3.6 ショート動画

#### `shorts` テーブル

```sql
CREATE TABLE shorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  duration INTEGER NOT NULL, -- 秒数（最大60秒）
  thumbnail_url VARCHAR(500),

  -- プライバシー・権限
  privacy VARCHAR(20) DEFAULT 'public', -- 'public', 'unlisted', 'private'
  is_adult BOOLEAN DEFAULT FALSE,

  -- 統計情報
  view_count BIGINT DEFAULT 0,
  like_count BIGINT DEFAULT 0,
  comment_count BIGINT DEFAULT 0,

  -- メディアファイル参照
  media_file_id UUID REFERENCES media_files(id),

  -- タイムスタンプ
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP,

  -- インデックス
  INDEX idx_shorts_user_id (user_id),
  INDEX idx_shorts_category (category),
  INDEX idx_shorts_privacy (privacy),
  INDEX idx_shorts_is_adult (is_adult),
  INDEX idx_shorts_created_at (created_at DESC),
  INDEX idx_shorts_view_count (view_count DESC)
);
```

**説明**: ショート動画メタデータ（最大60秒）。

#### `short_tags` テーブル

```sql
CREATE TABLE short_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id UUID NOT NULL REFERENCES shorts(id) ON DELETE CASCADE,
  tag VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(short_id, tag),
  INDEX idx_short_tags_short_id (short_id),
  INDEX idx_short_tags_tag (tag)
);
```

**説明**: ショート動画タグ。

#### `short_categories` テーブル

```sql
CREATE TABLE short_categories (
  id VARCHAR(50) PRIMARY KEY,
  name_ja VARCHAR(50) NOT NULL,
  name_en VARCHAR(50) NOT NULL,
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

-- 初期データ
INSERT INTO short_categories VALUES
('dance', 'ダンス', 'Dance', 'musical-notes', 1, true),
('comedy', 'コメディ', 'Comedy', 'happy', 2, true),
('beauty', '美容', 'Beauty', 'rose', 3, true),
('food', 'グルメ', 'Food', 'restaurant', 4, true),
('fitness', 'フィットネス', 'Fitness', 'fitness', 5, true),
('travel', '旅行', 'Travel', 'airplane', 6, true),
('pets', 'ペット', 'Pets', 'paw', 7, true),
('art', 'アート', 'Art', 'color-palette', 8, true),
('adult', 'アダルト', 'Adult', 'warning', 9, true);
```

**説明**: ショートカテゴリマスタデータ。

#### `short_versions`, `short_views`, `short_likes`, `short_comments`, `short_watch_history`, `short_recommendations`

ショート用のテーブルは、動画用のテーブルと同様の構造（`short_`プレフィックス）。

---

### 3.7 ライブ配信

#### `live_streams` テーブル

```sql
CREATE TABLE live_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  thumbnail_url VARCHAR(500),

  -- 配信設定
  privacy VARCHAR(20) DEFAULT 'public', -- 'public', 'unlisted', 'private'
  is_adult BOOLEAN DEFAULT FALSE,
  chat_enabled BOOLEAN DEFAULT TRUE,
  super_chat_enabled BOOLEAN DEFAULT TRUE,
  archive_enabled BOOLEAN DEFAULT TRUE,

  -- 配信状態
  status VARCHAR(20) NOT NULL, -- 'scheduled', 'live', 'ended'
  stream_key VARCHAR(100) UNIQUE NOT NULL,
  rtmp_url VARCHAR(500) NOT NULL,

  -- 統計情報
  current_viewers INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  total_likes BIGINT DEFAULT 0,
  total_super_chat_amount INTEGER DEFAULT 0, -- 円単位

  -- タイムスタンプ
  scheduled_start_time TIMESTAMP,
  actual_start_time TIMESTAMP,
  end_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- アーカイブ動画参照
  archive_video_id UUID REFERENCES videos(id),

  -- インデックス
  INDEX idx_live_streams_user_id (user_id),
  INDEX idx_live_streams_status (status),
  INDEX idx_live_streams_scheduled_start (scheduled_start_time),
  INDEX idx_live_streams_actual_start (actual_start_time DESC)
);
```

**説明**: ライブ配信メタデータ。

#### `live_chat_messages` テーブル

```sql
CREATE TABLE live_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_stream_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_super_chat BOOLEAN DEFAULT FALSE,
  super_chat_amount INTEGER, -- 円単位
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_live_chat_messages_stream_id (live_stream_id),
  INDEX idx_live_chat_messages_created_at (created_at DESC),
  INDEX idx_live_chat_messages_is_super_chat (is_super_chat)
);
```

**説明**: ライブチャットメッセージ（スーパーチャット含む）。

#### `live_viewers` テーブル

```sql
CREATE TABLE live_viewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_stream_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- 未ログインの場合はNULL
  session_id VARCHAR(100), -- 未ログインユーザー識別用
  joined_at TIMESTAMP DEFAULT NOW(),
  left_at TIMESTAMP,
  watch_duration INTEGER DEFAULT 0, -- 秒数

  INDEX idx_live_viewers_stream_id (live_stream_id),
  INDEX idx_live_viewers_user_id (user_id),
  INDEX idx_live_viewers_joined_at (joined_at)
);
```

**説明**: ライブ視聴者記録。

#### `live_stream_stats` テーブル

```sql
CREATE TABLE live_stream_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_stream_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  timestamp TIMESTAMP NOT NULL,
  current_viewers INTEGER NOT NULL,
  total_messages INTEGER DEFAULT 0,
  total_super_chats INTEGER DEFAULT 0,
  super_chat_amount INTEGER DEFAULT 0,

  INDEX idx_live_stream_stats_stream_id (live_stream_id),
  INDEX idx_live_stream_stats_timestamp (timestamp)
);
```

**説明**: ライブ配信の統計情報（時系列）。

---

### 3.8 収益化

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

**説明**: 収益記録。

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

**説明**: 投げ銭。

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

**説明**: 出金方法。口座番号は暗号化保存。

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

**説明**: 出金申請。

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

**説明**: 税務情報（マイナンバー等、暗号化保存）。

---

### 3.9 ソーシャル機能

#### `follows` テーブル

```sql
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(follower_id, following_id),
  INDEX idx_follows_follower_id (follower_id),
  INDEX idx_follows_following_id (following_id),
  INDEX idx_follows_created_at (created_at DESC)
);
```

**説明**: フォロー関係。

#### `notifications` テーブル

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'new_video', 'comment_reply', 'like', 'tip_received', 'new_follower', 'live_started'
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  thumbnail_url VARCHAR(500),
  link_url VARCHAR(500),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL, -- 誰がアクションしたか
  content_type VARCHAR(20), -- 'video', 'short', 'live', 'comment'
  content_id VARCHAR(100),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_notifications_user_id (user_id),
  INDEX idx_notifications_type (type),
  INDEX idx_notifications_is_read (is_read),
  INDEX idx_notifications_created_at (created_at DESC)
);
```

**説明**: 通知。保持期間30日。

#### `user_stats` テーブル

```sql
CREATE TABLE user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  total_likes BIGINT DEFAULT 0,
  total_videos INTEGER DEFAULT 0,
  total_shorts INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id),
  INDEX idx_user_stats_user_id (user_id),
  INDEX idx_user_stats_follower_count (follower_count DESC)
);
```

**説明**: ユーザー統計情報。

#### `activity_feed` テーブル

```sql
CREATE TABLE activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- 'upload_video', 'upload_short', 'start_live', 'like', 'comment'
  content_type VARCHAR(20), -- 'video', 'short', 'live', 'comment'
  content_id VARCHAR(100),
  metadata JSONB, -- 追加情報（タイトル、サムネイル等）
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_activity_feed_user_id (user_id),
  INDEX idx_activity_feed_actor_id (actor_id),
  INDEX idx_activity_feed_created_at (created_at DESC)
);
```

**説明**: アクティビティフィード。

#### `notification_settings` テーブル

```sql
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  new_video BOOLEAN DEFAULT TRUE,
  new_short BOOLEAN DEFAULT TRUE,
  live_started BOOLEAN DEFAULT TRUE,
  comment_reply BOOLEAN DEFAULT TRUE,
  likes BOOLEAN DEFAULT TRUE,
  new_follower BOOLEAN DEFAULT TRUE,
  tips_received BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id),
  INDEX idx_notification_settings_user_id (user_id)
);
```

**説明**: 通知設定。

---

### 3.10 プレイリスト

#### `playlists` テーブル

```sql
CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  video_count INTEGER DEFAULT 0,
  thumbnail_url VARCHAR(500), -- 最初の動画のサムネイル
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_playlists_user_id (user_id),
  INDEX idx_playlists_is_public (is_public),
  INDEX idx_playlists_created_at (created_at DESC)
);
```

**説明**: プレイリストメタデータ。

#### `playlist_videos` テーブル

```sql
CREATE TABLE playlist_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  position INTEGER NOT NULL, -- 並び順（0始まり）
  added_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(playlist_id, video_id),
  INDEX idx_playlist_videos_playlist_id (playlist_id),
  INDEX idx_playlist_videos_video_id (video_id),
  INDEX idx_playlist_videos_position (playlist_id, position)
);
```

**説明**: プレイリスト内の動画。

#### `playlist_views` テーブル

```sql
CREATE TABLE playlist_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(100),
  viewed_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_playlist_views_playlist_id (playlist_id),
  INDEX idx_playlist_views_user_id (user_id),
  INDEX idx_playlist_views_viewed_at (viewed_at)
);
```

**説明**: プレイリスト視聴記録。

---

### 3.11 Netflix コンテンツ

#### `netflix_contents` テーブル

```sql
CREATE TABLE netflix_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'movie', 'series'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  poster_url VARCHAR(500),
  backdrop_url VARCHAR(500),
  release_year INTEGER,
  country VARCHAR(3), -- 'JP', 'US', 'KR', etc.
  rating DECIMAL(2,1) DEFAULT 0.0,
  is_adult BOOLEAN DEFAULT FALSE,
  privacy VARCHAR(20) DEFAULT 'public', -- 'public', 'unlisted', 'private'
  ip_license_id UUID REFERENCES ip_licenses(id),

  -- 映画の場合
  duration INTEGER, -- minutes
  video_url VARCHAR(500),

  -- メタデータ
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_netflix_contents_user_id (user_id),
  INDEX idx_netflix_contents_type (type),
  INDEX idx_netflix_contents_published (is_published, published_at),
  INDEX idx_netflix_contents_ip_license (ip_license_id)
);
```

**説明**: Netflixコンテンツメタデータ（映画またはシリーズ）。

#### `netflix_genres` テーブル

```sql
CREATE TABLE netflix_genres (
  netflix_content_id UUID NOT NULL REFERENCES netflix_contents(id) ON DELETE CASCADE,
  genre VARCHAR(50) NOT NULL,

  PRIMARY KEY (netflix_content_id, genre),
  INDEX idx_netflix_genres_genre (genre)
);
```

**説明**: Netflixジャンル。

#### `seasons` テーブル

```sql
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  netflix_content_id UUID NOT NULL REFERENCES netflix_contents(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  title VARCHAR(255),
  description TEXT,
  release_year INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE (netflix_content_id, season_number),
  INDEX idx_seasons_netflix_content (netflix_content_id)
);
```

**説明**: TVシリーズのシーズン。

#### `episodes` テーブル

```sql
CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL, -- minutes
  video_url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE (season_id, episode_number),
  INDEX idx_episodes_season (season_id)
);
```

**説明**: シーズン内のエピソード。

#### `ip_licenses` テーブル

```sql
CREATE TABLE ip_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  thumbnail_url VARCHAR(500),
  license_type VARCHAR(50) NOT NULL, -- '商用利用可', '非商用のみ'
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_ip_licenses_active (is_active)
);
```

**説明**: IP権利管理。

#### `netflix_watch_history` テーブル

```sql
CREATE TABLE netflix_watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  netflix_content_id UUID NOT NULL REFERENCES netflix_contents(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE, -- シリーズの場合
  progress_seconds INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  watched_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_netflix_watch_history_user (user_id),
  INDEX idx_netflix_watch_history_content (netflix_content_id),
  INDEX idx_netflix_watch_history_episode (episode_id)
);
```

**説明**: Netflix視聴履歴。

---

## 4. ER図（エンティティリレーション図）

### 4.1 全体概要図

```
users
├─── user_sessions (1:N)
├─── user_subscriptions (1:N)
│    └─── subscription_payment_history (1:N)
├─── payment_methods (1:N)
├─── tax_info (1:1)
│
├─── videos (1:N)
│    ├─── video_tags (1:N)
│    ├─── video_likes (1:N)
│    ├─── video_comments (1:N)
│    ├─── video_views (1:N)
│    └─── watch_history (1:N)
│
├─── shorts (1:N)
│    ├─── short_tags (1:N)
│    ├─── short_likes (1:N)
│    ├─── short_comments (1:N)
│    └─── short_views (1:N)
│
├─── live_streams (1:N)
│    ├─── live_chat_messages (1:N)
│    ├─── live_viewers (1:N)
│    └─── live_stream_stats (1:N)
│
├─── netflix_contents (1:N)
│    ├─── netflix_genres (1:N)
│    ├─── seasons (1:N)
│    │    └─── episodes (1:N)
│    └─── netflix_watch_history (1:N)
│
├─── playlists (1:N)
│    └─── playlist_videos (1:N) ─── videos (N:1)
│
├─── media_files (1:N)
│    ├─── transcoding_jobs (1:N)
│    └─── cdn_urls (1:N)
│
├─── follows (follower 1:N, following 1:N)
├─── notifications (1:N)
├─── user_stats (1:1)
├─── notification_settings (1:1)
│
├─── earnings (1:N)
├─── tips (from/to 1:N)
└─── withdrawal_requests (1:N)
```

---

## 5. インデックス戦略

### 5.1 パフォーマンス重視インデックス

- **user_id**: 全テーブルでインデックス必須（ユーザーごとのデータ取得）
- **created_at**: タイムライン表示用（DESC インデックス）
- **view_count, like_count**: ランキング・ソート用（DESC インデックス）
- **status**: フィルター用（動画ステータス、ライブ状態等）
- **is_adult, privacy**: アクセス制御フィルター用

### 5.2 複合インデックス

```sql
-- 例: 公開済み動画の作成日時でソート
INDEX idx_videos_public_created (privacy, is_adult, created_at DESC);

-- 例: ユーザーのアクティブなサブスク
INDEX idx_user_subscriptions_active (user_id, status);
```

---

## 6. データ整合性

### 6.1 外部キー制約

- **ON DELETE CASCADE**: ユーザー削除時に関連データも削除（プライバシー）
- **ON DELETE SET NULL**: コンテンツ削除時も統計データは保持

### 6.2 トランザクション境界

- **いいね/コメント**: カウント更新とレコード挿入は同一トランザクション
- **出金**: 残高チェックと出金申請は同一トランザクション
- **サブスク変更**: プラン変更とセッション更新は同一トランザクション

---

## 7. スケーリング戦略

### 7.1 パーティショニング

- `video_views`, `short_views`: 日付パーティション（月次）
- `notifications`: 作成日パーティション（30日で削除）

### 7.2 シャーディング

- ユーザーデータ: `user_id % N` でシャーディング
- コンテンツデータ: `content_id % N` でシャーディング

---

## 8. バックアップ・復旧

- **フルバックアップ**: 毎日午前3時
- **増分バックアップ**: 6時間ごと
- **PITR（Point-in-Time Recovery）**: 7日間の任意時点に復旧可能

---

## 9. セキュリティ

### 9.1 暗号化

- **保存時暗号化**: 全テーブル（AES-256）
- **転送時暗号化**: TLS 1.3以上
- **特定フィールド暗号化**:
  - `password_hash`: bcrypt（コストファクター12）
  - `refresh_token_hash`: SHA-256
  - `account_number`: AES-256
  - `individual_number`, `business_number`: AES-256

### 9.2 アクセス制御

- **アプリケーション層**: IAMロールによるS3/RDSアクセス制御
- **DB層**: ロール別権限（read-only, read-write, admin）

---

## 10. モニタリング

- **スロークエリログ**: 500ms以上のクエリをログ
- **デッドロック検出**: 自動アラート
- **テーブルサイズ**: 閾値超過でアラート
- **インデックス使用率**: 未使用インデックスの検出

---

## 関連ドキュメント

- `specs/references/api-endpoints.md` - 全APIエンドポイント一覧
- `specs/references/business-rules.md` - ビジネスルール詳細
- `specs/architecture/database.md` - データベースアーキテクチャ
