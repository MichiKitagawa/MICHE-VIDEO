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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import PlanCard from '../../components/PlanCard';
import { Colors } from '../../constants/Colors';
import { getUser, getSubscribedChannels, getSubscriptionPlans, upgradePlan, getWatchHistory } from '../../utils/mockApi';
import { User, SubscribedChannel, SubscriptionPlan, WatchHistory } from '../../types';

type TabType = 'profile' | 'channels' | 'plan' | 'creation' | 'notifications' | 'history' | 'account';

const TABS = [
  { key: 'profile', label: 'プロフィール' },
  { key: 'channels', label: '登録チャンネル' },
  { key: 'plan', label: 'プラン管理' },
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

  // 通知設定
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [newVideoNotifications, setNewVideoNotifications] = useState(true);

  // プロフィール設定
  const [publicProfile, setPublicProfile] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const userData = await getUser();
    const channelsData = await getSubscribedChannels();
    const plansData = await getSubscriptionPlans();
    const historyData = await getWatchHistory();
    setUser(userData);
    setChannels(channelsData);
    setPlans(plansData);
    setWatchHistory(historyData);
  };

  const formatSubscriberCount = (count: number): string => {
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}万人`;
    }
    return `${count}人`;
  };

  const handleUpgradePlan = async (planId: string) => {
    Alert.alert(
      'プランアップグレード',
      'このプランにアップグレードしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'アップグレード',
          onPress: async () => {
            await upgradePlan(planId);
            Alert.alert('成功', 'プランがアップグレードされました（モック）');
            loadData();
          },
        },
      ]
    );
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
                  <View style={styles.fieldValue}>
                    <Text style={styles.fieldValueText}>{user.name}</Text>
                  </View>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>メールアドレス</Text>
                  <View style={styles.fieldValue}>
                    <Text style={styles.fieldValueText}>{user.email}</Text>
                  </View>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>ID</Text>
                  <View style={styles.fieldValue}>
                    <Text style={styles.fieldValueText}>{user.id}</Text>
                  </View>
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

                <TouchableOpacity style={styles.editButton}>
                  <Text style={styles.editButtonText}>編集（モック）</Text>
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
              <Text style={styles.planSubtitle}>
                あなたに最適なプランをお選びください
              </Text>

              <View style={[styles.plansContainer, isMobile && styles.plansContainerMobile]}>
                {plans.map((plan) => (
                  <View key={plan.id} style={[isMobile && styles.planCardMobile]}>
                    <PlanCard plan={plan} onUpgrade={handleUpgradePlan} />
                  </View>
                ))}
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
  editButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
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
});
