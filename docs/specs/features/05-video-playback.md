# 05. 動画再生仕様書

## 1. 概要

### 1.1 機能の目的
動画のストリーミング再生、いいね・コメント、視聴履歴、おすすめ動画の提供を実現し、ユーザーに快適な視聴体験を提供する。

### 1.2 対応フロントエンド画面
- `/video/[id]` - 動画詳細・再生画面
- `/(tabs)/videos` - 動画フィード
- `/(tabs)/settings` - 視聴履歴タブ
- `/channel/[id]` - チャンネルページ

### 1.3 関連機能
- `03-content-delivery.md` - CDN配信・ストリーミング
- `04-video-management.md` - 動画メタデータ管理
- `10-social.md` - いいね・コメント機能
- `12-search-recommendation.md` - おすすめアルゴリズム

---

## 2. ユースケース

### 2.1 主要ユーザーフロー

#### フロー1: 動画再生
```
1. ユーザーが動画サムネイルをクリック
2. /video/[id] に遷移
3. GET /api/videos/:id → 動画メタデータ取得
4. プラン・権限チェック（Netflix動画 / アダルト動画）
5. GET /api/videos/:id/stream → 署名付きストリーミングURL取得
6. HLS形式で動画再生開始
7. ABR（適応ビットレート）で画質自動調整
8. 再生開始時に POST /api/videos/:id/view → 視聴回数カウント
9. 30秒ごとに POST /api/videos/:id/progress → 視聴進捗保存
```

#### フロー2: いいね機能
```
1. 動画再生中にいいねボタンクリック
2. POST /api/videos/:id/like
3. like_count インクリメント
4. UIのいいねボタンがアクティブ表示
5. クリエイターに通知送信
```

#### フロー3: コメント投稿
```
1. 動画再生中にコメント入力欄にフォーカス
2. コメント内容を入力
3. 送信ボタンクリック
4. POST /api/videos/:id/comments
5. コメント一覧に即座に追加表示
6. クリエイターに通知送信
```

#### フロー4: 視聴履歴
```
1. 動画再生中、30秒ごとに進捗保存
2. POST /api/videos/:id/progress { "progress_seconds": 120 }
3. 視聴履歴テーブルに保存
4. 設定画面の履歴タブで確認可能
5. 再生再開時、前回の続きから再生
```

#### フロー5: おすすめ動画
```
1. 動画詳細ページの下部に「おすすめ動画」セクション表示
2. GET /api/videos/:id/recommendations
3. 視聴履歴・カテゴリ・タグに基づいたおすすめ取得
4. サムネイル一覧表示
5. クリックで次の動画に遷移（連続再生）
```

### 2.2 エッジケース
- ネットワーク速度低下時の画質自動調整
- 再生途中でのプラン降格（Premium → Free）
- アダルトコンテンツの年齢確認未完了
- コメントスパム・不適切コンテンツ報告
- 同じ動画の重複視聴カウント

---

## 3. データモデル

### 3.1 テーブル定義

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

### 3.2 リレーション図
```
videos (1) ─── (N) video_views
  │
  ├─── (N) video_likes
  │
  ├─── (N) video_comments
  │           └─── (N) video_comments (replies)
  │
  ├─── (N) watch_history
  │
  └─── (N) video_recommendations

users (1) ─── (N) video_likes
  │
  ├─── (N) video_comments
  │
  └─── (N) watch_history
```

---

## 4. API仕様

### 4.1 動画視聴開始

**エンドポイント**: `POST /api/videos/:id/view`

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
  "video_id": "vid_123456",
  "view_count": 12346
}
```

---

### 4.2 視聴進捗保存

**エンドポイント**: `POST /api/videos/:id/progress`

**認証**: 必須（Bearer Token）

**リクエスト**:
```json
{
  "progress_seconds": 120,
  "duration_seconds": 600
}
```

**レスポンス** (200 OK):
```json
{
  "message": "視聴進捗を保存しました",
  "progress_seconds": 120,
  "duration_seconds": 600,
  "progress_percentage": 20
}
```

---

### 4.3 いいね登録

**エンドポイント**: `POST /api/videos/:id/like`

**認証**: 必須（Bearer Token）

**レスポンス** (200 OK):
```json
{
  "message": "いいねしました",
  "video_id": "vid_123456",
  "like_count": 891,
  "is_liked": true
}
```

---

### 4.4 いいね解除

**エンドポイント**: `DELETE /api/videos/:id/like`

**認証**: 必須（Bearer Token）

**レスポンス** (200 OK):
```json
{
  "message": "いいねを解除しました",
  "video_id": "vid_123456",
  "like_count": 890,
  "is_liked": false
}
```

---

### 4.5 コメント一覧取得

**エンドポイント**: `GET /api/videos/:id/comments`

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
      "content": "素晴らしい動画でした！",
      "like_count": 15,
      "created_at": "2025-10-25T12:00:00Z",
      "replies": [
        {
          "id": "cmt_789012",
          "user_id": "usr_456",
          "user_name": "山田花子",
          "user_avatar": "https://cdn.example.com/avatars/usr_456.jpg",
          "content": "同感です！",
          "like_count": 5,
          "created_at": "2025-10-25T13:00:00Z"
        }
      ]
    }
  ],
  "pagination": {
    "total": 123,
    "page": 1,
    "limit": 20
  }
}
```

---

### 4.6 コメント投稿

**エンドポイント**: `POST /api/videos/:id/comments`

**認証**: 必須（Bearer Token）

**リクエスト**:
```json
{
  "content": "素晴らしい動画でした！",
  "parent_comment_id": null
}
```

**レスポンス** (201 Created):
```json
{
  "comment": {
    "id": "cmt_123456",
    "video_id": "vid_123456",
    "user_id": "usr_789",
    "user_name": "田中太郎",
    "user_avatar": "https://cdn.example.com/avatars/usr_789.jpg",
    "content": "素晴らしい動画でした！",
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

**エンドポイント**: `DELETE /api/videos/:id/comments/:comment_id`

**認証**: 必須（Bearer Token、コメント投稿者 or 動画所有者）

**レスポンス** (200 OK):
```json
{
  "message": "コメントを削除しました",
  "comment_id": "cmt_123456"
}
```

---

### 4.8 コメントにいいね

**エンドポイント**: `POST /api/videos/:id/comments/:comment_id/like`

**認証**: 必須（Bearer Token）

**レスポンス** (200 OK):
```json
{
  "message": "コメントにいいねしました",
  "comment_id": "cmt_123456",
  "like_count": 16
}
```

---

### 4.9 視聴履歴取得

**エンドポイント**: `GET /api/users/watch-history`

**認証**: 必須（Bearer Token）

**クエリパラメータ**:
- `page` (integer): ページ番号（デフォルト: 1）
- `limit` (integer): 取得件数（デフォルト: 20）

**レスポンス** (200 OK):
```json
{
  "history": [
    {
      "id": "wh_123456",
      "video_id": "vid_123456",
      "video_title": "素晴らしい動画タイトル",
      "thumbnail_url": "https://cdn.example.com/thumbnails/vid_123456.jpg",
      "user_name": "田中太郎",
      "user_avatar": "https://cdn.example.com/avatars/usr_789.jpg",
      "progress_seconds": 120,
      "duration_seconds": 600,
      "progress_percentage": 20,
      "last_watched_at": "2025-10-25T12:00:00Z"
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

### 4.10 おすすめ動画取得

**エンドポイント**: `GET /api/videos/:id/recommendations`

**認証**: 不要（ログイン時はパーソナライズ）

**クエリパラメータ**:
- `limit` (integer): 取得件数（デフォルト: 10）

**レスポンス** (200 OK):
```json
{
  "recommendations": [
    {
      "id": "vid_789012",
      "title": "関連動画のタイトル",
      "thumbnail_url": "https://cdn.example.com/thumbnails/vid_789012.jpg",
      "user_name": "山田花子",
      "user_avatar": "https://cdn.example.com/avatars/usr_456.jpg",
      "view_count": 56789,
      "duration": 480,
      "created_at": "2025-10-20T10:00:00Z",
      "reason": "category"
    }
  ]
}
```

---

## 5. ビジネスルール

### 5.1 視聴回数カウントルール

- 同じユーザーが同じ動画を視聴: 1日1回までカウント
- 未ログインユーザー: セッションIDで識別、1セッション1回
- 視聴時間が動画の10%未満: カウントしない
- 再生開始から5秒以内の離脱: カウントしない

### 5.2 いいね機能

- 1ユーザー1動画につき1いいね
- いいね取り消し可能
- 自分の動画にもいいね可能
- いいね数は動画一覧でリアルタイム表示

### 5.3 コメント機能

#### コメント制限
- 最小1文字、最大1000文字
- 連続投稿: 10秒間隔
- 1日の投稿上限: 100件
- スパム検出: 同じ内容の連続投稿は禁止

#### 返信機能
- 最大ネスト深度: 2階層（コメント → 返信 → 返信の返信まで）
- 親コメント削除時: 返信も全て削除

### 5.4 視聴履歴

- 保存期間: 無制限（ユーザーが削除するまで）
- 視聴進捗: 30秒ごとに自動保存
- 90%以上視聴: `completed: true`
- プライバシー: 自分の履歴のみ閲覧可能

### 5.5 おすすめアルゴリズム

#### スコア計算
```
score = 0.4 * category_match +
        0.3 * tag_match +
        0.2 * user_history_similarity +
        0.1 * trending_score
```

#### おすすめ理由
- `category` - 同じカテゴリ
- `tag` - タグが一致
- `user_history` - 視聴履歴に基づく
- `trending` - 現在人気の動画

### 5.6 エラーハンドリング

#### ストリーミングエラー
- ネットワークエラー: 自動リトライ（3回）
- 権限エラー: プラン変更案内表示
- サーバーエラー: エラーメッセージ表示

#### コメントエラー
```json
{
  "error": "comment_spam_detected",
  "message": "短時間に同じ内容のコメントを投稿できません",
  "retry_after": 10
}
```

### 5.7 境界値

- コメント長: 1-1000文字
- コメント投稿間隔: 10秒
- 1日のコメント上限: 100件
- 視聴進捗保存間隔: 30秒
- おすすめ動画取得数: 最大50件

### 5.8 エッジケース

#### 再生中のプラン降格
- Premium → Free: Netflix動画の再生は継続可能（現在の視聴のみ）
- 次の動画再生時に制限適用

#### 動画削除時の視聴履歴
- 動画削除後も視聴履歴に残る
- サムネイル・タイトルは「削除された動画」と表示

#### コメントスパム
- AIによる自動検出（繰り返しパターン、URL含有）
- 一時的なコメント投稿制限
- 悪質な場合はアカウント停止

---

## 6. 非機能要件

### 6.1 パフォーマンス
- 動画詳細取得: 200ms以内（P95）
- ストリーミングURL取得: 300ms以内（P95）
- コメント一覧取得: 500ms以内（P95）
- いいね登録: 200ms以内（P95）
- おすすめ動画取得: 1秒以内（P95）

### 6.2 セキュリティ
- 署名付きストリーミングURL（24時間有効）
- CSRF保護（コメント投稿）
- XSS対策（コメント内容のサニタイズ）
- レート制限（コメント投稿、いいね）

### 6.3 スケーラビリティ
- CDN配信（CloudFront / Cloudflare）
- コメント一覧のページネーション
- 視聴回数のバッチ更新（5分ごと）
- おすすめ動画の事前計算（1時間ごと）

### 6.4 可用性
- SLA: 99.9%
- CDN: 99.99%
- DB: PostgreSQL（マスター・スレーブ構成）
- キャッシュ: Redis（コメント一覧、おすすめ動画）

---

## 7. 実装上の注意点

### 7.1 外部サービス連携
- CDN: AWS CloudFront / Cloudflare
- 動画プレイヤー: expo-av / Video.js
- リアルタイム更新: WebSocket / Server-Sent Events
- コメントスパム検出: Akismet / カスタムAI

### 7.2 技術的制約
- HLSストリーミング: iOSネイティブサポート、Androidはhls.js
- ABR: ネットワーク速度に応じた自動画質切替
- コメント一覧: 仮想スクロール（大量コメント対応）
- 視聴進捗: localStorage（オフライン対応）

### 7.3 既知の課題
- 視聴回数のリアルタイム更新（バッチ処理による遅延）
  - 対策: バッチ間隔短縮、キャッシュ利用
- コメントスパムの完全防止困難
  - 対策: AI検出精度向上、コミュニティ報告機能
- おすすめアルゴリズムのフィルターバブル
  - 対策: 多様性スコアの導入、新規動画の優先表示

---

## 8. 関連ドキュメント
- `specs/features/03-content-delivery.md` - CDN配信・ストリーミング
- `specs/features/04-video-management.md` - 動画メタデータ管理
- `specs/features/10-social.md` - いいね・コメント機能
- `specs/features/12-search-recommendation.md` - おすすめアルゴリズム
