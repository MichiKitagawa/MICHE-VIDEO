// ライブ配信視聴ページ

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import VideoPlayer from '../../../components/VideoPlayer';
import LiveChat from '../../../components/live/LiveChat';
import SuperChatModal from '../../../components/live/SuperChatModal';
import { LiveStream, LiveChatMessage } from '../../../types';
import { getLiveChatMessages, sendLiveChatMessage, sendSuperChat } from '../../../utils/mockApi';
import { Colors } from '../../../constants/Colors';

export default function LiveStreamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [superChatModalVisible, setSuperChatModalVisible] = useState(false);

  // モックライブ配信データ
  const [liveStream] = useState<LiveStream>({
    id: id,
    title: 'ライブ配信タイトル',
    description: 'ライブ配信の説明',
    category: 'ゲーム',
    thumbnail_url: 'https://picsum.photos/1280/720',
    status: 'live',
    privacy: 'public',
    is_adult: false,
    chat_enabled: true,
    super_chat_enabled: true,
    archive_enabled: true,
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    stream_key: 'stream_key_123',
    current_viewers: 1234,
    peak_viewers: 2345,
    total_likes: 890,
    total_super_chat: 12345,
    created_at: new Date().toISOString(),
  });

  useEffect(() => {
    loadMessages();
  }, [id]);

  const loadMessages = async () => {
    try {
      const data = await getLiveChatMessages(id);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    try {
      const newMessage = await sendLiveChatMessage(id, message);
      setMessages([...messages, newMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleSendSuperChat = async (amount: number, message: string) => {
    try {
      const superChatMessage = await sendSuperChat(id, amount, message);
      setMessages([...messages, superChatMessage]);
    } catch (error) {
      console.error('Failed to send super chat:', error);
    }
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
      {/* トップバー */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.liveBadge}>
          <Text style={styles.liveBadgeText}>LIVE</Text>
        </View>
        <View style={styles.viewerInfo}>
          <Ionicons name="eye" size={16} color={Colors.text} />
          <Text style={styles.viewerCount}>
            {liveStream.current_viewers?.toLocaleString()}
          </Text>
        </View>
      </View>

      {isMobile ? (
        // モバイルレイアウト（縦に並べる）
        <View style={styles.mobileLayout}>
          {/* 動画プレーヤー */}
          <VideoPlayer videoUrl={liveStream.stream_url} />

          {/* ライブ情報 */}
          <View style={styles.liveInfo}>
            <Text style={styles.liveTitle}>{liveStream.title}</Text>
            <View style={styles.liveStats}>
              <View style={styles.stat}>
                <Ionicons name="heart" size={16} color="#ff0000" />
                <Text style={styles.statText}>{liveStream.total_likes}</Text>
              </View>
              {liveStream.super_chat_enabled && (
                <View style={styles.stat}>
                  <Ionicons name="cash" size={16} color="#FFD600" />
                  <Text style={styles.statText}>
                    ¥{liveStream.total_super_chat?.toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* チャット */}
          <View style={styles.chatContainer}>
            <LiveChat
              streamId={id}
              messages={messages}
              onSendMessage={handleSendMessage}
              onSendSuperChat={(amount, message) => {
                setSuperChatModalVisible(true);
              }}
            />
          </View>
        </View>
      ) : (
        // デスクトップレイアウト（横に並べる）
        <View style={styles.desktopLayout}>
          <View style={styles.videoSection}>
            {/* 動画プレーヤー */}
            <VideoPlayer videoUrl={liveStream.stream_url} />

            {/* ライブ情報 */}
            <View style={styles.liveInfo}>
              <Text style={styles.liveTitle}>{liveStream.title}</Text>
              <Text style={styles.liveDescription}>{liveStream.description}</Text>
              <View style={styles.liveStats}>
                <View style={styles.stat}>
                  <Ionicons name="heart" size={16} color="#ff0000" />
                  <Text style={styles.statText}>{liveStream.total_likes}</Text>
                </View>
                {liveStream.super_chat_enabled && (
                  <View style={styles.stat}>
                    <Ionicons name="cash" size={16} color="#FFD600" />
                    <Text style={styles.statText}>
                      ¥{liveStream.total_super_chat?.toLocaleString()}
                    </Text>
                  </View>
                )}
                <View style={styles.stat}>
                  <Ionicons name="eye" size={16} color={Colors.textSecondary} />
                  <Text style={styles.statText}>
                    最大 {liveStream.peak_viewers?.toLocaleString()}人
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* チャット */}
          <View style={styles.chatSidebar}>
            <LiveChat
              streamId={id}
              messages={messages}
              onSendMessage={handleSendMessage}
              onSendSuperChat={(amount, message) => {
                setSuperChatModalVisible(true);
              }}
            />
          </View>
        </View>
      )}

      {/* スーパーチャットモーダル */}
      <SuperChatModal
        visible={superChatModalVisible}
        onClose={() => setSuperChatModalVisible(false)}
        onSend={handleSendSuperChat}
      />
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
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  liveBadge: {
    backgroundColor: '#ff0000',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  viewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewerCount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  mobileLayout: {
    flex: 1,
  },
  desktopLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  videoSection: {
    flex: 1,
  },
  chatSidebar: {
    width: 400,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  chatContainer: {
    flex: 1,
  },
  liveInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  liveTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  liveDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  liveStats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
});
