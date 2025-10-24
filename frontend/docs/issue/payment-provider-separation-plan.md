# 決済プロバイダー分離による成人向けコンテンツ対応実装計画

## 📋 概要

**作成日**: 2025-10-24
**ステータス**: 実装前
**優先度**: 高

### 目的
Stripeポリシーに準拠しながらアダルトコンテンツの収益化を実現するため、決済プロバイダーをコンテンツタイプごとに分離する。

## 🎯 背景と問題点

### Stripeポリシーの制限
- Stripeは「ポルノグラフィおよび性的満足を目的とした成人向けコンテンツの販売」を禁止
- 明示的な性行為や裸体を描写する性的に露骨な素材の販売も禁止
- 違反するとアカウント停止のリスク

### 現在の実装の問題
1. サブスクプランでアダルトコンテンツへのアクセスが含まれる可能性
2. アダルトコンテンツへの投げ銭もStripeで処理される恐れ
3. 決済プロバイダーとコンテンツタイプの紐付けが明確でない

## ✨ 目標仕様

### 決済プロバイダーの完全分離

```
┌─────────────────────────────────────────┐
│ Stripe決済                               │
├─────────────────────────────────────────┤
│ ✓ フリープラン（無料）                  │
│ ✓ プレミアムプラン（非アダルトのみ）    │
│ ✓ 非アダルトコンテンツへの投げ銭       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 成人向け専門決済（CCBill/Epoch等）       │
├─────────────────────────────────────────┤
│ ✓ プレミアム+プラン（アダルト含む）     │
│ ✓ アダルトコンテンツへの投げ銭         │
└─────────────────────────────────────────┘
```

### サブスクリプションプラン構成

| プラン | 月額 | Netflix視聴 | 広告 | アダルト視聴 | 決済 |
|--------|------|------------|------|--------------|------|
| フリー | ¥0 | ✗ | ✓ | ✗ | - |
| プレミアム | ¥980 | ✓ | ✗ | ✗ | Stripe |
| プレミアム+ | ¥1,980 | ✓ | ✗ | ✓ | CCBill |

## 🔧 実装計画

### Phase 1: 型定義の拡張

#### 1.1 SubscriptionPlan型の拡張
**ファイル**: `types/index.ts`
**行数**: 77-88

**現在の定義**:
```typescript
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  is_current: boolean;
  billing_cycle: 'monthly' | 'yearly';
  next_billing_date?: string;
  has_netflix_access: boolean;
  has_ads: boolean;
}
```

**変更後**:
```typescript
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  is_current: boolean;
  billing_cycle: 'monthly' | 'yearly';
  next_billing_date?: string;
  has_netflix_access: boolean;
  has_ads: boolean;

  // 🆕 追加フィールド
  has_adult_access: boolean;  // アダルトコンテンツへのアクセス可否
  payment_provider: 'stripe' | 'ccbill' | 'epoch' | null;  // 決済プロバイダー
}
```

#### 1.2 決済プロバイダー関連の型定義追加
**ファイル**: `types/index.ts`
**追加位置**: SubscriptionPlanの後

```typescript
// 決済プロバイダー
export type PaymentProvider = 'stripe' | 'ccbill' | 'epoch';

// 投げ銭リクエスト
export interface TipRequest {
  content_id: string;
  content_type: 'video' | 'short' | 'live';
  amount: number;
  message?: string;
  payment_provider: PaymentProvider;  // 自動選択される
}

// 投げ銭履歴
export interface TipHistory {
  id: string;
  content_id: string;
  content_title: string;
  content_thumbnail: string;
  creator_name: string;
  amount: number;
  message?: string;
  payment_provider: PaymentProvider;
  created_at: string;
  status: 'completed' | 'pending' | 'failed';
}
```

### Phase 2: モックデータの更新

#### 2.1 サブスクプランモックデータの作成
**新規ファイル**: `mock/subscription-plans.json`

```json
[
  {
    "id": "plan_free",
    "name": "フリープラン",
    "price": 0,
    "features": [
      "基本的な動画視聴",
      "広告あり",
      "標準画質"
    ],
    "is_current": true,
    "billing_cycle": "monthly",
    "has_netflix_access": false,
    "has_ads": true,
    "has_adult_access": false,
    "payment_provider": null
  },
  {
    "id": "plan_premium",
    "name": "プレミアムプラン",
    "price": 980,
    "features": [
      "Netflix型コンテンツ視聴",
      "広告なし",
      "高画質配信",
      "オフライン視聴",
      "複数デバイス同時視聴"
    ],
    "is_current": false,
    "billing_cycle": "monthly",
    "has_netflix_access": true,
    "has_ads": false,
    "has_adult_access": false,
    "payment_provider": "stripe"
  },
  {
    "id": "plan_premium_plus",
    "name": "プレミアム+プラン",
    "price": 1980,
    "features": [
      "Netflix型コンテンツ視聴",
      "広告なし",
      "高画質配信",
      "オフライン視聴",
      "複数デバイス同時視聴",
      "全コンテンツへのアクセス（18+含む）"
    ],
    "is_current": false,
    "billing_cycle": "monthly",
    "has_netflix_access": true,
    "has_ads": false,
    "has_adult_access": true,
    "payment_provider": "ccbill"
  }
]
```

#### 2.2 既存のサブスクプランモック更新
**ファイル**: `mock/subscription-plans.json`（既存の場合）
または settings.tsxのモックデータ更新

### Phase 3: ユーティリティ関数の追加

#### 3.1 決済プロバイダー選択ロジック
**新規ファイル**: `utils/paymentProvider.ts`

```typescript
import { PaymentProvider } from '../types';

/**
 * コンテンツのアダルトフラグに基づいて適切な決済プロバイダーを選択
 */
export function selectPaymentProvider(isAdultContent: boolean): PaymentProvider {
  if (isAdultContent) {
    // アダルトコンテンツは成人向け専門決済
    return 'ccbill';  // または 'epoch'
  } else {
    // 非アダルトはStripe
    return 'stripe';
  }
}

/**
 * プランの決済プロバイダーに基づいて決済URLを取得
 */
export function getPaymentUrl(
  provider: PaymentProvider,
  planId: string,
  amount: number
): string {
  switch (provider) {
    case 'stripe':
      return `/api/payment/stripe/checkout?plan=${planId}`;
    case 'ccbill':
      return `/api/payment/ccbill/checkout?plan=${planId}`;
    case 'epoch':
      return `/api/payment/epoch/checkout?plan=${planId}`;
    default:
      throw new Error(`Unknown payment provider: ${provider}`);
  }
}

/**
 * 投げ銭の決済処理
 */
export async function processTip(
  contentId: string,
  contentType: 'video' | 'short' | 'live',
  isAdultContent: boolean,
  amount: number,
  message?: string
): Promise<{ success: boolean; paymentUrl: string }> {
  const provider = selectPaymentProvider(isAdultContent);

  // 実際の実装ではAPIコールを行う
  const paymentUrl = `/api/payment/${provider}/tip?content=${contentId}&amount=${amount}`;

  return {
    success: true,
    paymentUrl,
  };
}
```

#### 3.2 コンテンツアクセス制御ロジック
**新規ファイル**: `utils/contentAccess.ts`

```typescript
import { Video, Short, NetflixContent, SubscriptionPlan } from '../types';
import { canShowAdultContent } from '../constants/Platform';

/**
 * ユーザーの現在のプランに基づいてコンテンツへのアクセス権限をチェック
 */
export function canAccessContent(
  content: Video | Short | NetflixContent,
  currentPlan: SubscriptionPlan
): { canAccess: boolean; reason?: string } {
  // プラットフォーム制限（iOS/Android）
  if (content.is_adult && !canShowAdultContent) {
    return {
      canAccess: false,
      reason: 'このプラットフォームではアダルトコンテンツは利用できません',
    };
  }

  // アダルトコンテンツのアクセス権チェック
  if (content.is_adult && !currentPlan.has_adult_access) {
    return {
      canAccess: false,
      reason: 'アダルトコンテンツを視聴するにはプレミアム+プランが必要です',
    };
  }

  // Netflix型コンテンツのアクセス権チェック
  if ('type' in content && !currentPlan.has_netflix_access) {
    return {
      canAccess: false,
      reason: 'Netflix型コンテンツを視聴するにはプレミアムプラン以上が必要です',
    };
  }

  return { canAccess: true };
}

/**
 * コンテンツリストをフィルタリング
 */
export function filterContentByPlan<T extends { is_adult: boolean }>(
  contents: T[],
  currentPlan: SubscriptionPlan
): T[] {
  return contents.filter(content => {
    // 非アダルトは常に表示
    if (!content.is_adult) {
      return true;
    }

    // プラットフォーム制限
    if (!canShowAdultContent) {
      return false;
    }

    // プランによるアクセス権
    return currentPlan.has_adult_access;
  });
}
```

### Phase 4: API関数の実装

#### 4.1 サブスクプラン関連API
**ファイル**: `utils/mockApi.ts`
**追加する関数**:

```typescript
/**
 * 利用可能なサブスクプランの一覧を取得
 */
export async function getAvailableSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  // モックデータから読み込み
  const plans = require('../mock/subscription-plans.json');
  return new Promise(resolve => {
    setTimeout(() => resolve(plans), 300);
  });
}

/**
 * ユーザーの現在のプランを取得
 */
export async function getCurrentSubscriptionPlan(): Promise<SubscriptionPlan> {
  const plans = await getAvailableSubscriptionPlans();
  // 現在はフリープランを返す（モック）
  return plans.find(p => p.id === 'plan_free') || plans[0];
}

/**
 * サブスクプランの変更
 */
export async function changeSubscriptionPlan(
  planId: string
): Promise<{ success: boolean; paymentUrl?: string; error?: string }> {
  const plans = await getAvailableSubscriptionPlans();
  const plan = plans.find(p => p.id === planId);

  if (!plan) {
    return { success: false, error: 'プランが見つかりません' };
  }

  if (plan.price === 0) {
    // フリープランへの変更は即座に完了
    return { success: true };
  }

  // 有料プランの場合は決済URLを返す
  const paymentUrl = getPaymentUrl(
    plan.payment_provider!,
    planId,
    plan.price
  );

  return { success: true, paymentUrl };
}
```

#### 4.2 投げ銭関連API
**ファイル**: `utils/mockApi.ts`
**追加する関数**:

```typescript
/**
 * 投げ銭を送る
 */
export async function sendTip(
  contentId: string,
  contentType: 'video' | 'short' | 'live',
  amount: number,
  message?: string
): Promise<{ success: boolean; paymentUrl?: string; error?: string }> {
  // コンテンツ情報を取得してアダルトフラグを確認
  let isAdult = false;

  if (contentType === 'video') {
    const video = await getVideoDetail(contentId);
    isAdult = video.is_adult;
  } else if (contentType === 'short') {
    const shorts = await getShorts();
    const short = shorts.find(s => s.id === contentId);
    isAdult = short?.is_adult || false;
  }

  // 決済処理
  const result = await processTip(contentId, contentType, isAdult, amount, message);

  return result;
}

/**
 * 投げ銭履歴を取得
 */
export async function getTipHistory(): Promise<TipHistory[]> {
  // モックデータ
  return new Promise(resolve => {
    setTimeout(() => resolve([
      {
        id: 'tip_1',
        content_id: 'video_1',
        content_title: 'Sample Video',
        content_thumbnail: 'https://picsum.photos/400/225',
        creator_name: 'Creator Name',
        amount: 500,
        message: 'Great content!',
        payment_provider: 'stripe',
        created_at: new Date().toISOString(),
        status: 'completed',
      },
    ]), 300);
  });
}
```

### Phase 5: UI コンポーネントの実装

#### 5.1 プラン選択画面の改修
**ファイル**: `app/(tabs)/settings.tsx`
**変更箇所**: プラン管理タブ

**主な変更点**:
1. 3つのプランを表示（フリー、プレミアム、プレミアム+）
2. 各プランの決済プロバイダーを表示
3. アダルトコンテンツアクセスの有無を明示
4. プラン変更時に適切な決済フローへ誘導

**実装イメージ**:
```typescript
// プラン表示コンポーネント
function PlanCard({ plan, currentPlan, onSelect }: {
  plan: SubscriptionPlan;
  currentPlan: SubscriptionPlan;
  onSelect: (plan: SubscriptionPlan) => void;
}) {
  const isCurrent = plan.id === currentPlan.id;

  return (
    <View style={[styles.planCard, isCurrent && styles.planCardCurrent]}>
      {isCurrent && (
        <View style={styles.currentBadge}>
          <Text style={styles.currentBadgeText}>現在のプラン</Text>
        </View>
      )}

      <Text style={styles.planName}>{plan.name}</Text>
      <Text style={styles.planPrice}>
        {plan.price === 0 ? '無料' : `¥${plan.price.toLocaleString()}/月`}
      </Text>

      {/* 機能リスト */}
      <View style={styles.featureList}>
        {plan.features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      {/* 決済プロバイダー表示 */}
      {plan.payment_provider && (
        <View style={styles.providerInfo}>
          <Ionicons name="card-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.providerText}>
            決済: {plan.payment_provider.toUpperCase()}
          </Text>
        </View>
      )}

      {/* プラン変更ボタン */}
      {!isCurrent && (
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => onSelect(plan)}
        >
          <Text style={styles.selectButtonText}>
            {plan.price === 0 ? 'このプランに変更' : 'このプランに登録'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

#### 5.2 投げ銭UIの改修
**新規ファイル**: `components/TipModal.tsx`

投げ銭を送る際のモーダルコンポーネント。コンテンツのアダルトフラグに応じて適切な決済プロバイダーを自動選択。

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { selectPaymentProvider } from '../utils/paymentProvider';
import { sendTip } from '../utils/mockApi';

interface TipModalProps {
  visible: boolean;
  onClose: () => void;
  contentId: string;
  contentType: 'video' | 'short' | 'live';
  contentTitle: string;
  creatorName: string;
  isAdultContent: boolean;
}

export function TipModal({
  visible,
  onClose,
  contentId,
  contentType,
  contentTitle,
  creatorName,
  isAdultContent,
}: TipModalProps) {
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const provider = selectPaymentProvider(isAdultContent);
  const presetAmounts = [100, 500, 1000, 5000];

  const handleSendTip = async () => {
    const tipAmount = parseInt(amount);
    if (isNaN(tipAmount) || tipAmount <= 0) {
      alert('金額を入力してください');
      return;
    }

    setLoading(true);
    try {
      const result = await sendTip(
        contentId,
        contentType,
        tipAmount,
        message
      );

      if (result.success && result.paymentUrl) {
        // 決済画面へ遷移
        // 実装はプラットフォームに応じて変更
        alert(`決済画面へ移動します: ${result.paymentUrl}`);
        onClose();
      }
    } catch (error) {
      alert('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* ヘッダー */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>投げ銭を送る</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {/* コンテンツ情報 */}
          <View style={styles.contentInfo}>
            <Text style={styles.contentTitle}>{contentTitle}</Text>
            <Text style={styles.creatorName}>by {creatorName}</Text>
          </View>

          {/* プリセット金額 */}
          <View style={styles.presetAmounts}>
            {presetAmounts.map(preset => (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.presetButton,
                  amount === preset.toString() && styles.presetButtonSelected
                ]}
                onPress={() => setAmount(preset.toString())}
              >
                <Text style={[
                  styles.presetButtonText,
                  amount === preset.toString() && styles.presetButtonTextSelected
                ]}>
                  ¥{preset.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* カスタム金額入力 */}
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="カスタム金額（円）"
            keyboardType="number-pad"
            placeholderTextColor={Colors.textSecondary}
          />

          {/* メッセージ入力 */}
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            placeholder="メッセージ（任意）"
            multiline
            placeholderTextColor={Colors.textSecondary}
          />

          {/* 決済プロバイダー表示 */}
          <View style={styles.providerInfo}>
            <Ionicons name="information-circle" size={16} color={Colors.textSecondary} />
            <Text style={styles.providerText}>
              決済方法: {provider.toUpperCase()}
            </Text>
          </View>

          {/* 送信ボタン */}
          <TouchableOpacity
            style={[styles.sendButton, loading && styles.sendButtonDisabled]}
            onPress={handleSendTip}
            disabled={loading}
          >
            <Text style={styles.sendButtonText}>
              {loading ? '処理中...' : '投げ銭を送る'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // スタイル定義...
});
```

### Phase 6: コンテンツフィルタリングの実装

#### 6.1 動画一覧のフィルタリング
**ファイル**: `app/(tabs)/videos.tsx`

```typescript
import { filterContentByPlan } from '../utils/contentAccess';
import { getCurrentSubscriptionPlan } from '../utils/mockApi';

// useEffect内
useEffect(() => {
  const loadVideos = async () => {
    const allVideos = await getVideos();
    const currentPlan = await getCurrentSubscriptionPlan();

    // プランに基づいてフィルタリング
    const filteredVideos = filterContentByPlan(allVideos, currentPlan);
    setVideos(filteredVideos);
  };

  loadVideos();
}, []);
```

#### 6.2 動画再生前のアクセスチェック
**ファイル**: `app/video/[id].tsx`

```typescript
import { canAccessContent } from '../utils/contentAccess';
import { getCurrentSubscriptionPlan } from '../utils/mockApi';

// 動画読み込み時
useEffect(() => {
  const checkAccess = async () => {
    const videoData = await getVideoDetail(id);
    const currentPlan = await getCurrentSubscriptionPlan();

    const accessCheck = canAccessContent(videoData, currentPlan);

    if (!accessCheck.canAccess) {
      // アクセス権がない場合、アップグレード促進画面を表示
      Alert.alert(
        'プランのアップグレードが必要です',
        accessCheck.reason,
        [
          { text: 'キャンセル', onPress: () => router.back() },
          {
            text: 'プランを見る',
            onPress: () => router.push('/(tabs)/settings')
          },
        ]
      );
      return;
    }

    setVideo(videoData);
  };

  checkAccess();
}, [id]);
```

## 📁 ファイル変更一覧

### 変更ファイル

| ファイル | 変更内容 | 優先度 |
|---------|---------|--------|
| `types/index.ts` | SubscriptionPlan型の拡張、新規型追加 | 高 |
| `utils/mockApi.ts` | サブスクプラン・投げ銭関連API追加 | 高 |
| `app/(tabs)/settings.tsx` | プラン管理UIの3プラン対応 | 高 |
| `app/(tabs)/videos.tsx` | コンテンツフィルタリング追加 | 中 |
| `app/(tabs)/shorts.tsx` | コンテンツフィルタリング追加 | 中 |
| `app/(tabs)/netflix.tsx` | コンテンツフィルタリング追加 | 中 |
| `app/video/[id].tsx` | アクセス権チェック追加 | 高 |

### 新規ファイル

| ファイル | 内容 | 優先度 |
|---------|------|--------|
| `utils/paymentProvider.ts` | 決済プロバイダー選択ロジック | 高 |
| `utils/contentAccess.ts` | コンテンツアクセス制御ロジック | 高 |
| `components/TipModal.tsx` | 投げ銭モーダルコンポーネント | 中 |
| `mock/subscription-plans.json` | サブスクプランモックデータ | 高 |

## 🚀 実装の優先順位

### フェーズ1: 基礎実装（必須）
1. ✅ 型定義の拡張（`types/index.ts`）
2. ✅ モックデータの作成（`mock/subscription-plans.json`）
3. ✅ ユーティリティ関数の実装（`utils/paymentProvider.ts`, `utils/contentAccess.ts`）
4. ✅ API関数の実装（`utils/mockApi.ts`）

### フェーズ2: UI実装（必須）
5. ✅ プラン選択画面の改修（`app/(tabs)/settings.tsx`）
6. ✅ コンテンツフィルタリングの実装（各タブ）
7. ✅ アクセス権チェックの実装（動画再生画面）

### フェーズ3: 投げ銭機能（推奨）
8. ⭕ 投げ銭モーダルの実装（`components/TipModal.tsx`）
9. ⭕ 動画プレイヤーへの投げ銭ボタン追加
10. ⭕ ライブ配信への投げ銭機能追加

### フェーズ4: 決済統合（実装時）
11. 🔲 Stripe決済の実装（非アダルト用）
12. 🔲 CCBill決済の実装（アダルト用）
13. 🔲 決済完了後のコールバック処理

## 🧪 テストケース

### 1. プランによるコンテンツアクセス制御
- [ ] フリープラン: アダルトコンテンツ非表示
- [ ] プレミアムプラン: アダルトコンテンツ非表示、Netflix視聴可能
- [ ] プレミアム+プラン: すべてのコンテンツ表示

### 2. 決済プロバイダーの選択
- [ ] 非アダルトコンテンツへの投げ銭 → Stripe
- [ ] アダルトコンテンツへの投げ銭 → CCBill
- [ ] プレミアムプラン登録 → Stripe
- [ ] プレミアム+プラン登録 → CCBill

### 3. プラットフォーム制限
- [ ] iOS: アダルトコンテンツ完全非表示
- [ ] Android: アダルトコンテンツ完全非表示
- [ ] Web: プランに応じて表示/非表示

## 📝 注意事項

### Stripeポリシー準拠
- ✅ Stripeでアダルトコンテンツ関連の決済を行わない
- ✅ プラン説明でアダルトコンテンツを明示的に販売対象としない
- ✅ プレミアムプランは「プラットフォーム機能」として販売

### ユーザー体験
- プラン変更時に決済プロバイダーの違いを明示
- アクセス権がない場合、適切なメッセージでプランアップグレードを促進
- iOS/Androidではアダルトコンテンツを完全に非表示

### セキュリティ
- サーバーサイドで必ずアクセス権を再チェック
- フロントエンドのフィルタリングだけに頼らない
- 決済情報は適切に暗号化

## 🔄 今後の拡張

- [ ] 年間プランの追加
- [ ] ファミリープランの検討
- [ ] 投げ銭のランキング表示
- [ ] クリエイターダッシュボードでの収益詳細表示
- [ ] 複数の決済プロバイダーからユーザーが選択可能に

## 📚 参考リンク

- [Stripe Prohibited Businesses](https://stripe.com/legal/restricted-businesses)
- [CCBill Documentation](https://ccbill.com/doc)
- [Epoch Payment Solutions](https://epoch.com/)

---

**最終更新**: 2025-10-24
**作成者**: Claude Code
**ステータス**: 実装準備完了
