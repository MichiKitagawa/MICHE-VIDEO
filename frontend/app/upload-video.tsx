// 通常動画アップロード画面

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { getIPLicenses } from '../utils/mockApi';
import { IPLicense } from '../types';

type Step = 1 | 2 | 3;

export default function UploadVideoScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [videoUri, setVideoUri] = useState<string | null>(null);

  // Step 2
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [selectedIP, setSelectedIP] = useState<IPLicense | null>(null);
  const [ipLicenses, setIpLicenses] = useState<IPLicense[]>([]);
  const [showIPPicker, setShowIPPicker] = useState(false);

  // Step 3
  const [isAdult, setIsAdult] = useState(false);
  const [allowComments, setAllowComments] = useState(true);

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('エラー', 'ライブラリへのアクセス許可が必要です');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setVideoUri(result.assets[0].uri);
    }
  };

  const pickThumbnail = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('エラー', 'ライブラリへのアクセス許可が必要です');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setThumbnailUri(result.assets[0].uri);
    }
  };

  const loadIPLicenses = async () => {
    const licenses = await getIPLicenses();
    setIpLicenses(licenses);
    setShowIPPicker(true);
  };

  const selectIP = (ip: IPLicense) => {
    setSelectedIP(ip);
    setShowIPPicker(false);
  };

  const handleNext = () => {
    if (step === 1 && !videoUri) {
      Alert.alert('エラー', '動画を選択してください');
      return;
    }
    if (step === 2 && !title.trim()) {
      Alert.alert('エラー', 'タイトルを入力してください');
      return;
    }
    if (step < 3) {
      setStep((step + 1) as Step);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    } else {
      router.back();
    }
  };

  const handleUpload = () => {
    Alert.alert('成功', '動画をアップロードしました（モック）', [
      {
        text: 'OK',
        onPress: () => router.push('/(tabs)'),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={28} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>通常動画をアップロード</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* ステップインジケーター */}
      <View style={styles.stepIndicator}>
        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, step >= 1 && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, step >= 1 && styles.stepNumberActive]}>1</Text>
          </View>
          <Text style={styles.stepLabel}>動画選択</Text>
        </View>
        <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, step >= 2 && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, step >= 2 && styles.stepNumberActive]}>2</Text>
          </View>
          <Text style={styles.stepLabel}>詳細入力</Text>
        </View>
        <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, step >= 3 && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, step >= 3 && styles.stepNumberActive]}>3</Text>
          </View>
          <Text style={styles.stepLabel}>公開設定</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Step 1: 動画選択 */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>動画を選択してください</Text>
            <Text style={styles.stepSubtitle}>横型の動画を推奨します</Text>

            <TouchableOpacity style={styles.videoPickerArea} onPress={pickVideo}>
              {videoUri ? (
                <View style={styles.videoPreview}>
                  <Ionicons name="videocam" size={64} color={Colors.primary} />
                  <Text style={styles.videoSelectedText}>動画が選択されました</Text>
                  <Text style={styles.changeVideoText}>タップして変更</Text>
                </View>
              ) : (
                <View style={styles.videoPlaceholder}>
                  <Ionicons name="cloud-upload-outline" size={80} color={Colors.textSecondary} />
                  <Text style={styles.videoPlaceholderText}>動画をアップロード</Text>
                  <Text style={styles.videoPlaceholderSubText}>タップまたはドラッグ＆ドロップ</Text>
                </View>
              )}
            </TouchableOpacity>

            {videoUri && (
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                  <Text style={styles.nextButtonText}>次へ</Text>
                  <Ionicons name="arrow-forward" size={20} color={Colors.background} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Step 2: 詳細入力 */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>動画の詳細を入力してください</Text>

            {/* タイトル */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>タイトル *</Text>
              <TextInput
                style={styles.input}
                placeholder="動画のタイトルを入力"
                placeholderTextColor={Colors.textSecondary}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* 説明 */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>説明</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="動画の説明を入力"
                placeholderTextColor={Colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            {/* サムネイル */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>サムネイル</Text>
              <TouchableOpacity style={styles.thumbnailPicker} onPress={pickThumbnail}>
                {thumbnailUri ? (
                  <Image source={{ uri: thumbnailUri }} style={styles.thumbnailImage} />
                ) : (
                  <View style={styles.thumbnailPlaceholder}>
                    <Ionicons name="image-outline" size={40} color={Colors.textSecondary} />
                    <Text style={styles.thumbnailPlaceholderText}>サムネイルを選択</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* IP選択 */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>使用するIP（任意）</Text>
              {selectedIP ? (
                <TouchableOpacity
                  style={styles.selectedIPCard}
                  onPress={loadIPLicenses}
                >
                  <Image
                    source={{ uri: selectedIP.thumbnail }}
                    style={styles.selectedIPThumbnail}
                  />
                  <View style={styles.selectedIPInfo}>
                    <Text style={styles.selectedIPName}>{selectedIP.name}</Text>
                    <Text style={styles.selectedIPLicense}>{selectedIP.license_type}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.ipPickerButton}
                  onPress={loadIPLicenses}
                >
                  <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
                  <Text style={styles.ipPickerButtonText}>IPを選択</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.nextButton, !title.trim() && styles.nextButtonDisabled]}
                onPress={handleNext}
                disabled={!title.trim()}
              >
                <Text style={styles.nextButtonText}>次へ</Text>
                <Ionicons name="arrow-forward" size={20} color={Colors.background} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 3: 公開設定 */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>公開設定</Text>

            {/* 成人向けフラグ */}
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => setIsAdult(!isAdult)}
              >
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>18歳以上向けコンテンツ</Text>
                  <Text style={styles.settingDescription}>
                    成人向けコンテンツの場合はオンにしてください
                  </Text>
                </View>
                <View style={[styles.checkbox, isAdult && styles.checkboxChecked]}>
                  {isAdult && <Ionicons name="checkmark" size={16} color={Colors.background} />}
                </View>
              </TouchableOpacity>
            </View>

            {/* コメント許可 */}
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => setAllowComments(!allowComments)}
              >
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>コメントを許可</Text>
                  <Text style={styles.settingDescription}>
                    視聴者がコメントできるようにします
                  </Text>
                </View>
                <View style={[styles.checkbox, allowComments && styles.checkboxChecked]}>
                  {allowComments && <Ionicons name="checkmark" size={16} color={Colors.background} />}
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.uploadButton} onPress={handleUpload}>
                <Ionicons name="cloud-upload" size={20} color={Colors.background} />
                <Text style={styles.uploadButtonText}>アップロード</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* IPピッカーモーダル */}
      {showIPPicker && (
        <View style={styles.ipPickerModal}>
          <View style={styles.ipPickerHeader}>
            <Text style={styles.ipPickerTitle}>IPを選択</Text>
            <TouchableOpacity onPress={() => setShowIPPicker(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            <TouchableOpacity
              style={styles.ipOption}
              onPress={() => {
                setSelectedIP(null);
                setShowIPPicker(false);
              }}
            >
              <Text style={styles.ipOptionText}>IPを使用しない</Text>
            </TouchableOpacity>
            {ipLicenses.map((ip) => (
              <TouchableOpacity
                key={ip.id}
                style={styles.ipOption}
                onPress={() => selectIP(ip)}
              >
                <Image
                  source={{ uri: ip.thumbnail }}
                  style={styles.ipOptionThumbnail}
                />
                <View style={styles.ipOptionInfo}>
                  <Text style={styles.ipOptionName}>{ip.name}</Text>
                  <Text style={styles.ipOptionLicense}>{ip.license_type}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  stepItem: {
    alignItems: 'center',
    gap: 8,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: Colors.primary,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  stepNumberActive: {
    color: Colors.background,
  },
  stepLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 12,
  },
  stepLineActive: {
    backgroundColor: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  stepContent: {
    gap: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
  },
  stepSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: -12,
  },
  videoPickerArea: {
    height: 300,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  videoPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  videoPlaceholderSubText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  videoPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    gap: 12,
  },
  videoSelectedText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  changeVideoText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  thumbnailPicker: {
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  thumbnailPlaceholderText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  ipPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  ipPickerButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  selectedIPCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    gap: 12,
  },
  selectedIPThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: Colors.border,
  },
  selectedIPInfo: {
    flex: 1,
  },
  selectedIPName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  selectedIPLicense: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  buttonContainer: {
    marginTop: 12,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  nextButtonDisabled: {
    backgroundColor: Colors.inactive,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  uploadButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  ipPickerModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background,
    zIndex: 1000,
  },
  ipPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  ipPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  ipOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  ipOptionText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  ipOptionThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: Colors.border,
  },
  ipOptionInfo: {
    flex: 1,
  },
  ipOptionName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  ipOptionLicense: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
