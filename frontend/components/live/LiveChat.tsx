// ライブ配信チャットコンポーネント

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LiveChatMessage } from '../../types';
import { Colors } from '../../constants/Colors';

interface LiveChatProps {
  streamId: string;
  messages: LiveChatMessage[];
  onSendMessage: (message: string) => void;
  onSendSuperChat: (amount: number, message: string) => void;
}

const formatRelativeTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffSeconds < 60) return `${diffSeconds}秒前`;
  if (diffMinutes < 60) return `${diffMinutes}分前`;
  return `${diffHours}時間前`;
};

export default function LiveChat({
  streamId,
  messages,
  onSendMessage,
  onSendSuperChat,
}: LiveChatProps) {
  const [messageText, setMessageText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // 新しいメッセージが来たら自動スクロール
  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSend = () => {
    if (!messageText.trim()) return;
    onSendMessage(messageText.trim());
    setMessageText('');
  };

  const renderMessage = ({ item }: { item: LiveChatMessage }) => {
    if (item.is_super_chat) {
      // スーパーチャットメッセージ
      return (
        <View style={styles.superChatMessage}>
          <View style={styles.superChatHeader}>
            <Image source={{ uri: item.user_avatar }} style={styles.avatar} />
            <View style={styles.superChatInfo}>
              <View style={styles.superChatNameRow}>
                <Text style={styles.superChatUsername}>{item.user_name}</Text>
                <Text style={styles.superChatAmount}>¥{item.super_chat_amount?.toLocaleString()}</Text>
              </View>
              <Text style={styles.superChatTime}>{formatRelativeTime(item.timestamp)}</Text>
            </View>
          </View>
          <Text style={styles.superChatText}>{item.message}</Text>
        </View>
      );
    }

    // 通常のメッセージ
    return (
      <View style={styles.messageItem}>
        <Image source={{ uri: item.user_avatar }} style={styles.avatar} />
        <View style={styles.messageContent}>
          <View style={styles.messageHeader}>
            <Text style={styles.username}>{item.user_name}</Text>
            <Text style={styles.timestamp}>{formatRelativeTime(item.timestamp)}</Text>
          </View>
          <Text style={styles.messageText}>{item.message}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* チャットヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>チャット</Text>
        <Text style={styles.messageCount}>{messages.length}件</Text>
      </View>

      {/* メッセージリスト */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        showsVerticalScrollIndicator={true}
      />

      {/* 入力エリア */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="メッセージを入力..."
          placeholderTextColor={Colors.textSecondary}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={styles.superChatButton}
          onPress={() => {
            // スーパーチャットモーダルを開く
            // 実装は親コンポーネントで行う
          }}
        >
          <Ionicons name="cash" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!messageText.trim()}
        >
          <Ionicons
            name="send"
            size={20}
            color={messageText.trim() ? '#fff' : Colors.textSecondary}
          />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  messageCount: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingVertical: 8,
  },
  messageItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.border,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  username: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  timestamp: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  messageText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  superChatMessage: {
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    backgroundColor: '#FFD600',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA000',
  },
  superChatHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  superChatInfo: {
    flex: 1,
  },
  superChatNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  superChatUsername: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  superChatAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  superChatTime: {
    fontSize: 11,
    color: '#666',
  },
  superChatText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.text,
  },
  superChatButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.border,
  },
});
