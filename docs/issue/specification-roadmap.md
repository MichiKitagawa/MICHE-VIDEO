# バックエンド開発仕様書ロードマップ

## ドキュメント構成

### 1. 機能別仕様書（`specs/features/`）
開発時の主要参照ドキュメント。1〜2週間のスプリントで完結する粒度。

#### Phase 1: 基盤機能
- `01-authentication.md` - ユーザー認証・JWT・セッション管理
- `02-subscription.md` - サブスク管理・Stripe/CCBill統合・決済
- `03-content-delivery.md` - 動画アップロード・エンコード・CDN・ストレージ

#### Phase 2: コア機能
- `04-video-management.md` - 動画CRUD・メタデータ管理・モザイクチェック
- `05-video-playback.md` - 動画再生・いいね・コメント・視聴履歴
- `06-short-management.md` - ショート動画CRUD・メタデータ管理
- `07-short-playback.md` - ショート再生・インタラクション
- `08-live-streaming.md` - ライブ配信・WebRTC/HLS・SuperChat
- `14-netflix-content.md` - Netflixコンテンツ（映画・シリーズ）・IP権利管理

#### Phase 3: 収益化・ソーシャル
- `09-monetization.md` - 投げ銭・収益分配・出金管理
- `10-social.md` - フォロー・通知・アクティビティフィード
- `11-playlist.md` - プレイリスト・保存済み・視聴履歴

#### Phase 4: 高度な機能
- `12-search-recommendation.md` - 検索・レコメンデーション・Elasticsearch
- `13-channel-creation.md` - チャンネル管理・Analytics・収益ダッシュボード

---

### 2. 横断仕様書（`specs/references/`）
全体把握と設計時の参照ドキュメント。

#### データ・API
- `data-models.md` - 全テーブル定義・ER図・インデックス設計
- `api-endpoints.md` - 全APIエンドポイント一覧・バージョニング
- `error-codes.md` - エラーコード定義・メッセージ

#### ビジネスロジック
- `business-rules.md` - 課金ルール・権限マトリックス・コンテンツアクセス制御
- `authentication.md` - 認証・認可の詳細仕様・JWT構造
- `payment-integration.md` - Stripe/CCBill統合・Webhook処理

#### インフラ・外部連携
- `content-delivery.md` - CDN構成・動画配信戦略・適応ビットレート
- `file-storage.md` - S3/GCS構成・バケット設計・ライフサイクル
- `external-services.md` - 外部API一覧・レート制限・障害対応

---

### 3. アーキテクチャドキュメント（`specs/architecture/`）
技術選定と全体構成。

- `system-overview.md` - システム全体図・コンポーネント構成
- `tech-stack.md` - 技術選定理由・言語・FW・DB・インフラ
- `deployment.md` - デプロイ構成・CI/CD・環境分離
- `security.md` - セキュリティアーキテクチャ・暗号化・監査ログ
- `scalability.md` - スケーリング戦略・負荷分散・キャッシュ
- `monitoring.md` - 監視・ログ・アラート戦略

---

## 機能別仕様書の構成

各機能仕様書は以下のセクションで構成：

```markdown
# [機能名] 仕様書

## 1. 概要
- 機能の目的
- 対応フロントエンド画面
- 関連機能

## 2. ユースケース
- 主要ユーザーフロー
- エッジケース

## 3. データモデル
- 使用テーブル
- リレーション図

## 4. API仕様
- エンドポイント一覧
- リクエスト/レスポンス
- 認証・認可

## 5. ビジネスルール
- バリデーション
- 権限制御
- 課金ルール
- アダルトフィルタリング
- エラーハンドリング
- 境界値
- エッジケース

## 6. 非機能要件
- パフォーマンス目標
- セキュリティ要件
- スケーラビリティ

## 7. 実装上の注意点
- 外部サービス連携
- 技術的制約
- 既知の課題
```

---

## 開発フロー

```
1. 機能仕様書作成
   ↓
2. データモデル・API仕様確定
   ↓
3. テスト仕様書作成（TDD）
   ↓
4. 実装
   ↓
5. テスト実行
   ↓
6. QA・リリース
```

---

## 粒度の判断基準

**良い粒度の指標**：
- 実装期間: 1〜2週間スプリント
- API数: 3〜10エンドポイント
- テーブル数: 1〜5テーブルが主要関連
- 他機能依存: 3つ以下

**粒度が細かすぎる**: 仕様書3ページ未満、API 1〜2個
**粒度が粗すぎる**: 仕様書50ページ超、実装1ヶ月以上
