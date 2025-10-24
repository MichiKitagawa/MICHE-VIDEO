// ライブ配信設定画面

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Switch,
  useWindowDimensions,
  Clipboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { isWeb } from '../constants/Platform';

const CATEGORIES = ['ゲーム', '音楽', 'トーク', '教育', 'スポーツ', 'クリエイティブ', 'その他'];

export default function GoLiveScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Streaming method selection
  const [streamingMethod, setStreamingMethod] = useState<'camera' | 'software' | null>(null);

  // Basic info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('ゲーム');
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);

  // Privacy settings
  const [privacy, setPrivacy] = useState<'public' | 'unlisted' | 'private'>('public');
  const [isAdult, setIsAdult] = useState(false);

  // Advanced settings
  const [chatEnabled, setChatEnabled] = useState(true);
  const [superChatEnabled, setSuperChatEnabled] = useState(true);
  const [archiveEnabled, setArchiveEnabled] = useState(true);

  // Stream credentials (mock)
  const [streamKey] = useState('live_' + Date.now().toString());
  const [streamUrl] = useState('rtmp://stream.example.com/live');

  // モバイルの場合は自動的にカメラ配信を選択
  useEffect(() => {
    if (!isWeb) {
      setStreamingMethod('camera');
    }
  }, []);

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

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('コピーしました', `${label}をクリップボードにコピーしました`);
  };

  const handleGoLive = () => {
    if (!title.trim()) {
      Alert.alert('エラー', '配信タイトルを入力してください');
      return;
    }

    Alert.alert(
      'ライブ配信を開始',
      '配信を開始してもよろしいですか？',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '配信開始',
          onPress: () => {
            // Create mock stream ID and navigate
            const streamId = 'stream_' + Date.now();
            router.push(`/live/${streamId}` as any);
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="radio" size={28} color="#FF4444" />
          <Text style={styles.headerTitle}>ライブ配信設定</Text>
        </View>
      </View>

      {/* Streaming Method Selection (Web only) */}
      {isWeb && streamingMethod === null && (
        <View style={styles.methodSelectionContainer}>
          <Text style={styles.methodSelectionTitle}>配信方法を選択</Text>
          <Text style={styles.methodSelectionSubtitle}>
            カメラで配信するか、配信ソフトを使用するかを選択してください
          </Text>

          <View style={styles.methodOptions}>
            <TouchableOpacity
              style={styles.methodOption}
              onPress={() => setStreamingMethod('camera')}
            >
              <View style={styles.methodOptionIcon}>
                <Ionicons name="videocam" size={48} color={Colors.primary} />
              </View>
              <Text style={styles.methodOptionTitle}>カメラで配信</Text>
              <Text style={styles.methodOptionDescription}>
                ウェブカメラを使用して{'\n'}
                ブラウザから直接配信
              </Text>
              <View style={styles.methodFeatures}>
                <View style={styles.methodFeatureItem}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                  <Text style={styles.methodFeatureText}>簡単セットアップ</Text>
                </View>
                <View style={styles.methodFeatureItem}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                  <Text style={styles.methodFeatureText}>追加ソフト不要</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.methodOption}
              onPress={() => setStreamingMethod('software')}
            >
              <View style={styles.methodOptionIcon}>
                <Ionicons name="desktop" size={48} color="#FF4444" />
              </View>
              <Text style={styles.methodOptionTitle}>配信ソフトで配信</Text>
              <Text style={styles.methodOptionDescription}>
                OBS等の配信ソフトを使用して{'\n'}
                高品質な配信
              </Text>
              <View style={styles.methodFeatures}>
                <View style={styles.methodFeatureItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#FF4444" />
                  <Text style={styles.methodFeatureText}>高画質配信</Text>
                </View>
                <View style={styles.methodFeatureItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#FF4444" />
                  <Text style={styles.methodFeatureText}>詳細カスタマイズ</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Configuration sections (shown after method selection) */}
      {streamingMethod !== null && (
        <>
      {/* Basic Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>基本情報</Text>

        <Text style={styles.label}>配信タイトル *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="配信のタイトルを入力"
          placeholderTextColor={Colors.textSecondary}
        />

        <Text style={styles.label}>説明</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="配信の説明を入力"
          placeholderTextColor={Colors.textSecondary}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>カテゴリー</Text>
        <View style={styles.categoryContainer}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                category === cat && styles.categoryChipSelected,
              ]}
              onPress={() => setCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  category === cat && styles.categoryChipTextSelected,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>サムネイル (16:9)</Text>
        <TouchableOpacity style={styles.thumbnailPicker} onPress={pickThumbnail}>
          {thumbnailUri ? (
            <Image source={{ uri: thumbnailUri }} style={styles.thumbnailPreview} />
          ) : (
            <>
              <Ionicons name="image" size={48} color={Colors.textSecondary} />
              <Text style={styles.thumbnailPickerText}>サムネイル画像を選択</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Privacy Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>プライバシー設定</Text>

        <View style={styles.privacyOptions}>
          <TouchableOpacity
            style={[styles.privacyOption, privacy === 'public' && styles.privacyOptionActive]}
            onPress={() => setPrivacy('public')}
          >
            <Ionicons
              name={privacy === 'public' ? 'radio-button-on' : 'radio-button-off'}
              size={24}
              color={privacy === 'public' ? Colors.primary : Colors.textSecondary}
            />
            <View style={styles.privacyOptionText}>
              <Text style={styles.privacyOptionTitle}>公開</Text>
              <Text style={styles.privacyOptionDescription}>誰でも視聴可能</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.privacyOption, privacy === 'unlisted' && styles.privacyOptionActive]}
            onPress={() => setPrivacy('unlisted')}
          >
            <Ionicons
              name={privacy === 'unlisted' ? 'radio-button-on' : 'radio-button-off'}
              size={24}
              color={privacy === 'unlisted' ? Colors.primary : Colors.textSecondary}
            />
            <View style={styles.privacyOptionText}>
              <Text style={styles.privacyOptionTitle}>限定公開</Text>
              <Text style={styles.privacyOptionDescription}>URLを知っている人のみ</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.privacyOption, privacy === 'private' && styles.privacyOptionActive]}
            onPress={() => setPrivacy('private')}
          >
            <Ionicons
              name={privacy === 'private' ? 'radio-button-on' : 'radio-button-off'}
              size={24}
              color={privacy === 'private' ? Colors.primary : Colors.textSecondary}
            />
            <View style={styles.privacyOptionText}>
              <Text style={styles.privacyOptionTitle}>下書き（テスト配信）</Text>
              <Text style={styles.privacyOptionDescription}>配信開始前のテスト用</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>成人向けコンテンツ (18+)</Text>
          <Switch
            value={isAdult}
            onValueChange={setIsAdult}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={isAdult ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Advanced Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>詳細設定</Text>

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>チャット</Text>
            <Text style={styles.switchDescription}>視聴者とチャットで交流</Text>
          </View>
          <Switch
            value={chatEnabled}
            onValueChange={setChatEnabled}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={chatEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>スーパーチャット</Text>
            <Text style={styles.switchDescription}>視聴者から投げ銭を受け取る</Text>
          </View>
          <Switch
            value={superChatEnabled}
            onValueChange={setSuperChatEnabled}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={superChatEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>アーカイブ保存</Text>
            <Text style={styles.switchDescription}>配信終了後に自動保存</Text>
          </View>
          <Switch
            value={archiveEnabled}
            onValueChange={setArchiveEnabled}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={archiveEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Streaming Information (Software method only) */}
      {streamingMethod === 'software' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ストリーミング情報</Text>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={Colors.primary} />
            <Text style={styles.infoText}>
              配信ソフト（OBS等）で以下の情報を使用してください
            </Text>
          </View>

          <Text style={styles.label}>Stream URL</Text>
          <View style={styles.credentialBox}>
            <Text style={styles.credentialText}>{streamUrl}</Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => copyToClipboard(streamUrl, 'Stream URL')}
            >
              <Ionicons name="copy" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Stream Key</Text>
          <View style={styles.credentialBox}>
            <Text style={styles.credentialText}>{streamKey}</Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => copyToClipboard(streamKey, 'Stream Key')}
            >
              <Ionicons name="copy" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>キャンセル</Text>
        </TouchableOpacity>
        {streamingMethod === 'camera' ? (
          <TouchableOpacity style={styles.liveButton} onPress={handleGoLive}>
            <Ionicons name="radio" size={20} color="#fff" />
            <Text style={styles.liveButtonText}>配信開始</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.liveButton} onPress={handleGoLive}>
            <Ionicons name="hourglass" size={20} color="#fff" />
            <Text style={styles.liveButtonText}>配信待機</Text>
          </TouchableOpacity>
        )}
      </View>
      </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: Colors.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  categoryChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: Colors.text,
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  thumbnailPicker: {
    height: 200,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  thumbnailPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbnailPickerText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  privacyOptions: {
    gap: 12,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  privacyOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  privacyOptionText: {
    flex: 1,
  },
  privacyOptionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  privacyOptionDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  switchDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.primary + '10',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  credentialBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  credentialText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    fontFamily: 'monospace',
  },
  copyButton: {
    padding: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  liveButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#FF4444',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  liveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Method selection styles
  methodSelectionContainer: {
    marginBottom: 32,
  },
  methodSelectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  methodSelectionSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  methodOptions: {
    flexDirection: 'row',
    gap: 24,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  methodOption: {
    width: '45%',
    minWidth: 280,
    maxWidth: 400,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  methodOptionIcon: {
    marginBottom: 20,
  },
  methodOptionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  methodOptionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  methodFeatures: {
    width: '100%',
    gap: 8,
  },
  methodFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  methodFeatureText: {
    fontSize: 14,
    color: Colors.text,
  },
});
