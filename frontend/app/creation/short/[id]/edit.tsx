// ショート編集ページ

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../../constants/Colors';
import { getShorts, updateShort, updateShortThumbnail } from '../../../../utils/mockApi';
import { Short } from '../../../../types';

const CATEGORIES = ['ゲーム', '音楽', 'エンタメ', '教育', 'スポーツ', '科学技術', '料理', '旅行', 'ファッション', 'その他'];

export default function ShortEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [short, setShort] = useState<Short | null>(null);

  // フォーム状態
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isAdult, setIsAdult] = useState(false);
  const [thumbnailUri, setThumbnailUri] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'unlisted' | 'private'>('public');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    loadShort();
  }, [id]);

  const loadShort = async () => {
    try {
      const shorts = await getShorts();
      const foundShort = shorts.find((s) => s.id === id);
      if (foundShort) {
        setShort(foundShort);
        setTitle(foundShort.title);
        setDescription(foundShort.description || '');
        setCategory(foundShort.category || '');
        setIsAdult(foundShort.is_adult);
        setThumbnailUri(foundShort.thumbnail_url);
        setPrivacy(foundShort.privacy || 'public');
        setTags(foundShort.tags || []);
      } else {
        Alert.alert('エラー', 'ショートが見つかりません');
        router.back();
      }
    } catch (error) {
      console.error('Failed to load short:', error);
      Alert.alert('エラー', 'ショートの読み込みに失敗しました');
    } finally {
      setLoading(false);
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

  const addTag = () => {
    const newTag = tagInput.trim();
    if (!newTag) return;

    if (tags.length >= 10) {
      Alert.alert('エラー', 'タグは最大10個までです');
      return;
    }

    if (tags.includes(newTag)) {
      Alert.alert('エラー', 'このタグは既に追加されています');
      return;
    }

    setTags([...tags, newTag]);
    setTagInput('');
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('エラー', 'タイトルを入力してください');
      return;
    }

    if (!category.trim()) {
      Alert.alert('エラー', 'カテゴリーを選択してください');
      return;
    }

    setSaving(true);
    try {
      // サムネイルが変更されていれば更新
      if (thumbnailUri !== short?.thumbnail_url) {
        await updateShortThumbnail(id as string, thumbnailUri);
      }

      // ショート情報を更新
      await updateShort(id as string, {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        is_adult: isAdult,
        privacy,
        tags,
      });

      Alert.alert('保存完了', 'ショート情報を更新しました', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Failed to update short:', error);
      Alert.alert('エラー', 'ショートの更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ショート編集</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (!short) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ショート編集</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* サムネイル */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>サムネイル *</Text>
          <TouchableOpacity style={styles.thumbnailPicker} onPress={pickThumbnail}>
            <Image source={{ uri: thumbnailUri }} style={styles.thumbnail} />
            <View style={styles.thumbnailOverlay}>
              <Ionicons name="camera" size={32} color="#fff" />
              <Text style={styles.thumbnailOverlayText}>変更</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.hint}>推奨: 1080x1920 (9:16) • JPGまたはPNG • 2MB以下</Text>
        </View>

        {/* タイトル */}
        <View style={styles.section}>
          <Text style={styles.label}>タイトル *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="ショートのタイトルを入力"
            placeholderTextColor={Colors.textSecondary}
          />
        </View>

        {/* 説明 */}
        <View style={styles.section}>
          <Text style={styles.label}>説明</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="ショートの説明を入力"
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* カテゴリー */}
        <View style={styles.section}>
          <Text style={styles.label}>カテゴリー *</Text>
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
        </View>

        {/* タグ */}
        <View style={styles.section}>
          <Text style={styles.label}>タグ (最大10個)</Text>
          {tags.length > 0 && (
            <View style={styles.tagContainer}>
              {tags.map((tag, index) => (
                <View key={index} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tag}</Text>
                  <TouchableOpacity onPress={() => removeTag(index)}>
                    <Ionicons name="close-circle" size={16} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <TextInput
            style={styles.input}
            value={tagInput}
            onChangeText={setTagInput}
            placeholder="タグを入力してEnter"
            placeholderTextColor={Colors.textSecondary}
            onSubmitEditing={addTag}
            returnKeyType="done"
          />
        </View>

        {/* プライバシー設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>プライバシー設定</Text>

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
              <Text style={styles.privacyOptionTitle}>非公開</Text>
              <Text style={styles.privacyOptionDescription}>自分のみ視聴可能</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 成人向けコンテンツ */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.label}>成人向けコンテンツ (18+)</Text>
              <Text style={styles.switchDescription}>
                Web版でのみ視聴可能
              </Text>
            </View>
            <Switch
              value={isAdult}
              onValueChange={setIsAdult}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={isAdult ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* 保存ボタン */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.background} />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color={Colors.background} />
              <Text style={styles.saveButtonText}>保存</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  thumbnailPicker: {
    width: 200,
    aspectRatio: 9 / 16,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.border,
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  thumbnailOverlayText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
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
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: Colors.primary + '20',
  },
  tagChipText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
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
    marginBottom: 12,
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
});
