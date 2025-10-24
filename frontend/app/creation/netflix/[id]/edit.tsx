// Netflix型コンテンツ編集

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  useWindowDimensions,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../../constants/Colors';
import { getNetflixContentDetail, updateNetflixContent, updateNetflixPoster } from '../../../../utils/mockApi';
import { NetflixContent } from '../../../../types';

const GENRES = ['アクション', 'コメディ', 'ドラマ', 'ホラー', 'SF', 'ロマンス', 'スリラー', 'ドキュメンタリー', 'アニメ', 'ファミリー'];

export default function EditNetflixContentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<NetflixContent | null>(null);

  // Edit fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [posterUri, setPosterUri] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'unlisted' | 'private'>('public');

  useEffect(() => {
    loadContent();
  }, [id]);

  const loadContent = async () => {
    try {
      const data = await getNetflixContentDetail(id);
      if (!data) {
        Alert.alert('エラー', 'コンテンツが見つかりませんでした');
        router.back();
        return;
      }
      setContent(data);
      setTitle(data.title);
      setDescription(data.description);
      setSelectedGenres(data.genres);
      setPosterUri(data.poster_url);
      setPrivacy(data.privacy || 'public');
    } catch (error) {
      Alert.alert('エラー', 'コンテンツの読み込みに失敗しました');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const pickPoster = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('エラー', 'ライブラリへのアクセス許可が必要です');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [2, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setPosterUri(result.assets[0].uri);
    }
  };

  const toggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter((g) => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('エラー', 'タイトルを入力してください');
      return;
    }

    if (selectedGenres.length === 0) {
      Alert.alert('エラー', '少なくとも1つのジャンルを選択してください');
      return;
    }

    setSaving(true);
    try {
      // ポスターが変更されていれば更新
      if (posterUri !== content?.poster_url) {
        await updateNetflixPoster(id, posterUri);
      }

      // コンテンツ情報を更新
      await updateNetflixContent(id, {
        title: title.trim(),
        description: description.trim(),
        genres: selectedGenres,
        privacy,
      });
      Alert.alert('保存完了', 'コンテンツを更新しました', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('エラー', '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!content) {
    return null;
  }

  const contentTypeLabel = content.type === 'movie' ? '映画' : 'シリーズ';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Netflix型コンテンツ編集</Text>
          <Text style={styles.headerSubtitle}>{contentTypeLabel}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* ポスター画像 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ポスター画像 *</Text>
          <TouchableOpacity style={styles.posterPicker} onPress={pickPoster}>
            <Image source={{ uri: posterUri }} style={styles.posterImage} />
            <View style={styles.posterOverlay}>
              <Ionicons name="camera" size={32} color="#fff" />
              <Text style={styles.posterOverlayText}>変更</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.hint}>推奨: 2:3 (例: 600x900) • JPGまたはPNG • 2MB以下</Text>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>基本情報</Text>

          <Text style={styles.label}>タイトル *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="タイトルを入力"
            placeholderTextColor={Colors.textSecondary}
          />

          <Text style={styles.label}>説明</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="説明を入力"
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>ジャンル * (複数選択可)</Text>
          <View style={styles.genreContainer}>
            {GENRES.map((genre) => (
              <TouchableOpacity
                key={genre}
                style={[
                  styles.genreChip,
                  selectedGenres.includes(genre) && styles.genreChipSelected,
                ]}
                onPress={() => toggleGenre(genre)}
              >
                <Text
                  style={[
                    styles.genreChipText,
                    selectedGenres.includes(genre) && styles.genreChipTextSelected,
                  ]}
                >
                  {genre}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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

        {/* Content Type Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>コンテンツ情報</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>タイプ:</Text>
            <Text style={styles.infoValue}>{contentTypeLabel}</Text>
          </View>
          {content.type === 'movie' && content.duration && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>再生時間:</Text>
              <Text style={styles.infoValue}>{content.duration}分</Text>
            </View>
          )}
          {content.type === 'series' && content.seasons && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>シーズン数:</Text>
                <Text style={styles.infoValue}>{content.seasons.length}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>総エピソード数:</Text>
                <Text style={styles.infoValue}>
                  {content.seasons.reduce((acc, s) => acc + s.episodes.length, 0)}
                </Text>
              </View>
            </>
          )}
          <Text style={styles.infoNote}>
            ※ 画像やエピソード管理は今後のバージョンで対応予定です
          </Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>保存</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>キャンセル</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerMobile: {
    paddingTop: 48,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 16,
    color: Colors.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  genreChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  genreChipText: {
    fontSize: 14,
    color: Colors.text,
  },
  genreChipTextSelected: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  switchDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    width: 120,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  infoNote: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 12,
    fontStyle: 'italic',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  posterPicker: {
    width: 200,
    aspectRatio: 2 / 3,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'center',
  },
  posterImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.border,
  },
  posterOverlay: {
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
  posterOverlayText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
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
});
