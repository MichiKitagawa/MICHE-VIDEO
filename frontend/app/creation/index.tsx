// Creation Hub メインページ（左タブレイアウト）

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import DashboardContent from '../../components/creation/DashboardContent';
import ContentsContent from '../../components/creation/ContentsContent';
import UploadContent from '../../components/creation/UploadContent';
import AnalyticsContent from '../../components/creation/AnalyticsContent';

type CreationTab = 'dashboard' | 'contents' | 'upload' | 'analytics';

const TABS = [
  { key: 'dashboard', label: 'ダッシュボード', icon: 'stats-chart' },
  { key: 'contents', label: 'コンテンツ', icon: 'folder-open' },
  { key: 'upload', label: 'アップロード', icon: 'cloud-upload' },
  { key: 'analytics', label: 'アナリティクス', icon: 'analytics' },
] as const;

export default function CreationScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<CreationTab>('dashboard');
  const isMobile = width < 768;

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Creation Hub</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* メインコンテンツ */}
      <View style={styles.mainContent}>
        {/* 左側タブ（デスクトップ） */}
        {!isMobile && (
          <View style={styles.sidebar}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.sidebarTab, activeTab === tab.key && styles.sidebarTabActive]}
                  onPress={() => setActiveTab(tab.key as CreationTab)}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={20}
                    color={activeTab === tab.key ? Colors.primary : Colors.textSecondary}
                  />
                  <Text style={[styles.sidebarTabText, activeTab === tab.key && styles.sidebarTabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 上部タブ（モバイル） */}
        {isMobile && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.mobileTabsContainer}
            contentContainerStyle={styles.mobileTabsContent}
          >
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.mobileTab, activeTab === tab.key && styles.mobileTabActive]}
                onPress={() => setActiveTab(tab.key as CreationTab)}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={20}
                  color={activeTab === tab.key ? Colors.primary : Colors.textSecondary}
                />
                <Text style={[styles.mobileTabText, activeTab === tab.key && styles.mobileTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* コンテンツエリア */}
        <View style={styles.content}>
          {activeTab === 'dashboard' && <DashboardContent />}
          {activeTab === 'contents' && <ContentsContent />}
          {activeTab === 'upload' && <UploadContent />}
          {activeTab === 'analytics' && <AnalyticsContent />}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  // デスクトップ：左側タブ
  sidebar: {
    width: 200,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    backgroundColor: Colors.background,
  },
  sidebarTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  sidebarTabActive: {
    backgroundColor: Colors.primary + '10',
    borderLeftColor: Colors.primary,
  },
  sidebarTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  sidebarTabTextActive: {
    color: Colors.primary,
  },
  // モバイル：上部タブ
  mobileTabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  mobileTabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  mobileTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  mobileTabActive: {
    borderBottomColor: Colors.primary,
  },
  mobileTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  mobileTabTextActive: {
    color: Colors.primary,
  },
  content: {
    flex: 1,
  },
});
