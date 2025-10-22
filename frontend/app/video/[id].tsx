// 動画視聴ページ

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import VideoPlayer from '../../components/VideoPlayer';
import { VideoDetail } from '../../types';
import { getVideoDetail } from '../../utils/mockApi';
import { Colors } from '../../constants/Colors';

export default function VideoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  useEffect(() => {
    loadVideo();
  }, [id]);

  const loadVideo = async () => {
    try {
      const data = await getVideoDetail(id);
      setVideo(data);
    } catch (error) {
      console.error('Failed to load video:', error);
    } finally {
      setLoading(false);
    }
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
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!video) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>動画が見つかりません</Text>
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
      {/* トップバー */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="chevron-back" size={28} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* 動画プレーヤー */}
        <VideoPlayer videoUrl={video.video_url} />

        {/* 動画情報 */}
        <View style={styles.infoSection}>
          {/* タイトル */}
          <Text style={styles.title}>{video.title}</Text>

          {/* 視聴数・日付 */}
          <Text style={styles.meta}>
            {formatViewCount(video.view_count)}視聴 • {formatDate(video.created_at)}
          </Text>
        </View>

        {/* チャンネル情報 */}
        <View style={styles.channelSection}>
          <Image
            source={{ uri: video.user_avatar }}
            style={styles.avatar}
          />
          <View style={styles.channelInfo}>
            <Text style={styles.channelName}>{video.user_name}</Text>
          </View>
        </View>

        {/* アクションボタン（後回し） */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="thumbs-up-outline" size={20} color={Colors.text} />
            <Text style={styles.actionText}>いいね</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="thumbs-down-outline" size={20} color={Colors.text} />
            <Text style={styles.actionText}>低評価</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share-outline" size={20} color={Colors.text} />
            <Text style={styles.actionText}>シェア</Text>
          </TouchableOpacity>
        </View>

        {/* 説明文 */}
        <TouchableOpacity
          style={styles.descriptionSection}
          onPress={() => setDescriptionExpanded(!descriptionExpanded)}
        >
          <Text
            style={styles.description}
            numberOfLines={descriptionExpanded ? undefined : 3}
          >
            {video.description}
          </Text>
          <Text style={styles.expandText}>
            {descriptionExpanded ? '閉じる' : 'もっと見る'}
          </Text>
        </TouchableOpacity>

        {/* IP情報 */}
        {video.ip_license && (
          <View style={styles.ipSection}>
            <Text style={styles.ipSectionTitle}>使用IP</Text>
            <View style={styles.ipCard}>
              <Image
                source={{ uri: video.ip_license.thumbnail }}
                style={styles.ipThumbnail}
              />
              <View style={styles.ipInfo}>
                <Text style={styles.ipName}>{video.ip_license.name}</Text>
                <Text style={styles.ipLicense}>
                  {video.ip_license.license_type}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backIcon: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
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
  infoSection: {
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 24,
    marginBottom: 8,
  },
  meta: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  channelSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.border,
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  actionsSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  actionText: {
    fontSize: 13,
    color: Colors.text,
  },
  descriptionSection: {
    padding: 16,
  },
  description: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  expandText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  ipSection: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  ipSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  ipCard: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    gap: 12,
  },
  ipThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: Colors.border,
  },
  ipInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  ipName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  ipLicense: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
