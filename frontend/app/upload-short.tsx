// ショート動画アップロード画面

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

export default function UploadShortScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [videoUri, setVideoUri] = useState<string | null>(null);

  // Step 2
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [selectedIP, setSelectedIP] = useState<IPLicense | null>(null);
  const [ipLicenses, setIpLicenses] = useState<IPLicense[]>([]);
  const [showIPPicker, setShowIPPicker] = useState(false);

  // Step 3
  const [isAdult, setIsAdult] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [mosaicConfirmed, setMosaicConfirmed] = useState(false);

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
      aspect: [9, 16],
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
    Alert.alert('成功', 'ショート動画をアップロードしました（モック）', [
      {
        text: 'OK',
        onPress: () => router.push('/(tabs)/shorts'),
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
        <Text style={styles.headerTitle}>ショートをアップロード</Text>
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
            <Text style={styles.stepTitle}>ショート動画を選択してください</Text>
            <View style={styles.recommendBadges}>
              <View style={styles.badge}>
                <Ionicons name="phone-portrait" size={16} color="#FF0050" />
                <Text style={styles.badgeText}>縦型動画推奨</Text>
              </View>
              <View style={styles.badge}>
                <Ionicons name="time" size={16} color="#FF0050" />
                <Text style={styles.badgeText}>60秒以下推奨</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.videoPickerArea} onPress={pickVideo}>
              {videoUri ? (
                <View style={styles.videoPreview}>
                  <Ionicons name="play-circle" size={64} color={Colors.background} />
                  <Text style={styles.videoSelectedText}>動画が選択されました</Text>
                  <Text style={styles.changeVideoText}>タップして変更</Text>
                </View>
              ) : (
                <View style={styles.videoPlaceholder}>
                  <Ionicons name="phone-portrait-outline" size={80} color={Colors.textSecondary} />
                  <Text style={styles.videoPlaceholderText}>縦型動画をアップロード</Text>
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
            <Text style={styles.stepTitle}>ショートの詳細を入力してください</Text>

            {/* タイトル */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>タイトル *</Text>
              <TextInput
                style={styles.input}
                placeholder="キャッチーなタイトルを入力"
                placeholderTextColor={Colors.textSecondary}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
              <Text style={styles.charCount}>{title.length}/100</Text>
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
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* ハッシュタグ */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>ハッシュタグ</Text>
              <TextInput
                style={styles.input}
                placeholder="#ハッシュタグ1 #ハッシュタグ2 #ハッシュタグ3"
                placeholderTextColor={Colors.textSecondary}
                value={hashtags}
                onChangeText={setHashtags}
              />
              <Text style={styles.helpText}>
                スペースで区切って複数のタグを入力できます
              </Text>
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
                    <Text style={styles.thumbnailPlaceholderText}>縦型サムネイルを選択</Text>
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
                onPress={() => {
                  const newValue = !isAdult;
                  setIsAdult(newValue);
                  // 成人向けをOFFにした場合、モザイク確認もリセット
                  if (!newValue) {
                    setMosaicConfirmed(false);
                  }
                }}
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

            {/* 成人向けコンテンツの警告 */}
            {isAdult && (
              <View style={styles.warningCard}>
                <View style={styles.warningHeader}>
                  <Ionicons name="warning" size={24} color="#DC2626" />
                  <Text style={styles.warningTitle}>
                    アダルトコンテンツのアップロードに関する重要な注意
                  </Text>
                </View>
                <View style={styles.warningContent}>
                  <Text style={styles.warningText}>
                    刑法第175条（わいせつ物頒布等の罪）により、わいせつな画像や動画を公開することは犯罪となります。
                  </Text>
                  <Text style={styles.warningText}>
                    アダルトコンテンツをアップロードする場合は、必ず適切なモザイク処理を施してください。
                  </Text>
                  <Text style={styles.warningTextBold}>
                    違反した場合、3年以下の懲役または250万円以下の罰金、もしくは両方が科せられる可能性があります。
                  </Text>
                </View>

                {/* モザイク確認チェックボックス */}
                <TouchableOpacity
                  style={styles.confirmRow}
                  onPress={() => setMosaicConfirmed(!mosaicConfirmed)}
                >
                  <View style={[styles.checkbox, mosaicConfirmed && styles.checkboxChecked]}>
                    {mosaicConfirmed && <Ionicons name="checkmark" size={16} color={Colors.background} />}
                  </View>
                  <Text style={styles.confirmText}>
                    このコンテンツは刑法第175条に準拠したモザイク処理が施されていることを確認しました
                  </Text>
                </TouchableOpacity>
              </View>
            )}

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
              <TouchableOpacity
                style={[
                  styles.uploadButton,
                  (isAdult && !mosaicConfirmed) && styles.uploadButtonDisabled,
                ]}
                onPress={handleUpload}
                disabled={isAdult && !mosaicConfirmed}
              >
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
    backgroundColor: '#FF0050',
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
    backgroundColor: '#FF0050',
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
  recommendBadges: {
    flexDirection: 'row',
    gap: 12,
    marginTop: -8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFE6EE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF0050',
  },
  videoPickerArea: {
    height: 400,
    maxWidth: 300,
    alignSelf: 'center',
    width: '100%',
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    gap: 12,
  },
  videoSelectedText: {
    fontSize: 16,
    color: Colors.background,
    fontWeight: '600',
  },
  changeVideoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
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
    height: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  thumbnailPicker: {
    height: 200,
    maxWidth: 160,
    alignSelf: 'center',
    width: '100%',
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
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
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
    backgroundColor: '#FF0050',
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
    backgroundColor: '#FF0050',
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
  uploadButtonDisabled: {
    backgroundColor: Colors.inactive,
  },
  warningCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  warningTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#DC2626',
    lineHeight: 20,
  },
  warningContent: {
    gap: 12,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 20,
  },
  warningTextBold: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#DC2626',
    lineHeight: 20,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FCA5A5',
  },
  confirmText: {
    flex: 1,
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 20,
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
