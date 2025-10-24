// ライブ配信中画面（クリエイター側）

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  useWindowDimensions,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

interface ChatMessage {
  id: string;
  user: string;
  message: string;
  superChat?: number;
  timestamp: string;
}

export default function LiveStreamScreen() {
  const router = useRouter();
  const { streamId } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Live stats (mock data that updates)
  const [isLive, setIsLive] = useState(true);
  const [viewers, setViewers] = useState(1234);
  const [likes, setLikes] = useState(567);
  const [superChatTotal, setSuperChatTotal] = useState(12345);
  const [duration, setDuration] = useState(0);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      user: 'ユーザー1',
      message: 'こんにちは！',
      timestamp: new Date().toISOString(),
    },
    {
      id: '2',
      user: 'ユーザー2',
      message: '面白いです！',
      timestamp: new Date().toISOString(),
    },
    {
      id: '3',
      user: 'ユーザー3',
      message: '応援しています！',
      superChat: 500,
      timestamp: new Date().toISOString(),
    },
  ]);

  // Simulate live updates
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setViewers((prev) => prev + Math.floor(Math.random() * 10) - 3);
      setLikes((prev) => prev + Math.floor(Math.random() * 3));
      setDuration((prev) => prev + 1);

      // Add random chat messages
      if (Math.random() < 0.3) {
        const newMessage: ChatMessage = {
          id: Date.now().toString(),
          user: `ユーザー${Math.floor(Math.random() * 100)}`,
          message: ['すごい！', '楽しい！', 'いいね！', '応援してます！'][
            Math.floor(Math.random() * 4)
          ],
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, newMessage].slice(-20));
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isLive]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ja-JP').format(num);
  };

  const handleEndStream = () => {
    Alert.alert(
      '配信を終了',
      '本当に配信を終了しますか？',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '終了',
          style: 'destructive',
          onPress: () => {
            setIsLive(false);
            Alert.alert(
              '配信終了',
              'ライブ配信が終了しました。アーカイブが自動的に保存されます。',
              [
                {
                  text: 'OK',
                  onPress: () => router.back(),
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>配信中</Text>
        </View>
        <Text style={styles.duration}>{formatDuration(duration)}</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Preview Section */}
        <View style={styles.previewSection}>
          <View style={styles.previewPlaceholder}>
            <Ionicons name="videocam" size={64} color={Colors.textSecondary} />
            <Text style={styles.previewText}>配信プレビュー</Text>
            <Text style={styles.previewSubtext}>
              配信ソフトからの映像がここに表示されます
            </Text>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>リアルタイム統計</Text>
          <View style={[styles.statsGrid, isMobile && styles.statsGridMobile]}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: Colors.primary + '20' }]}>
                <Ionicons name="people" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.statValue}>{formatNumber(viewers)}</Text>
              <Text style={styles.statLabel}>視聴者数</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#E91E63' + '20' }]}>
                <Ionicons name="heart" size={24} color="#E91E63" />
              </View>
              <Text style={styles.statValue}>{formatNumber(likes)}</Text>
              <Text style={styles.statLabel}>いいね数</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#00C853' + '20' }]}>
                <Ionicons name="cash" size={24} color="#00C853" />
              </View>
              <Text style={styles.statValue}>¥{formatNumber(superChatTotal)}</Text>
              <Text style={styles.statLabel}>スーパーチャット</Text>
            </View>
          </View>
        </View>

        {/* Chat Section */}
        <View style={styles.chatSection}>
          <Text style={styles.sectionTitle}>チャット</Text>
          <View style={styles.chatContainer}>
            <ScrollView style={styles.chatMessages} contentContainerStyle={styles.chatMessagesContent}>
              {chatMessages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.chatMessage,
                    msg.superChat && styles.superChatMessage,
                  ]}
                >
                  {msg.superChat && (
                    <View style={styles.superChatBadge}>
                      <Ionicons name="cash" size={16} color="#00C853" />
                      <Text style={styles.superChatAmount}>¥{msg.superChat}</Text>
                    </View>
                  )}
                  <Text style={styles.chatUser}>{msg.user}</Text>
                  <Text style={styles.chatText}>{msg.message}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </ScrollView>

      {/* Control Bar */}
      <View style={styles.controlBar}>
        <TouchableOpacity style={styles.endButton} onPress={handleEndStream}>
          <Ionicons name="stop-circle" size={24} color="#fff" />
          <Text style={styles.endButtonText}>配信を終了</Text>
        </TouchableOpacity>
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
    padding: 16,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 16,
  },
  backButton: {
    padding: 4,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  liveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  duration: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginLeft: 'auto',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  previewSection: {
    marginBottom: 24,
  },
  previewPlaceholder: {
    aspectRatio: 16 / 9,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  previewSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statsGridMobile: {
    flexDirection: 'column',
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  chatSection: {
    marginBottom: 24,
  },
  chatContainer: {
    height: 400,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chatMessages: {
    flex: 1,
  },
  chatMessagesContent: {
    padding: 16,
    gap: 12,
  },
  chatMessage: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
  },
  superChatMessage: {
    backgroundColor: '#00C853' + '10',
    borderWidth: 1,
    borderColor: '#00C853',
  },
  superChatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  superChatAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00C853',
  },
  chatUser: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 4,
  },
  chatText: {
    fontSize: 14,
    color: Colors.text,
  },
  controlBar: {
    padding: 16,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  endButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#D32F2F',
    paddingVertical: 16,
    borderRadius: 8,
  },
  endButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
