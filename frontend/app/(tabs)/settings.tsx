// 設定画面（レスポンシブ対応）

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  FlatList,
  Alert,
  Switch,
  useWindowDimensions,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import PlanCard from '../../components/PlanCard';
import AgeVerificationModal from '../../components/AgeVerificationModal';
import { Colors } from '../../constants/Colors';
import {
  getUser,
  getSubscribedChannels,
  getAvailableSubscriptionPlans,
  getCurrentSubscriptionPlan,
  changeSubscriptionPlan,
  cancelSubscription,
  getWatchHistory,
  updateUser,
  getBillingHistory,
  getPaymentMethods,
  getEarningsStats,
  getWithdrawalMethods,
  getWithdrawalHistory,
  requestWithdrawal,
  addWithdrawalMethod,
  deleteWithdrawalMethod,
  setDefaultWithdrawalMethod,
} from '../../utils/mockApi';
import {
  User,
  SubscribedChannel,
  SubscriptionPlan,
  WatchHistory,
  BillingHistory,
  PaymentMethod,
  EarningsStats,
  WithdrawalMethod,
  WithdrawalRequest,
} from '../../types';

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

export default function SettingsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [user, setUser] = useState<User | null>(null);
  const [channels, setChannels] = useState<SubscribedChannel[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [watchHistory, setWatchHistory] = useState<WatchHistory[]>([]);

  // 請求・支払い関連
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  // 収益・出金関連
  const [earningsStats, setEarningsStats] = useState<EarningsStats | null>(null);
  const [withdrawalMethods, setWithdrawalMethods] = useState<WithdrawalMethod[]>([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalRequest[]>([]);

  // 出金モーダル関連
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  // 出金方法追加モーダル関連
  const [addMethodModalVisible, setAddMethodModalVisible] = useState(false);
  const [methodType, setMethodType] = useState<'bank_transfer' | 'paypal'>('bank_transfer');
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [accountType, setAccountType] = useState<'checking' | 'savings'>('checking');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');

  // 年齢確認モーダル関連
  const [ageVerificationModalVisible, setAgeVerificationModalVisible] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);

  // 通知設定
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [newVideoNotifications, setNewVideoNotifications] = useState(true);

  // プロフィール設定
  const [publicProfile, setPublicProfile] = useState(true);

  // プロフィール編集フォーム
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const userData = await getUser();
    const channelsData = await getSubscribedChannels();
    const plansData = await getAvailableSubscriptionPlans();
    const historyData = await getWatchHistory();
    const billingData = await getBillingHistory();
    const paymentData = await getPaymentMethods();
    const earningsData = await getEarningsStats();
    const withdrawalMethodsData = await getWithdrawalMethods();
    const withdrawalHistoryData = await getWithdrawalHistory();

    setUser(userData);
    setChannels(channelsData);
    setPlans(plansData);
    setWatchHistory(historyData);
    setBillingHistory(billingData);
    setPaymentMethods(paymentData);
    setEarningsStats(earningsData);
    setWithdrawalMethods(withdrawalMethodsData);
    setWithdrawalHistory(withdrawalHistoryData);

    // フォーム初期値設定
    setEditName(userData.name);
    setEditEmail(userData.email);
    setEditBio(userData.bio || '');
  };

  const formatSubscriberCount = (count: number): string => {
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}万人`;
    }
    return `${count}人`;
  };

  const handlePlanChange = async (targetPlanId: string) => {
    const currentPlan = plans.find(p => p.is_current);
    const targetPlan = plans.find(p => p.id === targetPlanId);

    if (!currentPlan || !targetPlan) return;

    // Premium+プラン（成人向けコンテンツ含む）の場合、年齢確認モーダルを表示
    if (targetPlan.has_adult_access) {
      setPendingPlanId(targetPlanId);
      setAgeVerificationModalVisible(true);
      return;
    }

    // 年齢確認不要なプランの場合は既存のフローを実行
    await executePlanChange(targetPlanId);
  };

  const executePlanChange = async (targetPlanId: string) => {
    const currentPlan = plans.find(p => p.is_current);
    const targetPlan = plans.find(p => p.id === targetPlanId);

    if (!currentPlan || !targetPlan) return;

    const isUpgrade = targetPlan.price > currentPlan.price;
    const isDowngrade = targetPlan.price < currentPlan.price;

    // Display payment provider info
    const providerInfo = targetPlan.payment_provider
      ? `\n決済: ${targetPlan.payment_provider === 'stripe' ? 'Stripe' : targetPlan.payment_provider === 'ccbill' ? 'CCBill' : 'Epoch'}`
      : '';

    if (isUpgrade) {
      Alert.alert(
        'プランアップグレード',
        `${targetPlan.name}（月額¥${targetPlan.price.toLocaleString()}）にアップグレードしますか？${providerInfo}\n即座に適用されます。`,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: 'アップグレード',
            onPress: async () => {
              const result = await changeSubscriptionPlan(targetPlanId);
              if (result.success) {
                if (result.paymentUrl) {
                  Alert.alert(
                    '決済ページへ移動',
                    `以下のURLで決済を完了してください：\n${result.paymentUrl}`,
                    [{ text: 'OK' }]
                  );
                } else {
                  Alert.alert('成功', 'プランがアップグレードされました');
                }
                loadData();
              } else {
                Alert.alert('エラー', result.error || 'プラン変更に失敗しました');
              }
            },
          },
        ]
      );
    } else if (isDowngrade) {
      Alert.alert(
        'プランダウングレード',
        `${targetPlan.name}（月額¥${targetPlan.price.toLocaleString()}）にダウングレードしますか？次回更新日から適用されます。`,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: 'ダウングレード',
            onPress: async () => {
              const result = await changeSubscriptionPlan(targetPlanId);
              if (result.success) {
                Alert.alert('成功', 'プランがダウングレードされました（次回更新日から適用）');
                loadData();
              } else {
                Alert.alert('エラー', result.error || 'プラン変更に失敗しました');
              }
            },
          },
        ]
      );
    }
  };

  const handleAgeVerificationConfirm = async () => {
    setAgeVerificationModalVisible(false);
    if (pendingPlanId) {
      await executePlanChange(pendingPlanId);
      setPendingPlanId(null);
    }
  };

  const handleAgeVerificationCancel = () => {
    setAgeVerificationModalVisible(false);
    setPendingPlanId(null);
  };

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
              Alert.alert('キャンセル完了', 'プランがキャンセルされました');
              loadData();
            } catch (error) {
              Alert.alert('エラー', 'キャンセルに失敗しました');
            }
          },
        },
      ]
    );
  };

  // 出金申請
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
      loadData();
    } catch (error: any) {
      Alert.alert('エラー', error.message || '出金申請に失敗しました');
    } finally {
      setWithdrawing(false);
    }
  };

  // 出金方法追加
  const handleAddWithdrawalMethod = () => {
    setAddMethodModalVisible(true);
  };

  const handleSubmitMethod = async () => {
    if (methodType === 'bank_transfer') {
      if (!bankName || !branchName || !accountNumber || !accountHolder) {
        Alert.alert('エラー', 'すべての項目を入力してください');
        return;
      }
    } else {
      if (!paypalEmail) {
        Alert.alert('エラー', 'PayPalメールアドレスを入力してください');
        return;
      }
    }

    try {
      await addWithdrawalMethod({
        type: methodType,
        bank_name: methodType === 'bank_transfer' ? bankName : undefined,
        branch_name: methodType === 'bank_transfer' ? branchName : undefined,
        account_type: methodType === 'bank_transfer' ? accountType : undefined,
        account_number: methodType === 'bank_transfer' ? accountNumber : undefined,
        account_holder: methodType === 'bank_transfer' ? accountHolder : undefined,
        paypal_email: methodType === 'paypal' ? paypalEmail : undefined,
        is_default: withdrawalMethods.length === 0,
      });

      Alert.alert('成功', '出金方法を追加しました');
      setAddMethodModalVisible(false);
      // フォームをクリア
      setBankName('');
      setBranchName('');
      setAccountNumber('');
      setAccountHolder('');
      setPaypalEmail('');
      loadData();
    } catch (error) {
      Alert.alert('エラー', '出金方法の追加に失敗しました');
    }
  };

  const handleDeleteMethod = async (methodId: string) => {
    Alert.alert(
      '削除確認',
      'この出金方法を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWithdrawalMethod(methodId);
              Alert.alert('成功', '出金方法を削除しました');
              loadData();
            } catch (error) {
              Alert.alert('エラー', '削除に失敗しました');
            }
          },
        },
      ]
    );
  };

  const handleSetDefaultMethod = async (methodId: string) => {
    try {
      await setDefaultWithdrawalMethod(methodId);
      Alert.alert('成功', 'デフォルト出金方法を設定しました');
      loadData();
    } catch (error) {
      Alert.alert('エラー', '設定に失敗しました');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: () => {
            Alert.alert('ログアウトしました（モック）');
            router.push('/auth');
          },
        },
      ]
    );
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('エラー', 'ユーザー名を入力してください');
      return;
    }

    setSaving(true);
    try {
      await updateUser({
        name: editName.trim(),
        email: editEmail.trim(),
        bio: editBio.trim(),
      });

      // ローカルの状態も更新
      if (user) {
        setUser({
          ...user,
          name: editName.trim(),
          email: editEmail.trim(),
          bio: editBio.trim(),
        });
      }

      Alert.alert('保存完了', 'プロフィール情報を更新しました');
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('エラー', 'プロフィールの更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // モバイル用タブナビゲーション
  const renderMobileTabBar = () => (
    <View style={styles.mobileTabBar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.mobileTabBarContent}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.mobileTab,
              activeTab === tab.key && styles.mobileTabActive,
            ]}
            onPress={() => setActiveTab(tab.key as TabType)}
          >
            <Text
              style={[
                styles.mobileTabText,
                activeTab === tab.key && styles.mobileTabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // デスクトップ用サイドバー
  const renderDesktopSidebar = () => (
    <View style={styles.sidebar}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.sidebarItem, activeTab === tab.key && styles.sidebarItemActive]}
          onPress={() => setActiveTab(tab.key as TabType)}
        >
          <Text style={[styles.sidebarItemText, activeTab === tab.key && styles.sidebarItemTextActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <Header showProfile={false} showSearch={false} />

      {isMobile && renderMobileTabBar()}

      <View style={styles.content}>
        {!isMobile && renderDesktopSidebar()}

        {/* メインコンテンツエリア */}
        <View style={styles.mainContent}>
          {/* プロフィールタブ */}
          {activeTab === 'profile' && user && (
            <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, isMobile && styles.scrollContentMobile]}>
              <Text style={styles.sectionTitle}>プロフィール</Text>

              <View style={styles.profileSection}>
                <Image source={{ uri: user.avatar_url }} style={styles.profileAvatar} />
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{user.name}</Text>
                  <Text style={styles.profileEmail}>{user.email}</Text>
                </View>
              </View>

              <View style={styles.formSection}>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>ユーザー名</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="ユーザー名を入力"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>メールアドレス</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    placeholder="メールアドレスを入力"
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>ID</Text>
                  <View style={styles.fieldValue}>
                    <Text style={styles.fieldValueText}>{user.id}</Text>
                  </View>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>チャンネル説明</Text>
                  <TextInput
                    style={[styles.fieldInput, styles.bioInput]}
                    value={editBio}
                    onChangeText={setEditBio}
                    placeholder="チャンネルの説明を入力"
                    placeholderTextColor={Colors.textSecondary}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingItemInfo}>
                    <Text style={styles.settingItemTitle}>プロフィールを公開</Text>
                    <Text style={styles.settingItemDescription}>
                      オンにすると、他のユーザーがあなたの投稿動画を閲覧できます
                    </Text>
                  </View>
                  <Switch
                    value={publicProfile}
                    onValueChange={setPublicProfile}
                    trackColor={{ false: Colors.border, true: Colors.primary }}
                    thumbColor={Colors.background}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.editButton, saving && styles.editButtonDisabled]}
                  onPress={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={Colors.background} />
                  ) : (
                    <Text style={styles.editButtonText}>保存（モック）</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* 登録チャンネルタブ */}
          {activeTab === 'channels' && (
            <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, isMobile && styles.scrollContentMobile]}>
              <Text style={styles.sectionTitle}>登録チャンネル</Text>
              <FlatList
                data={channels}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.channelCard}>
                    <Image source={{ uri: item.channel_avatar }} style={styles.channelAvatar} />
                    <View style={styles.channelInfo}>
                      <Text style={styles.channelName}>{item.channel_name}</Text>
                      <Text style={styles.channelCount}>
                        {formatSubscriberCount(item.subscriber_count)}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.channelButton}>
                      <Text style={styles.channelButtonText}>登録済み</Text>
                    </TouchableOpacity>
                  </View>
                )}
                scrollEnabled={false}
              />
            </ScrollView>
          )}

          {/* プラン管理タブ */}
          {activeTab === 'plan' && (
            <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, isMobile && styles.scrollContentMobile]}>
              <Text style={styles.sectionTitle}>プラン管理</Text>

              {/* 現在のプランセクション */}
              {plans.find(p => p.is_current) && plans.find(p => p.is_current)!.price > 0 && (
                <View style={styles.currentPlanSection}>
                  <Text style={styles.subsectionTitle}>現在のプラン</Text>
                  <View style={styles.currentPlanCard}>
                    <View style={styles.currentPlanInfo}>
                      <Text style={styles.currentPlanName}>{plans.find(p => p.is_current)!.name}</Text>
                      <Text style={styles.currentPlanPrice}>¥{plans.find(p => p.is_current)!.price.toLocaleString()}/月</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={handleCancelSubscription}
                    >
                      <Text style={styles.cancelButtonText}>プランをキャンセル</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* 利用可能なプラン */}
              <Text style={styles.planSubtitle}>
                あなたに最適なプランをお選びください
              </Text>

              <View style={[styles.plansContainer, isMobile && styles.plansContainerMobile]}>
                {plans.map((plan) => (
                  <View key={plan.id} style={[isMobile && styles.planCardMobile]}>
                    <PlanCard plan={plan} onUpgrade={handlePlanChange} />
                  </View>
                ))}
              </View>

              {/* 請求情報（有料プランのみ） */}
              {plans.find(p => p.is_current)?.price! > 0 && (
                <>
                  <View style={styles.billingInfoSection}>
                    <Text style={styles.subsectionTitle}>請求情報</Text>
                    {paymentMethods.length > 0 && (
                      <View style={styles.paymentMethodCard}>
                        <Text style={styles.paymentMethodLabel}>支払い方法</Text>
                        <Text style={styles.paymentMethodValue}>
                          {paymentMethods[0].brand} •••• {paymentMethods[0].last_four}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* 請求履歴 */}
                  <View style={styles.billingHistorySection}>
                    <Text style={styles.subsectionTitle}>請求履歴</Text>
                    {billingHistory.map((bill) => (
                      <View key={bill.id} style={styles.billingHistoryItem}>
                        <View style={styles.billingHistoryInfo}>
                          <Text style={styles.billingHistoryDate}>
                            {new Date(bill.date).toLocaleDateString('ja-JP')}
                          </Text>
                          <Text style={styles.billingHistoryPlan}>{bill.plan_name}</Text>
                        </View>
                        <Text style={styles.billingHistoryAmount}>¥{bill.amount.toLocaleString()}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
          )}

          {/* 収益管理タブ */}
          {activeTab === 'earnings' && earningsStats && (
            <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, isMobile && styles.scrollContentMobile]}>
              <Text style={styles.sectionTitle}>収益管理</Text>

              {/* 収益サマリー */}
              <View style={styles.earningsSummary}>
                <View style={styles.balanceCard}>
                  <Text style={styles.balanceLabel}>出金可能残高</Text>
                  <Text style={styles.balanceAmount}>¥{earningsStats.available_balance.toLocaleString()}</Text>
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
                    <Text style={styles.statValue}>¥{earningsStats.pending_balance.toLocaleString()}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>今月の収益</Text>
                    <Text style={styles.statValue}>¥{earningsStats.this_month_earnings.toLocaleString()}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>累計出金額</Text>
                    <Text style={styles.statValue}>¥{earningsStats.total_withdrawn.toLocaleString()}</Text>
                  </View>
                </View>
              </View>

              {/* 収益内訳 */}
              <View style={styles.earningsBreakdown}>
                <Text style={styles.subsectionTitle}>収益内訳</Text>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>投げ銭</Text>
                  <Text style={styles.breakdownValue}>¥{earningsStats.breakdown.tips.toLocaleString()}</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>サブスク分配プール</Text>
                  <Text style={styles.breakdownValue}>¥{earningsStats.breakdown.subscription_pool.toLocaleString()}</Text>
                </View>
              </View>

              {/* 出金方法の管理 */}
              <View style={styles.withdrawalMethodsSection}>
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

              {/* 出金履歴 */}
              <View style={styles.withdrawalHistorySection}>
                <Text style={styles.subsectionTitle}>出金履歴</Text>
                {withdrawalHistory.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>出金履歴がありません</Text>
                  </View>
                ) : (
                  withdrawalHistory.map((request) => (
                    <View key={request.id} style={styles.historyCard}>
                      <View style={styles.withdrawalHistoryHeader}>
                        <Text style={styles.historyAmount}>¥{request.amount.toLocaleString()}</Text>
                        <View style={[
                          styles.statusBadge,
                          request.status === 'completed' && styles.statusCompleted,
                          request.status === 'processing' && styles.statusProcessing,
                          request.status === 'pending' && styles.statusPending,
                        ]}>
                          <Text style={styles.statusText}>
                            {request.status === 'completed' && '完了'}
                            {request.status === 'processing' && '処理中'}
                            {request.status === 'pending' && '申請中'}
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
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          )}

          {/* Creationタブ */}
          {activeTab === 'creation' && (
            <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, isMobile && styles.scrollContentMobile]}>
              <Text style={styles.sectionTitle}>Creation Hub</Text>
              <Text style={styles.planSubtitle}>
                コンテンツの作成・管理を行います
              </Text>

              <TouchableOpacity
                style={styles.creationButton}
                onPress={() => router.push('/creation')}
              >
                <View style={styles.creationButtonContent}>
                  <Ionicons name="create" size={24} color={Colors.primary} />
                  <View style={styles.creationButtonText}>
                    <Text style={styles.creationButtonTitle}>Creation Hubを開く</Text>
                    <Text style={styles.creationButtonDescription}>
                      ダッシュボード、コンテンツ管理、アップロード、アナリティクス
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* 通知設定タブ */}
          {activeTab === 'notifications' && (
            <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, isMobile && styles.scrollContentMobile]}>
              <Text style={styles.sectionTitle}>通知設定</Text>

              <View style={styles.settingCard}>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>プッシュ通知</Text>
                    <Text style={styles.settingDescription}>
                      アプリからの通知を受け取る
                    </Text>
                  </View>
                  <Switch value={pushNotifications} onValueChange={setPushNotifications} />
                </View>
              </View>

              <View style={styles.settingCard}>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>メール通知</Text>
                    <Text style={styles.settingDescription}>
                      重要な更新をメールで受け取る
                    </Text>
                  </View>
                  <Switch value={emailNotifications} onValueChange={setEmailNotifications} />
                </View>
              </View>

              <View style={styles.settingCard}>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>新着動画通知</Text>
                    <Text style={styles.settingDescription}>
                      登録チャンネルの新着動画を通知
                    </Text>
                  </View>
                  <Switch value={newVideoNotifications} onValueChange={setNewVideoNotifications} />
                </View>
              </View>
            </ScrollView>
          )}

          {/* 視聴履歴タブ */}
          {activeTab === 'history' && (
            <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, isMobile && styles.scrollContentMobile]}>
              <View style={styles.historyHeader}>
                <Text style={styles.sectionTitle}>視聴履歴</Text>
                <TouchableOpacity
                  style={styles.clearHistoryButton}
                  onPress={() => {
                    Alert.alert(
                      '履歴を削除',
                      'すべての視聴履歴を削除しますか？',
                      [
                        { text: 'キャンセル', style: 'cancel' },
                        {
                          text: '削除',
                          style: 'destructive',
                          onPress: () => {
                            setWatchHistory([]);
                            Alert.alert('履歴を削除しました（モック）');
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Text style={styles.clearHistoryButtonText}>履歴を削除</Text>
                </TouchableOpacity>
              </View>

              {watchHistory.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="time-outline" size={64} color={Colors.textSecondary} />
                  <Text style={styles.emptyStateText}>視聴履歴がありません</Text>
                </View>
              ) : (
                <FlatList
                  data={watchHistory}
                  scrollEnabled={false}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.historyItem}>
                      <Image
                        source={{ uri: item.thumbnail_url }}
                        style={[styles.historyThumbnail, isMobile && styles.historyThumbnailMobile]}
                      />
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyTitle} numberOfLines={2}>
                          {item.video_title}
                        </Text>
                        <View style={styles.historyMetaRow}>
                          <Image source={{ uri: item.user_avatar }} style={styles.historyUserAvatar} />
                          <Text style={styles.historyUserName}>{item.user_name}</Text>
                        </View>
                        <Text style={styles.historyWatchedAt}>
                          {new Date(item.watched_at).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </Text>
                        <View style={styles.progressBarContainer}>
                          <View style={[styles.progressBar, { width: `${item.progress}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{item.progress}% 視聴済み</Text>
                      </View>
                    </View>
                  )}
                />
              )}
            </ScrollView>
          )}

          {/* アカウントタブ */}
          {activeTab === 'account' && (
            <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, isMobile && styles.scrollContentMobile]}>
              <Text style={styles.sectionTitle}>アカウント</Text>

              <View style={styles.settingCard}>
                <TouchableOpacity style={styles.settingButton}>
                  <Text style={styles.settingButtonText}>メールアドレス変更</Text>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.settingCard}>
                <TouchableOpacity style={styles.settingButton}>
                  <Text style={styles.settingButtonText}>パスワード変更</Text>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.dangerZone}>
                <Text style={styles.dangerZoneTitle}>危険な操作</Text>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                  <Ionicons name="log-out-outline" size={20} color={Colors.background} />
                  <Text style={styles.logoutButtonText}>ログアウト</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.deleteButton}>
                  <Ionicons name="trash-outline" size={20} color={Colors.background} />
                  <Text style={styles.deleteButtonText}>アカウント削除</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>

      {/* 出金申請モーダル */}
      <Modal
        visible={withdrawModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setWithdrawModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setWithdrawModalVisible(false)}
        >
          <Pressable style={styles.withdrawModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>出金申請</Text>
              <TouchableOpacity onPress={() => setWithdrawModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceInfoLabel}>出金可能残高</Text>
                <Text style={styles.balanceInfoAmount}>¥{earningsStats?.available_balance.toLocaleString()}</Text>
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>出金額（最低¥5,000）</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                  placeholder="出金額を入力"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>出金方法</Text>
                {withdrawalMethods.map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    style={styles.methodOption}
                    onPress={() => setSelectedMethodId(method.id)}
                  >
                    <View style={styles.radioButton}>
                      {selectedMethodId === method.id && <View style={styles.radioButtonInner} />}
                    </View>
                    <View style={styles.methodOptionInfo}>
                      <Text style={styles.methodOptionName}>
                        {method.type === 'bank_transfer'
                          ? `${method.bank_name} ${method.branch_name}`
                          : method.paypal_email}
                      </Text>
                      <Text style={styles.methodOptionDetails}>
                        {method.type === 'bank_transfer'
                          ? `${method.account_holder} (${method.account_number})`
                          : 'PayPal'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.feeNotice}>※ 手数料¥250が差し引かれます</Text>

              <TouchableOpacity
                style={[styles.submitButton, withdrawing && styles.submitButtonDisabled]}
                onPress={handleSubmitWithdrawal}
                disabled={withdrawing}
              >
                {withdrawing ? (
                  <ActivityIndicator size="small" color={Colors.background} />
                ) : (
                  <Text style={styles.submitButtonText}>出金申請を送信</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 出金方法追加モーダル */}
      <Modal
        visible={addMethodModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAddMethodModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setAddMethodModalVisible(false)}
        >
          <Pressable style={styles.methodModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>出金方法を追加</Text>
              <TouchableOpacity onPress={() => setAddMethodModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.methodTypeSelector}>
                <TouchableOpacity
                  style={[
                    styles.methodTypeButton,
                    methodType === 'bank_transfer' && styles.methodTypeButtonActive,
                  ]}
                  onPress={() => setMethodType('bank_transfer')}
                >
                  <Ionicons
                    name="business"
                    size={24}
                    color={methodType === 'bank_transfer' ? Colors.primary : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.methodTypeText,
                      methodType === 'bank_transfer' && styles.methodTypeTextActive,
                    ]}
                  >
                    銀行振込
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.methodTypeButton,
                    methodType === 'paypal' && styles.methodTypeButtonActive,
                  ]}
                  onPress={() => setMethodType('paypal')}
                >
                  <Ionicons
                    name="logo-paypal"
                    size={24}
                    color={methodType === 'paypal' ? Colors.primary : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.methodTypeText,
                      methodType === 'paypal' && styles.methodTypeTextActive,
                    ]}
                  >
                    PayPal
                  </Text>
                </TouchableOpacity>
              </View>

              {methodType === 'bank_transfer' ? (
                <>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>銀行名</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={bankName}
                      onChangeText={setBankName}
                      placeholder="例: 三菱UFJ銀行"
                      placeholderTextColor={Colors.textSecondary}
                    />
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>支店名</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={branchName}
                      onChangeText={setBranchName}
                      placeholder="例: 渋谷支店"
                      placeholderTextColor={Colors.textSecondary}
                    />
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>口座種別</Text>
                    <View style={styles.accountTypeSelector}>
                      <TouchableOpacity
                        style={[
                          styles.accountTypeButton,
                          accountType === 'checking' && styles.accountTypeButtonActive,
                        ]}
                        onPress={() => setAccountType('checking')}
                      >
                        <Text
                          style={[
                            styles.accountTypeText,
                            accountType === 'checking' && styles.accountTypeTextActive,
                          ]}
                        >
                          普通
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.accountTypeButton,
                          accountType === 'savings' && styles.accountTypeButtonActive,
                        ]}
                        onPress={() => setAccountType('savings')}
                      >
                        <Text
                          style={[
                            styles.accountTypeText,
                            accountType === 'savings' && styles.accountTypeTextActive,
                          ]}
                        >
                          貯蓄
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>口座番号</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={accountNumber}
                      onChangeText={setAccountNumber}
                      placeholder="口座番号"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>口座名義（カナ）</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={accountHolder}
                      onChangeText={setAccountHolder}
                      placeholder="例: ヤマダ タロウ"
                      placeholderTextColor={Colors.textSecondary}
                    />
                  </View>
                </>
              ) : (
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>PayPalメールアドレス</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={paypalEmail}
                    onChangeText={setPaypalEmail}
                    placeholder="example@email.com"
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              )}

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmitMethod}
              >
                <Text style={styles.submitButtonText}>追加</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 年齢確認モーダル */}
      <AgeVerificationModal
        visible={ageVerificationModalVisible}
        onConfirm={handleAgeVerificationConfirm}
        onCancel={handleAgeVerificationCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  // モバイル用タブバー
  mobileTabBar: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  mobileTabBarContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
  },
  mobileTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mobileTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  mobileTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  mobileTabTextActive: {
    color: Colors.background,
    fontWeight: '600',
  },
  // デスクトップ用サイドバー
  sidebar: {
    width: 200,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    backgroundColor: Colors.background,
  },
  sidebarItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  sidebarItemActive: {
    borderLeftColor: Colors.primary,
    backgroundColor: '#F0F0F0',
  },
  sidebarItemText: {
    fontSize: 15,
    color: Colors.text,
  },
  sidebarItemTextActive: {
    fontWeight: '600',
    color: Colors.primary,
  },
  mainContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  scrollContentMobile: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 24,
  },
  planSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 32,
  },
  plansContainer: {
    flexDirection: 'row',
    gap: 24,
    flexWrap: 'wrap',
  },
  plansContainerMobile: {
    flexDirection: 'column',
  },
  planCardMobile: {
    width: '100%',
    marginBottom: 16,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 16,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.border,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  formSection: {
    gap: 20,
  },
  formField: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  fieldValue: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F9F9F9',
  },
  fieldValueText: {
    fontSize: 15,
    color: Colors.text,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  bioInput: {
    minHeight: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  editButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  editButtonDisabled: {
    opacity: 0.6,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  channelAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.border,
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  channelCount: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  channelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 20,
  },
  channelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  uploadContent: {
    padding: 24,
  },
  uploadContentMobile: {
    padding: 16,
  },
  uploadSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  uploadCardsContainer: {
    flexDirection: 'row',
    gap: 24,
    justifyContent: 'center',
  },
  uploadCardsContainerMobile: {
    flexDirection: 'column',
  },
  uploadCard: {
    flex: 1,
    maxWidth: 320,
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  uploadCardMobile: {
    maxWidth: '100%',
    marginBottom: 16,
  },
  uploadCardIconContainer: {
    marginBottom: 20,
  },
  uploadCardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  uploadCardDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  uploadCardFeatures: {
    width: '100%',
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: Colors.text,
  },
  creationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  creationButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  creationButtonText: {
    flex: 1,
  },
  creationButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  creationButtonDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  settingCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingButtonText: {
    fontSize: 16,
    color: Colors.text,
  },
  dangerZone: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  dangerZoneTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginBottom: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D32F2F',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  // 視聴履歴スタイル
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  clearHistoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.border,
    borderRadius: 6,
  },
  clearHistoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  historyItem: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyThumbnail: {
    width: 120,
    height: 90,
    borderRadius: 8,
    backgroundColor: Colors.border,
  },
  historyThumbnailMobile: {
    width: 80,
    height: 60,
  },
  historyInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  historyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyUserAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  historyUserName: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  historyWatchedAt: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
  },
  // プロフィール公開設定スタイル
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  settingItemInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  settingItemDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  // プラン管理スタイル
  currentPlanSection: {
    marginBottom: 32,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  currentPlanCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  currentPlanInfo: {
    flex: 1,
  },
  currentPlanName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  currentPlanPrice: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFE5E5',
    borderRadius: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D32F2F',
  },
  billingInfoSection: {
    marginTop: 32,
    marginBottom: 24,
  },
  paymentMethodCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  paymentMethodLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  paymentMethodValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  billingHistorySection: {
    marginTop: 24,
  },
  billingHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  billingHistoryInfo: {
    flex: 1,
  },
  billingHistoryDate: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  billingHistoryPlan: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  billingHistoryAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  // 収益管理スタイル
  earningsSummary: {
    marginBottom: 32,
  },
  balanceCard: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  withdrawButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  withdrawButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  earningsBreakdown: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 32,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  breakdownLabel: {
    fontSize: 15,
    color: Colors.text,
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  // 出金方法スタイル
  withdrawalMethodsSection: {
    marginBottom: 32,
  },
  subsectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  methodCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  methodInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  methodDetails: {
    flex: 1,
  },
  methodName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  methodAccount: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  defaultBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  methodActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  methodActionText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  // 出金履歴スタイル
  withdrawalHistorySection: {
    marginBottom: 32,
  },
  historyCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  withdrawalHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyAmount: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusCompleted: {
    backgroundColor: '#E8F5E9',
  },
  statusProcessing: {
    backgroundColor: '#FFF3E0',
  },
  statusPending: {
    backgroundColor: '#E3F2FD',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  historyMethod: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  historyFee: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  // モーダルスタイル
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  withdrawModal: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  methodModal: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  modalContent: {
    padding: 20,
  },
  balanceInfo: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  balanceInfoLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  balanceInfoAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  methodOptionInfo: {
    flex: 1,
  },
  methodOptionName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  methodOptionDetails: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  feeNotice: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  methodTypeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  methodTypeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    gap: 8,
  },
  methodTypeButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: '#E3F2FD',
  },
  methodTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  methodTypeTextActive: {
    color: Colors.primary,
  },
  accountTypeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  accountTypeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  accountTypeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  accountTypeText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  accountTypeTextActive: {
    color: Colors.background,
  },
});
