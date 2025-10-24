// 保存済みコンテンツタブ

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Video, Short } from '../../types';
import { getSavedContents, removeSavedContent } from '../../utils/mockApi';

export default function SavedContentsTab() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [shorts, setShorts] = useState<Short[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSavedContents();
  }, []);

  const loadSavedContents = async () => {
    setLoading(true);
    try {
      const data = await getSavedContents();
      setVideos(data.videos);
      setShorts(data.shorts);
    } catch (error) {
      console.error('Failed to load saved contents:', error);
      Alert.alert('エラー', '保存済みコンテンツの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (contentId: string, contentType: 'video' | 'short') => {
    Alert.alert(
      '削除確認',
      '保存リストから削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeSavedContent(contentId, contentType);
              if (contentType === 'video') {
                setVideos(videos.filter(v => v.id !== contentId));
              } else {
                setShorts(shorts.filter(s => s.id !== contentId));
              }
              Alert.alert('成功', '保存リストから削除しました');
            } catch (error) {
              console.error('Failed to remove saved content:', error);
              Alert.alert('エラー', '削除に失敗しました');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  const hasContent = videos.length > 0 || shorts.length > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>保存済みコンテンツ</Text>

      {!hasContent ? (
        <View style={styles.emptyState}>
          <Ionicons name="bookmark-outline" size={64} color={Colors.textSecondary} />
          <Text style={styles.emptyStateText}>保存したコンテンツはありません</Text>
        </View>
      ) : (
        <>
          {/* 保存した動画セクション */}
          {videos.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.subsectionTitle}>動画 ({videos.length})</Text>
              {videos.map((video) => (
                <View key={video.id} style={styles.contentCard}>
                  <TouchableOpacity
                    style={styles.contentMain}
                    onPress={() => router.push(`/video/${video.id}` as any)}
                  >
                    <Image
                      source={{ uri: video.thumbnail_url }}
                      style={styles.thumbnail}
                    />
                    <View style={styles.contentInfo}>
                      <Text style={styles.contentTitle} numberOfLines={2}>
                        {video.title}
                      </Text>
                      <View style={styles.creatorRow}>
                        <Image
                          source={{ uri: video.user_avatar }}
                          style={styles.creatorAvatar}
                        />
                        <Text style={styles.creatorName}>{video.user_name}</Text>
                      </View>
                      <Text style={styles.viewCount}>
                        {video.view_count.toLocaleString()}回視聴
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemove(video.id, 'video')}
                  >
                    <Ionicons name="close-circle" size={24} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* 保存したShortsセクション */}
          {shorts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.subsectionTitle}>Shorts ({shorts.length})</Text>
              {shorts.map((short) => (
                <View key={short.id} style={styles.contentCard}>
                  <TouchableOpacity
                    style={styles.contentMain}
                    onPress={() => router.push(`/shorts?id=${short.id}` as any)}
                  >
                    <Image
                      source={{ uri: short.thumbnail_url }}
                      style={styles.shortThumbnail}
                    />
                    <View style={styles.contentInfo}>
                      <Text style={styles.contentTitle} numberOfLines={2}>
                        {short.title}
                      </Text>
                      <View style={styles.creatorRow}>
                        <Image
                          source={{ uri: short.user_avatar }}
                          style={styles.creatorAvatar}
                        />
                        <Text style={styles.creatorName}>{short.user_name}</Text>
                      </View>
                      <Text style={styles.viewCount}>
                        {short.view_count.toLocaleString()}回視聴
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemove(short.id, 'short')}
                  >
                    <Ionicons name="close-circle" size={24} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </>
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
    padding: 20,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 24,
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
  section: {
    marginBottom: 32,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  contentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contentMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 120,
    height: 90,
    borderRadius: 8,
    backgroundColor: Colors.border,
  },
  shortThumbnail: {
    width: 60,
    height: 90,
    borderRadius: 8,
    backgroundColor: Colors.border,
  },
  contentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  creatorAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
    backgroundColor: Colors.border,
  },
  creatorName: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  viewCount: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  removeButton: {
    padding: 8,
  },
});
