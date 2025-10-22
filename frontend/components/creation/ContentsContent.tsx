// コンテンツ管理（動画・ショート一覧、編集・削除）

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { getUserVideos, getUserShorts, deleteVideo, deleteShort } from '../../utils/mockApi';
import { Video, Short } from '../../types';

type ContentTab = 'videos' | 'shorts';

export default function ContentsContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ContentTab>('videos');
  const [videos, setVideos] = useState<Video[]>([]);
  const [shorts, setShorts] = useState<Short[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      console.error('Failed to load content data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: string, type: 'video' | 'short') => {
    if (type === 'video') {
      router.push(`/creation/video/${id}/edit` as any);
    } else {
      router.push(`/creation/short/${id}/edit` as any);
    }
  };

  const handleDelete = (id: string, title: string, type: 'video' | 'short') => {
    Alert.alert(
      '削除確認',
      `「${title}」を削除しますか？この操作は取り消せません。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(id);
            try {
              if (type === 'video') {
                await deleteVideo(id);
                setVideos(videos.filter(v => v.id !== id));
                Alert.alert('削除完了', '動画を削除しました');
              } else {
                await deleteShort(id);
                setShorts(shorts.filter(s => s.id !== id));
                Alert.alert('削除完了', 'ショートを削除しました');
              }
            } catch (error) {
              Alert.alert('エラー', '削除に失敗しました');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const formatNumber = (num: number): string => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`;
    }
    return num.toString();
  };

  const renderContentList = () => {
    const contents = activeTab === 'videos' ? videos : shorts;
    const type = activeTab === 'videos' ? 'video' : 'short';

    if (contents.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons
            name={activeTab === 'videos' ? 'videocam-outline' : 'phone-portrait-outline'}
            size={64}
            color={Colors.textSecondary}
          />
          <Text style={styles.emptyStateText}>
            {activeTab === 'videos' ? '動画がありません' : 'ショートがありません'}
          </Text>
          <Text style={styles.emptyStateDescription}>
            アップロードタブから新しいコンテンツを投稿しましょう
          </Text>
        </View>
      );
    }

    return contents.map((item) => {
      const isDeleting = deletingId === item.id;
      return (
        <View key={item.id} style={styles.contentCard}>
          <Image source={{ uri: item.thumbnail_url }} style={styles.thumbnail} />
          <View style={styles.contentInfo}>
            <Text style={styles.contentTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Ionicons name="eye" size={14} color={Colors.textSecondary} />
                <Text style={styles.statText}>{formatNumber(item.view_count)}</Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="heart" size={14} color={Colors.textSecondary} />
                <Text style={styles.statText}>{formatNumber(('like_count' in item ? item.like_count : 0) || 0)}</Text>
              </View>
              {item.is_adult && (
                <View style={styles.adultBadge}>
                  <Text style={styles.adultBadgeText}>18+</Text>
                </View>
              )}
            </View>
            <Text style={styles.category}>{'category' in item ? item.category : ''}</Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEdit(item.id, type)}
              disabled={isDeleting}
            >
              <Ionicons name="create-outline" size={20} color={Colors.primary} />
              <Text style={styles.actionButtonText}>編集</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDelete(item.id, item.title, type)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#D32F2F" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={20} color="#D32F2F" />
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>削除</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      );
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>コンテンツ</Text>
        <Text style={styles.subtitle}>アップロードした動画・ショートの管理</Text>
      </View>

      {/* タブ */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'videos' && styles.tabActive]}
          onPress={() => setActiveTab('videos')}
        >
          <Ionicons
            name={activeTab === 'videos' ? 'videocam' : 'videocam-outline'}
            size={20}
            color={activeTab === 'videos' ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'videos' && styles.tabTextActive]}>
            動画 ({videos.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'shorts' && styles.tabActive]}
          onPress={() => setActiveTab('shorts')}
        >
          <Ionicons
            name={activeTab === 'shorts' ? 'phone-portrait' : 'phone-portrait-outline'}
            size={20}
            color={activeTab === 'shorts' ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'shorts' && styles.tabTextActive]}>
            ショート ({shorts.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* コンテンツリスト */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {renderContentList()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
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
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 24,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  contentCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  thumbnail: {
    width: 160,
    height: 90,
    borderRadius: 8,
    backgroundColor: Colors.border,
  },
  contentInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'space-between',
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  category: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  adultBadge: {
    backgroundColor: Colors.adult,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adultBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.background,
  },
  actions: {
    justifyContent: 'center',
    gap: 8,
    marginLeft: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  deleteButton: {
    borderColor: '#D32F2F',
  },
  deleteButtonText: {
    color: '#D32F2F',
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
