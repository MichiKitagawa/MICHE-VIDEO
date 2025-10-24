# プラットフォーム修正計画書

作成日: 2025年1月（推定）

## 概要

本ドキュメントは、動画プラットフォームの包括的なレビューに基づき、発見された問題点と具体的な修正計画をまとめたものです。

---

## 優先度別タスク一覧

### 🔴 最優先（法的必須・クリティカル）

1. **利用規約・プライバシーポリシーページの作成**
2. **プラン変更時の年齢確認警告**
3. **アダルトコンテンツアップロード時の警告表示**
4. **文字化け修正（paymentProvider.ts）**

### 🟡 高優先（ユーザー体験に大きく影響）

5. **Shortsタブへの検索機能追加**
6. **ショート動画への投げ銭機能追加**
7. **保存済みリスト表示UI**
8. **オフライン視聴機能の削除 or 実装決定**

### 🟢 中優先（機能拡充）

9. **通知機能の実装**
10. **プレイリスト機能の実装**
11. **SuperChatModalとTipModalの統一**
12. **Stripe⇄CCBill間のプラン変更処理の明確化**

---

# 詳細修正計画

---

## 1. 利用規約・プライバシーポリシーページの作成

### 🔴 優先度: 最優先（法的必須）

### 何が問題か

- 利用規約（Terms of Service）ページが存在しない
- プライバシーポリシー（Privacy Policy）ページが存在しない
- アダルトコンテンツを扱うプラットフォームとして、法的保護に必須
- App Store / Google Play の審査要件
- 個人情報保護法（GDPR相当）の要件

### どうすべきか

- `app/terms.tsx` - 利用規約ページを作成
- `app/privacy.tsx` - プライバシーポリシーページを作成
- サインアップ時に同意チェックボックスを追加
- フッターまたは設定画面からアクセス可能にする

### 具体的な修正計画

#### ステップ1: 利用規約ページの作成

**ファイル**: `app/terms.tsx`

```typescript
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>利用規約</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.title}>利用規約</Text>
        <Text style={styles.updateDate}>最終更新日: 2025年○月○日</Text>

        <Text style={styles.sectionTitle}>第1条（適用）</Text>
        <Text style={styles.paragraph}>
          本規約は、当社が提供する動画配信サービス（以下「本サービス」）の利用条件を定めるものです。
        </Text>

        <Text style={styles.sectionTitle}>第2条（年齢制限）</Text>
        <Text style={styles.paragraph}>
          本サービスには、18歳未満の方が視聴できないコンテンツが含まれています。{'\n'}
          18歳未満の方は、プレミアム+プランへの登録およびアダルトコンテンツの視聴はできません。{'\n'}
          虚偽の年齢申告を行った場合、アカウントを停止します。
        </Text>

        <Text style={styles.sectionTitle}>第3条（禁止事項）</Text>
        <Text style={styles.paragraph}>
          ユーザーは、以下の行為を行ってはなりません：{'\n'}
          1. 刑法第175条に違反する無修正のアダルトコンテンツのアップロード{'\n'}
          2. 他人の著作権、商標権、プライバシー権を侵害する行為{'\n'}
          3. 虚偽の情報による登録{'\n'}
          4. その他、当社が不適切と判断する行為
        </Text>

        {/* 他のセクションを追加 */}
      </ScrollView>
    </View>
  );
}
```

#### ステップ2: プライバシーポリシーページの作成

**ファイル**: `app/privacy.tsx`

同様の構造で作成。以下の項目を含める：
- 収集する個人情報
- 利用目的
- 第三者提供（CCBill、Stripeへの決済情報提供）
- Cookie の使用
- データの保管期間
- ユーザーの権利（削除要求等）

#### ステップ3: サインアップ画面への同意チェックボックス追加

**ファイル**: `app/auth.tsx`

```typescript
const [agreedToTerms, setAgreedToTerms] = useState(false);

// サインアップボタン
<TouchableOpacity
  style={[styles.button, !agreedToTerms && styles.buttonDisabled]}
  onPress={handleSignup}
  disabled={!agreedToTerms}
>
  <Text style={styles.buttonText}>アカウント作成</Text>
</TouchableOpacity>

// 同意チェックボックス
<View style={styles.termsContainer}>
  <Checkbox value={agreedToTerms} onValueChange={setAgreedToTerms} />
  <Text style={styles.termsText}>
    <Text
      style={styles.link}
      onPress={() => router.push('/terms')}
    >
      利用規約
    </Text>
    および
    <Text
      style={styles.link}
      onPress={() => router.push('/privacy')}
    >
      プライバシーポリシー
    </Text>
    に同意します
  </Text>
</View>
```

#### ステップ4: 設定画面からのリンク追加

**ファイル**: `app/(tabs)/settings.tsx`

アカウントタブに以下のリンクを追加：
- 利用規約を見る
- プライバシーポリシーを見る

---

## 2. プラン変更時の年齢確認警告

### 🔴 優先度: 最優先（法的必須）

### 何が問題か

- Premium+プラン（アダルトコンテンツアクセス可能）への変更時に、年齢確認警告が表示されない
- 18歳以上であることの再確認がない
- 法的証跡として不十分

### どうすべきか

- Premium+プランのカード選択時に警告ダイアログを表示
- 「18歳以上であることを確認します」チェックボックスの追加
- チェックしなければ決済ページに進めない

### 具体的な修正計画

#### ステップ1: 年齢確認モーダルの作成

**ファイル**: `components/AgeVerificationModal.tsx`

```typescript
import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface AgeVerificationModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function AgeVerificationModal({
  visible,
  onConfirm,
  onCancel,
}: AgeVerificationModalProps) {
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    if (confirmed) {
      onConfirm();
      setConfirmed(false); // Reset for next time
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={64} color="#FF0000" />
          </View>

          <Text style={styles.title}>年齢確認</Text>

          <Text style={styles.message}>
            プレミアム+プランには18歳以上の方のみご利用いただけるコンテンツが含まれます。
          </Text>

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              • アダルトコンテンツへのアクセスが可能になります{'\n'}
              • 虚偽の申告は利用規約違反となります{'\n'}
              • クレジットカード情報による年齢確認を行います
            </Text>
          </View>

          <View style={styles.checkboxContainer}>
            <Checkbox
              value={confirmed}
              onValueChange={setConfirmed}
            />
            <Text style={styles.checkboxLabel}>
              私は18歳以上であり、アダルトコンテンツの視聴に同意します
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                !confirmed && styles.confirmButtonDisabled
              ]}
              onPress={handleConfirm}
              disabled={!confirmed}
            >
              <Text style={styles.confirmButtonText}>同意して進む</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

#### ステップ2: settings.tsx への統合

**ファイル**: `app/(tabs)/settings.tsx`

```typescript
import AgeVerificationModal from '../../components/AgeVerificationModal';

const [ageVerificationVisible, setAgeVerificationVisible] = useState(false);
const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<string | null>(null);

const handlePlanPress = (plan: SubscriptionPlan) => {
  // Premium+プランの場合は年齢確認を表示
  if (plan.id === 'plan_premium_plus' && !plan.is_current) {
    setSelectedPlanForUpgrade(plan.id);
    setAgeVerificationVisible(true);
  } else {
    proceedWithPlanChange(plan.id);
  }
};

const handleAgeVerificationConfirm = () => {
  setAgeVerificationVisible(false);
  if (selectedPlanForUpgrade) {
    proceedWithPlanChange(selectedPlanForUpgrade);
  }
};

const proceedWithPlanChange = async (planId: string) => {
  // 既存のプラン変更ロジック
  const result = await changeSubscriptionPlan(planId);
  // ...
};

// JSX
<AgeVerificationModal
  visible={ageVerificationVisible}
  onConfirm={handleAgeVerificationConfirm}
  onCancel={() => {
    setAgeVerificationVisible(false);
    setSelectedPlanForUpgrade(null);
  }}
/>
```

---

## 3. アダルトコンテンツアップロード時の警告表示

### 🔴 優先度: 最優先（法的必須）

### 何が問題か

- アダルトコンテンツのアップロード時に、刑法175条の警告が表示されない
- モザイク処理必須の注意喚起がない
- クリエイターが無修正コンテンツをアップロードしてしまうリスク

### どうすべきか

- アップロード画面で `is_adult` にチェックを入れた際に警告を表示
- モザイク処理済みであることの自己申告チェックボックスを必須化
- 未チェックの場合はアップロードボタンを無効化

### 具体的な修正計画

#### ステップ1: 動画アップロード画面の修正

**ファイル**: `app/upload-video.tsx`

```typescript
const [isAdult, setIsAdult] = useState(false);
const [mosaicConfirmed, setMosaicConfirmed] = useState(false);

// is_adult のチェックボックス
<View style={styles.checkboxRow}>
  <Checkbox
    value={isAdult}
    onValueChange={(value) => {
      setIsAdult(value);
      if (!value) {
        setMosaicConfirmed(false); // Reset mosaic confirmation
      }
    }}
  />
  <Text style={styles.checkboxLabel}>
    18歳以上向けコンテンツ（アダルト）
  </Text>
</View>

// 警告ボックス（isAdultがtrueの時のみ表示）
{isAdult && (
  <View style={styles.adultWarningBox}>
    <View style={styles.warningHeader}>
      <Ionicons name="warning" size={28} color="#FF0000" />
      <Text style={styles.warningTitle}>
        アダルトコンテンツのアップロードに関する重要な注意
      </Text>
    </View>

    <Text style={styles.warningText}>
      <Text style={styles.bold}>刑法第175条（わいせつ物頒布等罪）</Text>{'\n'}
      {'\n'}
      • 性器のモザイク処理は法的義務です{'\n'}
      • 無修正コンテンツは違法であり、3年以下の懲役または250万円以下の罰金の対象となります{'\n'}
      • モザイク処理が不十分な場合、コンテンツは削除されアカウントが停止されます{'\n'}
      • 悪質な場合、警察に通報する可能性があります
    </Text>

    <View style={styles.mosaicConfirmationBox}>
      <Checkbox
        value={mosaicConfirmed}
        onValueChange={setMosaicConfirmed}
      />
      <Text style={styles.mosaicConfirmationText}>
        このコンテンツは刑法第175条に準拠したモザイク処理が施されていることを確認しました
      </Text>
    </View>
  </View>
)}

// アップロードボタンの無効化条件
<TouchableOpacity
  style={[
    styles.uploadButton,
    (isAdult && !mosaicConfirmed) && styles.uploadButtonDisabled
  ]}
  onPress={handleUpload}
  disabled={isAdult && !mosaicConfirmed}
>
  <Text style={styles.uploadButtonText}>アップロード</Text>
</TouchableOpacity>
```

#### ステップ2: ショートアップロード画面の修正

**ファイル**: `app/upload-short.tsx`

同様の警告ボックスとモザイク確認チェックボックスを追加

#### ステップ3: Netflix型コンテンツアップロード画面の修正

**ファイル**: `app/upload-netflix-movie.tsx`, `app/upload-netflix-series.tsx`

同様の警告ボックスとモザイク確認チェックボックスを追加

---

## 4. 文字化け修正（paymentProvider.ts）

### 🔴 優先度: 最優先（コード品質）

### 何が問題か

- `utils/paymentProvider.ts` のコメント部分が文字化けしている
- UTF-8エンコーディングの問題
- コードの保守性、可読性に悪影響

### どうすべきか

- ファイルを UTF-8 で書き直す
- 日本語コメントを適切に表示

### 具体的な修正計画

**ファイル**: `utils/paymentProvider.ts`

```typescript
import { PaymentProvider } from '../types';

/**
 * コンテンツの種類に基づいて決済プロバイダーを選択
 */
export function selectPaymentProvider(isAdultContent: boolean): PaymentProvider {
  if (isAdultContent) {
    // アダルトコンテンツはCCBill
    return 'ccbill';  // または 'epoch'
  } else {
    // 一般コンテンツはStripe
    return 'stripe';
  }
}

/**
 * 決済プロバイダーごとの決済URLを生成
 */
export function getPaymentUrl(
  provider: PaymentProvider,
  planId: string,
  amount: number
): string {
  switch (provider) {
    case 'stripe':
      return `/api/payment/stripe/checkout?plan=${planId}&amount=${amount}`;
    case 'ccbill':
      return `/api/payment/ccbill/checkout?plan=${planId}&amount=${amount}`;
    case 'epoch':
      return `/api/payment/epoch/checkout?plan=${planId}&amount=${amount}`;
    default:
      throw new Error(`Unknown payment provider: ${provider}`);
  }
}

/**
 * 投げ銭処理
 */
export async function processTip(
  contentId: string,
  contentType: 'video' | 'short' | 'live',
  isAdultContent: boolean,
  amount: number,
  message?: string
): Promise<{ success: boolean; paymentUrl: string }> {
  const provider = selectPaymentProvider(isAdultContent);

  // 決済プロバイダーのAPIエンドポイントを生成
  const messageParam = message ? `&message=${encodeURIComponent(message)}` : '';
  const paymentUrl = `/api/payment/${provider}/tip?content=${contentId}&type=${contentType}&amount=${amount}${messageParam}`;

  return {
    success: true,
    paymentUrl,
  };
}

/**
 * 決済プロバイダーの表示名を取得
 */
export function getPaymentProviderDisplayName(provider: PaymentProvider): string {
  switch (provider) {
    case 'stripe':
      return 'Stripe';
    case 'ccbill':
      return 'CCBill';
    case 'epoch':
      return 'Epoch';
    default:
      return provider.toUpperCase();
  }
}
```

---

## 5. Shortsタブへの検索機能追加

### 🟡 優先度: 高

### 何が問題か

- Videosタブには検索機能があるが、Shortsタブにはない
- ユーザーが特定のShort動画を探せない
- YouTube Shortsでも検索機能が提供されている

### どうすべきか

- Shortsタブにヘッダー検索バーを追加
- Shortsのみを検索対象とする（Videosは含めない）
- 検索結果表示UIを実装

### 具体的な修正計画

#### ステップ1: Short検索API関数の追加

**ファイル**: `utils/mockApi.ts`

```typescript
/**
 * Short動画を検索
 */
export const searchShorts = async (query: string): Promise<Short[]> => {
  const shorts = await getShorts();

  if (!query.trim()) {
    return shorts;
  }

  const lowerQuery = query.toLowerCase();

  return shorts.filter(short =>
    short.title.toLowerCase().includes(lowerQuery) ||
    short.description?.toLowerCase().includes(lowerQuery) ||
    short.user_name.toLowerCase().includes(lowerQuery) ||
    short.category?.toLowerCase().includes(lowerQuery)
  );
};
```

#### ステップ2: Shortsタブに検索UIを追加

**ファイル**: `app/(tabs)/shorts.tsx`

```typescript
import { useState } from 'react';

const [searchQuery, setSearchQuery] = useState('');
const [isSearchActive, setIsSearchActive] = useState(false);

// 検索バーコンポーネント
<View style={styles.searchContainer}>
  <View style={styles.searchBar}>
    <Ionicons name="search" size={20} color={Colors.textSecondary} />
    <TextInput
      style={styles.searchInput}
      placeholder="Shortsを検索"
      placeholderTextColor={Colors.textSecondary}
      value={searchQuery}
      onChangeText={setSearchQuery}
      onFocus={() => setIsSearchActive(true)}
      onBlur={() => {
        if (!searchQuery) {
          setIsSearchActive(false);
        }
      }}
    />
    {searchQuery.length > 0 && (
      <TouchableOpacity onPress={() => setSearchQuery('')}>
        <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
      </TouchableOpacity>
    )}
  </View>
</View>

// スタイル
const styles = StyleSheet.create({
  searchContainer: {
    position: 'absolute',
    top: 50,
    left: 12,
    right: 12,
    zIndex: 100,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.background,
    fontSize: 16,
  },
});
```

#### ステップ3: 検索結果のフィルタリング

```typescript
const filteredShorts = useMemo(() => {
  if (!searchQuery.trim()) {
    return filteredShorts; // プランによるフィルタリング済み
  }

  return filteredShorts.filter(short =>
    short.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    short.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    short.user_name.toLowerCase().includes(searchQuery.toLowerCase())
  );
}, [filteredShorts, searchQuery]);
```

---

## 6. ショート動画への投げ銭機能追加

### 🟡 優先度: 高

### 何が問題か

- 動画には投げ銭機能があるが、Short動画にはない
- TikTokやYouTube Shortsでも「ギフト」機能が提供されている
- クリエイターの収益化機会を逃している

### どうすべきか

- `short/[id]/index.tsx` に投げ銭ボタンを追加
- 既存の `TipModal` を再利用

### 具体的な修正計画

**ファイル**: `app/short/[id]/index.tsx`

```typescript
import TipModal from '../../../components/TipModal';

const [tipModalVisible, setTipModalVisible] = useState(false);

// 右側アクションボタンに追加
<View style={styles.actionsContainer}>
  {/* 既存のボタン（アバター、いいね、コメント、シェア） */}

  {/* 投げ銭ボタンを追加 */}
  <TouchableOpacity
    style={styles.actionButton}
    onPress={() => setTipModalVisible(true)}
  >
    <Ionicons name="gift-outline" size={32} color={Colors.primary} />
    <Text style={styles.actionText}>投げ銭</Text>
  </TouchableOpacity>

  {/* メニューボタン */}
  <TouchableOpacity
    style={styles.actionButton}
    onPress={() => setActionSheetVisible(true)}
  >
    <Ionicons name="ellipsis-vertical" size={28} color={Colors.background} />
  </TouchableOpacity>
</View>

{/* TipModal */}
<TipModal
  visible={tipModalVisible}
  onClose={() => setTipModalVisible(false)}
  contentId={short.id}
  contentType="short"
  contentTitle={short.title}
  creatorName={short.user_name}
  isAdultContent={short.is_adult}
/>
```

---

## 7. 保存済みリスト表示UI

### 🟡 優先度: 高

### 何が問題か

- `saveContentForLater` API関数は存在するが、保存したコンテンツを表示するUIがない
- 保存機能が実質的に使えない

### どうすべきか

- 設定画面に「保存済み」タブを追加
- 保存したコンテンツを一覧表示
- 削除機能も実装

### 具体的な修正計画

#### ステップ1: 保存済みコンテンツ取得APIの追加

**ファイル**: `utils/mockApi.ts`

```typescript
/**
 * 保存済みコンテンツを取得
 */
export const getSavedContents = async (): Promise<{
  videos: Video[];
  shorts: Short[];
}> => {
  // モック実装（実際はバックエンドから取得）
  return {
    videos: [],
    shorts: [],
  };
};

/**
 * 保存済みコンテンツから削除
 */
export const removeSavedContent = async (
  contentId: string,
  contentType: 'video' | 'short'
): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300));
};
```

#### ステップ2: settings.tsx に「保存済み」タブを追加

**ファイル**: `app/(tabs)/settings.tsx`

```typescript
const tabs = [
  'プロフィール',
  'チャンネル',
  'プラン',
  'クリエイター',
  '通知',
  '履歴',
  '保存済み',  // 追加
  'アカウント',
];

// 保存済みタブの内容
{activeTab === '保存済み' && (
  <SavedContentsTab />
)}
```

#### ステップ3: SavedContentsTab コンポーネントの作成

**ファイル**: `components/settings/SavedContentsTab.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Video, Short } from '../../types';
import { getSavedContents, removeSavedContent } from '../../utils/mockApi';
import { Colors } from '../../constants/Colors';

export default function SavedContentsTab() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [shorts, setShorts] = useState<Short[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSavedContents();
  }, []);

  const loadSavedContents = async () => {
    try {
      const data = await getSavedContents();
      setVideos(data.videos);
      setShorts(data.shorts);
    } catch (error) {
      console.error('Failed to load saved contents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (contentId: string, contentType: 'video' | 'short') => {
    try {
      await removeSavedContent(contentId, contentType);
      if (contentType === 'video') {
        setVideos(videos.filter(v => v.id !== contentId));
      } else {
        setShorts(shorts.filter(s => s.id !== contentId));
      }
    } catch (error) {
      Alert.alert('エラー', '削除に失敗しました');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* 動画セクション */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>保存した動画</Text>
        {videos.length === 0 ? (
          <Text style={styles.emptyText}>保存した動画はありません</Text>
        ) : (
          videos.map(video => (
            <View key={video.id} style={styles.contentItem}>
              <TouchableOpacity
                onPress={() => router.push(`/video/${video.id}`)}
                style={styles.contentInfo}
              >
                <Image
                  source={{ uri: video.thumbnail_url }}
                  style={styles.thumbnail}
                />
                <View style={styles.textInfo}>
                  <Text style={styles.title}>{video.title}</Text>
                  <Text style={styles.meta}>{video.user_name}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleRemove(video.id, 'video')}
              >
                <Ionicons name="close-circle" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Shortsセクション */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>保存したShorts</Text>
        {shorts.length === 0 ? (
          <Text style={styles.emptyText}>保存したShortsはありません</Text>
        ) : (
          shorts.map(short => (
            <View key={short.id} style={styles.contentItem}>
              <TouchableOpacity
                onPress={() => router.push(`/short/${short.id}`)}
                style={styles.contentInfo}
              >
                <Image
                  source={{ uri: short.thumbnail_url }}
                  style={styles.thumbnail}
                />
                <View style={styles.textInfo}>
                  <Text style={styles.title}>{short.title}</Text>
                  <Text style={styles.meta}>{short.user_name}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleRemove(short.id, 'short')}
              >
                <Ionicons name="close-circle" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
```

---

## 8. オフライン視聴機能の削除 or 実装決定

### 🟡 優先度: 高

### 何が問題か

- Premium以上のプラン特典として「オフライン視聴」が記載されている
- 実際の機能は未実装
- 機能詐称になる可能性

### どうすべきか

**選択肢A**: 機能を削除
- `subscription-plans.json` から「オフライン視聴」を削除
- ユーザーに誤解を与えない

**選択肢B**: 実装する
- expo-file-system を使用してダウンロード機能を実装
- ストレージ管理機能を追加
- DRM対応を検討

**選択肢C**: 「近日公開」と明記
- 暫定的な対応として、説明文に「近日公開予定」と追加

### 推奨: 選択肢A（削除）

理由：
- DRM実装はコストが高い
- ストレージ管理も複雑
- MVPとしては不要

### 具体的な修正計画（削除する場合）

**ファイル**: `mock/subscription-plans.json`

```json
{
  "id": "plan_premium",
  "features": [
    "Netflix型コンテンツ視聴",
    "広告なし",
    "高画質配信（1080p）",
    // "オフライン視聴",  ← 削除
    "複数デバイス同時視聴（2台まで）"
  ]
}
```

---

## 9. 通知機能の実装

### 🟢 優先度: 中

### 何が問題か

- 通知関連のAPI、UI、ページが存在しない
- チャンネル登録者への新着通知がない
- コメント返信通知がない
- エンゲージメントを高める重要機能が不足

### どうすべきか

- 通知一覧ページを作成
- 通知タイプ（新着動画、コメント返信、いいね、投げ銭受領等）を定義
- プッシュ通知の準備（expo-notifications）

### 具体的な修正計画

#### ステップ1: 通知型定義の追加

**ファイル**: `types/index.ts`

```typescript
export interface Notification {
  id: string;
  type: 'new_video' | 'comment_reply' | 'like' | 'tip_received' | 'subscription';
  title: string;
  message: string;
  thumbnail_url?: string;
  link_url?: string; // タップ時の遷移先
  is_read: boolean;
  created_at: string;
}
```

#### ステップ2: 通知一覧ページの作成

**ファイル**: `app/notifications.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Notification } from '../types';
import { getNotifications, markNotificationAsRead } from '../utils/mockApi';
import { Colors } from '../constants/Colors';

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    const data = await getNotifications();
    setNotifications(data);
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.is_read) {
      await markNotificationAsRead(notification.id);
      setNotifications(
        notifications.map(n =>
          n.id === notification.id ? { ...n, is_read: true } : n
        )
      );
    }

    if (notification.link_url) {
      router.push(notification.link_url as any);
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.is_read && styles.unreadNotification,
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      {item.thumbnail_url && (
        <Image source={{ uri: item.thumbnail_url }} style={styles.thumbnail} />
      )}
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.time}>{formatRelativeTime(item.created_at)}</Text>
      </View>
      {!item.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>通知</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>通知はありません</Text>
        }
      />
    </View>
  );
}
```

#### ステップ3: ヘッダーに通知アイコンを追加

**ファイル**: `components/Header.tsx`

```typescript
<TouchableOpacity
  style={styles.notificationButton}
  onPress={() => router.push('/notifications')}
>
  <Ionicons name="notifications-outline" size={24} color={Colors.text} />
  {unreadCount > 0 && (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{unreadCount}</Text>
    </View>
  )}
</TouchableOpacity>
```

---

## 10. プレイリスト機能の実装

### 🟢 優先度: 中

### 何が問題か

- プレイリスト機能が存在しない
- 連続視聴体験の低下
- YouTubeなど競合サービスでは標準機能

### どうすべきか

- プレイリスト作成・管理機能を実装
- 動画詳細ページから「プレイリストに追加」ボタンを表示
- プレイリスト一覧・再生機能を実装

### 具体的な修正計画

（詳細は省略。優先度が中のため、必要に応じて実装）

---

## 11. SuperChatModalとTipModalの統一

### 🟢 優先度: 中（保守性向上）

### 何が問題か

- ライブ配信用の `SuperChatModal` と動画用の `TipModal` が別コンポーネント
- 機能は似ているがコードが重複
- 保守性の低下

### どうすべきか

- 共通の `TipModal` コンポーネントに統一
- `contentType` で動画/Short/ライブを判別
- ライブ配信時は「スーパーチャット」、それ以外は「投げ銭」と表示

### 具体的な修正計画

（詳細は省略。リファクタリング作業として後回し可）

---

## 12. Stripe⇄CCBill間のプラン変更処理の明確化

### 🟢 優先度: 中

### 何が問題か

- Premium（Stripe）→ Premium+（CCBill）への変更時の処理フローが不明確
- 2つの異なる決済プロバイダー間での移行処理が未実装
- 二重課金のリスク

### どうすべきか

- プラン変更時のフロー明確化
- 「現在のプランをキャンセル → 新しいプランに登録」という2段階処理
- ユーザーへの説明を追加

### 具体的な修正計画

#### ステップ1: プラン変更確認ダイアログの改善

```typescript
const handlePlanChange = (newPlan: SubscriptionPlan) => {
  const currentPlan = getCurrentPlan();

  // 異なる決済プロバイダー間の移行の場合
  if (
    currentPlan.payment_provider !== null &&
    newPlan.payment_provider !== currentPlan.payment_provider
  ) {
    Alert.alert(
      'プラン変更の確認',
      `現在のプラン（${currentPlan.name}）をキャンセルし、新しいプラン（${newPlan.name}）に登録します。\n\n` +
      `決済プロバイダーが変更されるため、新規登録として処理されます。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '変更する',
          onPress: () => proceedWithCrossProviderChange(currentPlan, newPlan)
        },
      ]
    );
  } else {
    // 同じプロバイダー内での変更
    proceedWithPlanChange(newPlan);
  }
};

const proceedWithCrossProviderChange = async (
  currentPlan: SubscriptionPlan,
  newPlan: SubscriptionPlan
) => {
  // 1. 現在のプランをキャンセル
  await cancelSubscription();

  // 2. 新しいプランに登録
  const result = await changeSubscriptionPlan(newPlan.id);

  // 3. 決済URLへリダイレクト
  if (result.paymentUrl) {
    Linking.openURL(result.paymentUrl);
  }
};
```

---

## 実装優先順位

### フェーズ1: 法的コンプライアンス（必須）

1. ✅ 利用規約・プライバシーポリシーページ
2. ✅ プラン変更時の年齢確認警告
3. ✅ アダルトコンテンツアップロード時の警告
4. ✅ 文字化け修正

**期間**: 1週間

---

### フェーズ2: コア機能改善（高優先）

5. ✅ Shortsタブへの検索機能
6. ✅ ショート動画への投げ銭
7. ✅ 保存済みリスト表示UI
8. ✅ オフライン視聴機能の削除 or 実装決定

**期間**: 1週間

---

### フェーズ3: エンゲージメント向上（中優先）

9. ✅ 通知機能
10. ✅ プレイリスト機能
11. ✅ コード品質改善（SuperChat/Tip統一）
12. ✅ プラン変更処理の明確化

**期間**: 2週間

---

## まとめ

本ドキュメントでは、プラットフォームの包括的なレビューに基づき、12の主要な修正項目を特定しました。

**最優先事項**は法的コンプライアンス関連（1-4）であり、これらは事業リスクに直結するため即座に対応が必要です。

その後、ユーザー体験を大きく改善する検索機能や投げ銭機能（5-8）を実装し、最後にエンゲージメント向上のための機能（9-12）を追加することを推奨します。

---

**作成日**: 2025年1月
**最終更新**: 2025年1月
