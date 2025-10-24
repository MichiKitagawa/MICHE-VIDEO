# サブスクリプション管理と出金機能 実装計画

**作成日**: 2025-10-24
**ステータス**: 計画中
**優先度**: 高

## 概要

MICHE VIDEOプラットフォームにおけるサブスクリプション管理機能の拡充と、クリエイター向け出金機能の新規実装を行う。

### 現状の問題点

1. **サブスクリプションプラン構成が要件と不一致**
   - 現在: 無料/プレミアム/ビジネスの3プラン
   - 必要: 無料/有料スタンダード/有料プレミアム（Netflix視聴可否と広告有無で差別化）

2. **サブスクリプション管理機能が不十分**
   - アップグレードのみ可能
   - キャンセル、ダウングレード、請求履歴表示などが未実装

3. **出金機能が完全に未実装**
   - クリエイターの収益管理機能なし
   - 出金申請・履歴管理なし

---

## 実装フェーズ

### Phase 1: サブスクリプションプラン構成の修正（最優先）

#### 1-1. プランデータの更新

**ファイル**: `mock/subscription-plans.json`

**変更前**:
```json
[
  { "id": "free", "name": "無料プラン", "price": 0, ... },
  { "id": "premium", "name": "プレミアムプラン", "price": 980, ... },
  { "id": "business", "name": "ビジネスプラン", "price": 2980, ... }
]
```

**変更後**:
```json
[
  {
    "id": "free",
    "name": "無料プラン",
    "price": 0,
    "has_netflix_access": false,
    "has_ads": true,
    "features": [
      "YouTube型広告あり",
      "Netflix視聴不可",
      "標準画質（480p）",
      "シングルデバイス",
      "基本的なコンテンツ閲覧"
    ],
    "is_current": true,
    "billing_cycle": "monthly"
  },
  {
    "id": "standard",
    "name": "有料スタンダード",
    "price": 980,
    "has_netflix_access": true,
    "has_ads": true,
    "features": [
      "Netflix型コンテンツ視聴可",
      "YouTube型広告あり",
      "フルHD画質（1080p）",
      "2デバイスまで同時視聴",
      "オフラインダウンロード"
    ],
    "is_current": false,
    "billing_cycle": "monthly"
  },
  {
    "id": "premium",
    "name": "有料プレミアム",
    "price": 1980,
    "has_netflix_access": true,
    "has_ads": false,
    "features": [
      "Netflix型コンテンツ視聴可",
      "完全広告なし",
      "4K画質対応",
      "4デバイスまで同時視聴",
      "オフラインダウンロード",
      "早期アクセス",
      "優先サポート"
    ],
    "is_current": false,
    "billing_cycle": "monthly"
  }
]
```

**作業項目**:
- [ ] `mock/subscription-plans.json`の更新
- [ ] `types/index.ts`の`SubscriptionPlan`型に`has_netflix_access`と`has_ads`フィールドを追加
- [ ] プラン表示UIの確認（`components/PlanCard.tsx`は修正不要の想定）

**見積もり**: 30分

---

#### 1-2. Netflix視聴制御ロジックの実装

**ファイル**: `app/(tabs)/netflix.tsx`, `utils/mockApi.ts`

**実装内容**:
1. 現在のユーザープランを取得
2. `has_netflix_access`がfalseの場合、Netflix画面で制限メッセージを表示
3. 「プランをアップグレード」ボタンからSettings > Plan画面へ遷移

**コード例**:
```typescript
// app/(tabs)/netflix.tsx に追加
const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);

useEffect(() => {
  const loadCurrentPlan = async () => {
    const plan = await getCurrentPlan();
    setCurrentPlan(plan);
  };
  loadCurrentPlan();
}, []);

// Netflix画面のレンダリング
if (currentPlan && !currentPlan.has_netflix_access) {
  return (
    <View style={styles.restrictedContainer}>
      <Ionicons name="lock-closed" size={64} color={Colors.textSecondary} />
      <Text style={styles.restrictedTitle}>Netflix型コンテンツは有料プランで視聴できます</Text>
      <Text style={styles.restrictedDescription}>
        有料スタンダードまたは有料プレミアムにアップグレードしてください
      </Text>
      <TouchableOpacity
        style={styles.upgradeButton}
        onPress={() => router.push('/(tabs)/settings' as any)}
      >
        <Text style={styles.upgradeButtonText}>プランを見る</Text>
      </TouchableOpacity>
    </View>
  );
}
```

**作業項目**:
- [ ] Netflix画面での視聴制限UI実装
- [ ] 広告表示ロジックの実装（モック）
- [ ] テスト: 各プランでNetflixアクセス可否を確認

**見積もり**: 1.5時間

---

### Phase 2: サブスクリプション管理機能の拡充

#### 2-1. プランキャンセル機能

**ファイル**: `app/(tabs)/settings.tsx`, `utils/mockApi.ts`, `types/index.ts`

**実装内容**:

1. **API関数の追加** (`utils/mockApi.ts`):
```typescript
export const cancelSubscription = async (): Promise<void> => {
  // モック実装: 500ms待機して成功
  await new Promise(resolve => setTimeout(resolve, 500));
};
```

2. **UI実装** (`app/(tabs)/settings.tsx`):
```typescript
const handleCancelSubscription = () => {
  Alert.alert(
    'プランをキャンセル',
    '現在のプランをキャンセルしますか？次回更新日まで引き続き利用できます。',
    [
      { text: 'キャンセルしない', style: 'cancel' },
      {
        text: 'キャンセル',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelSubscription();
            Alert.alert('キャンセル完了', 'プランがキャンセルされました（モック）');
            loadData();
          } catch (error) {
            Alert.alert('エラー', 'キャンセルに失敗しました');
          }
        },
      },
    ]
  );
};
```

3. **プラン管理タブのUI更新**:
   - 現在のプランが有料の場合、「プランをキャンセル」ボタンを表示
   - キャンセル後の扱いを明記（次回更新日まで利用可能、その後無料プランに）

**作業項目**:
- [ ] `cancelSubscription` API関数の実装
- [ ] キャンセルボタンとハンドラーの実装
- [ ] キャンセル確認ダイアログの実装
- [ ] テスト: 各プランでキャンセルフローを確認

**見積もり**: 1時間

---

#### 2-2. プランダウングレード機能

**ファイル**: `app/(tabs)/settings.tsx`, `utils/mockApi.ts`

**実装内容**:

1. **API関数の追加** (`utils/mockApi.ts`):
```typescript
export const downgradePlan = async (planId: string): Promise<void> => {
  // モック実装
  await new Promise(resolve => setTimeout(resolve, 500));
};
```

2. **プラン変更ロジックの改善**:
```typescript
const handlePlanChange = async (targetPlanId: string) => {
  const currentPlan = plans.find(p => p.is_current);
  const targetPlan = plans.find(p => p.id === targetPlanId);

  if (!currentPlan || !targetPlan) return;

  const isUpgrade = targetPlan.price > currentPlan.price;
  const isDowngrade = targetPlan.price < currentPlan.price;

  if (isUpgrade) {
    Alert.alert(
      'プランアップグレード',
      `${targetPlan.name}（月額¥${targetPlan.price}）にアップグレードしますか？即座に適用されます。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'アップグレード',
          onPress: async () => {
            await upgradePlan(targetPlanId);
            Alert.alert('成功', 'プランがアップグレードされました');
            loadData();
          },
        },
      ]
    );
  } else if (isDowngrade) {
    Alert.alert(
      'プランダウングレード',
      `${targetPlan.name}（月額¥${targetPlan.price}）にダウングレードしますか？次回更新日から適用されます。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ダウングレード',
          onPress: async () => {
            await downgradePlan(targetPlanId);
            Alert.alert('成功', 'プランがダウングレードされました（次回更新日から適用）');
            loadData();
          },
        },
      ]
    );
  }
};
```

3. **PlanCard コンポーネントの更新**:
   - アップグレード/ダウングレードの両方に対応
   - 現在のプラン以外は「このプランに変更」ボタンを表示

**作業項目**:
- [ ] `downgradePlan` API関数の実装
- [ ] プラン変更ハンドラーの改善（アップグレード/ダウングレード判定）
- [ ] `PlanCard.tsx`のボタンテキストを動的に変更
- [ ] テスト: 全プラン間の変更フローを確認

**見積もり**: 1.5時間

---

#### 2-3. 請求情報表示の実装

**ファイル**: `app/(tabs)/settings.tsx`, `types/index.ts`, `mock/billing-history.json`（新規）

**実装内容**:

1. **型定義の追加** (`types/index.ts`):
```typescript
export interface BillingHistory {
  id: string;
  date: string;
  amount: number;
  plan_name: string;
  payment_method: string;
  status: 'paid' | 'pending' | 'failed';
  invoice_url?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'paypal' | 'bank_transfer';
  last_four?: string;
  brand?: string; // 'Visa', 'Mastercard', etc.
  is_default: boolean;
  expires_at?: string;
}
```

2. **モックデータの作成** (`mock/billing-history.json`):
```json
[
  {
    "id": "bill_001",
    "date": "2025-10-01T00:00:00Z",
    "amount": 980,
    "plan_name": "有料スタンダード",
    "payment_method": "Visa •••• 4242",
    "status": "paid",
    "invoice_url": "https://example.com/invoice/bill_001.pdf"
  },
  {
    "id": "bill_002",
    "date": "2025-09-01T00:00:00Z",
    "amount": 980,
    "plan_name": "有料スタンダード",
    "payment_method": "Visa •••• 4242",
    "status": "paid",
    "invoice_url": "https://example.com/invoice/bill_002.pdf"
  }
]
```

3. **API関数の追加** (`utils/mockApi.ts`):
```typescript
import billingHistoryData from '../mock/billing-history.json';

export const getBillingHistory = async (): Promise<BillingHistory[]> => {
  return billingHistoryData as BillingHistory[];
};

export const getPaymentMethods = async (): Promise<PaymentMethod[]> => {
  // モック実装
  return [
    {
      id: 'pm_001',
      type: 'credit_card',
      last_four: '4242',
      brand: 'Visa',
      is_default: true,
      expires_at: '2027-12-31',
    },
  ];
};
```

4. **UI実装** (`app/(tabs)/settings.tsx`):
   - プラン管理タブ内に「請求情報」セクションを追加
   - 次回請求予定日と金額を表示
   - 支払い方法（カード下4桁）を表示
   - 「支払い方法を変更」ボタン（モーダル表示）
   - 請求履歴一覧（折りたたみ可能）

**UI構成**:
```
プラン管理タブ
├── 現在のプラン（既存）
├── 利用可能なプラン（既存）
├── 請求情報（新規）← 有料プラン利用者のみ表示
│   ├── 次回請求予定: 2025-11-01（¥980）
│   ├── 支払い方法: Visa •••• 4242
│   └── [支払い方法を変更] ボタン
└── 請求履歴（新規）← 有料プラン利用者のみ表示
    └── 履歴一覧（日付、金額、プラン、領収書）
```

**作業項目**:
- [ ] 型定義の追加
- [ ] モックデータファイルの作成
- [ ] API関数の実装
- [ ] 請求情報セクションのUI実装
- [ ] 請求履歴一覧のUI実装
- [ ] テスト: 有料プランと無料プランでの表示確認

**見積もり**: 2.5時間

---

### Phase 3: 出金機能の実装（基本）

#### 3-1. 収益ダッシュボードの実装

**ファイル**: `app/(tabs)/settings.tsx`, `types/index.ts`, `mock/earnings-stats.json`（新規）, `utils/mockApi.ts`

**実装内容**:

1. **型定義の追加** (`types/index.ts`):
```typescript
export interface EarningsStats {
  available_balance: number;      // 出金可能残高
  pending_balance: number;        // 保留中残高
  this_month_earnings: number;    // 今月の収益
  total_withdrawn: number;        // 累計出金額
  breakdown: {
    ad_revenue: number;           // 広告収益
    netflix_revenue: number;      // Netflix視聴収益
    super_chat: number;           // スーパーチャット
    subscriptions: number;        // チャンネル登録料（将来機能）
  };
}
```

2. **モックデータの作成** (`mock/earnings-stats.json`):
```json
{
  "available_balance": 45280,
  "pending_balance": 12340,
  "this_month_earnings": 23450,
  "total_withdrawn": 156000,
  "breakdown": {
    "ad_revenue": 28000,
    "netflix_revenue": 15000,
    "super_chat": 14620,
    "subscriptions": 0
  }
}
```

3. **API関数の追加** (`utils/mockApi.ts`):
```typescript
import earningsStatsData from '../mock/earnings-stats.json';

export const getEarningsStats = async (): Promise<EarningsStats> => {
  return earningsStatsData as EarningsStats;
};
```

4. **Settingsタブ構成の更新** (`app/(tabs)/settings.tsx`):
   - TABSに「収益管理」を追加（CreationとNotificationsの間）
   - タブタイプに`'earnings'`を追加

```typescript
type TabType = 'profile' | 'channels' | 'plan' | 'earnings' | 'creation' | 'notifications' | 'history' | 'account';

const TABS = [
  { key: 'profile', label: 'プロフィール' },
  { key: 'channels', label: '登録チャンネル' },
  { key: 'plan', label: 'プラン管理' },
  { key: 'earnings', label: '収益管理' },
  { key: 'creation', label: 'Creation' },
  { key: 'notifications', label: '通知設定' },
  { key: 'history', label: '視聴履歴' },
  { key: 'account', label: 'アカウント' },
] as const;
```

5. **収益管理タブのUI実装**:

```typescript
{activeTab === 'earnings' && (
  <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, isMobile && styles.scrollContentMobile]}>
    <Text style={styles.sectionTitle}>収益管理</Text>

    {/* 収益サマリー */}
    <View style={styles.earningsSummary}>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>出金可能残高</Text>
        <Text style={styles.balanceAmount}>¥{earningsStats?.available_balance.toLocaleString()}</Text>
        <TouchableOpacity
          style={styles.withdrawButton}
          onPress={handleWithdrawRequest}
        >
          <Text style={styles.withdrawButtonText}>出金申請</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>保留中残高</Text>
          <Text style={styles.statValue}>¥{earningsStats?.pending_balance.toLocaleString()}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>今月の収益</Text>
          <Text style={styles.statValue}>¥{earningsStats?.this_month_earnings.toLocaleString()}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>累計出金額</Text>
          <Text style={styles.statValue}>¥{earningsStats?.total_withdrawn.toLocaleString()}</Text>
        </View>
      </View>
    </View>

    {/* 収益内訳 */}
    <View style={styles.earningsBreakdown}>
      <Text style={styles.subsectionTitle}>収益内訳</Text>
      <View style={styles.breakdownItem}>
        <View style={styles.breakdownBar} style={{ width: '100%', backgroundColor: '#4CAF50' }} />
        <Text style={styles.breakdownLabel}>広告収益</Text>
        <Text style={styles.breakdownValue}>¥{earningsStats?.breakdown.ad_revenue.toLocaleString()}</Text>
      </View>
      <View style={styles.breakdownItem}>
        <View style={styles.breakdownBar} style={{ width: '50%', backgroundColor: '#2196F3' }} />
        <Text style={styles.breakdownLabel}>Netflix視聴収益</Text>
        <Text style={styles.breakdownValue}>¥{earningsStats?.breakdown.netflix_revenue.toLocaleString()}</Text>
      </View>
      <View style={styles.breakdownItem}>
        <View style={styles.breakdownBar} style={{ width: '40%', backgroundColor: '#FF9800' }} />
        <Text style={styles.breakdownLabel}>スーパーチャット</Text>
        <Text style={styles.breakdownValue}>¥{earningsStats?.breakdown.super_chat.toLocaleString()}</Text>
      </View>
    </View>
  </ScrollView>
)}
```

**作業項目**:
- [ ] 型定義の追加
- [ ] モックデータファイルの作成
- [ ] API関数の実装
- [ ] TABSに収益管理タブを追加
- [ ] 収益サマリーUIの実装
- [ ] 収益内訳UIの実装
- [ ] レスポンシブ対応（モバイル/デスクトップ）
- [ ] テスト: 収益データの表示確認

**見積もり**: 3時間

---

#### 3-2. 出金方法の管理

**ファイル**: `types/index.ts`, `mock/withdrawal-methods.json`（新規）, `utils/mockApi.ts`, `app/(tabs)/settings.tsx`

**実装内容**:

1. **型定義の追加** (`types/index.ts`):
```typescript
export interface WithdrawalMethod {
  id: string;
  type: 'bank_transfer' | 'paypal' | 'other';
  bank_name?: string;
  branch_name?: string;
  account_type?: 'checking' | 'savings';
  account_number?: string;  // マスク表示用
  account_holder?: string;
  paypal_email?: string;
  is_verified: boolean;
  is_default: boolean;
  created_at: string;
}
```

2. **モックデータの作成** (`mock/withdrawal-methods.json`):
```json
[
  {
    "id": "wm_001",
    "type": "bank_transfer",
    "bank_name": "三菱UFJ銀行",
    "branch_name": "渋谷支店",
    "account_type": "checking",
    "account_number": "••••••1234",
    "account_holder": "ヤマダ タロウ",
    "is_verified": true,
    "is_default": true,
    "created_at": "2025-08-15T10:00:00Z"
  }
]
```

3. **API関数の追加** (`utils/mockApi.ts`):
```typescript
import withdrawalMethodsData from '../mock/withdrawal-methods.json';

export const getWithdrawalMethods = async (): Promise<WithdrawalMethod[]> => {
  return withdrawalMethodsData as WithdrawalMethod[];
};

export const addWithdrawalMethod = async (
  method: Omit<WithdrawalMethod, 'id' | 'is_verified' | 'created_at'>
): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 500));
};

export const deleteWithdrawalMethod = async (methodId: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 500));
};

export const setDefaultWithdrawalMethod = async (methodId: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300));
};
```

4. **UI実装** - 出金方法管理セクション:

```typescript
{/* 出金方法の管理 */}
<View style={styles.withdrawalMethods}>
  <View style={styles.subsectionHeader}>
    <Text style={styles.subsectionTitle}>出金方法</Text>
    <TouchableOpacity onPress={handleAddWithdrawalMethod}>
      <Ionicons name="add-circle" size={24} color={Colors.primary} />
    </TouchableOpacity>
  </View>

  {withdrawalMethods.map((method) => (
    <View key={method.id} style={styles.methodCard}>
      <View style={styles.methodInfo}>
        <Ionicons
          name={method.type === 'bank_transfer' ? 'business' : 'logo-paypal'}
          size={24}
          color={Colors.primary}
        />
        <View style={styles.methodDetails}>
          <Text style={styles.methodName}>
            {method.type === 'bank_transfer'
              ? `${method.bank_name} ${method.branch_name}`
              : method.paypal_email}
          </Text>
          <Text style={styles.methodAccount}>
            {method.type === 'bank_transfer'
              ? `${method.account_holder} (${method.account_number})`
              : 'PayPal'}
          </Text>
          {method.is_default && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>デフォルト</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.methodActions}>
        {!method.is_default && (
          <TouchableOpacity onPress={() => handleSetDefaultMethod(method.id)}>
            <Text style={styles.methodActionText}>デフォルトに設定</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => handleDeleteMethod(method.id)}>
          <Ionicons name="trash-outline" size={20} color="#D32F2F" />
        </TouchableOpacity>
      </View>
    </View>
  ))}
</View>
```

5. **出金方法追加モーダルの実装**:

```typescript
<Modal
  visible={addMethodModalVisible}
  animationType="slide"
  transparent
  onRequestClose={() => setAddMethodModalVisible(false)}
>
  <Pressable style={styles.modalBackdrop} onPress={() => setAddMethodModalVisible(false)}>
    <Pressable style={styles.methodModal} onPress={(e) => e.stopPropagation()}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>出金方法を追加</Text>
        <TouchableOpacity onPress={() => setAddMethodModalVisible(false)}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* 銀行振込フォーム */}
      <ScrollView style={styles.modalContent}>
        <Text style={styles.fieldLabel}>種類</Text>
        <View style={styles.methodTypeSelector}>
          <TouchableOpacity
            style={[styles.typeOption, methodType === 'bank_transfer' && styles.typeOptionActive]}
            onPress={() => setMethodType('bank_transfer')}
          >
            <Text>銀行振込</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeOption, methodType === 'paypal' && styles.typeOptionActive]}
            onPress={() => setMethodType('paypal')}
          >
            <Text>PayPal</Text>
          </TouchableOpacity>
        </View>

        {methodType === 'bank_transfer' && (
          <>
            <TextInput style={styles.input} placeholder="銀行名" />
            <TextInput style={styles.input} placeholder="支店名" />
            <TextInput style={styles.input} placeholder="口座種別（普通/当座）" />
            <TextInput style={styles.input} placeholder="口座番号" />
            <TextInput style={styles.input} placeholder="口座名義（カタカナ）" />
          </>
        )}

        {methodType === 'paypal' && (
          <TextInput style={styles.input} placeholder="PayPalメールアドレス" />
        )}

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmitMethod}>
          <Text style={styles.submitButtonText}>追加</Text>
        </TouchableOpacity>
      </ScrollView>
    </Pressable>
  </Pressable>
</Modal>
```

**作業項目**:
- [ ] 型定義の追加
- [ ] モックデータファイルの作成
- [ ] API関数の実装（取得、追加、削除、デフォルト設定）
- [ ] 出金方法一覧UIの実装
- [ ] 出金方法追加モーダルの実装
- [ ] 銀行振込/PayPalフォームの実装
- [ ] バリデーション実装
- [ ] テスト: 出金方法の追加・削除・デフォルト設定

**見積もり**: 3.5時間

---

#### 3-3. 出金申請機能

**ファイル**: `types/index.ts`, `mock/withdrawal-history.json`（新規）, `utils/mockApi.ts`, `app/(tabs)/settings.tsx`

**実装内容**:

1. **型定義の追加** (`types/index.ts`):
```typescript
export interface WithdrawalRequest {
  id: string;
  amount: number;
  method_id: string;
  method_type: string;
  method_display: string;  // 表示用（例: "三菱UFJ銀行 渋谷支店"）
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requested_at: string;
  processed_at?: string;
  error_message?: string;
  fee: number;  // 手数料
  net_amount: number;  // 実際の振込額
}
```

2. **モックデータの作成** (`mock/withdrawal-history.json`):
```json
[
  {
    "id": "wd_001",
    "amount": 50000,
    "method_id": "wm_001",
    "method_type": "bank_transfer",
    "method_display": "三菱UFJ銀行 渋谷支店",
    "status": "completed",
    "requested_at": "2025-09-15T10:00:00Z",
    "processed_at": "2025-09-18T15:30:00Z",
    "fee": 250,
    "net_amount": 49750
  },
  {
    "id": "wd_002",
    "amount": 30000,
    "method_id": "wm_001",
    "method_type": "bank_transfer",
    "method_display": "三菱UFJ銀行 渋谷支店",
    "status": "processing",
    "requested_at": "2025-10-20T14:00:00Z",
    "fee": 250,
    "net_amount": 29750
  }
]
```

3. **API関数の追加** (`utils/mockApi.ts`):
```typescript
import withdrawalHistoryData from '../mock/withdrawal-history.json';

const MINIMUM_WITHDRAWAL = 5000;  // 最低出金額
const WITHDRAWAL_FEE = 250;       // 出金手数料

export const requestWithdrawal = async (
  amount: number,
  methodId: string
): Promise<WithdrawalRequest> => {
  if (amount < MINIMUM_WITHDRAWAL) {
    throw new Error(`最低出金額は¥${MINIMUM_WITHDRAWAL.toLocaleString()}です`);
  }

  const stats = await getEarningsStats();
  if (amount > stats.available_balance) {
    throw new Error('出金可能残高を超えています');
  }

  const method = (await getWithdrawalMethods()).find(m => m.id === methodId);
  if (!method) {
    throw new Error('出金方法が見つかりません');
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    id: 'wd_' + Date.now(),
    amount,
    method_id: methodId,
    method_type: method.type,
    method_display: method.type === 'bank_transfer'
      ? `${method.bank_name} ${method.branch_name}`
      : method.paypal_email || 'PayPal',
    status: 'pending',
    requested_at: new Date().toISOString(),
    fee: WITHDRAWAL_FEE,
    net_amount: amount - WITHDRAWAL_FEE,
  };
};

export const getWithdrawalHistory = async (): Promise<WithdrawalRequest[]> => {
  return withdrawalHistoryData as WithdrawalRequest[];
};
```

4. **出金申請モーダルの実装**:

```typescript
const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
const [withdrawAmount, setWithdrawAmount] = useState('');
const [selectedMethodId, setSelectedMethodId] = useState('');
const [withdrawing, setWithdrawing] = useState(false);

const handleWithdrawRequest = () => {
  if (withdrawalMethods.length === 0) {
    Alert.alert('エラー', '先に出金方法を登録してください');
    return;
  }
  setWithdrawModalVisible(true);
  setSelectedMethodId(withdrawalMethods.find(m => m.is_default)?.id || withdrawalMethods[0].id);
};

const handleSubmitWithdrawal = async () => {
  const amount = parseInt(withdrawAmount);

  if (isNaN(amount) || amount < 5000) {
    Alert.alert('エラー', '最低出金額は¥5,000です');
    return;
  }

  if (!earningsStats || amount > earningsStats.available_balance) {
    Alert.alert('エラー', '出金可能残高を超えています');
    return;
  }

  setWithdrawing(true);
  try {
    await requestWithdrawal(amount, selectedMethodId);
    Alert.alert('申請完了', '出金申請が完了しました。通常3-5営業日で処理されます。');
    setWithdrawModalVisible(false);
    setWithdrawAmount('');
    // データ再読み込み
    loadData();
  } catch (error: any) {
    Alert.alert('エラー', error.message || '出金申請に失敗しました');
  } finally {
    setWithdrawing(false);
  }
};

// モーダルUI
<Modal
  visible={withdrawModalVisible}
  animationType="slide"
  transparent
  onRequestClose={() => setWithdrawModalVisible(false)}
>
  <Pressable style={styles.modalBackdrop} onPress={() => setWithdrawModalVisible(false)}>
    <Pressable style={styles.withdrawModal} onPress={(e) => e.stopPropagation()}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>出金申請</Text>
        <TouchableOpacity onPress={() => setWithdrawModalVisible(false)}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.modalContent}>
        <View style={styles.balanceDisplay}>
          <Text style={styles.balanceDisplayLabel}>出金可能残高</Text>
          <Text style={styles.balanceDisplayAmount}>
            ¥{earningsStats?.available_balance.toLocaleString()}
          </Text>
        </View>

        <View style={styles.formField}>
          <Text style={styles.fieldLabel}>出金額（最低¥5,000）</Text>
          <TextInput
            style={styles.input}
            placeholder="出金額を入力"
            keyboardType="numeric"
            value={withdrawAmount}
            onChangeText={setWithdrawAmount}
          />
          <Text style={styles.feeNote}>※ 手数料¥250が差し引かれます</Text>
        </View>

        <View style={styles.formField}>
          <Text style={styles.fieldLabel}>出金方法</Text>
          {withdrawalMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodOption,
                selectedMethodId === method.id && styles.methodOptionActive
              ]}
              onPress={() => setSelectedMethodId(method.id)}
            >
              <View style={styles.methodOptionContent}>
                <Ionicons
                  name={selectedMethodId === method.id ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={Colors.primary}
                />
                <View>
                  <Text style={styles.methodOptionText}>
                    {method.type === 'bank_transfer'
                      ? `${method.bank_name} ${method.branch_name}`
                      : method.paypal_email}
                  </Text>
                  <Text style={styles.methodOptionSubtext}>
                    {method.type === 'bank_transfer'
                      ? `${method.account_holder} (${method.account_number})`
                      : 'PayPal'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, withdrawing && styles.submitButtonDisabled]}
          onPress={handleSubmitWithdrawal}
          disabled={withdrawing}
        >
          {withdrawing ? (
            <ActivityIndicator size="small" color={Colors.background} />
          ) : (
            <Text style={styles.submitButtonText}>出金申請</Text>
          )}
        </TouchableOpacity>
      </View>
    </Pressable>
  </Pressable>
</Modal>
```

5. **出金履歴セクションの実装**:

```typescript
{/* 出金履歴 */}
<View style={styles.withdrawalHistory}>
  <Text style={styles.subsectionTitle}>出金履歴</Text>

  {withdrawalHistory.length === 0 ? (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>出金履歴がありません</Text>
    </View>
  ) : (
    withdrawalHistory.map((request) => (
      <View key={request.id} style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyAmount}>¥{request.amount.toLocaleString()}</Text>
          <View style={[
            styles.statusBadge,
            request.status === 'completed' && styles.statusCompleted,
            request.status === 'processing' && styles.statusProcessing,
            request.status === 'pending' && styles.statusPending,
            request.status === 'failed' && styles.statusFailed,
          ]}>
            <Text style={styles.statusText}>
              {request.status === 'completed' && '完了'}
              {request.status === 'processing' && '処理中'}
              {request.status === 'pending' && '申請中'}
              {request.status === 'failed' && '失敗'}
            </Text>
          </View>
        </View>

        <Text style={styles.historyMethod}>{request.method_display}</Text>
        <Text style={styles.historyDate}>
          申請日: {new Date(request.requested_at).toLocaleDateString('ja-JP')}
        </Text>
        {request.processed_at && (
          <Text style={styles.historyDate}>
            処理日: {new Date(request.processed_at).toLocaleDateString('ja-JP')}
          </Text>
        )}
        <Text style={styles.historyFee}>
          手数料: ¥{request.fee.toLocaleString()}（実振込額: ¥{request.net_amount.toLocaleString()}）
        </Text>
        {request.error_message && (
          <Text style={styles.errorMessage}>{request.error_message}</Text>
        )}
      </View>
    ))
  )}
</View>
```

**作業項目**:
- [ ] 型定義の追加
- [ ] モックデータファイルの作成
- [ ] API関数の実装（出金申請、履歴取得）
- [ ] 出金申請モーダルの実装
- [ ] 出金額入力とバリデーション
- [ ] 出金方法選択UI
- [ ] 出金履歴一覧UIの実装
- [ ] ステータス表示の実装
- [ ] テスト: 各種エラーケース（最低額未満、残高不足等）
- [ ] テスト: 出金申請から履歴表示まで

**見積もり**: 4時間

---

### Phase 4: 追加機能（優先度: 中）

#### 4-1. 税務情報管理

**実装内容**:
- マイナンバー/法人番号の登録
- 住所情報の管理
- 確認書類のアップロード（モック）

**見積もり**: 2.5時間

---

#### 4-2. 収益レポート

**実装内容**:
- 月次収益レポート
- 年次収益レポート
- CSVエクスポート機能（モック）

**見積もり**: 3時間

---

## ファイル一覧

### 新規作成するファイル

1. `mock/billing-history.json` - 請求履歴データ
2. `mock/earnings-stats.json` - 収益統計データ
3. `mock/withdrawal-methods.json` - 出金方法データ
4. `mock/withdrawal-history.json` - 出金履歴データ

### 修正するファイル

1. `types/index.ts` - 型定義の追加
2. `mock/subscription-plans.json` - プラン構成の修正
3. `utils/mockApi.ts` - API関数の追加
4. `app/(tabs)/settings.tsx` - UI実装（全Phase）
5. `app/(tabs)/netflix.tsx` - Netflix視聴制限ロジック
6. `components/PlanCard.tsx` - プラン変更ボタンの改善（必要に応じて）

---

## 実装スケジュール（見積もり）

| Phase | 内容 | 見積もり時間 | 累積時間 |
|-------|------|------------|---------|
| Phase 1-1 | プランデータ更新 | 0.5h | 0.5h |
| Phase 1-2 | Netflix視聴制御 | 1.5h | 2h |
| Phase 2-1 | プランキャンセル | 1h | 3h |
| Phase 2-2 | プランダウングレード | 1.5h | 4.5h |
| Phase 2-3 | 請求情報表示 | 2.5h | 7h |
| Phase 3-1 | 収益ダッシュボード | 3h | 10h |
| Phase 3-2 | 出金方法管理 | 3.5h | 13.5h |
| Phase 3-3 | 出金申請機能 | 4h | 17.5h |
| Phase 4-1 | 税務情報管理 | 2.5h | 20h |
| Phase 4-2 | 収益レポート | 3h | 23h |

**合計見積もり**: 約23時間（Phase 1-3のみで17.5時間）

---

## テスト計画

### Phase 1: プラン構成テスト
- [ ] 各プランの特徴が正しく表示される
- [ ] Netflix画面で無料プランでは視聴制限が表示される
- [ ] 有料プランではNetflixコンテンツが視聴できる

### Phase 2: サブスクリプション管理テスト
- [ ] プランのアップグレードが正常に動作する
- [ ] プランのダウングレードが正常に動作する（次回更新日に適用）
- [ ] プランのキャンセルが正常に動作する
- [ ] 請求履歴が正しく表示される
- [ ] 支払い方法の追加・削除が正常に動作する

### Phase 3: 出金機能テスト
- [ ] 収益統計が正しく表示される
- [ ] 出金方法の追加が正常に動作する（銀行振込/PayPal）
- [ ] 出金方法の削除が正常に動作する
- [ ] デフォルト出金方法の設定が正常に動作する
- [ ] 出金額のバリデーションが正常に動作する（最低額、残高チェック）
- [ ] 出金申請が正常に動作する
- [ ] 出金履歴が正しく表示される
- [ ] 各種ステータス（申請中/処理中/完了/失敗）が正しく表示される

---

## 注意事項

1. **モック実装について**
   - 現時点では全てモック実装
   - 実際のバックエンド実装時は`utils/mockApi.ts`の関数を実APIに置き換え

2. **セキュリティ考慮事項**（実装時に対応）
   - 銀行口座情報は暗号化して保存
   - マイナンバーは厳重な管理が必要
   - 出金申請には認証の強化（2FA等）を検討

3. **法的要件**（実装時に対応）
   - 税務情報の管理は税理士と相談
   - 出金手数料の表示義務
   - プライバシーポリシーの更新

4. **パフォーマンス**
   - 収益統計の計算は重い場合があるため、キャッシュを検討
   - 出金履歴は件数が多い場合、ページネーションを実装

---

## 実装後の確認事項

- [ ] 全てのモックデータが正しく読み込まれる
- [ ] TypeScriptの型エラーがない
- [ ] レスポンシブデザインが正しく動作する（モバイル/デスクトップ）
- [ ] 全てのエラーハンドリングが実装されている
- [ ] ユーザーフィードバック（Alert, ActivityIndicator等）が適切に表示される
- [ ] 日本語表記が統一されている

---

## 参考リソース

- [YouTube パートナープログラム収益化](https://support.google.com/youtube/answer/72857)
- [Patreon クリエイターガイド](https://support.patreon.com/hc/en-us)
- [Stripe Connect ペイアウト](https://stripe.com/docs/connect/payouts)
- [Netflix プラン変更](https://help.netflix.com/ja/node/24853)
