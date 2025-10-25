# 10. ソーシャル機能仕様書

## 1. 概要

### 1.1 機能の目的
ユーザー間のインタラクションを促進し、コミュニティを形成する。フォロー/アンフォロー、通知、アクティビティフィード、ユーザープロフィール機能を提供する。

### 1.2 対応フロントエンド画面
- `/channel/[id]` - チャンネルページ（フォローボタン）
- `/(tabs)/settings` - 通知設定タブ
- `/notifications` - 通知一覧
- `/(tabs)/settings` - 登録チャンネルタブ
- `/video/[id]`, `/short/[id]` - いいね・コメント機能

### 1.3 関連機能
- `01-authentication.md` - ユーザー管理
- `05-video-playback.md` - いいね・コメント
- `07-short-playback.md` - いいね・コメント
- `08-live-streaming.md` - ライブチャット

---

## 2. ユースケース

### 2.1 主要ユーザーフロー

#### フロー1: チャンネルフォロー
```
1. ユーザーがチャンネルページにアクセス
2. 「フォロー」ボタンをクリック
3. POST /api/users/:user_id/follow
4. フォロー関係が作成
5. ボタンが「フォロー中」に変化
6. フォローされたユーザーに通知送信
7. フォローしたユーザーの新規投稿が通知対象に
```

#### フロー2: チャンネルアンフォロー
```
1. ユーザーがチャンネルページで「フォロー中」ボタンをクリック
2. 確認ダイアログ表示（オプション）
3. DELETE /api/users/:user_id/follow
4. フォロー関係が削除
5. ボタンが「フォロー」に変化
6. 新規投稿通知が停止
```

#### フロー3: 通知受信
```
1. フォロー中のクリエイターが動画投稿
2. サーバーがフォロワーに通知作成
3. POST /api/notifications/create
4. プッシュ通知送信（モバイル）
5. ブラウザ通知送信（Web）
6. 通知アイコンにバッジ表示（未読数）
7. ユーザーが通知をタップ
8. 該当コンテンツに遷移
9. 通知を既読にマーク
```

#### フロー4: 通知一覧確認
```
1. ユーザーが通知アイコンをタップ
2. GET /api/notifications → 通知一覧取得
3. 通知タイプ別に表示:
   - 新規動画投稿
   - コメント返信
   - いいね
   - 投げ銭受信
   - 新規フォロワー
4. 通知をタップして該当ページに遷移
5. PATCH /api/notifications/:id/read → 既読マーク
```

#### フロー5: 登録チャンネル一覧
```
1. ユーザーが設定画面の「登録チャンネル」タブにアクセス
2. GET /api/users/subscriptions → フォロー中のチャンネル一覧取得
3. チャンネル一覧表示（サムネイル、名前、フォロワー数）
4. 「フォロー解除」ボタンで即座にアンフォロー可能
```

### 2.2 エッジケース
- 既にフォロー中のユーザーを再度フォロー試行
- フォロー/アンフォローの高速連打
- 通知の大量送信（スパム）
- 削除されたコンテンツの通知
- プッシュ通知の権限未許可

---

## 3. データモデル

### 3.1 テーブル定義

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

### 3.2 リレーション図
```
users (1) ─── (N) follows (follower)
  │
  ├─── (N) follows (following)
  │
  ├─── (N) notifications
  │
  ├─── (1) user_stats
  │
  ├─── (N) activity_feed
  │
  └─── (1) notification_settings
```

---

## 4. API仕様

### 4.1 フォロー

**エンドポイント**: `POST /api/users/:user_id/follow`

**認証**: 必須（Bearer Token）

**レスポンス** (200 OK):
```json
{
  "message": "フォローしました",
  "user_id": "usr_789",
  "follower_count": 1235,
  "is_following": true
}
```

**エラーレスポンス**:
- `400 Bad Request` - 自分自身をフォロー試行
- `409 Conflict` - 既にフォロー中

---

### 4.2 アンフォロー

**エンドポイント**: `DELETE /api/users/:user_id/follow`

**認証**: 必須（Bearer Token）

**レスポンス** (200 OK):
```json
{
  "message": "フォローを解除しました",
  "user_id": "usr_789",
  "follower_count": 1234,
  "is_following": false
}
```

---

### 4.3 フォロー状態確認

**エンドポイント**: `GET /api/users/:user_id/follow-status`

**認証**: 必須（Bearer Token）

**レスポンス** (200 OK):
```json
{
  "user_id": "usr_789",
  "is_following": true,
  "is_followed_by": false,
  "follower_count": 1234,
  "following_count": 567
}
```

---

### 4.4 フォロワー一覧取得

**エンドポイント**: `GET /api/users/:user_id/followers`

**認証**: 不要

**クエリパラメータ**:
- `page` (integer): ページ番号（デフォルト: 1）
- `limit` (integer): 取得件数（デフォルト: 20）

**レスポンス** (200 OK):
```json
{
  "followers": [
    {
      "user_id": "usr_456",
      "name": "山田花子",
      "avatar_url": "https://cdn.example.com/avatars/usr_456.jpg",
      "follower_count": 890,
      "is_following": false,
      "followed_at": "2025-10-20T12:00:00Z"
    }
  ],
  "pagination": {
    "total": 1234,
    "page": 1,
    "limit": 20
  }
}
```

---

### 4.5 フォロー中一覧取得

**エンドポイント**: `GET /api/users/:user_id/following`

**認証**: 不要

**クエリパラメータ**:
- `page` (integer): ページ番号（デフォルト: 1）
- `limit` (integer): 取得件数（デフォルト: 20）

**レスポンス** (200 OK):
```json
{
  "following": [
    {
      "user_id": "usr_789",
      "name": "田中太郎",
      "avatar_url": "https://cdn.example.com/avatars/usr_789.jpg",
      "follower_count": 5678,
      "is_following": true,
      "followed_at": "2025-10-15T12:00:00Z"
    }
  ],
  "pagination": {
    "total": 567,
    "page": 1,
    "limit": 20
  }
}
```

---

### 4.6 通知一覧取得

**エンドポイント**: `GET /api/notifications`

**認証**: 必須（Bearer Token）

**クエリパラメータ**:
- `page` (integer): ページ番号（デフォルト: 1）
- `limit` (integer): 取得件数（デフォルト: 20）
- `unread_only` (boolean): 未読のみ取得（デフォルト: false）

**レスポンス** (200 OK):
```json
{
  "notifications": [
    {
      "id": "notif_123456",
      "type": "new_video",
      "title": "新しい動画が投稿されました",
      "message": "田中太郎さんが「素晴らしい動画タイトル」を投稿しました",
      "thumbnail_url": "https://cdn.example.com/thumbnails/vid_123456.jpg",
      "link_url": "/video/vid_123456",
      "actor": {
        "user_id": "usr_789",
        "name": "田中太郎",
        "avatar_url": "https://cdn.example.com/avatars/usr_789.jpg"
      },
      "is_read": false,
      "created_at": "2025-10-25T12:00:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20
  },
  "unread_count": 12
}
```

---

### 4.7 通知既読マーク

**エンドポイント**: `PATCH /api/notifications/:id/read`

**認証**: 必須（Bearer Token）

**レスポンス** (200 OK):
```json
{
  "message": "通知を既読にしました",
  "notification_id": "notif_123456"
}
```

---

### 4.8 全通知既読マーク

**エンドポイント**: `POST /api/notifications/mark-all-read`

**認証**: 必須（Bearer Token）

**レスポンス** (200 OK):
```json
{
  "message": "全ての通知を既読にしました",
  "marked_count": 12
}
```

---

### 4.9 未読通知数取得

**エンドポイント**: `GET /api/notifications/unread-count`

**認証**: 必須（Bearer Token）

**レスポンス** (200 OK):
```json
{
  "unread_count": 12
}
```

---

### 4.10 通知設定取得・更新

**エンドポイント**: `GET /api/notifications/settings`

**認証**: 必須（Bearer Token）

**レスポンス** (200 OK):
```json
{
  "new_video": true,
  "new_short": true,
  "live_started": true,
  "comment_reply": true,
  "likes": true,
  "new_follower": true,
  "tips_received": true,
  "email_notifications": true,
  "push_notifications": true
}
```

**エンドポイント**: `PATCH /api/notifications/settings`

**リクエスト**:
```json
{
  "new_video": true,
  "live_started": false,
  "push_notifications": true
}
```

**レスポンス** (200 OK):
```json
{
  "message": "通知設定を更新しました",
  "settings": {
    "new_video": true,
    "new_short": true,
    "live_started": false,
    "comment_reply": true,
    "likes": true,
    "new_follower": true,
    "tips_received": true,
    "email_notifications": true,
    "push_notifications": true
  }
}
```

---

## 5. ビジネスルール

### 5.1 フォロー機能

#### 制限
- 自分自身はフォロー不可
- 1日のフォロー上限: 200人
- フォロー/アンフォローの連続実行: 10秒間隔

#### フォロワー数カウント
- リアルタイム更新（キャッシュ5分）
- 統計情報はバッチ更新（1時間ごと）

### 5.2 通知機能

#### 通知タイプ
- `new_video` - フォロー中のクリエイターが動画投稿
- `new_short` - フォロー中のクリエイターがショート投稿
- `live_started` - フォロー中のクリエイターがライブ開始
- `comment_reply` - 自分のコメントに返信
- `like` - 自分のコンテンツにいいね
- `new_follower` - 新規フォロワー
- `tip_received` - 投げ銭受信

#### 通知送信タイミング
- 即座: `comment_reply`, `like`, `new_follower`, `tip_received`
- バッチ（5分ごと）: `new_video`, `new_short`, `live_started`

#### 通知保持期間
- 30日間（30日経過で自動削除）

### 5.3 プッシュ通知

#### 送信条件
- ユーザーがプッシュ通知を許可
- 通知設定で該当タイプがON
- アプリがバックグラウンドまたは非アクティブ

#### 送信制限
- 1時間あたり10通まで
- 同じコンテンツの重複通知は送信しない

### 5.4 エラーハンドリング

#### フォローエラー
```json
{
  "error": "follow_limit_exceeded",
  "message": "1日のフォロー上限に達しました",
  "details": {
    "limit": 200,
    "retry_after": "2025-10-26T00:00:00Z"
  }
}
```

#### 通知エラー
```json
{
  "error": "notification_not_found",
  "message": "通知が見つかりません",
  "details": {
    "notification_id": "notif_123456"
  }
}
```

### 5.5 境界値

- 1日のフォロー上限: 200人
- フォロー/アンフォロー間隔: 10秒
- 通知保持期間: 30日
- プッシュ通知上限: 10通/時間
- 通知一覧ページサイズ: 最大100件

### 5.6 エッジケース

#### 削除されたコンテンツの通知
- 通知は残る
- リンク先に遷移すると「削除されました」表示

#### 削除されたユーザーの通知
- 通知は残る
- actor_id がNULL（`actor`フィールドは空）

#### フォロー中のユーザーがアカウント削除
- フォロー関係は自動削除（ON DELETE CASCADE）
- 通知は30日後に自動削除

---

## 6. 非機能要件

### 6.1 パフォーマンス
- フォロー/アンフォロー: 300ms以内（P95）
- 通知一覧取得: 500ms以内（P95）
- 未読通知数取得: 100ms以内（キャッシュ利用）
- プッシュ通知送信: 1秒以内

### 6.2 セキュリティ
- CSRF保護（フォロー/アンフォロー）
- レート制限（フォロー、通知送信）
- プッシュ通知トークンの暗号化保存

### 6.3 スケーラビリティ
- フォロワー数のキャッシュ（Redis、TTL 5分）
- 通知一覧のページネーション
- プッシュ通知のバッチ送信（Firebase Cloud Messaging / APNs）

### 6.4 可用性
- SLA: 99.9%
- DB: PostgreSQL（マスター・スレーブ構成）
- キャッシュ: Redis（通知数、フォロワー数）

---

## 7. 実装上の注意点

### 7.1 外部サービス連携
- プッシュ通知: Firebase Cloud Messaging（Android）/ APNs（iOS）
- メール通知: SendGrid / AWS SES
- リアルタイム更新: WebSocket / Server-Sent Events

### 7.2 技術的制約
- プッシュ通知: デバイストークン管理必須
- 通知バッジ: OSごとに異なる実装
- フォロワー数: キャッシュとDB値の整合性

### 7.3 既知の課題
- フォロワー数のリアルタイム更新（キャッシュ遅延）
  - 対策: キャッシュTTL短縮、WebSocketでリアルタイム通知
- 大量フォロワーへの通知送信負荷
  - 対策: バッチ送信、優先度付け
- プッシュ通知の到達率
  - 対策: リトライ、代替手段（メール通知）

---

## 8. 関連ドキュメント
- `specs/features/01-authentication.md` - ユーザー管理
- `specs/features/05-video-playback.md` - いいね・コメント
- `specs/features/08-live-streaming.md` - ライブチャット
- `specs/architecture/notifications.md` - 通知アーキテクチャ
