// チャンネルページ

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import VideoCard from '../../components/VideoCard';
import { ChannelDetail } from '../../types';
import { getChannelDetail } from '../../utils/mockApi';
import { Colors } from '../../constants/Colors';

export default function ChannelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [channel, setChannel] = useState<ChannelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [activeTab, setActiveTab] = useState<'videos' | 'shorts'>('videos');

  const isMobile = width < 768;

  useEffect(() => {
    loadChannel();
  }, [id]);

  const loadChannel = async () => {
    try {
      const data = await getChannelDetail(id);
      setChannel(data);
    } catch (error) {
      console.error('Failed to load channel:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = () => {
    setSubscribed(!subscribed);
  };

  const handleVideoPress = (videoId: string) => {
    router.push(`/video/${videoId}`);
  };

  const formatSubscriberCount = (count: number): string => {
    if (count >= 10000) return `${(count / 10000).toFixed(1)}万人`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K人`;
    return `${count}人`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!channel) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>チャンネルが見つかりません</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {channel.name}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* バナー画像 */}
        {channel.banner_url && (
          <Image
            source={{ uri: channel.banner_url }}
            style={styles.banner}
            resizeMode="cover"
          />
        )}

        {/* チャンネル情報 */}
        <View style={[styles.channelInfo, isMobile && styles.channelInfoMobile]}>
          <View style={styles.avatarRow}>
            <Image source={{ uri: channel.avatar_url }} style={styles.avatar} />
            <View style={styles.channelMeta}>
              <View style={styles.channelNameRow}>
                <Text style={styles.channelName}>{channel.name}</Text>
                {channel.is_verified && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                )}
              </View>
              <Text style={styles.subscriberCount}>
                登録者 {formatSubscriberCount(channel.subscriber_count)}
              </Text>
              <Text style={styles.videoCount}>{channel.video_count}本の動画</Text>
            </View>
          </View>

          {/* 説明文 */}
          <Text style={styles.description}>{channel.description}</Text>

          {/* 登録ボタン */}
          <TouchableOpacity
            style={[styles.subscribeButton, subscribed && styles.subscribedButton]}
            onPress={handleSubscribe}
          >
            <Text style={[styles.subscribeButtonText, subscribed && styles.subscribedButtonText]}>
              {subscribed ? '登録済み' : 'チャンネル登録'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* タブ切り替え */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'videos' && styles.tabActive]}
            onPress={() => setActiveTab('videos')}
          >
            <Text style={[styles.tabText, activeTab === 'videos' && styles.tabTextActive]}>
              動画 ({channel.videos.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'shorts' && styles.tabActive]}
            onPress={() => setActiveTab('shorts')}
          >
            <Text style={[styles.tabText, activeTab === 'shorts' && styles.tabTextActive]}>
              Shorts ({channel.shorts.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* コンテンツ一覧 */}
        <View style={styles.contentContainer}>
          {activeTab === 'videos' && (
            <>
              {channel.videos.length === 0 ? (
                <Text style={styles.emptyText}>動画がありません</Text>
              ) : (
                channel.videos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onPress={() => handleVideoPress(video.id)}
                    layout="grid"
                  />
                ))
              )}
            </>
          )}

          {activeTab === 'shorts' && (
            <>
              {channel.shorts.length === 0 ? (
                <Text style={styles.emptyText}>Shortsがありません</Text>
              ) : (
                <Text style={styles.emptyText}>Shorts一覧（実装予定）</Text>
              )}
            </>
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
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: Colors.text,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  scrollView: {
    flex: 1,
  },
  banner: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.border,
  },
  channelInfo: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  channelInfoMobile: {
    padding: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.border,
  },
  channelMeta: {
    flex: 1,
  },
  channelNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  channelName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subscriberCount: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  videoCount: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
    marginBottom: 16,
  },
  subscribeButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: 'center',
  },
  subscribedButton: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.background,
  },
  subscribedButtonText: {
    color: Colors.text,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  contentContainer: {
    padding: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 24,
  },
});
