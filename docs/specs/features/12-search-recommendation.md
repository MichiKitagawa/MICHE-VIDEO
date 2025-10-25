# 12. 検索・レコメンデーション仕様書

## 1. 概要

### 1.1 機能の目的
動画・ショートの検索機能とパーソナライズされたレコメンデーション機能を提供し、ユーザーが目的のコンテンツを簡単に発見できるようにする。全文検索、フィルター、トレンド、パーソナライズドおすすめを実装する。

### 1.2 対応フロントエンド画面
- `/search` - 検索結果画面
- `/(tabs)/videos` - ホームフィード（おすすめ動画）
- `/(tabs)/shorts` - ショートフィード（おすすめショート）
- `/trending` - トレンド動画一覧
- `/video/[id]` - 関連動画（おすすめ）

### 1.3 関連機能
- `04-video-management.md` - 動画メタデータ
- `05-video-playback.md` - 動画再生・視聴履歴
- `06-short-management.md` - ショートメタデータ
- `07-short-playback.md` - ショート視聴履歴

---

## 2. ユースケース

### 2.1 主要ユーザーフロー

#### フロー1: 検索
```
1. ユーザーが検索バーにキーワード入力
2. 入力中にサジェスト表示（オートコンプリート）
3. GET /api/search/suggest?q=キーワード
4. サジェスト一覧表示（過去の検索履歴、人気検索ワード）
5. ユーザーがEnterキーまたは検索ボタンクリック
6. GET /api/search?q=キーワード&type=video
7. 検索結果表示（動画、ショート、チャンネル）
8. フィルター適用（カテゴリ、アップロード日、再生時間等）
9. ソート順変更（関連度順、視聴回数順、新着順）
```

#### フロー2: トレンド動画
```
1. ユーザーが /trending にアクセス
2. GET /api/trending/videos
3. トレンド動画一覧表示（24時間、7日間、30日間）
4. カテゴリフィルター適用可能
5. トレンドスコア順に表示
```

#### フロー3: パーソナライズドおすすめ（ホームフィード）
```
1. ユーザーが /(tabs)/videos にアクセス
2. GET /api/recommendations/feed
3. ユーザーの視聴履歴・いいね履歴・フォロー情報を分析
4. おすすめ動画一覧表示
5. 無限スクロールで追加読み込み
6. おすすめ理由表示（「〇〇さんの動画に基づく」等）
```

#### フロー4: 関連動画
```
1. ユーザーが動画詳細ページで動画視聴
2. GET /api/videos/:id/recommendations
3. 現在の動画に関連するおすすめ動画取得
4. 関連スコア順に表示（カテゴリ、タグ、視聴履歴）
5. 自動再生設定がONの場合、動画終了後に次の関連動画を自動再生
```

#### フロー5: フィルター検索
```
1. ユーザーが検索結果ページでフィルターボタンクリック
2. フィルターモーダル表示
3. フィルター条件選択:
   - カテゴリ
   - アップロード日（今日、今週、今月、今年）
   - 再生時間（4分未満、4-20分、20分超）
   - 並び順（関連度順、視聴回数順、新着順、評価順）
4. 適用ボタンクリック
5. GET /api/search?q=キーワード&category=gaming&upload_date=week
6. フィルター適用済みの検索結果表示
```

### 2.2 エッジケース
- 検索結果0件
- 特殊文字を含む検索クエリ
- 非常に長い検索クエリ
- アダルトコンテンツのフィルタリング
- 削除された動画がおすすめに表示

---

## 3. データモデル

### 3.1 テーブル定義

#### `search_queries` テーブル
```sql
CREATE TABLE search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  query VARCHAR(200) NOT NULL,
  result_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_search_queries_user_id (user_id),
  INDEX idx_search_queries_query (query),
  INDEX idx_search_queries_created_at (created_at DESC)
);
```

#### `popular_searches` テーブル
```sql
CREATE TABLE popular_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query VARCHAR(200) NOT NULL UNIQUE,
  search_count INTEGER DEFAULT 0,
  last_searched_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_popular_searches_search_count (search_count DESC),
  INDEX idx_popular_searches_query (query)
);
```

#### `trending_videos` テーブル
```sql
CREATE TABLE trending_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  trending_score FLOAT NOT NULL, -- トレンドスコア
  rank_24h INTEGER,
  rank_7d INTEGER,
  rank_30d INTEGER,
  views_24h INTEGER,
  views_7d INTEGER,
  views_30d INTEGER,
  calculated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(video_id),
  INDEX idx_trending_videos_video_id (video_id),
  INDEX idx_trending_videos_score (trending_score DESC),
  INDEX idx_trending_videos_rank_24h (rank_24h)
);
```

#### `user_recommendations` テーブル
```sql
CREATE TABLE user_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  score FLOAT NOT NULL, -- おすすめスコア（0.0-1.0）
  reason VARCHAR(50), -- 'watch_history', 'liked_videos', 'followed_channels', 'trending'
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL, -- 有効期限（24時間）

  INDEX idx_user_recommendations_user_id (user_id),
  INDEX idx_user_recommendations_score (score DESC),
  INDEX idx_user_recommendations_expires_at (expires_at)
);
```

#### `search_index` テーブル（全文検索用）
```sql
CREATE TABLE search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type VARCHAR(20) NOT NULL, -- 'video', 'short', 'channel'
  content_id UUID NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  tags TEXT[], -- PostgreSQL配列
  category VARCHAR(50),
  user_name VARCHAR(100),
  search_vector TSVECTOR, -- PostgreSQL全文検索用
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_search_index_content (content_type, content_id),
  INDEX idx_search_index_vector USING GIN(search_vector)
);
```

### 3.2 リレーション図
```
users (1) ─── (N) search_queries
  │
  └─── (N) user_recommendations ─── (1) videos

videos (1) ─── (1) trending_videos
  │
  └─── (1) search_index
```

---

## 4. API仕様

### 4.1 検索

**エンドポイント**: `GET /api/search`

**認証**: 不要（ログイン時はパーソナライズ）

**クエリパラメータ**:
- `q` (string): 検索クエリ（必須）
- `type` (string): 検索対象（`video`, `short`, `channel`, `all`、デフォルト: `all`）
- `category` (string): カテゴリフィルター
- `upload_date` (string): アップロード日フィルター（`today`, `week`, `month`, `year`）
- `duration` (string): 再生時間フィルター（`short`, `medium`, `long`）
- `sort` (string): ソート順（`relevance`, `view_count`, `upload_date`, `rating`）
- `page` (integer): ページ番号（デフォルト: 1）
- `limit` (integer): 取得件数（デフォルト: 20）

**レスポンス** (200 OK):
```json
{
  "query": "プログラミング",
  "results": {
    "videos": [
      {
        "id": "vid_123456",
        "title": "プログラミング入門",
        "description": "初心者向けのプログラミング講座",
        "thumbnail_url": "https://cdn.example.com/thumbnails/vid_123456.jpg",
        "user_name": "田中太郎",
        "user_avatar": "https://cdn.example.com/avatars/usr_789.jpg",
        "category": "education",
        "duration": 600,
        "view_count": 12345,
        "created_at": "2025-10-20T12:00:00Z",
        "relevance_score": 0.95
      }
    ],
    "shorts": [],
    "channels": []
  },
  "pagination": {
    "total": 234,
    "page": 1,
    "limit": 20
  }
}
```

---

### 4.2 検索サジェスト

**エンドポイント**: `GET /api/search/suggest`

**認証**: 不要

**クエリパラメータ**:
- `q` (string): 検索クエリ（最小2文字）
- `limit` (integer): 取得件数（デフォルト: 10）

**レスポンス** (200 OK):
```json
{
  "suggestions": [
    {
      "query": "プログラミング",
      "type": "popular",
      "search_count": 12345
    },
    {
      "query": "プログラミング入門",
      "type": "popular",
      "search_count": 5678
    },
    {
      "query": "プログラミング Python",
      "type": "history",
      "searched_at": "2025-10-20T12:00:00Z"
    }
  ]
}
```

---

### 4.3 トレンド動画取得

**エンドポイント**: `GET /api/trending/videos`

**認証**: 不要

**クエリパラメータ**:
- `period` (string): 期間（`24h`, `7d`, `30d`、デフォルト: `24h`）
- `category` (string): カテゴリフィルター（省略時は全カテゴリ）
- `limit` (integer): 取得件数（デフォルト: 20）

**レスポンス** (200 OK):
```json
{
  "period": "24h",
  "trending_videos": [
    {
      "rank": 1,
      "video": {
        "id": "vid_123456",
        "title": "話題の動画",
        "thumbnail_url": "https://cdn.example.com/thumbnails/vid_123456.jpg",
        "user_name": "田中太郎",
        "user_avatar": "https://cdn.example.com/avatars/usr_789.jpg",
        "category": "entertainment",
        "view_count": 567890,
        "views_24h": 123456,
        "trending_score": 0.98
      }
    }
  ]
}
```

---

### 4.4 パーソナライズドおすすめフィード

**エンドポイント**: `GET /api/recommendations/feed`

**認証**: 必須（Bearer Token）

**クエリパラメータ**:
- `page` (integer): ページ番号（デフォルト: 1）
- `limit` (integer): 取得件数（デフォルト: 20）

**レスポンス** (200 OK):
```json
{
  "recommendations": [
    {
      "video": {
        "id": "vid_123456",
        "title": "おすすめ動画",
        "thumbnail_url": "https://cdn.example.com/thumbnails/vid_123456.jpg",
        "user_name": "田中太郎",
        "user_avatar": "https://cdn.example.com/avatars/usr_789.jpg",
        "category": "education",
        "duration": 600,
        "view_count": 12345
      },
      "reason": "watch_history",
      "reason_text": "視聴履歴に基づく",
      "score": 0.92
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "has_more": true
  }
}
```

---

### 4.5 関連動画取得

**エンドポイント**: `GET /api/videos/:id/recommendations`

**認証**: 不要（ログイン時はパーソナライズ）

**クエリパラメータ**:
- `limit` (integer): 取得件数（デフォルト: 10）

**レスポンス** (200 OK):
```json
{
  "video_id": "vid_123456",
  "recommendations": [
    {
      "id": "vid_789012",
      "title": "関連動画",
      "thumbnail_url": "https://cdn.example.com/thumbnails/vid_789012.jpg",
      "user_name": "山田花子",
      "user_avatar": "https://cdn.example.com/avatars/usr_456.jpg",
      "category": "education",
      "duration": 480,
      "view_count": 56789,
      "reason": "category",
      "score": 0.88
    }
  ]
}
```

---

### 4.6 検索履歴取得

**エンドポイント**: `GET /api/search/history`

**認証**: 必須（Bearer Token）

**クエリパラメータ**:
- `limit` (integer): 取得件数（デフォルト: 20）

**レスポンス** (200 OK):
```json
{
  "history": [
    {
      "query": "プログラミング",
      "result_count": 234,
      "searched_at": "2025-10-25T12:00:00Z"
    }
  ]
}
```

---

### 4.7 検索履歴削除

**エンドポイント**: `DELETE /api/search/history`

**認証**: 必須（Bearer Token）

**レスポンス** (200 OK):
```json
{
  "message": "検索履歴を削除しました"
}
```

---

### 4.8 人気検索ワード取得

**エンドポイント**: `GET /api/search/popular`

**認証**: 不要

**クエリパラメータ**:
- `limit` (integer): 取得件数（デフォルト: 10）

**レスポンス** (200 OK):
```json
{
  "popular_searches": [
    {
      "query": "プログラミング",
      "search_count": 12345
    },
    {
      "query": "料理",
      "search_count": 10234
    }
  ]
}
```

---

### 4.9 トレンドショート取得

**エンドポイント**: `GET /api/trending/shorts`

**認証**: 不要

**クエリパラメータ**:
- `period` (string): 期間（`24h`, `7d`, `30d`、デフォルト: `24h`）
- `category` (string): カテゴリフィルター
- `limit` (integer): 取得件数（デフォルト: 20）

**レスポンス** (200 OK):
```json
{
  "period": "24h",
  "trending_shorts": [
    {
      "rank": 1,
      "short": {
        "id": "short_123456",
        "title": "話題のショート",
        "thumbnail_url": "https://cdn.example.com/thumbnails/short_123456.jpg",
        "user_name": "田中太郎",
        "category": "dance",
        "view_count": 123456,
        "views_24h": 45678,
        "trending_score": 0.96
      }
    }
  ]
}
```

---

### 4.10 おすすめショートフィード

**エンドポイント**: `GET /api/recommendations/shorts`

**認証**: 不要（ログイン時はパーソナライズ）

**クエリパラメータ**:
- `page` (integer): ページ番号（デフォルト: 1）
- `limit` (integer): 取得件数（デフォルト: 20）

**レスポンス** (200 OK):
```json
{
  "recommendations": [
    {
      "short": {
        "id": "short_123456",
        "title": "おすすめショート",
        "video_url": "https://cdn.example.com/shorts/short_123456.m3u8",
        "thumbnail_url": "https://cdn.example.com/thumbnails/short_123456.jpg",
        "user_name": "田中太郎",
        "category": "dance",
        "duration": 30,
        "view_count": 5678
      },
      "reason": "trending",
      "score": 0.90
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "has_more": true
  }
}
```

---

## 5. ビジネスルール

### 5.1 検索アルゴリズム

#### 関連度スコア計算
```
relevance_score = 0.4 * title_match +
                  0.3 * tag_match +
                  0.2 * description_match +
                  0.1 * popularity_boost
```

#### 全文検索
- PostgreSQL `tsvector`型を使用
- 日本語形態素解析（MeCab / Sudachi）
- ステミング・ストップワード除去

### 5.2 トレンドアルゴリズム

#### トレンドスコア計算
```
trending_score = (views_recent / views_total) *
                 (1 + like_rate) *
                 (1 + comment_rate) *
                 time_decay_factor
```

- `time_decay_factor`: 新しいほど高いスコア
- 24時間、7日間、30日間のランキングを計算
- 1時間ごとに再計算

### 5.3 パーソナライズドおすすめ

#### おすすめスコア計算
```
recommendation_score = 0.35 * watch_history_similarity +
                       0.25 * liked_videos_similarity +
                       0.20 * followed_channels_score +
                       0.15 * trending_score +
                       0.05 * category_preference
```

#### おすすめ理由
- `watch_history` - 視聴履歴に基づく
- `liked_videos` - いいねした動画に基づく
- `followed_channels` - フォロー中のチャンネル
- `trending` - 現在人気
- `category` - お気に入りカテゴリ

### 5.4 フィルター

#### アップロード日
- `today` - 今日（24時間以内）
- `week` - 今週（7日以内）
- `month` - 今月（30日以内）
- `year` - 今年（365日以内）

#### 再生時間
- `short` - 4分未満
- `medium` - 4-20分
- `long` - 20分超

### 5.5 エラーハンドリング

#### 検索結果0件
```json
{
  "query": "存在しないキーワード",
  "results": {
    "videos": [],
    "shorts": [],
    "channels": []
  },
  "message": "検索結果が見つかりませんでした",
  "suggestions": ["別のキーワードで検索してみてください"]
}
```

### 5.6 境界値

- 検索クエリ: 最小2文字、最大200文字
- 検索結果取得数: 最大100件
- おすすめフィード: ページサイズ最大50件
- トレンドランキング: 最大100位まで

### 5.7 エッジケース

#### アダルトコンテンツのフィルタリング
- iOS/Android: アダルトコンテンツを検索結果から除外
- Web: 検索結果に含むが「18+」バッジ表示

#### 削除された動画
- おすすめから自動除外
- 検索インデックスから削除（バッチ処理）

#### 特殊文字を含む検索
- サニタイズ処理
- SQLインジェクション対策

---

## 6. 非機能要件

### 6.1 パフォーマンス
- 検索: 500ms以内（P95）
- サジェスト: 200ms以内（P95）
- おすすめフィード: 1秒以内（P95）
- トレンド取得: 300ms以内（キャッシュ利用）

### 6.2 セキュリティ
- SQLインジェクション対策（パラメータ化クエリ）
- XSS対策（検索クエリのサニタイズ）
- レート制限（検索100回/分、サジェスト200回/分）

### 6.3 スケーラビリティ
- 検索インデックスのシャーディング
- おすすめのバッチ事前計算（1時間ごと）
- トレンドランキングのキャッシュ（Redis、TTL 1時間）
- ElasticSearch導入検討（大規模化時）

### 6.4 可用性
- SLA: 99.9%
- 検索インデックスのレプリケーション
- キャッシュ: Redis（トレンド、おすすめ）

---

## 7. 実装上の注意点

### 7.1 外部サービス連携
- 全文検索: PostgreSQL Full Text Search / ElasticSearch
- 形態素解析: MeCab / Sudachi / Kuromoji
- レコメンデーションエンジン: カスタムアルゴリズム / AWS Personalize

### 7.2 技術的制約
- PostgreSQL `tsvector`: 日本語対応が必要
- おすすめの計算コスト: バッチ処理で軽減
- トレンドランキング: 定期的な再計算（1時間ごと）

### 7.3 既知の課題
- 日本語全文検索の精度
  - 対策: 形態素解析、同義語辞書
- フィルターバブル（同じ系統のおすすめばかり）
  - 対策: 多様性スコアの導入、新規コンテンツの優先表示
- 検索インデックスの更新遅延
  - 対策: リアルタイムインデックス更新、バッチ処理の並行化

---

## 8. 関連ドキュメント
- `specs/features/04-video-management.md` - 動画メタデータ
- `specs/features/05-video-playback.md` - 視聴履歴
- `specs/features/06-short-management.md` - ショートメタデータ
- `specs/architecture/search.md` - 検索アーキテクチャ
