// プレイリスト詳細ページ

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PlaylistDetail, Video } from '../../types';
import { getPlaylistDetail, removeVideoFromPlaylist, deletePlaylist } from '../../utils/mockApi';
import { Colors } from '../../constants/Colors';

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlaylist();
  }, [id]);

  const loadPlaylist = async () => {
    try {
      const data = await getPlaylistDetail(id);
      setPlaylist(data);
    } catch (error) {
      console.error('Failed to load playlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAll = () => {
    if (!playlist || playlist.videos.length === 0) {
      Alert.alert('エラー', '再生できる動画がありません');
      return;
    }
    // 最初の動画を再生
    router.push(`/video/${playlist.videos[0].id}` as any);
  };

  const handleRemoveVideo = async (videoId: string) => {
    Alert.alert(
      '動画を削除',
      'このプレイリストから動画を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeVideoFromPlaylist(id, videoId);
              // UIを更新
              if (playlist) {
                const updatedVideos = playlist.videos.filter(v => v.id !== videoId);
                setPlaylist({
                  ...playlist,
                  videos: updatedVideos,
                  video_count: updatedVideos.length,
                });
              }
              Alert.alert('完了', '動画を削除しました');
            } catch (error) {
              Alert.alert('エラー', '動画の削除に失敗しました');
            }
          },
        },
      ]
    );
  };

  const handleDeletePlaylist = async () => {
    Alert.alert(
      'プレイリストを削除',
      'このプレイリストを完全に削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePlaylist(id);
              Alert.alert('完了', 'プレイリストを削除しました', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error) {
              Alert.alert('エラー', 'プレイリストの削除に失敗しました');
            }
          },
        },
      ]
    );
  };

  const formatViewCount = (count: number): string => {
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}万回`;
    }
    return `${count}回`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderVideoItem = ({ item, index }: { item: Video; index: number }) => (
    <TouchableOpacity
      style={styles.videoCard}
      onPress={() => router.push(`/video/${item.id}` as any)}
    >
      <View style={styles.videoIndex}>
        <Text style={styles.videoIndexText}>{index + 1}</Text>
      </View>
      <Image
        source={{ uri: item.thumbnail_url }}
        style={styles.videoThumbnail}
      />
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.videoChannel}>{item.user_name}</Text>
        <Text style={styles.videoMeta}>
          {formatViewCount(item.view_count)}視聴
        </Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveVideo(item.id)}
      >
        <Ionicons name="close-circle" size={24} color={Colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!playlist) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>プレイリストが見つかりません</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
          <Ionicons name="chevron-back" size={28} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>プレイリスト</Text>
        <TouchableOpacity
          style={styles.headerDeleteButton}
          onPress={handleDeletePlaylist}
        >
          <Ionicons name="trash-outline" size={24} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* プレイリスト情報 */}
        <View style={styles.playlistHeader}>
          <Image
            source={{ uri: playlist.thumbnail_url || 'https://picsum.photos/400/225' }}
            style={styles.playlistThumbnail}
          />
          <View style={styles.playlistHeaderInfo}>
            <View style={styles.playlistTitleRow}>
              <Text style={styles.playlistName}>{playlist.name}</Text>
              {!playlist.is_public && (
                <Ionicons name="lock-closed" size={20} color={Colors.textSecondary} />
              )}
            </View>
            {playlist.description && (
              <Text style={styles.playlistDescription}>{playlist.description}</Text>
            )}
            <Text style={styles.playlistStats}>
              {playlist.video_count}本の動画 • 更新: {formatDate(playlist.updated_at)}
            </Text>
          </View>
        </View>

        {/* アクションボタン */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.actionButton, styles.playAllButton]}
            onPress={handlePlayAll}
            disabled={playlist.videos.length === 0}
          >
            <Ionicons name="play" size={20} color={Colors.background} />
            <Text style={styles.playAllButtonText}>すべて再生</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="shuffle" size={20} color={Colors.primary} />
            <Text style={styles.actionButtonText}>シャッフル</Text>
          </TouchableOpacity>
        </View>

        {/* 動画一覧 */}
        <View style={styles.videosSection}>
          <Text style={styles.sectionTitle}>動画一覧</Text>
          {playlist.videos.length === 0 ? (
            <View style={styles.emptyVideos}>
              <Ionicons name="videocam-off-outline" size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyVideosText}>動画がありません</Text>
            </View>
          ) : (
            playlist.videos.map((video, index) => (
              <View key={video.id}>
                {renderVideoItem({ item: video, index })}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBackButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  headerDeleteButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  playlistHeader: {
    padding: 16,
  },
  playlistThumbnail: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: Colors.border,
    marginBottom: 16,
  },
  playlistHeaderInfo: {
    gap: 8,
  },
  playlistTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playlistName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  playlistDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  playlistStats: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  actionsSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  playAllButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  playAllButtonText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: '600',
  },
  actionButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  videosSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  videoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  videoIndex: {
    width: 28,
    alignItems: 'center',
  },
  videoIndexText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  videoThumbnail: {
    width: 120,
    height: 68,
    borderRadius: 8,
    backgroundColor: Colors.border,
  },
  videoInfo: {
    flex: 1,
    gap: 4,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 18,
  },
  videoChannel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  videoMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  removeButton: {
    padding: 4,
  },
  emptyVideos: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyVideosText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 12,
  },
});
