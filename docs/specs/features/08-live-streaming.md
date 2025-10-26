# 08. ライブ配信仕様書 - **Stretch Goal 2**

**⚠️ Important**: この機能は **Stretch Goal 2** です。MVP には含まれません。

**Decision Gate**:
- ✅ MVP完全稼働
- ✅ AWS MediaLive技術検証成功（PoC完了）
- ✅ 予算確保（MediaLive月額コスト: $500-2,000）
- ✅ チームリソース確保（+1-2エンジニア）

## 1. 概要

### 1.1 機能の目的
リアルタイムライブ配信機能を提供し、クリエイターが視聴者と直接コミュニケーションできるプラットフォームを構築する。WebRTC/HLSによる低遅延配信、リアルタイムチャット、スーパーチャット（投げ銭）機能を実装する。

### 1.2 対応フロントエンド画面
- `/go-live` - ライブ配信作成画面（Expo Router）
- `/live/[id]` - ライブ視聴画面
- `/(tabs)/videos` - ライブ配信一覧（ライブタブ）
- `/creation` - ライブ配信管理（ダッシュボード）

### 1.3 関連機能
- `01-authentication.md` - クリエイター権限チェック
- `09-monetization.md` - スーパーチャット・収益管理
- `10-social.md` - チャット・フォロー機能
- `13-channel-creation.md` - チャンネル管理

---

## 2. ユースケース

### 2.1 主要ユーザーフロー

#### フロー1: ライブ配信作成
```
1. クリエイターが /go-live にアクセス
2. 配信情報入力（タイトル、説明、カテゴリ）
3. サムネイル画像アップロード
4. プライバシー設定（公開/限定公開/非公開）
5. アダルトコンテンツフラグ設定
6. チャット有効化設定
7. スーパーチャット有効化設定（収益化）
8. アーカイブ保存設定
9. 配信予約設定（オプション）
10. POST /api/live/create
11. ストリームキー・RTMP URLの発行
12. OBS等の配信ソフトで設定
```

#### フロー2: ライブ配信開始
```
1. クリエイターが配信ソフトで配信開始
2. RTMP接続確立
3. サーバーがストリーム検出
4. ステータスが 'scheduled' → 'live' に変更
5. 視聴者に通知送信（フォロワー、登録者）
6. ライブ配信一覧に表示
7. HLS/WebRTCで視聴可能に
```

#### フロー3: ライブ視聴
```
1. ユーザーがライブ配信サムネイルをクリック
2. /live/[id] に遷移
3. GET /api/live/:id → 配信メタデータ取得
4. プラン・権限チェック
5. GET /api/live/:id/stream → 署名付きストリーミングURL取得
6. HLS/WebRTC形式で配信視聴開始
7. リアルタイムチャット表示（WebSocket接続）
8. 現在の視聴者数表示
9. いいね・スーパーチャット可能
```

#### フロー4: チャット投稿
```
1. 視聴中にチャット入力欄にメッセージ入力
2. 送信ボタンクリック or Enter
3. WebSocket経由でサーバーに送信
4. サーバーが全視聴者にブロードキャスト
5. チャット欄に即座に表示
6. スパムフィルター適用
```

#### フロー5: スーパーチャット送信
```
1. 視聴中にスーパーチャットボタンクリック
2. 金額選択（¥100, ¥500, ¥1000, ¥5000, ¥10000）
3. メッセージ入力（オプション）
4. 決済確認（Stripe / CCBill）
5. POST /api/live/:id/superchat
6. 決済完了後、チャット欄に目立つ形で表示
7. クリエイターに収益加算
8. 通知音・アニメーション表示
```

#### フロー6: ライブ配信終了
```
1. クリエイターが配信ソフトで配信停止
2. RTMP接続切断
3. サーバーがストリーム終了検出
4. ステータスが 'live' → 'ended' に変更
5. アーカイブ保存設定がONの場合:
   - 録画データをS3に保存
   - トランスコード実行
   - アーカイブ動画として公開
6. 統計データ保存（総視聴者数、ピーク視聴者数、総収益等）
```

### 2.2 エッジケース
- 配信中のネットワーク切断・再接続
- 同時視聴者数が上限を超える
- スーパーチャットのスパム投稿
- アーカイブ保存失敗
- 配信中のアダルトコンテンツ検出

---

## 3. データモデル

### 3.1 テーブル定義

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

### 3.2 リレーション図
```
users (1) ─── (N) live_streams
                    │
                    ├─── (N) live_chat_messages
                    │
                    ├─── (N) live_viewers
                    │
                    ├─── (N) live_stream_stats
                    │
                    └─── (1) videos (archive)
```

---

## 4. API仕様

### 4.1 ライブ配信作成

**エンドポイント**: `POST /api/live/create`

**認証**: 必須（Bearer Token、クリエイター権限）

**リクエスト**:
```json
{
  "title": "今夜のライブ配信",
  "description": "ゲーム実況します！",
  "category": "gaming",
  "thumbnail": "base64_encoded_image",
  "privacy": "public",
  "is_adult": false,
  "chat_enabled": true,
  "super_chat_enabled": true,
  "archive_enabled": true,
  "scheduled_start_time": "2025-10-25T20:00:00Z"
}
```

**レスポンス** (201 Created):
```json
{
  "live_stream": {
    "id": "live_123456",
    "title": "今夜のライブ配信",
    "status": "scheduled",
    "stream_key": "live_sk_abc123def456",
    "rtmp_url": "rtmp://live.example.com/live",
    "stream_url": "https://cdn.example.com/live/live_123456/index.m3u8",
    "scheduled_start_time": "2025-10-25T20:00:00Z",
    "created_at": "2025-10-25T12:00:00Z"
  }
}
```

---

### 4.2 ライブ配信詳細取得

**エンドポイント**: `GET /api/live/:id`

**認証**: 不要（公開配信の場合）

**レスポンス** (200 OK):
```json
{
  "id": "live_123456",
  "title": "今夜のライブ配信",
  "description": "ゲーム実況します！",
  "category": "gaming",
  "thumbnail_url": "https://cdn.example.com/thumbnails/live_123456.jpg",
  "privacy": "public",
  "is_adult": false,
  "status": "live",
  "user_id": "usr_789",
  "user_name": "田中太郎",
  "user_avatar": "https://cdn.example.com/avatars/usr_789.jpg",
  "current_viewers": 1234,
  "peak_viewers": 2345,
  "total_likes": 890,
  "total_super_chat_amount": 12345,
  "chat_enabled": true,
  "super_chat_enabled": true,
  "scheduled_start_time": "2025-10-25T20:00:00Z",
  "actual_start_time": "2025-10-25T20:02:00Z",
  "created_at": "2025-10-25T12:00:00Z"
}
```

---

### 4.3 ストリーミングURL取得

**エンドポイント**: `GET /api/live/:id/stream`

**認証**: 必須（Bearer Token）

**レスポンス** (200 OK):
```json
{
  "live_stream_id": "live_123456",
  "stream_url": "https://cdn.example.com/live/live_123456/index.m3u8?signature=xxx",
  "webrtc_url": "wss://live.example.com/webrtc/live_123456",
  "expires_in": 7200
}
```

---

### 4.4 ライブ配信開始

**エンドポイント**: `POST /api/live/:id/start`

**認証**: 必須（Bearer Token、配信所有者のみ）

**レスポンス** (200 OK):
```json
{
  "message": "配信を開始しました",
  "live_stream_id": "live_123456",
  "status": "live",
  "actual_start_time": "2025-10-25T20:02:00Z"
}
```

---

### 4.5 ライブ配信終了

**エンドポイント**: `POST /api/live/:id/end`

**認証**: 必須（Bearer Token、配信所有者のみ）

**レスポンス** (200 OK):
```json
{
  "message": "配信を終了しました",
  "live_stream_id": "live_123456",
  "status": "ended",
  "end_time": "2025-10-25T22:00:00Z",
  "stats": {
    "total_viewers": 5678,
    "peak_viewers": 2345,
    "total_likes": 890,
    "total_super_chat_amount": 12345,
    "duration_seconds": 7080
  }
}
```

---

### 4.6 チャットメッセージ送信

**エンドポイント**: `POST /api/live/:id/chat` (WebSocket推奨)

**認証**: 必須（Bearer Token）

**リクエスト**:
```json
{
  "message": "こんにちは！"
}
```

**レスポンス** (201 Created):
```json
{
  "chat_message": {
    "id": "chat_123456",
    "live_stream_id": "live_123456",
    "user_id": "usr_789",
    "user_name": "田中太郎",
    "user_avatar": "https://cdn.example.com/avatars/usr_789.jpg",
    "message": "こんにちは！",
    "is_super_chat": false,
    "created_at": "2025-10-25T20:05:00Z"
  }
}
```

---

### 4.7 スーパーチャット送信

**エンドポイント**: `POST /api/live/:id/superchat`

**認証**: 必須（Bearer Token）

**リクエスト**:
```json
{
  "amount": 1000,
  "message": "応援しています！"
}
```

**レスポンス** (201 Created):
```json
{
  "super_chat": {
    "id": "sc_123456",
    "live_stream_id": "live_123456",
    "user_id": "usr_789",
    "user_name": "田中太郎",
    "user_avatar": "https://cdn.example.com/avatars/usr_789.jpg",
    "amount": 1000,
    "message": "応援しています！",
    "created_at": "2025-10-25T20:10:00Z"
  },
  "payment": {
    "status": "completed",
    "transaction_id": "txn_abc123"
  }
}
```

---

### 4.8 ライブ配信一覧取得

**エンドポイント**: `GET /api/live/active`

**認証**: 不要

**クエリパラメータ**:
- `page` (integer): ページ番号（デフォルト: 1）
- `limit` (integer): 取得件数（デフォルト: 20）
- `category` (string): カテゴリフィルター

**レスポンス** (200 OK):
```json
{
  "live_streams": [
    {
      "id": "live_123456",
      "title": "今夜のライブ配信",
      "thumbnail_url": "https://cdn.example.com/thumbnails/live_123456.jpg",
      "user_name": "田中太郎",
      "user_avatar": "https://cdn.example.com/avatars/usr_789.jpg",
      "category": "gaming",
      "current_viewers": 1234,
      "status": "live",
      "actual_start_time": "2025-10-25T20:02:00Z"
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

### 4.9 ライブ統計取得

**エンドポイント**: `GET /api/live/:id/stats`

**認証**: 必須（Bearer Token、配信所有者のみ）

**レスポンス** (200 OK):
```json
{
  "live_stream_id": "live_123456",
  "current_viewers": 1234,
  "peak_viewers": 2345,
  "total_views": 5678,
  "total_likes": 890,
  "total_super_chat_amount": 12345,
  "average_watch_time_seconds": 600,
  "viewer_timeline": [
    {
      "timestamp": "2025-10-25T20:00:00Z",
      "viewers": 100
    },
    {
      "timestamp": "2025-10-25T20:15:00Z",
      "viewers": 1234
    }
  ]
}
```

---

### 4.10 チャット履歴取得

**エンドポイント**: `GET /api/live/:id/chat/history`

**認証**: 不要

**クエリパラメータ**:
- `limit` (integer): 取得件数（デフォルト: 50）
- `before` (timestamp): この時刻より前のメッセージ取得

**レスポンス** (200 OK):
```json
{
  "messages": [
    {
      "id": "chat_123456",
      "user_id": "usr_789",
      "user_name": "田中太郎",
      "user_avatar": "https://cdn.example.com/avatars/usr_789.jpg",
      "message": "こんにちは！",
      "is_super_chat": false,
      "created_at": "2025-10-25T20:05:00Z"
    },
    {
      "id": "sc_123456",
      "user_id": "usr_456",
      "user_name": "山田花子",
      "user_avatar": "https://cdn.example.com/avatars/usr_456.jpg",
      "message": "応援しています！",
      "is_super_chat": true,
      "super_chat_amount": 1000,
      "created_at": "2025-10-25T20:10:00Z"
    }
  ]
}
```

---

## 5. ビジネスルール

### 5.1 ライブ配信権限

| プラン | ライブ配信 | 配信時間 | 同時視聴者数上限 |
|-------|----------|---------|----------------|
| Free | ❌ | - | - |
| Premium | ✅ | 2時間 | 500人 |
| Premium+ | ✅ | 無制限 | 5000人 |

### 5.2 チャット機能

#### メッセージ制限
- 最小1文字、最大200文字
- 連続投稿: 3秒間隔
- スパムフィルター: URL含有、繰り返しパターン検出

#### スーパーチャット
- 金額: ¥100, ¥500, ¥1,000, ¥5,000, ¥10,000
- メッセージ: 最大200文字
- 決済プロバイダー: Stripe（一般）/ CCBill（アダルト）
- 手数料: 30%（プラットフォーム手数料）

### 5.3 アーカイブ保存

- 配信終了後、自動的にアーカイブ動画作成
- トランスコード: HLS形式、複数画質
- 公開設定: 配信時のプライバシー設定を継承
- 保存期間: 無制限（ユーザーが削除するまで）

### 5.4 エラーハンドリング

#### ストリーム接続エラー
```json
{
  "error": "stream_connection_failed",
  "message": "配信接続に失敗しました",
  "details": {
    "reason": "invalid_stream_key",
    "retry": false
  }
}
```

#### 同時視聴者数上限
```json
{
  "error": "viewer_limit_exceeded",
  "message": "視聴者数上限に達しました",
  "details": {
    "current_limit": 500,
    "upgrade_plan": "premium_plus"
  }
}
```

### 5.5 境界値

- 配信時間: Premium 2時間、Premium+ 無制限
- 同時視聴者数: Premium 500人、Premium+ 5000人
- チャット投稿間隔: 3秒
- スーパーチャット最大金額: ¥10,000/回
- 1日のスーパーチャット上限: ¥100,000

### 5.6 エッジケース

#### 配信中のネットワーク切断
- 30秒以内の再接続: 配信継続
- 30秒超: 配信終了、アーカイブ保存

#### スーパーチャットの決済失敗
- 即座にエラー表示
- チャットに表示しない
- 再試行可能

#### アーカイブ保存失敗
- 3回リトライ
- 失敗時はクリエイターに通知
- 録画データは7日間保持、再試行可能

---

## 6. 非機能要件

### 6.1 パフォーマンス
- 配信遅延: 3-5秒（HLS）、1-2秒（WebRTC）
- チャットメッセージ遅延: 500ms以内
- 同時配信数: 1000配信以上
- スケーリング: Auto Scaling（視聴者数に応じて）

### 6.2 セキュリティ
- ストリームキー: ランダム生成、定期的に再発行
- RTMP over TLS（RTMPS）
- WebSocket over TLS（WSS）
- チャットスパムフィルター
- 不適切コンテンツ自動検出

### 6.3 可用性
- SLA: 99.9%
- CDN: 99.99%（CloudFront）
- RTMP Server: 複数リージョン配置
- WebSocket: Redis Pub/Sub（スケールアウト）

---

## 7. 実装上の注意点

### 7.1 外部サービス連携
- RTMP Server: nginx-rtmp / AWS MediaLive
- CDN: AWS CloudFront / Cloudflare
- WebSocket: Socket.io / AWS API Gateway WebSocket
- トランスコード: FFmpeg / AWS MediaConvert

### 7.2 技術的制約
- HLS: 3-5秒遅延（セグメントサイズによる）
- WebRTC: 低遅延だがCPU負荷高い
- RTMP: OBS等の配信ソフト必須
- スケーリング: 視聴者数に応じた自動スケール

### 7.3 既知の課題
- HLS遅延（3-5秒）の改善
  - 対策: WebRTC対応、Low-Latency HLS
- チャットスパムの完全防止困難
  - 対策: AI検出、モデレーター機能
- 同時視聴者数上限
  - 対策: CDNキャッシュ、複数オリジンサーバー

---

## 8. 関連ドキュメント
- `specs/features/09-monetization.md` - スーパーチャット・収益管理
- `specs/features/10-social.md` - チャット・フォロー機能
- `specs/features/13-channel-creation.md` - チャンネル管理
- `specs/architecture/streaming.md` - ストリーミングアーキテクチャ
