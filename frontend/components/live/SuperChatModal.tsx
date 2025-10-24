// スーパーチャット送信モーダル

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

interface SuperChatModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (amount: number, message: string) => void;
}

const AMOUNTS = [100, 500, 1000, 2000, 5000, 10000];

export default function SuperChatModal({ visible, onClose, onSend }: SuperChatModalProps) {
  const [selectedAmount, setSelectedAmount] = useState(500);
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      onSend(selectedAmount, message.trim());
      setMessage('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.container}>
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
            {/* ヘッダー */}
            <View style={styles.header}>
              <Text style={styles.title}>スーパーチャット</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* 金額選択 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>金額を選択</Text>
              <View style={styles.amountGrid}>
                {AMOUNTS.map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={[
                      styles.amountButton,
                      selectedAmount === amount && styles.amountButtonActive,
                    ]}
                    onPress={() => setSelectedAmount(amount)}
                  >
                    <Text
                      style={[
                        styles.amountText,
                        selectedAmount === amount && styles.amountTextActive,
                      ]}
                    >
                      ¥{amount.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* メッセージ入力 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>メッセージ（必須）</Text>
              <TextInput
                style={styles.messageInput}
                value={message}
                onChangeText={setMessage}
                placeholder="応援メッセージを入力してください"
                placeholderTextColor={Colors.textSecondary}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
              <Text style={styles.characterCount}>{message.length}/200</Text>
            </View>

            {/* 送信ボタン */}
            <TouchableOpacity
              style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!message.trim()}
            >
              <Ionicons name="cash" size={20} color="#fff" />
              <Text style={styles.sendButtonText}>
                ¥{selectedAmount.toLocaleString()}を送信
              </Text>
            </TouchableOpacity>

            {/* 注意事項 */}
            <View style={styles.notice}>
              <Ionicons name="information-circle" size={16} color={Colors.textSecondary} />
              <Text style={styles.noticeText}>
                スーパーチャットは返金できません。
              </Text>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
  },
  modal: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amountButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    minWidth: 80,
    alignItems: 'center',
  },
  amountButtonActive: {
    backgroundColor: '#FFD600',
    borderColor: '#FFD600',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  amountTextActive: {
    color: '#000',
  },
  messageInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  characterCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFD600',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.border,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noticeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
});
