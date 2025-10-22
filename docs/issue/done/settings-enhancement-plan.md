# 設定画面充実化 修正計画

## 現状の問題点

### 1. サブスクリプションの意味が誤っている
- **現在の実装**: 「サブスクリプション」= 登録チャンネル一覧
- **正しい意味**: 「サブスクリプション」= 有料プランの契約管理
- **混同の原因**: YouTubeの「subscribe」（チャンネル登録）と、Netflix/Spotifyの「subscription」（課金プラン）の意味を混同

### 2. 設定項目が不足
- プロフィール、登録チャンネル、アップロードのみ
- 一般的な動画プラットフォームに必要な設定が不足

---

## 修正計画

### Phase 1: 用語と構造の修正

#### 1.1 型定義の変更
**ファイル**: `types/index.ts`

- `Subscription` → `SubscribedChannel` にリネーム
- 新しい `SubscriptionPlan` 型を追加

```typescript
// 登録チャンネル（旧Subscription）
export interface SubscribedChannel {
  id: string;
  channel_name: string;
  channel_avatar: string;
  subscriber_count: number;
  subscribed_at: string;
}

// サブスクリプションプラン（新規）
export interface SubscriptionPlan {
  id: string;
  name: string; // "無料プラン", "プレミアムプラン", "ビジネスプラン"
  price: number; // 月額料金（円）
  features: string[]; // 機能一覧
  is_current: boolean; // 現在のプラン
  billing_cycle: 'monthly' | 'yearly';
  next_billing_date?: string; // 次回請求日
}
```

#### 1.2 モックデータの変更
**ファイル**: `mock/subscriptions.json` → `mock/subscribed-channels.json`
- ファイル名変更

**新規**: `mock/subscription-plans.json`
```json
[
  {
    "id": "free",
    "name": "無料プラン",
    "price": 0,
    "features": [
      "広告付き動画視聴",
      "標準画質（480p）",
      "シングルデバイス"
    ],
    "is_current": true,
    "billing_cycle": "monthly"
  },
  {
    "id": "premium",
    "name": "プレミアムプラン",
    "price": 980,
    "features": [
      "広告なし動画視聴",
      "フルHD画質（1080p）",
      "3デバイスまで同時視聴",
      "オフラインダウンロード",
      "限定コンテンツ閲覧"
    ],
    "is_current": false,
    "billing_cycle": "monthly"
  },
  {
    "id": "business",
    "name": "ビジネスプラン",
    "price": 2980,
    "features": [
      "プレミアムプランの全て",
      "4K画質対応",
      "5デバイスまで同時視聴",
      "法人向け管理機能",
      "優先サポート",
      "IPライセンス商用利用"
    ],
    "is_current": false,
    "billing_cycle": "monthly"
  }
]
```

#### 1.3 APIの変更
**ファイル**: `utils/mockApi.ts`

```typescript
// 変更
export const getSubscriptions = async ()
  → export const getSubscribedChannels = async ()

// 新規
export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]>
export const getCurrentPlan = async (): Promise<SubscriptionPlan>
export const upgradePlan = async (planId: string): Promise<void>
```

---

### Phase 2: 設定タブの拡張

#### 2.1 新しいタブ構成

```
設定
├── プロフィール
├── 登録チャンネル（旧：サブスクリプション）
├── プラン管理（新規）← サブスクリプション契約
├── アップロード
├── 通知設定（新規）
├── プライバシー（新規）
├── 視聴履歴（新規）
├── ダウンロード（新規）
├── ヘルプ・サポート（新規）
└── アカウント（新規）← ログアウト含む
```

#### 2.2 各タブの詳細仕様

##### **プロフィール**（既存）
- ユーザー情報表示・編集
- アバター変更
- 変更なし

##### **登録チャンネル**（旧：サブスクリプション）
- 登録しているチャンネル一覧
- 登録解除ボタン
- チャンネルへのリンク

##### **プラン管理**（新規・重要）
- 現在のプラン表示
- プラン比較表
- アップグレード/ダウングレードボタン
- 請求履歴
- 次回請求日

**UIイメージ**:
```
┌─────────────────────────────┐
│ 現在のプラン: 無料プラン      │
│ 次回請求: なし               │
│                             │
│ ┌─────┐ ┌─────┐ ┌─────┐    │
│ │無料 │ │ﾌﾟﾚﾐｱﾑ│ │ﾋﾞｼﾞﾈｽ│    │
│ │ ¥0  │ │ ¥980│ │¥2980│    │
│ │現在 │ │ｱｯﾌﾟｸﾞﾚｰﾄﾞ│ │ｱｯﾌﾟｸﾞﾚｰﾄﾞ││
│ └─────┘ └─────┘ └─────┘    │
└─────────────────────────────┘
```

##### **アップロード**（既存）
- 変更なし

##### **通知設定**（新規）
- プッシュ通知ON/OFF
- 新着動画通知
- コメント通知
- いいね通知
- メール通知設定

##### **プライバシー**（新規）
- 視聴履歴の公開/非公開
- コメント履歴の公開/非公開
- アクティビティの公開設定
- ブロックリスト管理
- データダウンロード

##### **視聴履歴**（新規）
- 最近見た動画一覧
- 履歴削除ボタン
- 検索機能

##### **ダウンロード**（新規）
- ダウンロード済み動画一覧
- ストレージ使用量表示
- 画質設定
- 自動削除設定

##### **ヘルプ・サポート**（新規）
- よくある質問
- お問い合わせフォーム
- 利用規約
- プライバシーポリシー
- バージョン情報

##### **アカウント**（新規）
- メールアドレス変更
- パスワード変更
- アカウント削除
- **ログアウトボタン**

---

### Phase 3: 実装優先順位

#### 最優先（今回実装）
1. ✅ 型定義の変更（Subscription → SubscribedChannel + SubscriptionPlan）
2. ✅ モックデータ作成（subscribed-channels.json, subscription-plans.json）
3. ✅ API関数の変更（mockApi.ts）
4. ✅ settings.tsx のタブ構成変更
5. ✅ **プラン管理タブ**の実装（最重要）
6. ✅ 登録チャンネルタブの名称変更

#### 次回実装候補
7. ⏸️ 通知設定タブ
8. ⏸️ プライバシータブ
9. ⏸️ アカウントタブ（ログアウト含む）

#### 将来実装
10. ⏸️ 視聴履歴タブ
11. ⏸️ ダウンロードタブ
12. ⏸️ ヘルプ・サポートタブ

---

## 実装手順

### Step 1: 型定義とモックデータ準備
1. `types/index.ts` に新しい型追加
2. `mock/subscriptions.json` → `mock/subscribed-channels.json` リネーム
3. `mock/subscription-plans.json` 作成
4. `utils/mockApi.ts` の関数修正

### Step 2: プラン管理UIコンポーネント作成
1. `components/PlanCard.tsx` - プランカード
2. `components/PlanComparison.tsx` - プラン比較表（オプション）

### Step 3: settings.tsx の修正
1. TabType に新しいタブ追加
2. サイドバーのタブ項目追加
3. 各タブのコンテンツ実装
4. 「サブスクリプション」→「登録チャンネル」に名称変更

### Step 4: 動作確認
1. タブ切り替え
2. プラン表示
3. プランアップグレード（モック）
4. 登録チャンネル表示

---

## UIデザインガイドライン

### プラン管理画面
- **カード型レイアウト**: 各プランをカードで表示
- **明確な価格表示**: 大きなフォントで¥980/月
- **機能一覧**: チェックマーク付きリスト
- **CTAボタン**: 「アップグレード」「現在のプラン」を明確に
- **色分け**:
  - 無料プラン: グレー
  - プレミアムプラン: ブルー
  - ビジネスプラン: ゴールド

### 登録チャンネル画面
- **リスト形式**: 既存のUIを維持
- **登録解除ボタン**: 「登録済み」→「登録解除」にホバーで変化

---

## 今回実装する範囲

**Phase 1 + Phase 2（優先タブのみ）**

1. ✅ 型定義変更
2. ✅ モックデータ作成・変更
3. ✅ API関数修正
4. ✅ settings.tsx タブ追加（プラン管理、通知設定、プライバシー、アカウント）
5. ✅ プラン管理タブ完全実装
6. ✅ 登録チャンネルタブ名称変更
7. ✅ 通知設定タブ（簡易版）
8. ✅ プライバシータブ（簡易版）
9. ✅ アカウントタブ（ログアウト含む）

**Phase 3は今回見送り**
- 視聴履歴、ダウンロード、ヘルプ・サポートは将来実装

---

## 期待される成果

1. **正しい用語使用**: サブスクリプション = 有料プラン契約
2. **マネタイズ準備**: プラン管理UIの実装
3. **充実した設定画面**: 一般的な動画プラットフォームに匹敵
4. **ユーザー体験向上**: 必要な設定項目がすべて揃う

---

## 注意事項

- モックAPI実装のため、実際の課金処理は行わない
- プラン変更時はアラートで通知（モック）
- 将来的にはSupabaseと連携して実装
