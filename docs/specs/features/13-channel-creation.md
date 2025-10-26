# 13. チャンネル作成・管理仕様書

## 1. 概要

### 1.1 機能の目的
YouTube Studio風のクリエイターダッシュボードを提供し、チャンネル管理、コンテンツ管理、アナリティクス、収益管理を一元的に行えるようにする。

### 1.2 対応フロントエンド画面
- `/creation` - クリエイターダッシュボード
- `/creation/video/[id]/edit` - 動画編集
- `/creation/short/[id]/edit` - ショート編集 (Stretch Goal 1)
- `/go-live` - ライブ配信作成 (Stretch Goal 2)
- `/channel/[id]` - チャンネルページ（公開ページ）

### 1.3 関連機能
- `01-authentication.md` - クリエイター権限
- `04-video-management.md` - 動画管理
- `06-short-management.md` - ショート管理
- `08-live-streaming.md` - ライブ配信管理
- `09-monetization.md` - 収益管理

---

## 2. ユースケース

### 2.1 主要ユーザーフロー

#### フロー1: クリエイター権限申請
```
1. ユーザーがクリエイターになるために申請
2. 設定画面で「クリエイターになる」ボタンクリック
3. 利用規約同意画面表示
4. POST /api/creators/apply
5. 自動承認またはレビュー待ち
6. 承認後、is_creator フラグがtrueに
7. /creation ダッシュボードにアクセス可能
```

#### フロー2: チャンネル設定
```
1. クリエイターが /creation の「設定」タブにアクセス
2. GET /api/channels/my-channel → チャンネル情報取得
3. チャンネル情報編集:
   - チャンネル名（表示名）
   - チャンネル説明
   - アバター画像
   - バナー画像
   - SNSリンク（Twitter, Instagram等）
4. PATCH /api/channels/my-channel
5. 変更内容を保存
6. チャンネルページに反映
```

#### フロー3: ダッシュボード概要
```
1. クリエイターが /creation にアクセス
2. GET /api/analytics/overview → 統計概要取得
3. ダッシュボード表示:
   - 今月の総視聴回数
   - 今月の総視聴時間
   - 今月の新規フォロワー数
   - 今月の収益
   - 最近の動画パフォーマンス
4. グラフ表示（視聴回数推移、視聴時間推移）
```

#### フロー4: コンテンツ管理
```
1. クリエイターが /creation の「コンテンツ」タブにアクセス
2. GET /api/videos/my-videos → 動画一覧取得
3. 動画一覧表示（サムネイル、タイトル、視聴回数、公開状態）
4. フィルター・ソート機能:
   - 公開状態（公開、限定公開、非公開）
   - アップロード日
   - 視聴回数順
5. 一括操作:
   - 一括削除
   - 一括プライバシー変更
```

#### フロー5: アナリティクス詳細
```
1. クリエイターが /creation の「アナリティクス」タブにアクセス
2. GET /api/analytics/details → 詳細統計取得
3. 複数のグラフ・データ表示:
   - 視聴回数推移（日別、週別、月別）
   - 視聴者の年齢・性別分布
   - トラフィックソース（検索、おすすめ、外部リンク等）
   - エンゲージメント率（いいね率、コメント率）
   - コンテンツ別パフォーマンス（動画ごとの統計）
4. 期間フィルター（7日間、30日間、90日間、全期間）
5. CSVエクスポート機能
```

### 2.2 エッジケース
- クリエイター申請却下
- チャンネル名重複
- アナリティクスデータがない場合（新規クリエイター）
- 収益化未達成での収益タブ表示
- バナー画像のアスペクト比不適合

---

## 3. データモデル

### 3.1 テーブル定義

#### `channels` テーブル
```sql
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  avatar_url VARCHAR(500),
  banner_url VARCHAR(500),
  subscriber_count INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  total_videos INTEGER DEFAULT 0,
  total_shorts INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE, -- 認証バッジ
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id),
  INDEX idx_channels_user_id (user_id),
  INDEX idx_channels_subscriber_count (subscriber_count DESC)
);
```

#### `channel_links` テーブル
```sql
CREATE TABLE channel_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'twitter', 'instagram', 'youtube', 'website'
  url VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_channel_links_channel_id (channel_id)
);
```

#### `creator_applications` テーブル
```sql
CREATE TABLE creator_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL, -- 'pending', 'approved', 'rejected'
  reason TEXT, -- 却下理由
  applied_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,

  INDEX idx_creator_applications_user_id (user_id),
  INDEX idx_creator_applications_status (status)
);
```

#### `analytics_snapshots` テーブル
```sql
CREATE TABLE analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_views BIGINT DEFAULT 0,
  total_watch_time INTEGER DEFAULT 0, -- 秒数
  total_likes INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  new_subscribers INTEGER DEFAULT 0,
  revenue INTEGER DEFAULT 0, -- 円単位
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(channel_id, snapshot_date),
  INDEX idx_analytics_snapshots_channel_id (channel_id),
  INDEX idx_analytics_snapshots_date (snapshot_date DESC)
);
```

#### `content_analytics` テーブル
```sql
CREATE TABLE content_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type VARCHAR(20) NOT NULL, -- 'video', 'short', 'live'
  content_id UUID NOT NULL,
  views INTEGER DEFAULT 0,
  watch_time INTEGER DEFAULT 0, -- 秒数
  avg_view_duration INTEGER DEFAULT 0, -- 秒数
  ctr FLOAT DEFAULT 0, -- クリック率（0.0-1.0）
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(content_type, content_id),
  INDEX idx_content_analytics_content (content_type, content_id)
);
```

### 3.2 リレーション図
```
users (1) ─── (1) channels
                    │
                    ├─── (N) channel_links
                    │
                    ├─── (N) analytics_snapshots
                    │
                    └─── (N) videos, shorts, live_streams

creator_applications (N) ─── (1) users

content_analytics (1) ─── (1) videos / shorts / live_streams
```

---

## 4. API仕様

### 4.1 クリエイター申請

**エンドポイント**: `POST /api/creators/apply`

**認証**: 必須（Bearer Token）

**レスポンス** (201 Created):
```json
{
  "application": {
    "id": "app_123456",
    "status": "approved",
    "applied_at": "2025-10-25T12:00:00Z"
  },
  "message": "クリエイター申請が承認されました"
}
```

**エラーレスポンス**:
- `409 Conflict` - 既にクリエイター申請済み

---

### 4.2 チャンネル情報取得

**エンドポイント**: `GET /api/channels/my-channel`

**認証**: 必須（Bearer Token、クリエイター権限）

**レスポンス** (200 OK):
```json
{
  "id": "ch_123456",
  "user_id": "usr_789",
  "name": "田中太郎のチャンネル",
  "description": "プログラミング講座を配信しています",
  "avatar_url": "https://cdn.example.com/avatars/ch_123456.jpg",
  "banner_url": "https://cdn.example.com/banners/ch_123456.jpg",
  "subscriber_count": 1234,
  "total_views": 567890,
  "total_videos": 45,
  "total_shorts": 78,
  "is_verified": false,
  "created_at": "2025-10-01T12:00:00Z",
  "links": [
    {
      "platform": "twitter",
      "url": "https://twitter.com/tanaka"
    }
  ]
}
```

---

### 4.3 チャンネル情報更新

**エンドポイント**: `PATCH /api/channels/my-channel`

**認証**: 必須（Bearer Token、クリエイター権限）

**リクエスト**:
```json
{
  "name": "田中太郎のプログラミングチャンネル",
  "description": "初心者向けのプログラミング講座を配信しています",
  "links": [
    {
      "platform": "twitter",
      "url": "https://twitter.com/tanaka"
    },
    {
      "platform": "instagram",
      "url": "https://instagram.com/tanaka"
    }
  ]
}
```

**レスポンス** (200 OK):
```json
{
  "channel": {
    "id": "ch_123456",
    "name": "田中太郎のプログラミングチャンネル",
    "description": "初心者向けのプログラミング講座を配信しています",
    "updated_at": "2025-10-25T12:00:00Z"
  }
}
```

---

### 4.4 チャンネルアバター更新

**エンドポイント**: `PATCH /api/channels/my-channel/avatar`

**認証**: 必須（Bearer Token、クリエイター権限）

**リクエスト**:
```json
{
  "avatar": "base64_encoded_image"
}
```

**レスポンス** (200 OK):
```json
{
  "avatar_url": "https://cdn.example.com/avatars/ch_123456_new.jpg",
  "updated_at": "2025-10-25T12:00:00Z"
}
```

---

### 4.5 チャンネルバナー更新

**エンドポイント**: `PATCH /api/channels/my-channel/banner`

**認証**: 必須（Bearer Token、クリエイター権限）

**リクエスト**:
```json
{
  "banner": "base64_encoded_image"
}
```

**レスポンス** (200 OK):
```json
{
  "banner_url": "https://cdn.example.com/banners/ch_123456_new.jpg",
  "updated_at": "2025-10-25T12:00:00Z"
}
```

---

### 4.6 ダッシュボード概要取得

**エンドポイント**: `GET /api/analytics/overview`

**認証**: 必須（Bearer Token、クリエイター権限）

**クエリパラメータ**:
- `period` (string): 期間（`7d`, `30d`, `90d`, `all`、デフォルト: `30d`）

**レスポンス** (200 OK):
```json
{
  "period": "30d",
  "total_views": 123456,
  "total_watch_time_hours": 5678,
  "avg_view_duration_seconds": 300,
  "subscribers_gained": 234,
  "total_likes": 8901,
  "views_change_percent": 15.5,
  "watch_time_change_percent": 12.3,
  "subscribers_change_percent": 20.0,
  "likes_change_percent": 10.2
}
```

---

### 4.7 アナリティクス詳細取得

**エンドポイント**: `GET /api/analytics/details`

**認証**: 必須（Bearer Token、クリエイター権限）

**クエリパラメータ**:
- `period` (string): 期間（`7d`, `30d`, `90d`, `all`）

**レスポンス** (200 OK):
```json
{
  "overview": {
    "total_views": 123456,
    "total_watch_time_hours": 5678,
    "avg_view_duration_seconds": 300,
    "subscribers_gained": 234,
    "total_likes": 8901
  },
  "views_timeline": [
    {
      "date": "2025-10-01",
      "views": 4567
    }
  ],
  "performance_by_content": [
    {
      "id": "vid_123456",
      "type": "video",
      "title": "動画タイトル",
      "thumbnail_url": "https://cdn.example.com/thumbnails/vid_123456.jpg",
      "published_at": "2025-10-20T12:00:00Z",
      "views": 12345,
      "watch_time_hours": 678,
      "ctr": 0.08,
      "avg_view_duration": 300,
      "likes": 890,
      "comments": 123
    }
  ],
  "audience": {
    "age_distribution": {
      "13-17": 5,
      "18-24": 25,
      "25-34": 35,
      "35-44": 20,
      "45-54": 10,
      "55+": 5
    },
    "gender_distribution": {
      "male": 60,
      "female": 35,
      "other": 5
    },
    "top_regions": [
      {
        "country": "JP",
        "name": "日本",
        "percentage": 80
      }
    ],
    "devices": {
      "mobile": 60,
      "desktop": 30,
      "tablet": 8,
      "tv": 2
    }
  },
  "traffic_sources": {
    "search": 30,
    "suggested": 40,
    "external": 15,
    "direct": 10,
    "channel_page": 5
  },
  "engagement": {
    "like_rate": 0.08,
    "comment_rate": 0.02,
    "share_count": 234,
    "save_count": 123,
    "subscription_rate": 0.05,
    "avg_watch_percentage": 65
  }
}
```

---

### 4.8 チャンネル詳細取得（公開ページ）

**エンドポイント**: `GET /api/channels/:id`

**認証**: 不要

**レスポンス** (200 OK):
```json
{
  "id": "ch_123456",
  "user_id": "usr_789",
  "name": "田中太郎のチャンネル",
  "description": "プログラミング講座を配信しています",
  "avatar_url": "https://cdn.example.com/avatars/ch_123456.jpg",
  "banner_url": "https://cdn.example.com/banners/ch_123456.jpg",
  "subscriber_count": 1234,
  "total_views": 567890,
  "total_videos": 45,
  "is_verified": false,
  "created_at": "2025-10-01T12:00:00Z",
  "links": [
    {
      "platform": "twitter",
      "url": "https://twitter.com/tanaka"
    }
  ],
  "videos": [
    {
      "id": "vid_123456",
      "title": "動画タイトル",
      "thumbnail_url": "https://cdn.example.com/thumbnails/vid_123456.jpg",
      "view_count": 12345,
      "created_at": "2025-10-20T12:00:00Z"
    }
  ],
  "shorts": [
    {
      "id": "short_123456",
      "title": "ショートタイトル",
      "thumbnail_url": "https://cdn.example.com/thumbnails/short_123456.jpg",
      "view_count": 5678,
      "created_at": "2025-10-20T12:00:00Z"
    }
  ]
}
```

---

### 4.9 コンテンツパフォーマンス取得

**エンドポイント**: `GET /api/analytics/content/:content_type/:content_id`

**認証**: 必須（Bearer Token、クリエイター権限）

**レスポンス** (200 OK):
```json
{
  "content_id": "vid_123456",
  "content_type": "video",
  "title": "動画タイトル",
  "published_at": "2025-10-20T12:00:00Z",
  "views": 12345,
  "watch_time_hours": 678,
  "avg_view_duration": 300,
  "ctr": 0.08,
  "likes": 890,
  "comments": 123,
  "shares": 45,
  "views_timeline": [
    {
      "date": "2025-10-20",
      "views": 1234
    }
  ],
  "traffic_sources": {
    "search": 30,
    "suggested": 40,
    "external": 15,
    "direct": 10,
    "channel_page": 5
  }
}
```

---

### 4.10 アナリティクスエクスポート

**エンドポイント**: `GET /api/analytics/export`

**認証**: 必須（Bearer Token、クリエイター権限）

**クエリパラメータ**:
- `period` (string): 期間（`7d`, `30d`, `90d`, `all`）
- `format` (string): フォーマット（`csv`, `json`）

**レスポンス** (200 OK):
- CSV形式またはJSON形式のファイルダウンロード

---

## 5. ビジネスルール

### 5.1 クリエイター権限

#### 申請条件
- アカウント作成から7日以上経過
- メールアドレス確認済み
- 利用規約同意

#### 自動承認
- 通常は自動承認
- 過去の違反歴がある場合は手動レビュー

### 5.2 チャンネル設定

#### チャンネル名
- 最小2文字、最大100文字
- Unicode対応（日本語可）
- 重複可能（ユーザーIDで識別）

#### 説明文
- 最大1000文字
- Unicode対応
- リンク含有可能

#### アバター画像
- JPEG/PNG、最大5MB
- 推奨サイズ: 800x800px
- 円形クロップ表示

#### バナー画像
- JPEG/PNG、最大10MB
- 推奨サイズ: 2560x1440px
- アスペクト比: 16:9

### 5.3 認証バッジ

#### 付与条件
- フォロワー数10,000人以上
- アカウント作成から6ヶ月以上経過
- 過去6ヶ月間に違反歴なし
- 手動申請（運営が審査）

### 5.4 アナリティクス

#### 更新頻度
- リアルタイム: 視聴回数、いいね数
- バッチ更新（1時間ごと）: その他統計
- 日次集計（深夜0時）: 日別統計

#### データ保持期間
- 詳細データ: 90日間
- 集計データ: 無制限

### 5.5 エラーハンドリング

#### クリエイター申請エラー
```json
{
  "error": "creator_application_pending",
  "message": "クリエイター申請は現在審査中です"
}
```

#### アナリティクスデータなし
```json
{
  "error": "no_analytics_data",
  "message": "アナリティクスデータがありません",
  "suggestion": "コンテンツをアップロードしてください"
}
```

### 5.6 境界値

- チャンネル名: 2-100文字
- 説明文: 0-1000文字
- SNSリンク: 最大10個
- アバター画像: 最大5MB
- バナー画像: 最大10MB

### 5.7 エッジケース

#### チャンネル名重複
- 許可（ユーザーIDで識別）
- 検索時は登録者数順に表示

#### アナリティクスデータがない新規クリエイター
- 0件データ表示
- 「コンテンツをアップロードしてください」メッセージ

#### バナー画像のアスペクト比不適合
- 自動クロップ（中央寄せ）
- 警告メッセージ表示

---

## 6. 非機能要件

### 6.1 パフォーマンス
- チャンネル情報取得: 300ms以内（P95）
- ダッシュボード概要: 500ms以内（P95）
- アナリティクス詳細: 2秒以内（P95）
- アナリティクスエクスポート: 10秒以内

### 6.2 セキュリティ
- CSRF保護（チャンネル更新）
- XSS対策（チャンネル名、説明のサニタイズ）
- 画像アップロードのウイルススキャン
- 権限チェック（クリエイターのみアクセス可能）

### 6.3 スケーラビリティ
- アナリティクスデータのバッチ計算
- チャンネル統計のキャッシュ（Redis、TTL 1時間）
- アナリティクスエクスポートの非同期処理

### 6.4 可用性
- SLA: 99.9%
- DB: PostgreSQL（マスター・スレーブ構成）
- キャッシュ: Redis（チャンネル統計）

---

## 7. 実装上の注意点

### 7.1 外部サービス連携
- 画像処理: Sharp / ImageMagick
- 画像ストレージ: AWS S3
- CDN: AWS CloudFront（画像配信）
- アナリティクス: BigQuery（大規模データ分析）

### 7.2 技術的制約
- バナー画像: アスペクト比16:9推奨、自動クロップ
- アバター画像: 円形クロップ表示
- アナリティクス: バッチ処理で集計（リアルタイムは重い）

### 7.3 既知の課題
- アナリティクスの計算負荷
  - 対策: バッチ処理、事前計算、キャッシュ
- 大量コンテンツのパフォーマンス
  - 対策: ページネーション、仮想スクロール
- 画像アップロードの処理時間
  - 対策: 非同期処理、プログレスバー表示

---

## 8. 関連ドキュメント
- `specs/features/04-video-management.md` - 動画管理
- `specs/features/06-short-management.md` - ショート管理
- `specs/features/08-live-streaming.md` - ライブ配信管理
- `specs/features/09-monetization.md` - 収益管理
- `specs/architecture/analytics.md` - アナリティクスアーキテクチャ
