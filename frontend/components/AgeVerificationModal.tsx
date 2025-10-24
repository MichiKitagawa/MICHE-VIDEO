// 年齢確認モーダルコンポーネント

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface AgeVerificationModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function AgeVerificationModal({
  visible,
  onConfirm,
  onCancel,
}: AgeVerificationModalProps) {
  const [isChecked, setIsChecked] = useState(false);

  const handleConfirm = () => {
    if (isChecked) {
      onConfirm();
      // モーダルを閉じた後にチェック状態をリセット
      setIsChecked(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    // モーダルを閉じた後にチェック状態をリセット
    setIsChecked(false);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <Pressable
        style={styles.backdrop}
        onPress={handleCancel}
      >
        <Pressable
          style={styles.modalContainer}
          onPress={(e) => e.stopPropagation()}
        >
          {/* 警告アイコン */}
          <View style={styles.iconContainer}>
            <View style={styles.warningIconBackground}>
              <Ionicons name="warning" size={48} color="#FFFFFF" />
            </View>
          </View>

          {/* タイトル */}
          <Text style={styles.title}>年齢確認が必要です</Text>

          {/* 説明文 */}
          <Text style={styles.description}>
            プレミアム+プランには、成人向けコンテンツ（18+）へのアクセスが含まれます。
          </Text>
          <Text style={styles.description}>
            このプランを利用するには、18歳以上であることを確認する必要があります。
          </Text>

          {/* チェックボックス */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setIsChecked(!isChecked)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
              {isChecked && (
                <Ionicons name="checkmark" size={20} color={Colors.background} />
              )}
            </View>
            <Text style={styles.checkboxLabel}>
              私は18歳以上であることを確認します
            </Text>
          </TouchableOpacity>

          {/* 注意事項 */}
          <View style={styles.noticeContainer}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.noticeText}>
              虚偽の申告は利用規約違反となり、アカウントが停止される場合があります。
            </Text>
          </View>

          {/* ボタン */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                !isChecked && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!isChecked}
            >
              <Text
                style={[
                  styles.confirmButtonText,
                  !isChecked && styles.confirmButtonTextDisabled,
                ]}
              >
                同意して進む
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    width: '90%',
    maxWidth: 440,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  warningIconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D32F2F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 20,
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    gap: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: Colors.border,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  confirmButtonTextDisabled: {
    color: Colors.textSecondary,
  },
});
