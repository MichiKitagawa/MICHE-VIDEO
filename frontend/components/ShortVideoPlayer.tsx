// ShortVideoPlayer コンポーネント（TikTok/YouTubeショート風）

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, TouchableOpacity, Image } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Short } from '../types';
import { Colors } from '../constants/Colors';

interface ShortVideoPlayerProps {
  short: Short;
  isActive?: boolean;
  onChannelPress?: (userId: string) => void;
}

const TAB_BAR_HEIGHT = 60;
const DESKTOP_MAX_WIDTH = 450; // デスクトップでの縦型動画の最大幅

// いいね数、視聴数を表示用にフォーマット
const formatCount = (count: number): string => {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

export default function ShortVideoPlayer({ short, isActive = false, onChannelPress }: ShortVideoPlayerProps) {
  const { width, height } = useWindowDimensions();
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [liked, setLiked] = useState(false);

  // タブバーを引いた実際の表示可能高さ
  const contentHeight = height - TAB_BAR_HEIGHT;

  // デスクトップ判定
  const isDesktop = width >= 768;

  // 動画コンテナのサイズ
  const containerWidth = isDesktop ? Math.min(DESKTOP_MAX_WIDTH, width) : width;
  const containerHeight = contentHeight;

  // isActiveが変わったときに再生/停止を制御
  useEffect(() => {
    if (isActive) {
      videoRef.current?.playAsync();
    } else {
      videoRef.current?.pauseAsync();
    }
  }, [isActive]);

  // コンポーネントがアンマウントされたら動画を停止してアンロード
  useEffect(() => {
    return () => {
      videoRef.current?.stopAsync();
      videoRef.current?.unloadAsync();
    };
  }, []);

  const togglePlayPause = () => {
    if (status && 'isPlaying' in status) {
      if (status.isPlaying) {
        videoRef.current?.pauseAsync();
      } else {
        videoRef.current?.playAsync();
      }
    }
  };

  const handleAvatarPress = () => {
    if (onChannelPress) {
      onChannelPress(short.user_id);
    }
  };

  return (
    <View style={[styles.container, { width, height: containerHeight }]}>
      {/* 動画プレーヤーのラッパー（デスクトップで中央配置） */}
      <View style={[styles.videoWrapper, isDesktop && styles.videoWrapperDesktop]}>
        <TouchableOpacity
          style={[styles.videoContainer, { width: containerWidth, height: containerHeight }]}
          activeOpacity={1}
          onPress={togglePlayPause}
        >
          <Video
            ref={videoRef}
            source={{ uri: short.video_url }}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
            isLooping
            onPlaybackStatusUpdate={(status) => setStatus(status)}
          />
        </TouchableOpacity>

        {/* 右側アクションボタン */}
        <View style={[styles.actionsContainer, isDesktop && { right: (width - containerWidth) / 2 + 12 }]}>
          {/* 投稿者アバター */}
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleAvatarPress}
            activeOpacity={0.7}
          >
            <Image source={{ uri: short.user_avatar }} style={styles.avatar} />
          </TouchableOpacity>

          {/* いいね */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setLiked(!liked)}
          >
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={32}
              color={liked ? '#FF0050' : Colors.background}
            />
            <Text style={styles.actionText}>{formatCount(short.like_count)}</Text>
          </TouchableOpacity>

          {/* コメント */}
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={32} color={Colors.background} />
            <Text style={styles.actionText}>{formatCount(short.comment_count)}</Text>
          </TouchableOpacity>

          {/* シェア */}
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="arrow-redo-outline" size={32} color={Colors.background} />
            <Text style={styles.actionText}>シェア</Text>
          </TouchableOpacity>

          {/* メニュー */}
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="ellipsis-vertical" size={28} color={Colors.background} />
          </TouchableOpacity>
        </View>

        {/* 下部情報エリア */}
        <View style={[
          styles.infoContainer,
          isDesktop && { left: (width - containerWidth) / 2 + 12 }
        ]}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>@{short.user_name}</Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {short.title}
          </Text>
          <View style={styles.metaInfo}>
            <Text style={styles.metaText}>
              {formatCount(short.view_count)}回視聴
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.text,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  videoWrapperDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  actionsContainer: {
    position: 'absolute',
    right: 12,
    bottom: 100,
    alignItems: 'center',
    gap: 24,
  },
  avatarContainer: {
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  infoContainer: {
    position: 'absolute',
    left: 12,
    right: 80,
    bottom: 100,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  title: {
    color: Colors.background,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: Colors.background,
    fontSize: 13,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
