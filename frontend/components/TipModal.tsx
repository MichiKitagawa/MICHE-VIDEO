// 投げ銭モーダル

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { sendTip } from '../utils/mockApi';
import { selectPaymentProvider, getPaymentProviderDisplayName } from '../utils/paymentProvider';

interface TipModalProps {
  visible: boolean;
  onClose: () => void;
  contentId: string;
  contentType: 'video' | 'short' | 'live';
  contentTitle: string;
  creatorName: string;
  isAdultContent: boolean;
}

const PRESET_AMOUNTS = [100, 300, 500, 1000, 3000, 5000];

export default function TipModal({
  visible,
  onClose,
  contentId,
  contentType,
  contentTitle,
  creatorName,
  isAdultContent,
}: TipModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);

  const paymentProvider = selectPaymentProvider(isAdultContent);
  const providerName = getPaymentProviderDisplayName(paymentProvider);

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (text: string) => {
    // 数字のみ許可
    const numericValue = text.replace(/[^0-9]/g, '');
    setCustomAmount(numericValue);
    setSelectedAmount(null);
  };

  const getEffectiveAmount = (): number | null => {
    if (selectedAmount) return selectedAmount;
    if (customAmount) {
      const amount = parseInt(customAmount, 10);
      return isNaN(amount) ? null : amount;
    }
    return null;
  };

  const handleSendTip = async () => {
    const amount = getEffectiveAmount();

    if (!amount || amount < 100) {
      Alert.alert('エラー', '投げ銭は100円以上から設定できます');
      return;
    }

    if (amount > 100000) {
      Alert.alert('エラー', '投げ銭は100,000円以下に設定してください');
      return;
    }

    setProcessing(true);
    try {
      const result = await sendTip(
        contentId,
        contentType,
        amount,
        message.trim() || undefined
      );

      if (result.success && result.paymentUrl) {
        Alert.alert(
          '決済ページへ移動',
          `${providerName}の決済ページで支払いを完了してください：\n${result.paymentUrl}`,
          [
            {
              text: 'OK',
              onPress: () => {
                onClose();
                // リセット
                setSelectedAmount(null);
                setCustomAmount('');
                setMessage('');
              },
            },
          ]
        );
      } else {
        Alert.alert('エラー', result.error || '投げ銭の送信に失敗しました');
      }
    } catch (error) {
      Alert.alert('エラー', '投げ銭の送信に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (!processing) {
      onClose();
    }
  };

  const effectiveAmount = getEffectiveAmount();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={handleClose}
      >
        <Pressable
          style={styles.modalContainer}
          onPress={(e) => e.stopPropagation()}
        >
          {/* ヘッダー */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons
                name={contentType === 'live' ? 'cash-outline' : 'gift-outline'}
                size={24}
                color={Colors.primary}
              />
              <Text style={styles.headerTitle}>
                {contentType === 'live' ? 'スーパーチャットを送る' : '投げ銭を送る'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} disabled={processing}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {/* コンテンツ情報 */}
          <View style={styles.contentInfo}>
            <Text style={styles.contentTitle} numberOfLines={1}>
              {contentTitle}
            </Text>
            <Text style={styles.creatorName}>
              <Ionicons name="person-outline" size={14} color={Colors.textSecondary} />
              {' '}{creatorName}
            </Text>
          </View>

          {/* 決済プロバイダー情報 */}
          <View style={styles.providerInfo}>
            <Ionicons name="card-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.providerText}>
              決済: {providerName}
            </Text>
          </View>

          {/* 金額選択 */}
          <Text style={styles.sectionTitle}>金額を選択</Text>
          <View style={styles.amountGrid}>
            {PRESET_AMOUNTS.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.amountButton,
                  selectedAmount === amount && styles.amountButtonSelected,
                ]}
                onPress={() => handleAmountSelect(amount)}
                disabled={processing}
              >
                <Text
                  style={[
                    styles.amountButtonText,
                    selectedAmount === amount && styles.amountButtonTextSelected,
                  ]}
                >
                  ¥{amount.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* カスタム金額 */}
          <Text style={styles.sectionTitle}>または金額を入力</Text>
          <View style={styles.customAmountContainer}>
            <Text style={styles.currencySymbol}>¥</Text>
            <TextInput
              style={styles.customAmountInput}
              placeholder="カスタム金額"
              placeholderTextColor={Colors.textSecondary}
              value={customAmount}
              onChangeText={handleCustomAmountChange}
              keyboardType="number-pad"
              editable={!processing}
            />
          </View>
          <Text style={styles.amountHint}>100円〜100,000円</Text>

          {/* メッセージ */}
          <Text style={styles.sectionTitle}>メッセージ（任意）</Text>
          <TextInput
            style={styles.messageInput}
            placeholder="応援メッセージを添えることができます"
            placeholderTextColor={Colors.textSecondary}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={200}
            editable={!processing}
          />
          <Text style={styles.messageHint}>{message.length}/200</Text>

          {/* 合計金額 */}
          {effectiveAmount && (
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>合計</Text>
              <Text style={styles.totalAmount}>¥{effectiveAmount.toLocaleString()}</Text>
            </View>
          )}

          {/* 送信ボタン */}
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!effectiveAmount || processing) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendTip}
            disabled={!effectiveAmount || processing}
          >
            {processing ? (
              <ActivityIndicator size="small" color={Colors.background} />
            ) : (
              <Text style={styles.sendButtonText}>
                {contentType === 'live' ? 'スーパーチャットを送る' : '投げ銭を送る'}
              </Text>
            )}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  contentInfo: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  contentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  creatorName: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
  },
  providerText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
  },
  amountButton: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 8,
    alignItems: 'center',
  },
  amountButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  amountButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  amountButtonTextSelected: {
    color: Colors.background,
  },
  customAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  customAmountInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
  },
  amountHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    paddingHorizontal: 20,
    marginTop: 6,
  },
  messageInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
    minHeight: 80,
    maxHeight: 120,
    marginHorizontal: 20,
    textAlignVertical: 'top',
  },
  messageHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    paddingHorizontal: 20,
    marginTop: 6,
    textAlign: 'right',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 24,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.border,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
});
