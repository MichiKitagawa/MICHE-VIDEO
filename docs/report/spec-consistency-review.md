# 仕様整合性レビュー報告

## 1. 目的
- `docs/specs/` 配下の各ドキュメントとフロントエンド実装 (`frontend/`) を突き合わせ、実装上の齟齬・欠落を抽出する。
- 抽出された差異について影響度と推奨対応を提示し、バックエンド実装前に解決すべき項目を明確化する。

## 2. 調査対象
- アーキテクチャ系: `docs/specs/architecture/system-overview.md`, `tech-stack.md`, `security.md` など。
- 機能仕様: `docs/specs/features/01-14-*.md`。
- リファレンス: `docs/specs/references/api-endpoints.md`, `payment-integration.md`, `data-models.md`。
- フロントエンド: 型定義・モック (`frontend/types/index.ts`, `frontend/utils/mockApi.ts`, `frontend/mock/*.json`), 決済ユーティリティ (`frontend/utils/paymentProvider.ts`)。

## 3. 主な矛盾・ギャップ
### 3.1 決済エンドポイント命名の不一致
- **内容**: フロントは `/api/payment/<provider>/checkout|tip` を想定しているが、仕様書では `/api/subscriptions/create-checkout` や `/api/payments/provider` と定義。
- **根拠**:
  - フロント: `frontend/utils/paymentProvider.ts:19-50`。
  - 仕様: `docs/specs/features/02-subscription.md:198-319`, `docs/specs/references/api-endpoints.md:175-183`。
- **影響**: プラン変更・投げ銭時の遷移が失敗する。モバイルアプリの決済導線が成立しない。
- **推奨**: API レイヤで `/api/payment/{provider}/checkout` をエイリアスとして提供し、既存仕様のエントリポイントも保持。`/api/payments/provider` はコンテンツ別プロバイダー判定 API として役割を明確化。

### 3.2 決済プロバイダー種別 (`epoch`) の扱い
- **内容**: フロントは `PaymentProvider` 型に `'epoch'` を含めており UI も分岐するが、仕様書は Stripe/CCBill のみを正式サポートと記載。
- **根拠**:
  - フロント: `frontend/types/index.ts:78-90`, `frontend/utils/paymentProvider.ts:24-33`。
  - 仕様: `docs/specs/references/payment-integration.md:1-55`。
- **影響**: 実装しない場合は UI 側で未対応のプロバイダーが選択されエラーとなる。
- **推奨**: 現行フェーズでは Epoch を未対応と宣言し API で `provider=epoch` 要求時に `501 Not Implemented` を返すか、早期に採用可否を決定して仕様に追記。フロント側にはフォールバック表示を実装。

### 3.3 プランDTOのフィールド差異
- **内容**: フロントは `features: string[]`, `is_current`, `has_ads`, `billing_cycle`, `payment_provider: null` (Free) などを利用しているが、仕様書のレスポンス例には含まれていない。
- **根拠**:
  - フロントモック: `frontend/mock/subscription-plans.json:1-53`。
  - 型: `frontend/types/index.ts:78-90`。
  - 仕様: `docs/specs/features/02-subscription.md:198-272`。
- **影響**: UI に必要な情報が欠落し、追加変換ロジックが必要。
- **推奨**: 仕様に `feature_flags` + `features`(表示用配列)、`is_current`, `has_ads`, `billing_cycle`, `next_billing_date`, `device_limit` を追加。Freeプランの `payment_provider` は `null` を許可。

### 3.4 プラン名ローカライズ
- **内容**: フロントは日本語名称 (`フリープラン` 等) を表示する前提だが、仕様書サンプルは英語名のみ。
- **根拠**:
  - フロントモック: `frontend/mock/subscription-plans.json:3-52`。
  - 仕様: `docs/specs/features/02-subscription.md:206-244`。
- **影響**: 表示上の不整合、将来的な多言語対応不可。
- **推奨**: API で `name` (ローカライズ済) と `name_en` を併記し、i18n ポリシーを決定。

### 3.5 決済方法/出金方法の型差異
- **内容**: フロントの支払い方法 (`PaymentMethod`) は `credit_card|paypal|bank_transfer` を想定、出金方法 (`WithdrawalMethod`) には `other` も含まれる。一方、仕様では `payment_methods.type='card'` 限定、`withdrawal_methods.type` も `'bank_transfer'|'paypal'` のみ。
- **根拠**:
  - フロント: `frontend/types/index.ts:104-138`。
  - 仕様: `docs/specs/references/data-models.md:276-292`, `docs/specs/features/09-monetization.md:156-179`。
- **影響**: ユーザーが追加した支払い/出金オプションが保存できない。
- **推奨**: `payment_methods.type` に `'paypal'` 等を許容する列挙を定義し、`withdrawal_methods` には `other` ＋ 任意メタデータを許可。

### 3.6 Express vs Fastify の記述揺れ
- **内容**: システム概要図では API サーバーを "Node.js + Express" と記載する一方、技術スタック仕様では Fastify を推奨として明記。
- **根拠**:
  - `docs/specs/architecture/system-overview.md:37-39`。
  - `docs/specs/architecture/tech-stack.md:101-125`。
- **影響**: 実装チームでフレームワーク選定がぶれる。
- **推奨**: Fastify を正式採用として全ドキュメントを更新、Express は比較対象と位置づける。

### 3.7 `/api/payments/provider` と Tip API の整合
- **内容**: 仕様ではコンテンツごとの決済プロバイダー取得を `/api/payments/provider` と定義しているが、フロントの投げ銭は直接 `/api/payment/${provider}/tip` を生成。プロバイダー判定 API の利用箇所が存在しない。
- **根拠**:
  - フロント: `frontend/utils/paymentProvider.ts:45-55`。
  - 仕様: `docs/specs/references/api-endpoints.md:175-183`。
- **影響**: 大人向けコンテンツで誤ったプロバイダーへ遷移する恐れ。
- **推奨**: バックエンド側で `/api/payment/{provider}/tip` を受け、サーバー側で成人判定を再検証。`/api/payments/provider` は管理画面/API クライアント用にリネームも検討。

### 3.8 描画に必要な Netflix データ項目
- **内容**: フロントは詳細画面で `video_url` を直接利用し再生 (`frontend/app/netflix/[id].tsx`)。仕様では別途 `/stream` エンドポイントを定義しているが、レスポンス例に `video_url` が含まれないケースがある。
- **根拠**:
  - フロント: `frontend/app/netflix/[id].tsx:1-120`。
  - 仕様: `docs/specs/features/14-netflix-content.md:333-357` は映画のみ `video_url` を提示、シリーズの場合はエピソード配列に含まれるが必須条件が明文化されていない。
- **影響**: 取り扱い規定未定義だと、シリーズ配下エピソードの `video_url` 欠如で再生不可。
- **推奨**: エピソードスキーマに `video_url` を必須として明文化し、署名付きURL取得との責務分担を追記。

## 4. リスク評価
| # | 影響度 | 緊急度 | コメント |
| --- | --- | --- | --- |
| 3.1 | 高 | 高 | 決済導線が成立しない |
| 3.2 | 中 | 中 | 早期の方針決定が必要 |
| 3.3 | 中 | 中 | API 実装で吸収可能だが事前通知が望ましい |
| 3.4 | 低 | 低 | i18n 設計タイミングで対応 |
| 3.5 | 中 | 中 | 金銭関連データの欠落につながる |
| 3.6 | 低 | 中 | ドキュメント更新で解消 |
| 3.7 | 中 | 高 | 成人向けコンテンツ課金で不具合 |
| 3.8 | 中 | 中 | Netflix機能の再生エラーに直結 |

## 5. 推奨アクション
1. 決済エンドポイント (3.1, 3.7) の命名調整とリダイレクト設計を早期に確定。
2. Epoch 対応方針と DTO 差分 (3.2, 3.3, 3.5) をプロダクトオーナーに確認し、仕様反映。
3. アーキテクチャ文書のフレームワーク記載を Fastify に統一 (3.6)。
4. Netflix エピソードの `video_url` 必須化と署名付きURL発行手順を仕様化 (3.8)。
5. 上記修正を `docs/specs/` 配下へ反映後、フロントのモック/API 呼び出しを順次本番実装に置換。

以上。

