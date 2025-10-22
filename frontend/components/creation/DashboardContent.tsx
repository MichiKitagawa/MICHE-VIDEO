// ダッシュボードコンテンツ（統計サマリー）

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, useWindowDimensions, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { getUserVideos, getUserShorts } from '../../utils/mockApi';
import { Video, Short } from '../../types';

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={32} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function DashboardContent() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [shorts, setShorts] = useState<Short[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [videosData, shortsData] = await Promise.all([
        getUserVideos(),
        getUserShorts(),
      ]);
      setVideos(videosData);
      setShorts(shortsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 統計情報を計算
  const totalViews = videos.reduce((sum, v) => sum + v.view_count, 0) +
                     shorts.reduce((sum, s) => sum + s.view_count, 0);
  const totalLikes = videos.reduce((sum, v) => sum + (v.like_count || 0), 0) +
                     shorts.reduce((sum, s) => sum + s.like_count, 0);
  const videoCount = videos.length;
  const shortCount = shorts.length;

  // 数値を表示用にフォーマット
  const formatNumber = (num: number): string => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`;
    }
    return num.toString();
  };

  // 最近のコンテンツ（動画とショートを合わせて最新3つ）
  const allContent = [...videos, ...shorts].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 3);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>ダッシュボード</Text>
      <Text style={styles.subtitle}>あなたのコンテンツの統計サマリー</Text>

      {/* 統計カード */}
      <View style={[styles.statsGrid, isMobile && styles.statsGridMobile]}>
        <StatCard
          icon="eye"
          label="総再生回数"
          value={formatNumber(totalViews)}
          color={Colors.primary}
        />
        <StatCard
          icon="heart"
          label="総いいね数"
          value={formatNumber(totalLikes)}
          color="#FF0050"
        />
        <StatCard
          icon="videocam"
          label="動画数"
          value={videoCount.toString()}
          color="#00C853"
        />
        <StatCard
          icon="phone-portrait"
          label="ショート数"
          value={shortCount.toString()}
          color="#FF6B00"
        />
      </View>

      {/* 最近のアップロード */}
      {allContent.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>最近のアップロード</Text>
          {allContent.map((item) => {
            const isVideo = 'duration' in item && item.duration > 60;
            return (
              <View key={item.id} style={styles.contentItem}>
                <Image
                  source={{ uri: item.thumbnail_url }}
                  style={styles.contentThumbnail}
                />
                <View style={styles.contentInfo}>
                  <Text style={styles.contentTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View style={styles.contentMeta}>
                    <Ionicons
                      name={isVideo ? 'videocam' : 'phone-portrait'}
                      size={14}
                      color={Colors.textSecondary}
                    />
                    <Text style={styles.contentMetaText}>
                      {formatNumber(item.view_count)}回視聴
                    </Text>
                    <Text style={styles.contentMetaText}>•</Text>
                    <Text style={styles.contentMetaText}>
                      {formatNumber(('like_count' in item ? item.like_count : 0) || 0)}いいね
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* コンテンツがない場合 */}
      {allContent.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-upload-outline" size={64} color={Colors.textSecondary} />
          <Text style={styles.emptyStateText}>まだコンテンツがアップロードされていません</Text>
          <Text style={styles.emptyStateDescription}>
            最初の動画やショートをアップロードしてみましょう！
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32,
  },
  statsGridMobile: {
    flexDirection: 'column',
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  contentItem: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contentThumbnail: {
    width: 120,
    height: 68,
    borderRadius: 6,
    backgroundColor: Colors.border,
  },
  contentInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  contentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  contentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contentMetaText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
