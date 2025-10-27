# MVP Launch Checklist

**現状**: Backend コード実装完了（Phase 1-4: 100%）
**次の段階**: 環境構築・外部連携・デプロイ

---

## 📋 Phase 5: ローカル環境構築・動作確認

### 環境セットアップ

- [ ] PostgreSQL インストール（Homebrewまたはローカル）
  ```bash
  brew install postgresql@15
  brew services start postgresql@15
  createdb video_platform
  ```

- [ ] Redis インストール・起動
  ```bash
  brew install redis
  brew services start redis
  redis-cli ping  # PONG が返ればOK
  ```

- [ ] `.env` ファイル作成
  ```bash
  cd backend
  cp .env.example .env
  # .envを編集（最低限の設定）
  ```

- [ ] 依存関係インストール
  ```bash
  npm install
  ```

- [ ] Prisma セットアップ
  ```bash
  npx prisma generate
  npx prisma migrate deploy
  ```

### サーバー起動確認

- [ ] 開発サーバー起動
  ```bash
  npm run dev
  ```

- [ ] Health check 確認
  ```bash
  curl http://localhost:4000/health
  ```

- [ ] TypeScript ビルド確認
  ```bash
  npm run build
  npm start
  ```

### 基本API動作確認

- [ ] ユーザー登録エンドポイント
  ```bash
  curl -X POST http://localhost:4000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'
  ```

- [ ] ログインエンドポイント
  ```bash
  curl -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"Test123!"}'
  ```

- [ ] 認証済みエンドポイント（プロフィール取得）
  ```bash
  curl http://localhost:4000/api/auth/me \
    -H "Authorization: Bearer ACCESS_TOKEN"
  ```

- [ ] エラーハンドリング確認（不正なリクエスト）

---

## 📋 Phase 6: AWS S3 連携（動画アップロード機能）

### AWS アカウント設定

- [ ] AWSアカウント作成（既存なら省略）
- [ ] IAM ユーザー作成
  - ユーザー名: `video-platform-backend`
  - 権限: S3, MediaConvert
  - Access Key ID/Secret 取得

### S3 バケット作成

- [ ] S3 バケット作成
  - バケット名: `video-platform-uploads-dev`
  - リージョン: `ap-northeast-1`（東京）
  - パブリックアクセス: ブロック

- [ ] S3 CORS 設定
  ```json
  {
    "CORSRules": [{
      "AllowedOrigins": ["http://localhost:3000"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }]
  }
  ```

- [ ] `.env` に AWS 設定追加
  ```bash
  AWS_REGION=ap-northeast-1
  AWS_ACCESS_KEY_ID=your-key
  AWS_SECRET_ACCESS_KEY=your-secret
  S3_BUCKET_NAME=video-platform-uploads-dev
  ```

### 動画アップロードテスト

- [ ] Presigned URL 生成確認
  ```bash
  curl -X POST http://localhost:4000/api/videos/upload \
    -H "Authorization: Bearer TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"title":"Test Video","fileName":"test.mp4","fileSize":1048576,"mimeType":"video/mp4"}'
  ```

- [ ] S3 へ実際のファイルアップロード
  ```bash
  curl -X PUT "PRESIGNED_URL" --upload-file test.mp4
  ```

- [ ] S3 Console でファイル確認

### CloudFront 設定（オプショナル）

- [ ] CloudFront Distribution 作成
  - Origin: S3 バケット
  - Viewer Protocol: Redirect HTTP to HTTPS
  - CloudFront Domain 取得

- [ ] `.env` に CloudFront 追加
  ```bash
  CLOUDFRONT_DOMAIN=d123456.cloudfront.net
  ```

- [ ] 署名付きURL動作確認

### MediaConvert 設定（オプショナル）

- [ ] MediaConvert Endpoint 取得
  ```bash
  aws mediaconvert describe-endpoints --region ap-northeast-1
  ```

- [ ] IAM Role 作成（MediaConvert用）
- [ ] Job Template 作成（HLS変換）
- [ ] トランスコーディングテスト

---

## 📋 Phase 7: Stripe 連携（決済機能）

### Stripe アカウント設定

- [ ] Stripe アカウント作成
- [ ] Test mode で開始

### Product/Price 作成

- [ ] Premium プラン作成
  - 名前: Premium Membership
  - 価格: $9.99/month
  - Price ID 取得

- [ ] Premium Plus プラン作成
  - 名前: Premium Plus Membership
  - 価格: $19.99/month
  - Price ID 取得

### API Key 設定

- [ ] API Keys 取得
  - Publishable Key: `pk_test_...`
  - Secret Key: `sk_test_...`

- [ ] `.env` に Stripe 設定追加
  ```bash
  STRIPE_SECRET_KEY=sk_test_your_key
  ```

### Webhook 設定（ローカルテスト）

- [ ] Stripe CLI インストール
  ```bash
  brew install stripe/stripe-cli/stripe
  ```

- [ ] Stripe CLI ログイン
  ```bash
  stripe login
  ```

- [ ] Webhook forwarding 起動
  ```bash
  stripe listen --forward-to localhost:4000/api/webhooks/stripe
  ```

- [ ] Webhook Secret 取得
  ```bash
  STRIPE_WEBHOOK_SECRET=whsec_...
  ```

### 決済フローテスト

- [ ] チェックアウトセッション作成
  ```bash
  curl -X POST http://localhost:4000/api/subscriptions/create-checkout \
    -H "Authorization: Bearer TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"planId":"PLAN_UUID","successUrl":"http://localhost:3000/success","cancelUrl":"http://localhost:3000/cancel"}'
  ```

- [ ] Test card で決済
  - カード番号: 4242 4242 4242 4242
  - 有効期限: 任意の未来日付
  - CVC: 任意の3桁

- [ ] Webhook イベント確認
  - `checkout.session.completed`
  - `invoice.payment_succeeded`

- [ ] データベースでサブスク確認
  ```sql
  SELECT * FROM "user_subscriptions";
  ```

### 投げ銭機能テスト

- [ ] 投げ銭送信
  ```bash
  curl -X POST http://localhost:4000/api/tips/send \
    -H "Authorization: Bearer TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"toUserId":"USER_ID","amount":500,"message":"Great video!"}'
  ```

- [ ] Payment Intent 確認
- [ ] 収益統計確認

---

## 📋 Phase 8: テスト実装・実行

### Unit Tests

- [ ] 既存のUnit testsを全実行
  ```bash
  npm run test:unit
  ```

- [ ] 不足しているUnit tests実装
  - Subscription module: 0/41 → 41/41
  - Video module: 追加実装
  - Social module: 追加実装

- [ ] テストカバレッジ80%達成
  ```bash
  npm test -- --coverage
  ```

### Integration Tests

- [ ] 認証API Integration tests 実装・実行
  - 登録、ログイン、トークンリフレッシュ
  - プロフィール管理
  - セッション管理

- [ ] 動画API Integration tests 実装・実行
  - アップロード、CRUD
  - いいね、コメント
  - 視聴履歴

- [ ] サブスクAPI Integration tests 実装・実行
  - プラン取得
  - チェックアウト
  - Webhook処理

- [ ] 投げ銭API Integration tests 実装・実行

### E2E Tests

- [ ] E2E テスト環境構築
- [ ] 認証フローE2E
- [ ] 動画アップロードフローE2E
- [ ] 決済フローE2E

---

## 📋 Phase 9: Render.com デプロイ（MVP本番環境）

### Render アカウント準備

- [ ] Render.com アカウント作成
- [ ] GitHub リポジトリ接続

### PostgreSQL 作成

- [ ] Render PostgreSQL 作成
  - Name: `video-platform-db`
  - Plan: Starter ($7/month) または Free
  - Internal Database URL 取得

### Redis 作成

- [ ] Render Redis 作成
  - Name: `video-platform-redis`
  - Plan: Starter ($7/month)
  - Internal Redis URL 取得

### Web Service 作成

- [ ] Web Service 作成
  - Repository: `your-org/video-platform`
  - Branch: `main`
  - Root Directory: `backend`
  - Build Command: `npm install && npx prisma generate && npm run build`
  - Start Command: `npx prisma migrate deploy && npm start`

- [ ] 環境変数設定（Render Dashboard）
  ```bash
  NODE_ENV=production
  PORT=4000
  DATABASE_URL=[Render PostgreSQL URL]
  REDIS_HOST=[Render Redis Host]
  REDIS_PORT=6379
  REDIS_PASSWORD=[Render Redis Password]
  JWT_SECRET=[openssl rand -base64 64]
  CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
  AWS_REGION=ap-northeast-1
  AWS_ACCESS_KEY_ID=[AWS Key]
  AWS_SECRET_ACCESS_KEY=[AWS Secret]
  S3_BUCKET_NAME=video-platform-uploads
  STRIPE_SECRET_KEY=sk_live_[本番キー]
  STRIPE_WEBHOOK_SECRET=whsec_[本番Webhook Secret]
  ```

- [ ] デプロイ実行（自動）
- [ ] デプロイログ確認
- [ ] Health check 確認
  ```bash
  curl https://video-platform-api.onrender.com/health
  ```

### Stripe Webhook 本番設定

- [ ] Stripe Dashboard → Webhooks
- [ ] Endpoint 追加: `https://video-platform-api.onrender.com/api/webhooks/stripe`
- [ ] Events 選択（8種類）
- [ ] Signing Secret 取得 → Render環境変数に追加

### 本番動作確認

- [ ] ユーザー登録・ログイン
- [ ] 動画アップロード（S3 へ）
- [ ] 決済フロー（Stripe Live mode）
- [ ] Webhook 受信確認
- [ ] 全エンドポイント疎通確認

---

## 📋 Phase 10: 本番運用準備

### カスタムドメイン設定

- [ ] ドメイン取得（必要に応じて）
- [ ] Render Custom Domain 設定
  - `api.your-domain.com`
- [ ] DNS CNAME レコード追加
- [ ] SSL証明書自動発行確認

### 監視・アラート設定

- [ ] Render Dashboard 監視設定
- [ ] エラーログ確認方法確立
- [ ] Slack/Email アラート設定（オプション）

### バックアップ確認

- [ ] Render PostgreSQL 自動バックアップ確認（7日保持）
- [ ] S3 versioning 有効化確認
- [ ] 手動スナップショット取得テスト

### ドキュメント整備

- [ ] API仕様書を最新化
- [ ] Runbook 作成（障害対応手順）
- [ ] 運用マニュアル作成

### パフォーマンステスト

- [ ] 負荷テスト実施（Apache JMeter / k6）
  - 同時接続数: 100
  - レスポンスタイム: <500ms
- [ ] メモリ使用量監視
- [ ] スロークエリ確認

### セキュリティチェック

- [ ] 環境変数に機密情報なし確認
- [ ] HTTPS 強制確認
- [ ] Rate limiting 動作確認
- [ ] CORS 設定確認
- [ ] Helmet security headers 確認

---

## 📋 Phase 11: Frontend 連携

### Frontend Repository

- [ ] Frontend コード確認（`frontend/` ディレクトリ）
- [ ] API Base URL 設定
  - Development: `http://localhost:4000`
  - Production: `https://video-platform-api.onrender.com`

### API 統合

- [ ] 認証フロー統合
- [ ] 動画アップロードフロー統合
- [ ] 決済フロー統合（Stripe Elements）
- [ ] エラーハンドリング統合

### Vercel デプロイ

- [ ] Vercel アカウント作成
- [ ] Frontend デプロイ
- [ ] 環境変数設定
- [ ] 本番URL取得

### E2E 動作確認

- [ ] Frontend → Backend 全フロー確認
- [ ] クロスブラウザテスト
- [ ] モバイル表示確認

---

## 🎯 完了条件（MVP Launch Ready）

### 必須項目

- [ ] Backend が Render で稼働中
- [ ] PostgreSQL/Redis 接続確認
- [ ] AWS S3 で動画アップロード動作
- [ ] Stripe で決済動作（Live mode）
- [ ] Health check が成功
- [ ] 主要APIエンドポイント疎通確認
- [ ] Frontend と Backend が連携

### 推奨項目

- [ ] Unit test カバレッジ 80%以上
- [ ] Integration tests 実装済み
- [ ] E2E tests 実装済み
- [ ] カスタムドメイン設定
- [ ] 監視・アラート設定
- [ ] ドキュメント整備完了

---

## 📊 現在地

```
✅ Phase 1-4: コード実装完了（100%）
⏳ Phase 5: ローカル環境構築（0%）
⏳ Phase 6: AWS S3 連携（0%）
⏳ Phase 7: Stripe 連携（0%）
⏳ Phase 8: テスト実装（39%）
⏳ Phase 9: Render デプロイ（0%）
⏳ Phase 10: 本番運用準備（0%）
⏳ Phase 11: Frontend 連携（0%）

総合進捗: 約 25%
```

---

## 🚀 推奨順序

1. **Phase 5** から開始（ローカル環境構築）
2. 基本的なAPI動作確認
3. **Phase 6** AWS S3 連携（動画機能の要）
4. **Phase 7** Stripe 連携（収益化機能）
5. **Phase 8** テスト実装（品質保証）
6. **Phase 9** Render デプロイ（本番環境）
7. **Phase 10-11** 運用準備・Frontend連携

**推定所要時間**: 2-3週間（1日2-4時間作業）

---

## 💡 Tips

### 時短のコツ

- まず**最小限の機能で動作確認**（認証のみ）
- AWS/Stripeは**Test mode**で先に試す
- Renderは**Free plan**で動作確認してから有料化

### コスト削減

- 開発中: Render Free + Redis Cloud Free = **$0**
- MVP初期: Render Starter ($21/month) + AWS S3 ($10) = **$31/month**
- Stripe手数料: 3.6% (決済発生時のみ)

### トラブル時の対処

1. **ログを確認**（Render Dashboard or `pm2 logs`）
2. **環境変数チェック**（設定漏れが多い）
3. **Health check**から順に確認
4. **Deployment Guide**参照
