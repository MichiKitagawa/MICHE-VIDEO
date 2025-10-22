// VideoCard コンポーネント（YouTubeライク）

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from '../types';
import { Colors } from '../constants/Colors';
import { canShowAdultContent } from '../constants/Platform';

interface VideoCardProps {
  video: Video;
  onPress: () => void;
  onChannelPress?: (userId: string) => void;
  layout?: 'list' | 'grid'; // レイアウトモード
}

// 視聴数を表示用にフォーマット
const formatViewCount = (count: number): string => {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万回`;
  }
  return `${count}回`;
};

// 日時を相対表示（例：2日前）
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '1日前';
  if (diffDays < 7) return `${diffDays}日前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}ヶ月前`;
  return `${Math.floor(diffDays / 365)}年前`;
};

// 再生時間をフォーマット（秒 → MM:SS or HH:MM:SS）
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export default function VideoCard({ video, onPress, onChannelPress, layout = 'list' }: VideoCardProps) {
  const handleAvatarPress = (e: any) => {
    e.stopPropagation();
    if (onChannelPress) {
      onChannelPress(video.user_id);
    }
  };
  if (layout === 'grid') {
    // グリッドレイアウト
    return (
      <TouchableOpacity style={styles.gridContainer} onPress={onPress} activeOpacity={0.7}>
        {/* サムネイル */}
        <View style={styles.gridThumbnailContainer}>
          <Image source={{ uri: video.thumbnail_url }} style={styles.gridThumbnail} />
          {/* 再生時間オーバーレイ */}
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuration(video.duration)}</Text>
          </View>
        </View>

        {/* 動画情報 */}
        <View style={styles.gridInfoContainer}>
          {/* ユーザーアバター */}
          <TouchableOpacity onPress={handleAvatarPress}>
            <Image source={{ uri: video.user_avatar }} style={styles.gridAvatar} />
          </TouchableOpacity>

          <View style={styles.gridTextContainer}>
            {/* タイトル */}
            <Text style={styles.gridTitle} numberOfLines={2}>
              {video.title}
            </Text>

            {/* チャンネル名 */}
            <Text style={styles.gridMeta} numberOfLines={1}>
              {video.user_name}
            </Text>

            {/* 視聴数・日時 */}
            <Text style={styles.gridMeta}>
              {formatViewCount(video.view_count)}視聴 • {formatRelativeTime(video.created_at)}
            </Text>

            {/* 成人向けバッジ */}
            {video.is_adult && canShowAdultContent && (
              <View style={styles.adultBadge}>
                <Text style={styles.adultBadgeText}>18+</Text>
              </View>
            )}
          </View>

          {/* メニューアイコン */}
          <TouchableOpacity
            style={styles.gridMenuButton}
            onPress={(e) => {
              e.stopPropagation();
            }}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  // リストレイアウト（従来のデザイン）
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.contentContainer}>
        {/* サムネイル */}
        <View style={styles.thumbnailContainer}>
          <Image source={{ uri: video.thumbnail_url }} style={styles.thumbnail} />
          {/* 再生時間オーバーレイ */}
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuration(video.duration)}</Text>
          </View>
        </View>

        {/* 動画情報 */}
        <View style={styles.infoContainer}>
          {/* タイトル */}
          <Text style={styles.title} numberOfLines={2}>
            {video.title}
          </Text>

          {/* チャンネル名・視聴数・日時 */}
          <View style={styles.metaContainer}>
            <Text style={styles.meta}>
              {video.user_name} • {formatViewCount(video.view_count)}視聴 •{' '}
              {formatRelativeTime(video.created_at)}
            </Text>
          </View>

          {/* 成人向けバッジ（web版のみ） */}
          {video.is_adult && canShowAdultContent && (
            <View style={styles.adultBadge}>
              <Text style={styles.adultBadgeText}>18+</Text>
            </View>
          )}
        </View>

        {/* メニューアイコン */}
        <TouchableOpacity style={styles.menuButton} onPress={(e) => e.stopPropagation()}>
          <Ionicons name="ellipsis-vertical" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // リストレイアウトスタイル
  container: {
    backgroundColor: Colors.background,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  contentContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: 168,
    height: 94,
    borderRadius: 8,
    backgroundColor: Colors.border,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meta: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  menuButton: {
    padding: 4,
  },

  // グリッドレイアウトスタイル
  gridContainer: {
    backgroundColor: Colors.background,
    marginBottom: 24,
  },
  gridThumbnailContainer: {
    position: 'relative',
    width: '100%',
  },
  gridThumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    backgroundColor: Colors.border,
  },
  gridInfoContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  gridAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.border,
  },
  gridTextContainer: {
    flex: 1,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  gridMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  gridMenuButton: {
    padding: 4,
  },

  // 共通スタイル
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  adultBadge: {
    marginTop: 4,
    alignSelf: 'flex-start',
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
});
