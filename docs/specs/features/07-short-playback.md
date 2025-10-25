# 07. ショート再生仕様書

## 1. 概要

### 1.1 機能の目的
TikTok/Instagram Reels形式の縦型短尺動画のストリーミング再生、スワイプナビゲーション、いいね・コメント機能を提供し、中毒性の高い視聴体験を実現する。

### 1.2 対応フロントエンド画面
- `/(tabs)/shorts` - ショートフィード（縦スクロール）
- `/short/[id]` - 個別ショート再生画面
- `/channel/[id]` - チャンネルページ（ショートタブ）

### 1.3 関連機能
- `03-content-delivery.md` - CDN配信・ストリーミング
- `06-short-management.md` - ショートメタデータ管理
- `10-social.md` - いいね・コメント機能
- `12-search-recommendation.md` - おすすめアルゴリズム

---

## 2. ユースケース

### 2.1 主要ユーザーフロー

#### フロー1: ショートフィード閲覧
```
1. ユーザーが /(tabs)/shorts タブをタップ
2. GET /api/shorts/feed → ショート一覧取得（おすすめ順）
3. 縦スクロール形式で表示（1画面1ショート）
4. 自動で最初のショート再生開始
5. 上スワイプで次のショート、下スワイプで前のショート
6. スワイプ時に次のショートを事前読み込み（プリロード）
7. 視聴中のショートのみ再生、他は停止
```

#### フロー2: ショート再生・インタラクション
```
1. ショート動画が自動再生
2. ループ再生（終了後、自動的に最初から再生）
3. タップで一時停止/再生
4. ダブルタップでいいね
5. コメントアイコンタップでコメント欄表示
6. シェアアイコンタップで共有メニュー表示
7. プロフィールアイコンタップでチャンネルページに遷移
```

#### フロー3: いいね機能
```
1. ショート再生中にダブルタップ or いいねボタンタップ
2. POST /api/shorts/:id/like
3. いいねアニメーション表示（ハートが画面中央に拡大）
4. like_count インクリメント
5. UIのいいねボタンがアクティブ表示
6. クリエイターに通知送信
```

#### フロー4: コメント投稿
```
1. ショート再生中にコメントアイコンタップ
2. 下からコメント欄がスライドアップ
3. コメント一覧表示（最新順）
4. コメント入力欄にフォーカス
5. コメント内容を入力
6. 送信ボタンタップ
7. POST /api/shorts/:id/comments
8. コメント一覧に即座に追加表示
9. クリエイターに通知送信
```

#### フロー5: 視聴履歴・おすすめ
```
1. ショート再生開始時、POST /api/shorts/:id/view → 視聴回数カウント
2. 3秒以上視聴で視聴履歴に記録
3. 視聴履歴・いいね履歴に基づいておすすめショート生成
4. フィードの下部に無限スクロールでおすすめショートを追加
```

### 2.2 エッジケース
- ネットワーク速度低下時の動画読み込み遅延
- 再生途中でのプラン降格（Premium → Free）
- アダルトコンテンツの年齢確認未完了
- コメントスパム・不適切コンテンツ報告
- 高速スワイプ時の動画プリロード失敗

---

## 3. データモデル

### 3.1 テーブル定義

#### `short_views` テーブル
```sql
CREATE TABLE short_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id UUID NOT NULL REFERENCES shorts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- 未ログインの場合はNULL
  session_id VARCHAR(100), -- 未ログインユーザー識別用
  ip_address VARCHAR(45),
  user_agent TEXT,
  viewed_at TIMESTAMP DEFAULT NOW(),
  watch_duration INTEGER, -- 視聴時間（秒）

  INDEX idx_short_views_short_id (short_id),
  INDEX idx_short_views_user_id (user_id),
  INDEX idx_short_views_viewed_at (viewed_at)
);
```

#### `short_likes` テーブル
```sql
CREATE TABLE short_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id UUID NOT NULL REFERENCES shorts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(short_id, user_id),
  INDEX idx_short_likes_short_id (short_id),
  INDEX idx_short_likes_user_id (user_id)
);
```

#### `short_comments` テーブル
```sql
CREATE TABLE short_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id UUID NOT NULL REFERENCES shorts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES short_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,

  INDEX idx_short_comments_short_id (short_id),
  INDEX idx_short_comments_user_id (user_id),
  INDEX idx_short_comments_parent_id (parent_comment_id),
  INDEX idx_short_comments_created_at (created_at DESC)
);
```

#### `short_watch_history` テーブル
```sql
CREATE TABLE short_watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  short_id UUID NOT NULL REFERENCES shorts(id) ON DELETE CASCADE,
  last_watched_at TIMESTAMP DEFAULT NOW(),
  watch_count INTEGER DEFAULT 1, -- 視聴回数

  UNIQUE(user_id, short_id),
  INDEX idx_short_watch_history_user_id (user_id),
  INDEX idx_short_watch_history_short_id (short_id),
  INDEX idx_short_watch_history_last_watched_at (last_watched_at DESC)
);
```

#### `short_recommendations` テーブル
```sql
CREATE TABLE short_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id UUID NOT NULL REFERENCES shorts(id) ON DELETE CASCADE,
  recommended_short_id UUID NOT NULL REFERENCES shorts(id) ON DELETE CASCADE,
  score FLOAT NOT NULL, -- おすすめスコア（0.0-1.0）
  reason VARCHAR(50), -- 'category', 'tag', 'user_history', 'trending'
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(short_id, recommended_short_id),
  INDEX idx_short_recommendations_short_id (short_id),
  INDEX idx_short_recommendations_score (score DESC)
);
```

### 3.2 リレーション図
```
shorts (1) ─── (N) short_views
  │
  ├─── (N) short_likes
  │
  ├─── (N) short_comments
  │           └─── (N) short_comments (replies)
  │
  ├─── (N) short_watch_history
  │
  └─── (N) short_recommendations

users (1) ─── (N) short_likes
  │
  ├─── (N) short_comments
  │
  └─── (N) short_watch_history
```

---

## 4. API仕様

### 4.1 ショートフィード取得

**エンドポイント**: `GET /api/shorts/feed`

**認証**: 不要（ログイン時はパーソナライズ）

**クエリパラメータ**:
- `page` (integer): ページ番号（デフォルト: 1）
- `limit` (integer): 取得件数（デフォルト: 20）
- `category` (string): カテゴリフィルター（省略時は全カテゴリ）

**レスポンス** (200 OK):
```json
{
  "shorts": [
    {
      "id": "short_123456",
      "title": "素晴らしいショート動画",
      "description": "踊ってみた！",
      "video_url": "https://cdn.example.com/shorts/short_123456.m3u8",
      "thumbnail_url": "https://cdn.example.com/thumbnails/short_123456.jpg",
      "user_id": "usr_789",
      "user_name": "田中太郎",
      "user_avatar": "https://cdn.example.com/avatars/usr_789.jpg",
      "category": "dance",
      "duration": 30,
      "view_count": 5678,
      "like_count": 234,
      "comment_count": 45,
      "is_adult": false,
      "created_at": "2025-10-20T12:00:00Z"
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

### 4.2 ショート視聴開始

**エンドポイント**: `POST /api/shorts/:id/view`

**認証**: 不要（未ログインでも視聴可能）

**リクエスト**:
```json
{
  "session_id": "sess_anonymous_123"
}
```

**レスポンス** (200 OK):
```json
{
  "message": "視聴を記録しました",
  "short_id": "short_123456",
  "view_count": 5679
}
```

---

### 4.3 いいね登録

**エンドポイント**: `POST /api/shorts/:id/like`

**認証**: 必須（Bearer Token）

**レスポンス** (200 OK):
```json
{
  "message": "いいねしました",
  "short_id": "short_123456",
  "like_count": 235,
  "is_liked": true
}
```

---

### 4.4 いいね解除

**エンドポイント**: `DELETE /api/shorts/:id/like`

**認証**: 必須（Bearer Token）

**レスポンス** (200 OK):
```json
{
  "message": "いいねを解除しました",
  "short_id": "short_123456",
  "like_count": 234,
  "is_liked": false
}
```

---

### 4.5 コメント一覧取得

**エンドポイント**: `GET /api/shorts/:id/comments`

**認証**: 不要

**クエリパラメータ**:
- `page` (integer): ページ番号（デフォルト: 1）
- `limit` (integer): 取得件数（デフォルト: 20）
- `sort` (string): ソート順（`newest`, `popular`）

**レスポンス** (200 OK):
```json
{
  "comments": [
    {
      "id": "cmt_123456",
      "user_id": "usr_789",
      "user_name": "田中太郎",
      "user_avatar": "https://cdn.example.com/avatars/usr_789.jpg",
      "content": "素晴らしいショート！",
      "like_count": 12,
      "created_at": "2025-10-25T12:00:00Z",
      "replies": [
        {
          "id": "cmt_789012",
          "user_id": "usr_456",
          "user_name": "山田花子",
          "user_avatar": "https://cdn.example.com/avatars/usr_456.jpg",
          "content": "同感です！",
          "like_count": 3,
          "created_at": "2025-10-25T13:00:00Z"
        }
      ]
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20
  }
}
```

---

### 4.6 コメント投稿

**エンドポイント**: `POST /api/shorts/:id/comments`

**認証**: 必須（Bearer Token）

**リクエスト**:
```json
{
  "content": "素晴らしいショート！",
  "parent_comment_id": null
}
```

**レスポンス** (201 Created):
```json
{
  "comment": {
    "id": "cmt_123456",
    "short_id": "short_123456",
    "user_id": "usr_789",
    "user_name": "田中太郎",
    "user_avatar": "https://cdn.example.com/avatars/usr_789.jpg",
    "content": "素晴らしいショート！",
    "like_count": 0,
    "created_at": "2025-10-25T12:00:00Z"
  }
}
```

**エラーレスポンス**:
- `400 Bad Request` - コメント内容が空 or 長すぎる
- `429 Too Many Requests` - コメント投稿レート制限超過

---

### 4.7 コメント削除

**エンドポイント**: `DELETE /api/shorts/:id/comments/:comment_id`

**認証**: 必須（Bearer Token、コメント投稿者 or ショート所有者）

**レスポンス** (200 OK):
```json
{
  "message": "コメントを削除しました",
  "comment_id": "cmt_123456"
}
```

---

### 4.8 コメントにいいね

**エンドポイント**: `POST /api/shorts/:id/comments/:comment_id/like`

**認証**: 必須（Bearer Token）

**レスポンス** (200 OK):
```json
{
  "message": "コメントにいいねしました",
  "comment_id": "cmt_123456",
  "like_count": 13
}
```

---

### 4.9 おすすめショート取得

**エンドポイント**: `GET /api/shorts/:id/recommendations`

**認証**: 不要（ログイン時はパーソナライズ）

**クエリパラメータ**:
- `limit` (integer): 取得件数（デフォルト: 10）

**レスポンス** (200 OK):
```json
{
  "recommendations": [
    {
      "id": "short_789012",
      "title": "関連ショートのタイトル",
      "video_url": "https://cdn.example.com/shorts/short_789012.m3u8",
      "thumbnail_url": "https://cdn.example.com/thumbnails/short_789012.jpg",
      "user_name": "山田花子",
      "user_avatar": "https://cdn.example.com/avatars/usr_456.jpg",
      "view_count": 12345,
      "like_count": 890,
      "duration": 25,
      "created_at": "2025-10-20T10:00:00Z",
      "reason": "category"
    }
  ]
}
```

---

### 4.10 視聴履歴取得

**エンドポイント**: `GET /api/users/short-watch-history`

**認証**: 必須（Bearer Token）

**クエリパラメータ**:
- `page` (integer): ページ番号（デフォルト: 1）
- `limit` (integer): 取得件数（デフォルト: 20）

**レスポンス** (200 OK):
```json
{
  "history": [
    {
      "id": "swh_123456",
      "short_id": "short_123456",
      "short_title": "素晴らしいショート動画",
      "thumbnail_url": "https://cdn.example.com/thumbnails/short_123456.jpg",
      "user_name": "田中太郎",
      "user_avatar": "https://cdn.example.com/avatars/usr_789.jpg",
      "watch_count": 3,
      "last_watched_at": "2025-10-25T12:00:00Z"
    }
  ],
  "pagination": {
    "total": 78,
    "page": 1,
    "limit": 20
  }
}
```

---

## 5. ビジネスルール

### 5.1 視聴回数カウントルール

- 同じユーザーが同じショートを視聴: 1日1回までカウント
- 未ログインユーザー: セッションIDで識別、1セッション1回
- 視聴時間が3秒未満: カウントしない
- 高速スワイプ（1秒未満）: カウントしない

### 5.2 いいね機能

- 1ユーザー1ショートにつき1いいね
- いいね取り消し可能
- 自分のショートにもいいね可能
- ダブルタップでいいね（TikTok形式）
- いいねアニメーション表示（ハート拡大）

### 5.3 コメント機能

#### コメント制限
- 最小1文字、最大500文字（ショートは短いため動画より短い）
- 連続投稿: 5秒間隔
- 1日の投稿上限: 200件
- スパム検出: 同じ内容の連続投稿は禁止

#### 返信機能
- 最大ネスト深度: 1階層（コメント → 返信のみ）
- 親コメント削除時: 返信も全て削除

### 5.4 スワイプナビゲーション

- 上スワイプ: 次のショート
- 下スワイプ: 前のショート
- 左右スワイプ: 無効（誤操作防止）
- プリロード: 次の3本分のショートを事前読み込み
- 自動再生: 表示中のショートのみ再生

### 5.5 おすすめアルゴリズム

#### スコア計算
```
score = 0.35 * category_match +
        0.25 * tag_match +
        0.25 * user_history_similarity +
        0.15 * trending_score
```

#### おすすめ理由
- `category` - 同じカテゴリ
- `tag` - タグが一致
- `user_history` - 視聴履歴に基づく
- `trending` - 現在人気のショート

### 5.6 エラーハンドリング

#### ストリーミングエラー
- ネットワークエラー: 自動リトライ（3回）
- プリロード失敗: 次のショートに進まず、エラー表示
- 権限エラー: プラン変更案内表示

#### コメントエラー
```json
{
  "error": "comment_spam_detected",
  "message": "短時間に同じ内容のコメントを投稿できません",
  "retry_after": 5
}
```

### 5.7 境界値

- コメント長: 1-500文字
- コメント投稿間隔: 5秒
- 1日のコメント上限: 200件
- プリロード本数: 3本
- おすすめショート取得数: 最大50件
- フィードページサイズ: 20件

### 5.8 エッジケース

#### 高速スワイプ時の動画読み込み
- プリロード済み: 即座に再生
- プリロード未完了: ローディング表示、完了後再生

#### 再生中のプラン降格
- Premium → Free: アダルトショートの再生は中断
- 次のショートから制限適用

#### ショート削除時の視聴履歴
- ショート削除後も視聴履歴に残る
- サムネイル・タイトルは「削除されたショート」と表示

#### ネットワーク切断時
- 再生中のショート: バッファリング継続（可能な限り）
- 次のショート: オフラインメッセージ表示

---

## 6. 非機能要件

### 6.1 パフォーマンス
- フィード取得: 300ms以内（P95）
- ショート詳細取得: 200ms以内（P95）
- コメント一覧取得: 500ms以内（P95）
- いいね登録: 200ms以内（P95）
- 動画プリロード: 次のショート表示前に完了

### 6.2 セキュリティ
- 署名付きストリーミングURL（24時間有効）
- CSRF保護（コメント投稿、いいね）
- XSS対策（コメント内容のサニタイズ）
- レート制限（コメント投稿、いいね）

### 6.3 スケーラビリティ
- CDN配信（CloudFront / Cloudflare）
- コメント一覧のページネーション
- 視聴回数のバッチ更新（5分ごと）
- おすすめショートの事前計算（30分ごと）

### 6.4 可用性
- SLA: 99.9%
- CDN: 99.99%
- DB: PostgreSQL（マスター・スレーブ構成）
- キャッシュ: Redis（フィード、おすすめショート）

---

## 7. 実装上の注意点

### 7.1 外部サービス連携
- CDN: AWS CloudFront / Cloudflare
- 動画プレイヤー: expo-av（React Native）
- リアルタイム更新: WebSocket（いいね数、コメント数）
- コメントスパム検出: Akismet / カスタムAI

### 7.2 技術的制約
- HLSストリーミング: iOSネイティブサポート、Androidはhls.js
- 縦スクロール: FlatList with `pagingEnabled`（React Native）
- プリロード: `onViewableItemsChanged`コールバック
- 自動再生: 表示中のショートのみ`shouldPlay={true}`

### 7.3 既知の課題
- 高速スワイプ時のプリロード遅延
  - 対策: プリロード本数増加、低画質版の事前読み込み
- コメントスパムの完全防止困難
  - 対策: AI検出精度向上、コミュニティ報告機能
- フィルターバブル（同じ系統のショートばかり）
  - 対策: 多様性スコアの導入、新規ショートの優先表示

---

## 8. 関連ドキュメント
- `specs/features/03-content-delivery.md` - CDN配信・ストリーミング
- `specs/features/06-short-management.md` - ショートメタデータ管理
- `specs/features/10-social.md` - いいね・コメント機能
- `specs/features/12-search-recommendation.md` - おすすめアルゴリズム
