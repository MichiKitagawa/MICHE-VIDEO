# バックエンド実装仕様書（フロントエンド整合版）

## 1. 目的と適用範囲
- 本書は `docs/specs/` 配下の既存仕様および完成済みフロントエンド実装を基に、バックエンド側の実装指針と追加で必要な仕様を統合したもの。
- 既存ドキュメントの主要参照元: アーキテクチャ系 (`architecture/*`), 機能仕様 (`features/*`), 参照資料 (`references/*`)。
- 対象スコープ: REST API サーバー、バックグラウンドジョブ、外部サービス連携、運用・監視。

## 2. システム全体像
### 2.1 アーキテクチャ概観
- ベースは `docs/specs/architecture/system-overview.md` で定義された AWS ベースの3層構成 (ALB → Node.js API → PostgreSQL/Redis/S3)。
- 推奨アプリケーションランタイム: Node.js 20 + TypeScript 5 (`docs/specs/architecture/tech-stack.md`)。
- Webフレームワークは Fastify 4.x を標準採用。既存図にある Express 記述は Fastify に読み替えること。
- CDN/トランスコーディング/ライブ配信は CloudFront, MediaConvert, MediaLive を活用。

### 2.2 主要コンポーネント
| レイヤ | コンポーネント | 主な責務 | 備考 |
| --- | --- | --- | --- |
| クライアント | Web/React Native App | UI・体験 | Expo Router ベース (`frontend/app/*`) |
| API | Fastify アプリケーション | REST, GraphQL (将来) | DDD モジュール化。DIに Inversify 想定 |
| キャッシュ | Redis Cluster | セッション、レート制御、短期キャッシュ | TTL 設計は `system-overview.md` の9.1参照 |
| データ | PostgreSQL、Elasticsearch | トランザクション、全文検索 | Prisma 5.x によるORM |
| ストレージ | S3 (アップロード/配信用) | 元動画、変換済み動画、ライブ録画 | `media_files` テーブルで索引 |
| 外部連携 | Stripe, CCBill, AWS SES/SNS | 決済、通知 | 決済仕様は §5.1 参照 |

## 3. モジュール別実装指針
モジュール構成は `docs/specs/features` の14カテゴリと揃える。各モジュールは `modules/<domain>` にドメイン層・アプリ層・インフラ層を分離して実装する。

### 3.1 認証・アカウント (`features/01-authentication.md`)
- 責務: 会員登録、ログイン/リフレッシュ、プロフィール更新、パスワード管理、RBAC。
- 主API: `/api/auth/register|login|refresh|logout|me|profile|change-password|request-password-reset|reset-password`。
- データ: `users`, `user_sessions`, `email_verifications`, `password_resets`。
- フロント同期: `/auth` (統合認証ページ), `/(tabs)/settings` プロファイルタブ。

### 3.2 サブスクリプション & 決済 (`features/02-subscription.md`, `references/payment-integration.md`)
- 責務: プラン管理 (Free/Premium/Premium+)、チェックアウトURL生成、プラン変更、キャンセル、決済履歴、Webhook処理。
- 主API: `/api/subscriptions/plans|current|create-checkout|create-ccbill-checkout|change|cancel|payment-history`, `/api/webhooks/stripe`, `/api/webhooks/ccbill`。
- データ: `subscription_plans`, `user_subscriptions`, `subscription_payment_history`, `payment_methods`。
- フロント同期: `/(tabs)/settings` プラン管理、`AgeVerificationModal`、`PlanCard`。
- 追加要件: フロントが利用する `features: string[]`, `is_current`, `has_ads`, `billing_cycle` などのフィールドをAPIレスポンスで提供 (詳細は §4.1)。

### 3.3 コンテンツ取り扱い (動画/ショート/ライブ/Netflix)
- `features/03-content-delivery.md`: アップロード初期化 → S3 署名URL 発行、MediaConvert ジョブ投入、ステータス通知。
- `features/04-video-management.md` & `05-video-playback.md`: 動画 CRUD + 視聴履歴/推薦。
- `features/06-short-management.md` & `07-short-playback.md`: Shorts CRUD/フィード/コメント。
- `features/08-live-streaming.md`: ライブ作成・開始・終了・チャット、ライブ統計 (`live_streams`, `live_chat_messages`, `live_stream_stats`)。
- `features/14-netflix-content.md`: Netflix 風コンテンツ (映画/シリーズ)、シーズン/エピソード構造、IPライセンス。
- 共通データ: `videos`, `shorts`, `media_files`, `transcoding_jobs`, `video_comments`, `short_comments`, `video_views`, `short_views`, `live_streams`, `netflix_contents`, `seasons`, `episodes`, `ip_licenses`。
- フロント同期: `frontend/app/(tabs)/*`, `/video/[id]`, `/short/[id]`, `/live/[id]`, `/netflix/[id]`。

### 3.4 収益化・決済補助 (`features/09-monetization.md`)
- 責務: 投げ銭、収益統計、出金方法、出金申請、税情報。
- 主API: `/api/tips/send|sent`, `/api/earnings/stats|history`, `/api/withdrawal/methods`, `/api/withdrawal/request`, `/api/tax-info/register`, `/api/payments/provider`。
- データ: `earnings`, `tips`, `withdrawal_methods`, `withdrawal_requests`, `tax_info`。
- フロント同期: `Settings` → 収益タブ、`TipModal`、ライブ SuperChat。

### 3.5 ソーシャル & プラットフォーム機能
- `features/10-social.md`: フォロー、通知、通知設定。
- `features/11-playlist.md`: プレイリスト CRUD/並び替え。
- `features/12-search-recommendation.md`: 検索履歴、サジェスト、トレンド、個別推薦 (Elasticsearch + レコメンドバッチ)。
- `features/13-channel-creation.md`: クリエイター申請、チャンネル編集、アナリティクス。
- 主要データ: `follows`, `notifications`, `notification_settings`, `playlists`, `playlist_videos`, `search_history`, `activity_feed`, `analytics_rollups` など。

## 4. データ契約 (DTO) とフロント整合
### 4.1 サブスクリプションプラン DTO
- エンドポイント: `GET /api/subscriptions/plans`, `GET /api/subscriptions/current`。
- 提供フィールド:
  {
    "id": "plan_premium",
    "name": "プレミアムプラン",
    "name_en": "Premium",
    "price": 980,
    "currency": "JPY",
    "billing_cycle": "monthly",
    "features": ["Netflix型コンテンツ視聴", "広告なし", "1080p 配信"],
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
  }
- 実装メモ: `feature_flags` は既存 JSONB を直返しし、UI 表示用に `features` (ローカライズ済み配列) を生成。
- Free プランは `payment_provider: null` を返すことでフロントの現在実装と整合。

### 4.2 決済フロー応答
- `POST /api/subscriptions/create-checkout` / `create-ccbill-checkout` / `change` は `payment_url` を必ず返却。
- 応答例:
  {
    "success": true,
    "payment_url": "https://checkout.stripe.com/c/pay/cs_test_xxx",
    "provider": "stripe"
  }
- `change` では決済不要ケースに `payment_url: null` を許容し、`message` フィールドをオプションで返す。

### 4.3 Netflix コンテンツ DTO
- リスト (`GET /api/netflix`): `NetflixContent` のサマリ (id, title, type, poster_url, rating, is_adult, genres, country)。
- 詳細 (`GET /api/netflix/:id`): フロントが即時再生できるよう `video_url` (映画) または `seasons[].episodes[].video_url` を含め、同時に `streams` エンドポイントで署名付きURLを提供。
- プラン制御: レスポンスに `access_requirements` を追加し、`{ "min_plan": "premium", "adult_only": true }` のように表現。

### 4.4 ライブ配信・投げ銭
- `GET /api/live/:id` は `LiveStream` DTO として stream_key, stream_url, chat 設定を含める。
- `POST /api/tips/send` は `payment_url` を返し、`provider` はフロントの `processTip` と一致させる。
- Withdrawal API は `type: 'bank_transfer'|'paypal'|'other'` を許容し、追加情報フィールドを `metadata` に格納。

## 5. 外部サービス連携
### 5.1 決済基盤
- Stripe: 一般コンテンツ (Free→Premium) / Tips 非成人。`payment_methods` テーブルで customer/payment_method ID を管理。
- CCBill: Premium+ プラン / 成人向け Tips。Webhook はイベント重複を考慮し idempotent 処理。
- `/api/payments/provider` は `/api/payment/${provider}` シリーズと整合するよう別名エンドポイントを用意 (詳細は §7.2 不整合参照)。

**注記**: Epoch決済プロバイダーは削除済み。フロントエンド実装は Stripe と CCBill のみをサポート。

### 5.2 メディア処理
- Upload: `POST /api/upload/initiate` で S3 署名URLを払い出し、完了後 MediaConvert ジョブ投入 (`transcoding_jobs` トラッキング)。
- Live: MediaLive 入力 (RTMP) → HLS 出力を CloudFront へ。アーカイブは MediaPackage/S3 へ保存し `live_archives` テーブルで管理。

### 5.3 通知・メール
- メール: AWS SES, テンプレート管理 (verify, password reset, billing)。
- Push: AWS SNS + Expo push bridge。通知設定は `notification_settings` で制御。

## 6. バックグラウンド処理とバッチ
- トランスコードワーカー: MediaConvert 監視、`videos.status` 更新。
- 推薦バッチ: 視聴履歴/コンテンツメタから Elasticsearch へ nightly update。
- 決済バッチ: `earnings` を14日後に `available` へ移行、未処理出金申請のステータス更新。
- 監査ログ ETL: `audit_logs` (追加予定) を S3/Glue へエクスポート。

## 7. 非機能要件 & 運用
- セキュリティ: JWT (HS256) + Redis ブラックリスト (`architecture/security.md`)、WAF, DDoS 対策、PII/カード情報暗号化。
- パフォーマンス: API P95 < 200ms, 動画開始 < 2s (`system-overview.md` 1.1)。Fastify + connection pooling (pg) + Redis キャッシュ。
- 可用性: マルチAZ, 自動フェイルオーバー, RPO < 5分 (Wal-G + PITR)。
- 監視: CloudWatch Metrics/Logs, ELK, Datadog (optional)。主要ダッシュボード: API latency, Error rate, MediaConvert job status, Payment failures。
- アラート: 5xx スパイク, Webhook 失敗, 収益バッチ失敗, Stripe/CCBill ステータス異常。

## 8. 実装フェーズ提案
1. **コア API**: 認証 + サブスク + 動画 CRUD + 再生 (mock storage)。
2. **メディア基盤**: S3/MediaConvert, CDN, Netflix コンテンツ, Shorts, Live 下準備。
3. **収益化 & 決済**: Stripe/CCBill 統合、Tips、出金。
4. **拡張機能**: 検索/推薦, ソーシャル, アナリティクス, Netflix シリーズ, Creator Studio。
5. **運用強化**: 監査ログ, セキュリティ監視, コンプライアンスチェック。

## 9. 既知の課題・フォローアップ
- 決済 API エンドポイント命名・プロバイダー種別の不整合は §7.2 の整合性レビュー文書を参照。
- Express/Fastify の記述差異を全ドキュメントで統一する。
- WithdrawalMethod `type` の許容値をバックエンドでも拡張し、バリデーションを共有する。

**解決済み**:
- ✅ Epoch決済プロバイダーは削除済み。Stripe と CCBill のみサポート。

以上。

