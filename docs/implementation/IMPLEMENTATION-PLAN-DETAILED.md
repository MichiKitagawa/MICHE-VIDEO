# 実装計画書（詳細）

## 目次

1. [概要](#1-概要)
2. [機能別実装計画](#2-機能別実装計画)
3. [データベースマイグレーション戦略](#3-データベースマイグレーション戦略)
4. [CI/CDパイプライン](#4-cicdパイプライン)
5. [コード品質基準](#5-コード品質基準)
6. [パフォーマンスベンチマーク](#6-パフォーマンスベンチマーク)
7. [セキュリティチェックリスト](#7-セキュリティチェックリスト)

---

## 1. 概要

本ドキュメントは、動画配信プラットフォームバックエンドの14機能それぞれについて、詳細な実装タスク、技術的課題、テスト要件、成果物を定義する。

---

## 2. 機能別実装計画

### 機能01: 認証（Authentication）

**実装順序**: 1（最優先）
**依存関係**: なし
**推定期間**: 5営業日
**担当**: Backend Engineer x2

#### 2.1.1 技術スタック

- **JWT**: `jsonwebtoken@9.x`
- **パスワードハッシュ**: `bcrypt@5.x`（cost factor: 12）
- **メール送信**: AWS SES
- **セッション管理**: Redis（TTL: 30日）

#### 2.1.2 実装タスク

- [ ] **Day 1: プロジェクトセットアップ**
  - Fastify プロジェクト初期化
  - TypeScript設定（strict mode）
  - Prisma セットアップ
  - InversifyJS DI コンテナ設定
  - ESLint + Prettier 設定
  - Husky（pre-commit hook）設定

- [ ] **Day 2: ユーザーモデル & 認証基盤**
  - Prisma スキーマ定義（`users`, `user_sessions`）
  - User エンティティ（Domain Layer）
  - UserRepository インターフェース（Domain）
  - UserRepository 実装（Infrastructure）
  - Password Value Object（bcrypt ハッシュ化）
  - Email Value Object（バリデーション）

- [ ] **Day 3: 認証ロジック実装**
  - RegisterUserUseCase（メール確認コード生成）
  - LoginUseCase（JWT 発行）
  - RefreshTokenUseCase（トークンリフレッシュ）
  - LogoutUseCase（セッション無効化）
  - JWT Service（アクセストークン + リフレッシュトークン）
  - Redis Session Store

- [ ] **Day 4: メール確認 & パスワードリセット**
  - VerifyEmailUseCase
  - SendPasswordResetUseCase
  - ResetPasswordUseCase
  - Email Service（AWS SES統合）
  - メールテンプレート（HTML + Text）

- [ ] **Day 5: API エンドポイント & テスト**
  - AuthController（Fastify）
    - POST `/api/auth/register`
    - POST `/api/auth/login`
    - POST `/api/auth/refresh`
    - POST `/api/auth/logout`
    - POST `/api/auth/verify-email`
    - POST `/api/auth/send-password-reset`
    - POST `/api/auth/reset-password`
  - Auth Middleware（JWT検証）
  - Rate Limiting Middleware（Redis）
  - 単体テスト（Jest）
  - 統合テスト（Supertest）

#### 2.1.3 技術的課題

| 課題 | 解決策 |
|-----|--------|
| JWT トークン漏洩リスク | リフレッシュトークンをHTTPOnly Cookie、アクセストークンはメモリのみ |
| bcrypt 計算コスト | cost factor 12（セキュリティとパフォーマンスのバランス） |
| メール到達率 | AWS SES の DKIM/SPF 設定、バウンス管理 |
| セッション管理 | Redis でリフレッシュトークンハッシュ管理、TTL 30日 |

#### 2.1.4 テスト要件

**単体テスト**:
- ✅ User エンティティの生成
- ✅ Password ハッシュ化・検証
- ✅ Email バリデーション
- ✅ JWT 発行・検証
- ✅ Use Case ロジック

**統合テスト**:
- ✅ POST `/api/auth/register` → 201 Created
- ✅ POST `/api/auth/login` → 200 OK + JWT
- ✅ POST `/api/auth/refresh` → 200 OK + 新JWT
- ✅ POST `/api/auth/logout` → 204 No Content
- ✅ メール確認フロー
- ✅ パスワードリセットフロー
- ✅ 無効なトークンで401エラー
- ✅ Rate Limitで429エラー

**E2Eテスト**:
- ✅ ユーザー登録 → メール確認 → ログイン → 保護されたリソースアクセス

#### 2.1.5 成果物

- ✅ 動作する認証API
- ✅ JWT 発行・検証機能
- ✅ メール確認機能
- ✅ パスワードリセット機能
- ✅ テストカバレッジ > 80%
- ✅ API ドキュメント（Swagger）

#### 2.1.6 受け入れ基準

- [ ] ユーザーが登録できる
- [ ] メール確認リンクが機能する
- [ ] ログインでJWTが発行される
- [ ] リフレッシュトークンでアクセストークンを更新できる
- [ ] パスワードリセットが機能する
- [ ] 全テストがパスする
- [ ] Rate Limitが機能する（1分間に10リクエスト）

---

### 機能02: サブスクリプション（Subscription）

**実装順序**: 3（認証完了後）
**依存関係**: 認証（01）
**推定期間**: 10営業日
**担当**: Backend Engineer x2

#### 2.2.1 技術スタック

- **Stripe SDK**: `stripe@14.x`
- **CCBill**: REST API（カスタム実装）
- **Webhook処理**: Fastify + Idempotency Key
- **決済履歴**: PostgreSQL

#### 2.2.2 実装タスク

- [ ] **Day 1-2: プランモデル & データベース**
  - Prisma スキーマ（`subscription_plans`, `user_subscriptions`, `subscription_payment_history`, `payment_methods`）
  - Subscription エンティティ（Domain）
  - Plan エンティティ（Domain）
  - SubscriptionRepository インターフェース
  - SubscriptionRepository 実装
  - マスタデータ投入（Free, Premium, Premium+）

- [ ] **Day 3-4: Stripe統合**
  - StripeClient（Infrastructure）
  - Create Checkout Session
  - Webhook ハンドラー
    - `checkout.session.completed`
    - `customer.subscription.created`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `invoice.payment_succeeded`
    - `invoice.payment_failed`
  - Idempotency 処理（重複webhook防止）
  - 署名検証（Stripe Signature）

- [ ] **Day 5-6: CCBill統合**
  - CCBillClient（Infrastructure）
  - Checkout URL生成
  - Webhook ハンドラー
    - Approval Post（決済成功）
    - Denial Post（決済失敗）
    - Cancellation Post（キャンセル）
  - 年齢確認フロー統合

- [ ] **Day 7-8: サブスクロジック**
  - SubscribeUseCase（新規課金）
  - UpgradePlanUseCase（アップグレード + Proration）
  - DowngradePlanUseCase（ダウングレード）
  - CancelSubscriptionUseCase
  - ResumeSubscriptionUseCase
  - UpdatePaymentMethodUseCase

- [ ] **Day 9-10: API & テスト**
  - SubscriptionController
    - GET `/api/subscriptions/plans`
    - POST `/api/subscriptions/checkout`
    - POST `/api/subscriptions/change-plan`
    - POST `/api/subscriptions/cancel`
    - POST `/api/subscriptions/resume`
    - GET `/api/subscriptions/payment-history`
    - POST `/webhooks/stripe`
    - POST `/webhooks/ccbill`
  - 単体テスト
  - 統合テスト（Stripe Test Mode）
  - Webhook テスト（Stripe CLI）

#### 2.2.3 技術的課題

| 課題 | 解決策 |
|-----|--------|
| Webhook 重複処理 | Idempotency Key（`event.id`）をRedisで管理 |
| Webhook 署名検証失敗 | Stripe署名検証、CCBillはIPホワイトリスト |
| Proration計算ミス | Stripe自動計算に依存、CCBillは手動計算 |
| 決済失敗時の処理 | `past_due` 状態に変更、リトライ通知メール |
| CCBill年齢確認 | CCBillのAge Verification機能を活用 |

#### 2.2.4 テスト要件

**単体テスト**:
- ✅ Subscription エンティティ
- ✅ Plan エンティティ
- ✅ StripeClient モック
- ✅ CCBillClient モック
- ✅ Use Case ロジック
- ✅ Proration 計算

**統合テスト**:
- ✅ POST `/api/subscriptions/checkout` → Stripe Checkout URL
- ✅ Webhook `checkout.session.completed` → サブスク有効化
- ✅ POST `/api/subscriptions/change-plan` → プラン変更
- ✅ POST `/api/subscriptions/cancel` → キャンセル
- ✅ CCBill Webhook → サブスク有効化

**E2Eテスト**:
- ✅ ユーザー登録 → Premium課金 → 動画アクセス権限取得
- ✅ Free → Premium → Premium+ アップグレード
- ✅ Premium キャンセル → 期間終了後Free

#### 2.2.5 成果物

- ✅ Stripe統合（Checkout + Webhook）
- ✅ CCBill統合（Checkout + Webhook）
- ✅ プラン変更ロジック
- ✅ 決済履歴管理
- ✅ テストカバレッジ > 80%

#### 2.2.6 受け入れ基準

- [ ] ユーザーがPremiumプランに課金できる
- [ ] Stripeのwebhookが正常処理される
- [ ] CCBillでアダルトコンテンツ決済ができる
- [ ] プラン変更（アップグレード/ダウングレード）が機能する
- [ ] キャンセル後、期間終了でFreeに戻る
- [ ] 決済履歴が取得できる
- [ ] Webhookの重複処理が防止される

---

### 機能03: コンテンツ配信（Content Delivery）

**実装順序**: 2（認証完了後、動画管理と並行可）
**依存関係**: 認証（01）
**推定期間**: 8営業日
**担当**: Backend Engineer + DevOps Engineer

#### 2.3.1 技術スタック

- **S3 SDK**: `@aws-sdk/client-s3@3.x`
- **MediaConvert SDK**: `@aws-sdk/client-mediaconvert@3.x`
- **CloudFront SDK**: `@aws-sdk/cloudfront-signer@3.x`
- **Presigned URL**: 有効期限15分
- **署名付きURL**: 有効期限24時間

#### 2.3.2 実装タスク

- [ ] **Day 1: AWS環境構築**
  - S3バケット作成（uploads, processed, live）
  - IAM ロール設定
  - CloudFront ディストリビューション作成
  - MediaConvert キュー作成

- [ ] **Day 2-3: アップロード処理**
  - Prisma スキーマ（`media_files`, `transcoding_jobs`, `cdn_urls`）
  - MediaFile エンティティ（Domain）
  - S3Adapter（Infrastructure）
  - InitiateUploadUseCase（Presigned URL生成）
  - CompleteUploadUseCase（アップロード完了通知）
  - S3 Event → SQS → Lambda（トランスコードトリガー）

- [ ] **Day 4-5: トランスコード処理**
  - MediaConvertAdapter（Infrastructure）
  - TranscodingJob エンティティ（Domain）
  - CreateTranscodingJobUseCase
  - トランスコード設定
    - HLS形式
    - 4解像度（1080p, 720p, 480p, 360p）
    - ABR（Adaptive Bitrate）
  - EventBridge → Lambda → DB更新（status='ready'）

- [ ] **Day 6-7: CDN配信**
  - CloudFrontAdapter（Infrastructure）
  - GenerateSignedUrlUseCase
  - 署名付きURL生成（24時間有効）
  - Origin Access Identity設定
  - Cache設定（HLS: 7日、Segment: 1年）

- [ ] **Day 8: API & テスト**
  - ContentDeliveryController
    - POST `/api/upload/initiate`
    - POST `/api/upload/complete`
    - GET `/api/cdn/signed-url/:mediaFileId`
  - 単体テスト
  - 統合テスト
  - S3 → MediaConvert → CloudFront フローテスト

#### 2.3.3 技術的課題

| 課題 | 解決策 |
|-----|--------|
| 大容量ファイルアップロード | Presigned URL + Multipart Upload |
| トランスコード失敗 | リトライロジック、エラー通知 |
| CDN キャッシュ無効化 | バージョニング（`/v1/video/...`） |
| 署名付きURL漏洩 | 短い有効期限（24時間）、IP制限オプション |
| トランスコードコスト | 解像度を動的選択、不要な解像度は生成しない |

#### 2.3.4 テスト要件

**単体テスト**:
- ✅ S3 Presigned URL生成
- ✅ MediaConvert Job作成
- ✅ CloudFront署名付きURL生成
- ✅ Use Case ロジック

**統合テスト**:
- ✅ POST `/api/upload/initiate` → Presigned URL
- ✅ S3アップロード → トランスコードトリガー
- ✅ トランスコード完了 → DB更新
- ✅ GET `/api/cdn/signed-url/:id` → 署名付きURL

**E2Eテスト**:
- ✅ 動画ファイルアップロード → トランスコード → HLS再生

#### 2.3.5 成果物

- ✅ S3アップロード機能
- ✅ MediaConvertトランスコード
- ✅ CloudFront CDN配信
- ✅ 署名付きURL生成
- ✅ テストカバレッジ > 80%

#### 2.3.6 受け入れ基準

- [ ] Presigned URLで動画をS3にアップロードできる
- [ ] アップロード完了後、自動でトランスコードが開始される
- [ ] HLS形式で4解像度が生成される
- [ ] CloudFrontから署名付きURLで動画が再生できる
- [ ] トランスコード失敗時にエラー通知が届く

---

### 機能04: 動画管理（Video Management）

**実装順序**: 4（コンテンツ配信完了後）
**依存関係**: 認証（01）、コンテンツ配信（03）
**推定期間**: 8営業日
**担当**: Backend Engineer x2

#### 2.4.1 実装タスク

- [ ] **Day 1-2: 動画モデル**
  - Prisma スキーマ（`videos`, `video_tags`, `video_categories`, `video_versions`）
  - Video エンティティ（Domain）
  - VideoTag Value Object
  - VideoCategory エンティティ
  - VideoRepository インターフェース & 実装

- [ ] **Day 3-4: CRUD処理**
  - CreateVideoUseCase
  - UpdateVideoUseCase
  - PublishVideoUseCase
  - UnpublishVideoUseCase
  - DeleteVideoUseCase
  - GetVideoUseCase
  - ListVideosUseCase（ページネーション）
  - ListMyVideosUseCase

- [ ] **Day 5-6: タグ & カテゴリ**
  - AddTagsUseCase（最大30個制限）
  - RemoveTagsUseCase
  - SetCategoryUseCase
  - ListCategoriesUseCase
  - カテゴリマスタデータ投入

- [ ] **Day 7-8: API & テスト**
  - VideoController
    - POST `/api/videos`
    - GET `/api/videos/:id`
    - PATCH `/api/videos/:id`
    - DELETE `/api/videos/:id`
    - POST `/api/videos/:id/publish`
    - POST `/api/videos/:id/unpublish`
    - GET `/api/videos`（一覧）
    - GET `/api/videos/my`（自分の動画）
    - POST `/api/videos/:id/tags`
    - DELETE `/api/videos/:id/tags/:tag`
    - GET `/api/categories`
  - 単体テスト
  - 統合テスト

#### 2.4.2 技術的課題

| 課題 | 解決策 |
|-----|--------|
| タグ数制限 | 最大30個、バリデーション |
| 大量動画の一覧取得 | ページネーション（Cursor-based）、インデックス最適化 |
| 削除時の整合性 | Soft Delete（`is_deleted` フラグ） |
| バージョン管理 | `video_versions` テーブルで履歴管理 |

#### 2.4.3 テスト要件

**統合テスト**:
- ✅ POST `/api/videos` → 201 Created
- ✅ GET `/api/videos/:id` → 200 OK
- ✅ PATCH `/api/videos/:id` → 200 OK
- ✅ DELETE `/api/videos/:id` → 204 No Content
- ✅ POST `/api/videos/:id/publish` → 公開状態
- ✅ タグ追加・削除
- ✅ カテゴリ設定
- ✅ 未認証で403エラー

#### 2.4.4 受け入れ基準

- [ ] 動画を作成できる
- [ ] 動画を更新できる
- [ ] 動画を削除できる
- [ ] 動画を公開・非公開できる
- [ ] タグを追加・削除できる（最大30個）
- [ ] カテゴリを設定できる
- [ ] 一覧取得がページネーションされる

---

### 機能05: 動画再生（Video Playback）

**実装順序**: 5（動画管理完了後）
**依存関係**: 認証（01）、コンテンツ配信（03）、動画管理（04）
**推定期間**: 6営業日
**担当**: Backend Engineer x2

#### 2.5.1 実装タスク

- [ ] **Day 1-2: 再生処理**
  - Prisma スキーマ（`video_views`, `watch_history`）
  - GetStreamUrlUseCase（権限チェック + 署名付きURL生成）
  - RecordViewUseCase（視聴回数カウント）
  - SaveWatchProgressUseCase（進捗保存）
  - GetWatchHistoryUseCase

- [ ] **Day 3-4: いいね & コメント**
  - Prisma スキーマ（`video_likes`, `video_comments`）
  - LikeVideoUseCase
  - UnlikeVideoUseCase
  - AddCommentUseCase
  - ReplyCommentUseCase（返信機能）
  - DeleteCommentUseCase
  - ListCommentsUseCase（ページネーション）

- [ ] **Day 5-6: API & テスト**
  - VideoPlaybackController
    - GET `/api/videos/:id/stream`
    - POST `/api/videos/:id/view`
    - POST `/api/videos/:id/progress`
    - GET `/api/videos/watch-history`
    - POST `/api/videos/:id/like`
    - DELETE `/api/videos/:id/like`
    - POST `/api/videos/:id/comments`
    - POST `/api/comments/:id/reply`
    - DELETE `/api/comments/:id`
    - GET `/api/videos/:id/comments`
  - 単体テスト
  - 統合テスト

#### 2.5.2 技術的課題

| 課題 | 解決策 |
|-----|--------|
| 権限チェック漏れ | GetStreamUrlUseCaseで必ずサブスクプランチェック |
| 視聴回数の不正 | IPアドレス + セッションIDで重複排除（24時間） |
| コメントスパム | Rate Limiting（1分間に5コメント） |
| コメント返信の深さ制限 | 最大2階層（親 → 子 のみ） |

#### 2.5.3 受け入れ基準

- [ ] 動画のHLSストリームURLが取得できる
- [ ] サブスクプランに応じてアクセス制御される
- [ ] 視聴回数が正確にカウントされる
- [ ] 視聴進捗が保存・復元される
- [ ] いいねができる
- [ ] コメントができる
- [ ] コメントに返信できる

---

### 機能06: ショート動画管理（Short Management）

**実装順序**: 6（動画管理完了後、並行可）
**依存関係**: 認証（01）、コンテンツ配信（03）
**推定期間**: 6営業日
**担当**: Backend Engineer x1

#### 2.6.1 実装タスク

- [ ] **Day 1-2: ショートモデル**
  - Prisma スキーマ（`shorts`, `short_tags`, `short_categories`）
  - Short エンティティ（最大60秒制限）
  - ShortRepository インターフェース & 実装

- [ ] **Day 3-4: CRUD処理**
  - CreateShortUseCase（duration <= 60秒チェック）
  - UpdateShortUseCase
  - PublishShortUseCase
  - DeleteShortUseCase
  - GetShortUseCase
  - ListShortsUseCase（スワイプ型フィード）

- [ ] **Day 5-6: API & テスト**
  - ShortController
    - POST `/api/shorts`
    - GET `/api/shorts/:id`
    - PATCH `/api/shorts/:id`
    - DELETE `/api/shorts/:id`
    - POST `/api/shorts/:id/publish`
    - GET `/api/shorts/feed`（スワイプ型）
  - 単体テスト
  - 統合テスト

#### 2.6.2 技術的課題

| 課題 | 解決策 |
|-----|--------|
| 60秒制限チェック | アップロード時にdurationチェック、超過でエラー |
| スワイプ型フィードのパフォーマンス | Cursor-basedページネーション、Redis キャッシング |

#### 2.6.3 受け入れ基準

- [ ] ショート動画を作成できる（最大60秒）
- [ ] 60秒超過でエラーになる
- [ ] スワイプ型フィードが取得できる
- [ ] いいね、コメントができる（動画と同様）

---

### 機能07: ショート動画再生（Short Playback）

**実装順序**: 7（ショート管理完了後）
**依存関係**: ショート管理（06）
**推定期間**: 4営業日
**担当**: Backend Engineer x1

#### 2.7.1 実装タスク

- [ ] **Day 1-2: 再生処理**
  - Prisma スキーマ（`short_views`, `short_watch_history`）
  - GetShortStreamUrlUseCase
  - RecordShortViewUseCase
  - SaveShortWatchProgressUseCase

- [ ] **Day 3-4: いいね & コメント**
  - Prisma スキーマ（`short_likes`, `short_comments`）
  - LikeShortUseCase
  - UnlikeShortUseCase
  - AddShortCommentUseCase
  - ListShortCommentsUseCase

#### 2.7.2 受け入れ基準

- [ ] ショート動画のストリームURLが取得できる
- [ ] 視聴回数がカウントされる
- [ ] いいね、コメントができる

---

### 機能08: ライブ配信（Live Streaming）

**実装順序**: 10（Phase 4）
**依存関係**: 認証（01）、コンテンツ配信（03）、収益化（09）
**推定期間**: 10営業日
**担当**: Backend Engineer x2 + DevOps Engineer

#### 2.8.1 技術スタック

- **MediaLive**: RTMP → HLS変換
- **WebSocket**: Socket.IO（リアルタイムチャット）
- **Redis Pub/Sub**: チャットメッセージ配信

#### 2.8.2 実装タスク

- [ ] **Day 1-2: ライブ配信モデル**
  - Prisma スキーマ（`live_streams`, `live_chat_messages`, `live_viewers`, `live_stream_stats`）
  - LiveStream エンティティ（Domain）
  - LiveStreamRepository インターフェース & 実装
  - Stream Key生成（UUID）

- [ ] **Day 3-4: MediaLive統合**
  - MediaLiveAdapter（Infrastructure）
  - CreateLiveStreamUseCase（MediaLive Channel作成）
  - StartLiveStreamUseCase（配信開始）
  - EndLiveStreamUseCase（配信終了 + アーカイブ保存）
  - RTMP URL生成

- [ ] **Day 5-6: リアルタイムチャット**
  - Socket.IO セットアップ
  - WebSocketGateway（Interface Layer）
  - SendChatMessageUseCase
  - Redis Pub/Sub統合（スケーラビリティ）
  - チャット履歴保存（PostgreSQL）

- [ ] **Day 7-8: スーパーチャット**
  - SendSuperChatUseCase
  - Stripe決済統合
  - リアルタイム通知（配信者側）
  - スーパーチャット一覧

- [ ] **Day 9-10: API & テスト**
  - LiveController
    - POST `/api/live`
    - POST `/api/live/:id/start`
    - POST `/api/live/:id/end`
    - GET `/api/live/:id/stream`
    - GET `/api/live/:id/stats`
  - WebSocket
    - `live/:id/chat` → `on('message')`
    - `live/:id/chat` → `emit('message')`
    - `live/:id/superchat` → `on('superchat')`
  - 単体テスト
  - 統合テスト（WebSocket）

#### 2.8.3 技術的課題

| 課題 | 解決策 |
|-----|--------|
| ライブ遅延 | MediaLive Low Latency設定（3秒以下） |
| WebSocket接続数上限 | Redis Pub/Sub + 水平スケーリング |
| チャットスパム | Rate Limiting（1秒に1メッセージ） |
| スーパーチャット決済失敗 | リトライロジック、エラー通知 |

#### 2.8.4 受け入れ基準

- [ ] OBSでRTMP配信できる
- [ ] HLSでライブ視聴できる
- [ ] WebSocketチャットが動作する
- [ ] スーパーチャットができる
- [ ] 配信終了後、自動でアーカイブ動画が作成される
- [ ] 同時接続1,000人でテスト合格

---

### 機能09: 収益化（Monetization）

**実装順序**: 9（Phase 3）
**依存関係**: 認証（01）、サブスクリプション（02）
**推定期間**: 8営業日
**担当**: Backend Engineer x2

#### 2.9.1 実装タスク

- [ ] **Day 1-2: 収益モデル**
  - Prisma スキーマ（`earnings`, `tips`, `withdrawal_methods`, `withdrawal_requests`, `tax_info`）
  - Earning エンティティ（Domain）
  - Tip エンティティ（Domain）
  - EarningRepository インターフェース & 実装

- [ ] **Day 3-4: 投げ銭機能**
  - SendTipUseCase（Stripe決済）
  - RecordEarningUseCase（30%手数料差し引き）
  - ListEarningsUseCase
  - GetEarningStatsUseCase

- [ ] **Day 5-6: 出金申請**
  - AddWithdrawalMethodUseCase（銀行振込、PayPal）
  - CreateWithdrawalRequestUseCase（最小出金額 ¥5,000）
  - ProcessWithdrawalUseCase（管理者承認）
  - ListWithdrawalRequestsUseCase

- [ ] **Day 7-8: API & テスト**
  - MonetizationController
    - POST `/api/tips`
    - GET `/api/earnings`
    - GET `/api/earnings/stats`
    - POST `/api/withdrawal-methods`
    - POST `/api/withdrawal-requests`
    - GET `/api/withdrawal-requests`
  - 単体テスト
  - 統合テスト（Stripe Test Mode）

#### 2.9.2 受け入れ基準

- [ ] 動画・ショート・ライブに投げ銭できる
- [ ] 収益が記録される（30%手数料差し引き後）
- [ ] 出金申請ができる（最小 ¥5,000）
- [ ] 税務情報を登録できる

---

### 機能10: ソーシャル機能（Social）

**実装順序**: 11（Phase 4）
**依存関係**: 認証（01）、動画管理（04）
**推定期間**: 6営業日
**担当**: Backend Engineer x1

#### 2.10.1 実装タスク

- [ ] **Day 1-2: フォロー機能**
  - Prisma スキーマ（`follows`, `user_stats`）
  - Follow エンティティ（Domain）
  - FollowUserUseCase
  - UnfollowUserUseCase
  - GetFollowersUseCase
  - GetFollowingUseCase

- [ ] **Day 3-4: 通知機能**
  - Prisma スキーマ（`notifications`, `notification_settings`）
  - Notification エンティティ（Domain）
  - CreateNotificationUseCase
  - ListNotificationsUseCase
  - MarkAsReadUseCase
  - UpdateNotificationSettingsUseCase

- [ ] **Day 5-6: API & テスト**
  - SocialController
    - POST `/api/users/:id/follow`
    - DELETE `/api/users/:id/follow`
    - GET `/api/users/:id/followers`
    - GET `/api/users/:id/following`
    - GET `/api/notifications`
    - PATCH `/api/notifications/:id/read`
    - PATCH `/api/notification-settings`

#### 2.10.2 受け入れ基準

- [ ] ユーザーをフォローできる
- [ ] フォロワー一覧が取得できる
- [ ] 通知が届く（新動画、いいね、コメント、フォロー）
- [ ] 通知を既読にできる
- [ ] 通知設定を変更できる

---

### 機能11: プレイリスト（Playlist）

**実装順序**: 12（Phase 4）
**依存関係**: 動画管理（04）
**推定期間**: 4営業日
**担当**: Backend Engineer x1

#### 2.11.1 実装タスク

- [ ] **Day 1-2: プレイリストモデル**
  - Prisma スキーマ（`playlists`, `playlist_videos`）
  - Playlist エンティティ（Domain）
  - PlaylistRepository インターフェース & 実装

- [ ] **Day 3-4: CRUD & API**
  - CreatePlaylistUseCase
  - UpdatePlaylistUseCase
  - DeletePlaylistUseCase
  - AddVideoToPlaylistUseCase
  - RemoveVideoFromPlaylistUseCase
  - ReorderPlaylistVideosUseCase
  - PlaylistController

#### 2.11.2 受け入れ基準

- [ ] プレイリストを作成できる
- [ ] 動画を追加・削除できる
- [ ] 動画の順序を変更できる
- [ ] 公開設定を変更できる

---

### 機能12: 検索・推薦（Search & Recommendation）

**実装順序**: 13（Phase 4）
**依存関係**: 動画管理（04）、ショート管理（06）
**推定期間**: 8営業日
**担当**: Backend Engineer x2

#### 2.12.1 技術スタック

- **Elasticsearch 8.x**: 全文検索
- **Kuromoji Analyzer**: 日本語形態素解析

#### 2.12.2 実装タスク

- [ ] **Day 1-2: Elasticsearch セットアップ**
  - Elasticsearch インストール
  - インデックス設計（`videos`, `shorts`）
  - Kuromoji Analyzer設定
  - ElasticsearchAdapter（Infrastructure）

- [ ] **Day 3-4: 検索機能**
  - SearchVideosUseCase（タイトル、説明、タグ）
  - SearchShortsUseCase
  - ファセット検索（カテゴリ、タグ）
  - ソート（関連度、視聴回数、作成日）

- [ ] **Day 5-6: 推薦機能**
  - Prisma スキーマ（`video_recommendations`）
  - GenerateRecommendationsUseCase（協調フィルタリング）
  - GetRecommendedVideosUseCase
  - トレンド分析（視聴回数、いいね数の時系列）

- [ ] **Day 7-8: API & テスト**
  - SearchController
    - GET `/api/search?q=keyword`
    - GET `/api/videos/:id/recommendations`
    - GET `/api/trending`

#### 2.12.3 受け入れ基準

- [ ] 動画を全文検索できる
- [ ] 検索結果が1秒以内に返却される
- [ ] おすすめ動画が表示される
- [ ] トレンド動画が表示される

---

### 機能13: チャンネル作成（Channel Creation）

**実装順序**: 14（Phase 4）
**依存関係**: 認証（01）
**推定期間**: 4営業日
**担当**: Backend Engineer x1

#### 2.13.1 実装タスク

- [ ] **Day 1-2: チャンネルプロフィール**
  - User テーブル拡張（`is_creator`, `display_name`, `bio`, `avatar_url`）
  - UpdateCreatorProfileUseCase
  - GetCreatorProfileUseCase

- [ ] **Day 3-4: チャンネル統計**
  - GetChannelStatsUseCase（総視聴回数、フォロワー数等）
  - ChannelController

#### 2.13.2 受け入れ基準

- [ ] クリエイタープロフィールを設定できる
- [ ] チャンネル統計が取得できる

---

### 機能14: Netflix風コンテンツ（Netflix Content）

**実装順序**: 15（Phase 4）
**依存関係**: 認証（01）、コンテンツ配信（03）、サブスクリプション（02）
**推定期間**: 10営業日
**担当**: Backend Engineer x2

#### 2.14.1 実装タスク

- [ ] **Day 1-3: Netflixモデル**
  - Prisma スキーマ（`netflix_contents`, `seasons`, `episodes`, `ip_licenses`, `netflix_genres`）
  - NetflixContent エンティティ（Domain）
  - Season エンティティ（Domain）
  - Episode エンティティ（Domain）
  - IPLicense エンティティ（Domain）

- [ ] **Day 4-6: CRUD処理**
  - CreateNetflixContentUseCase（映画 or シリーズ）
  - CreateSeasonUseCase
  - CreateEpisodeUseCase
  - UpdateNetflixContentUseCase
  - PublishNetflixContentUseCase
  - ListNetflixContentsUseCase

- [ ] **Day 7-8: 再生処理**
  - GetNetflixStreamUrlUseCase（権限チェック: Premium以上）
  - RecordNetflixViewUseCase
  - SaveNetflixWatchProgressUseCase

- [ ] **Day 9-10: API & テスト**
  - NetflixController
    - POST `/api/netflix`
    - GET `/api/netflix/:id`
    - POST `/api/netflix/:id/seasons`
    - POST `/api/seasons/:id/episodes`
    - GET `/api/netflix/:id/stream`
    - POST `/api/netflix/:id/progress`

#### 2.14.2 受け入れ基準

- [ ] Netflixコンテンツを作成できる（映画・シリーズ）
- [ ] シーズン・エピソードを追加できる
- [ ] Premiumプラン以上で視聴できる
- [ ] 視聴進捗が保存される

---

## 3. データベースマイグレーション戦略

### 3.1 Prismaマイグレーション

#### 開発環境

```bash
# マイグレーション作成
npx prisma migrate dev --name init_users_table

# マイグレーション適用
npx prisma migrate dev

# シードデータ投入
npx prisma db seed
```

#### 本番環境

```bash
# マイグレーション適用（ダウンタイムあり）
npx prisma migrate deploy

# ゼロダウンタイムマイグレーション
# 1. 新カラム追加（NULL許可）
# 2. アプリケーションデプロイ（新カラム使用開始）
# 3. データバックフィル
# 4. 旧カラム削除
```

### 3.2 シードデータ

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // サブスクプラン
  await prisma.subscriptionPlan.createMany({
    data: [
      {
        id: 'plan_free',
        name: 'Free',
        price: 0,
        billing_interval: 'month',
        payment_provider: 'free',
        features: {
          general_videos: true,
          netflix_videos: false,
          adult_videos: false,
          live_streaming: false,
        },
      },
      {
        id: 'plan_premium',
        name: 'Premium',
        price: 980,
        billing_interval: 'month',
        payment_provider: 'stripe',
        features: {
          general_videos: true,
          netflix_videos: true,
          adult_videos: false,
          live_streaming: true,
          hd_quality: true,
          ad_free: true,
        },
      },
      {
        id: 'plan_premium_plus',
        name: 'Premium+',
        price: 1980,
        billing_interval: 'month',
        payment_provider: 'ccbill',
        features: {
          general_videos: true,
          netflix_videos: true,
          adult_videos: true,
          live_streaming: true,
          hd_quality: true,
          ad_free: true,
          priority_support: true,
        },
      },
    ],
  });

  // カテゴリ
  await prisma.videoCategory.createMany({
    data: [
      { id: 'entertainment', name_ja: 'エンターテイメント', name_en: 'Entertainment', icon: 'play-circle' },
      { id: 'music', name_ja: '音楽', name_en: 'Music', icon: 'musical-notes' },
      { id: 'gaming', name_ja: 'ゲーム', name_en: 'Gaming', icon: 'game-controller' },
      { id: 'education', name_ja: '教育', name_en: 'Education', icon: 'school' },
      { id: 'news', name_ja: 'ニュース', name_en: 'News', icon: 'newspaper' },
      { id: 'sports', name_ja: 'スポーツ', name_en: 'Sports', icon: 'basketball' },
      { id: 'technology', name_ja: 'テクノロジー', name_en: 'Technology', icon: 'laptop' },
      { id: 'lifestyle', name_ja: 'ライフスタイル', name_en: 'Lifestyle', icon: 'cafe' },
      { id: 'adult', name_ja: 'アダルト', name_en: 'Adult', icon: 'warning' },
    ],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 3.3 ロールバック戦略

```bash
# 直前のマイグレーションを取り消し
npx prisma migrate resolve --rolled-back 20231001_migration_name

# データベースを特定の状態にリセット（開発環境のみ）
npx prisma migrate reset
```

---

## 4. CI/CDパイプライン

### 4.1 GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: video_platform_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Prisma migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/video_platform_test

      - name: Run linters
        run: |
          npm run lint
          npm run format:check

      - name: Run type check
        run: npm run type-check

      - name: Run unit tests
        run: npm run test:unit
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/video_platform_test
          REDIS_URL: redis://localhost:6379

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/video_platform_test
          REDIS_URL: redis://localhost:6379

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to AWS ECS (Staging)
        run: |
          # ECS デプロイコマンド

  deploy-production:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to AWS ECS (Production)
        run: |
          # ECS デプロイコマンド
```

### 4.2 デプロイフロー

```
feature/* → develop → staging環境
develop → main → production環境
```

### 4.3 ロールバック手順

```bash
# 前バージョンにロールバック
aws ecs update-service --cluster video-platform-prod --service api-server --task-definition api-server:PREVIOUS_VERSION --force-new-deployment
```

---

## 5. コード品質基準

### 5.1 TypeScript設定

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### 5.2 ESLint設定

```javascript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    'complexity': ['error', 10],
    'max-lines-per-function': ['error', 50],
  },
};
```

### 5.3 Gitコミット規約

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type**:
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: コードスタイル
- `refactor`: リファクタリング
- `test`: テスト
- `chore`: その他

**例**:
```
feat(auth): implement JWT refresh token

- Add RefreshTokenUseCase
- Add Redis session store
- Add refresh endpoint

Closes #123
```

### 5.4 コードレビューチェックリスト

- [ ] TypeScriptの型エラーがない
- [ ] ESLintエラーがない
- [ ] テストがパスする
- [ ] テストカバレッジが低下していない
- [ ] コミットメッセージが規約に従っている
- [ ] ドキュメントが更新されている
- [ ] セキュリティ上の問題がない
- [ ] パフォーマンス上の問題がない

---

## 6. パフォーマンスベンチマーク

### 6.1 API応答時間目標

| エンドポイント | 目標（P95） | 目標（P99） |
|--------------|-----------|-----------|
| GET `/api/videos` | < 100ms | < 200ms |
| GET `/api/videos/:id` | < 50ms | < 100ms |
| POST `/api/videos/:id/like` | < 100ms | < 200ms |
| GET `/api/search` | < 500ms | < 1000ms |
| GET `/api/videos/:id/stream` | < 200ms | < 400ms |

### 6.2 データベースクエリ最適化

#### インデックス戦略

```sql
-- 複合インデックス（頻繁に使用されるクエリ）
CREATE INDEX idx_videos_user_created ON videos(user_id, created_at DESC);
CREATE INDEX idx_videos_category_views ON videos(category, view_count DESC);
CREATE INDEX idx_user_subscriptions_active ON user_subscriptions(user_id, status) WHERE status = 'active';

-- 部分インデックス（特定条件のみ）
CREATE INDEX idx_videos_published ON videos(created_at DESC) WHERE privacy = 'public' AND is_adult = false;

-- 全文検索インデックス（PostgreSQL）
CREATE INDEX idx_videos_title_trgm ON videos USING gin(title gin_trgm_ops);
```

#### クエリ例

```typescript
// 悪い例（N+1問題）
const videos = await prisma.video.findMany();
for (const video of videos) {
  const user = await prisma.user.findUnique({ where: { id: video.user_id } });
}

// 良い例（Prismaのinclude）
const videos = await prisma.video.findMany({
  include: {
    user: true,
  },
});
```

### 6.3 Redisキャッシング戦略

| データ種別 | TTL | キー形式 |
|-----------|-----|---------|
| サブスクプラン一覧 | 1時間 | `plans:list` |
| 動画メタデータ | 5分 | `video:{id}` |
| ユーザープロフィール | 10分 | `user:{id}:profile` |
| APIレスポンス（GET） | 1分 | `api:GET:/videos:{query_hash}` |

```typescript
// キャッシュ使用例
async getVideo(id: string): Promise<Video | null> {
  // 1. Redisキャッシュチェック
  const cached = await redis.get(`video:${id}`);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. DBから取得
  const video = await prisma.video.findUnique({ where: { id } });
  if (!video) return null;

  // 3. Redisにキャッシュ（5分）
  await redis.set(`video:${id}`, JSON.stringify(video), 'EX', 300);

  return video;
}
```

### 6.4 負荷テストシナリオ

```javascript
// k6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp-up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 1000 },  // Ramp-up to 1000 users
    { duration: '5m', target: 1000 },  // Stay at 1000 users
    { duration: '2m', target: 0 },     // Ramp-down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests < 200ms
    http_req_failed: ['rate<0.01'],   // Error rate < 1%
  },
};

export default function () {
  // 動画一覧取得
  let res = http.get('https://api.example.com/api/videos');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);

  // 動画詳細取得
  res = http.get('https://api.example.com/api/videos/123');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 100ms': (r) => r.timings.duration < 100,
  });

  sleep(1);
}
```

---

## 7. セキュリティチェックリスト

### 7.1 認証・認可

- [ ] JWT トークンは短い有効期限（15分）
- [ ] リフレッシュトークンはHTTPOnly Cookie
- [ ] パスワードはbcrypt（cost factor 12）
- [ ] Rate Limiting実装（1分間に10リクエスト）
- [ ] CSRF対策（SameSite Cookie）
- [ ] セッション無効化機能（ログアウト）

### 7.2 入力バリデーション

- [ ] 全エンドポイントでスキーマバリデーション（Fastify JSON Schema）
- [ ] XSS対策（HTML エスケープ）
- [ ] SQL Injection対策（Prisma ORM）
- [ ] Path Traversal対策（ファイルアップロード）
- [ ] ファイルサイズ制限（最大5GB）

### 7.3 データ保護

- [ ] 保存時暗号化（PostgreSQL: AES-256）
- [ ] 転送時暗号化（TLS 1.3）
- [ ] パスワードハッシュ化（bcrypt）
- [ ] 個人情報暗号化（マイナンバー、銀行口座）
- [ ] アクセスログ記録（監査証跡）

### 7.4 API セキュリティ

- [ ] CORS設定（許可ドメインのみ）
- [ ] Security Headers（Helmet.js）
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Strict-Transport-Security: max-age=31536000`
- [ ] Rate Limiting（Redis）
- [ ] API Key管理（環境変数）
- [ ] Webhook署名検証（Stripe、CCBill）

### 7.5 インフラセキュリティ

- [ ] VPC Private Subnet（RDS、ElastiCache）
- [ ] Security Group設定（最小権限）
- [ ] IAM Role（EC2、Lambda）
- [ ] S3 Bucket Policy（Private）
- [ ] CloudFront署名付きURL
- [ ] WAF設定（SQL Injection、XSS）
- [ ] DDoS対策（AWS Shield）

### 7.6 依存関係セキュリティ

- [ ] npm audit定期実行
- [ ] 脆弱性スキャン（Snyk）
- [ ] 依存関係自動アップデート（Dependabot）

### 7.7 監査・ロギング

- [ ] 全APIリクエストログ
- [ ] 認証失敗ログ
- [ ] 決済イベントログ
- [ ] エラーログ（Sentry）
- [ ] アクセスログ（CloudWatch）

---

## 8. 運用計画

### 8.1 監視・アラート

| メトリクス | 閾値 | アクション |
|-----------|-----|----------|
| API エラー率 | > 1% | Slack通知 + PagerDuty |
| API 応答時間（P95） | > 500ms | Slack通知 |
| CPU使用率 | > 80% | Auto Scaling |
| メモリ使用率 | > 80% | Auto Scaling |
| ディスク使用率 | > 80% | Slack通知 |
| RDS接続数 | > 80% | Slack通知 |

### 8.2 バックアップ

- **RDS**: 自動バックアップ（7日間保持）
- **S3**: バージョニング有効化
- **Redis**: AOF（Append-Only File）有効化

### 8.3 災害復旧（DR）

- **RTO（Recovery Time Objective）**: 4時間
- **RPO（Recovery Point Objective）**: 1時間
- **DR手順**: `/docs/operations/disaster-recovery.md`

---

## 9. まとめ

本実装計画書に基づき、以下の順序で開発を進める:

1. **Week 1-2**: 認証、データベース、インフラ基盤
2. **Week 3-6**: コンテンツ配信、動画管理、動画再生
3. **Week 7-9**: サブスクリプション、決済、収益化
4. **Week 10-14**: ライブ配信、検索、ソーシャル、Netflix
5. **Week 15-16**: 本番環境、パフォーマンス最適化、セキュリティ

各フェーズ終了時に以下を実施:
- ✅ デモ実施
- ✅ テスト合格確認
- ✅ コードレビュー
- ✅ ドキュメント更新

---

**作成日**: 2025-10-26
**最終更新**: 2025-10-26
**バージョン**: 1.0
**作成者**: Implementation Planning Team
