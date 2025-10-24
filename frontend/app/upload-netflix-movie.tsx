// Netflix型コンテンツアップロード - 映画

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
  Switch,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

const GENRES = ['アクション', 'コメディ', 'ドラマ', 'ホラー', 'SF', 'ロマンス', 'スリラー', 'ドキュメンタリー', 'アニメ', 'ファミリー'];
const COUNTRIES = [
  { code: 'JP', name: '日本' },
  { code: 'US', name: 'アメリカ' },
  { code: 'UK', name: 'イギリス' },
  { code: 'KR', name: '韓国' },
  { code: 'FR', name: 'フランス' },
  { code: 'DE', name: 'ドイツ' },
];

export default function UploadNetflixMovieScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Basic info
  const [contentType, setContentType] = useState<'movie' | 'series'>('movie');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [country, setCountry] = useState('JP');
  const [releaseYear, setReleaseYear] = useState(new Date().getFullYear().toString());
  const [duration, setDuration] = useState('120');

  // Images & Video
  const [posterUri, setPosterUri] = useState<string | null>(null);
  const [backdropUri, setBackdropUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);

  // Settings are managed by platform

  const toggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter((g) => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const pickImage = async (type: 'poster' | 'backdrop') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('エラー', 'ライブラリへのアクセス許可が必要です');
      return;
    }

    const aspect = type === 'poster' ? [2, 3] : [16, 9];
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      if (type === 'poster') {
        setPosterUri(result.assets[0].uri);
      } else {
        setBackdropUri(result.assets[0].uri);
      }
    }
  };

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

  const handleUpload = () => {
    if (!title.trim()) {
      Alert.alert('エラー', 'タイトルを入力してください');
      return;
    }
    if (!description.trim()) {
      Alert.alert('エラー', '説明を入力してください');
      return;
    }
    if (selectedGenres.length === 0) {
      Alert.alert('エラー', '少なくとも1つのジャンルを選択してください');
      return;
    }
    if (!videoUri && contentType === 'movie') {
      Alert.alert('エラー', '動画ファイルを選択してください');
      return;
    }

    Alert.alert(
      '成功',
      'Netflix型コンテンツのアップロードが完了しました',
      [
        {
          text: 'OK',
          onPress: () => router.back(),
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
        <Text style={styles.headerTitle}>Netflix型コンテンツ</Text>
      </View>

      {/* Content Type Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>コンテンツタイプ</Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeButton, contentType === 'movie' && styles.typeButtonActive]}
            onPress={() => setContentType('movie')}
          >
            <Text style={[styles.typeButtonText, contentType === 'movie' && styles.typeButtonTextActive]}>
              映画
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, contentType === 'series' && styles.typeButtonActive]}
            onPress={() => {
              Alert.alert('情報', 'シリーズのアップロードは別画面で行います');
              router.replace('/upload-netflix-series');
            }}
          >
            <Text style={[styles.typeButtonText, contentType === 'series' && styles.typeButtonTextActive]}>
              シリーズ
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Basic Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>基本情報</Text>

        <Text style={styles.label}>タイトル *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="映画のタイトルを入力"
          placeholderTextColor={Colors.textSecondary}
        />

        <Text style={styles.label}>説明 *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="映画の説明を入力"
          placeholderTextColor={Colors.textSecondary}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>ジャンル *</Text>
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

        <View style={[styles.row, isMobile && styles.rowMobile]}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>制作国 *</Text>
            <View style={styles.picker}>
              {COUNTRIES.map((c) => (
                <TouchableOpacity
                  key={c.code}
                  style={[styles.pickerItem, country === c.code && styles.pickerItemActive]}
                  onPress={() => setCountry(c.code)}
                >
                  <Text style={[styles.pickerItemText, country === c.code && styles.pickerItemTextActive]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.halfInput}>
            <Text style={styles.label}>公開年 *</Text>
            <TextInput
              style={styles.input}
              value={releaseYear}
              onChangeText={setReleaseYear}
              placeholder="2025"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="numeric"
            />
          </View>
        </View>

        <Text style={styles.label}>再生時間（分） *</Text>
        <TextInput
          style={styles.input}
          value={duration}
          onChangeText={setDuration}
          placeholder="120"
          placeholderTextColor={Colors.textSecondary}
          keyboardType="numeric"
        />
      </View>

      {/* Media Files */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>メディアファイル</Text>

        <View style={[styles.row, isMobile && styles.rowMobile]}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>ポスター画像 (2:3)</Text>
            <TouchableOpacity style={styles.imagePickerButton} onPress={() => pickImage('poster')}>
              {posterUri ? (
                <Image source={{ uri: posterUri }} style={styles.imagePreview} />
              ) : (
                <>
                  <Ionicons name="image" size={48} color={Colors.textSecondary} />
                  <Text style={styles.imagePickerText}>画像を選択</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.halfInput}>
            <Text style={styles.label}>バックドロップ画像 (16:9)</Text>
            <TouchableOpacity style={styles.imagePickerButton} onPress={() => pickImage('backdrop')}>
              {backdropUri ? (
                <Image source={{ uri: backdropUri }} style={styles.imagePreview} />
              ) : (
                <>
                  <Ionicons name="image" size={48} color={Colors.textSecondary} />
                  <Text style={styles.imagePickerText}>画像を選択</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.label}>動画ファイル *</Text>
        <TouchableOpacity style={styles.videoPickerButton} onPress={pickVideo}>
          {videoUri ? (
            <View style={styles.videoSelected}>
              <Ionicons name="checkmark-circle" size={24} color="#00C853" />
              <Text style={styles.videoSelectedText}>動画が選択されました</Text>
            </View>
          ) : (
            <>
              <Ionicons name="videocam" size={48} color={Colors.textSecondary} />
              <Text style={styles.videoPickerText}>動画ファイルを選択</Text>
            </>
          )}
        </TouchableOpacity>
      </View>


      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>キャンセル</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.uploadButton} onPress={handleUpload}>
          <Ionicons name="cloud-upload" size={20} color="#fff" />
          <Text style={styles.uploadButtonText}>アップロード</Text>
        </TouchableOpacity>
      </View>
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
  typeSelector: {
    flexDirection: 'row',
    gap: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  typeButtonTextActive: {
    color: '#fff',
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
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
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
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  rowMobile: {
    flexDirection: 'column',
  },
  halfInput: {
    flex: 1,
  },
  picker: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    maxHeight: 150,
  },
  pickerItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerItemActive: {
    backgroundColor: Colors.primary + '20',
  },
  pickerItemText: {
    fontSize: 15,
    color: Colors.text,
  },
  pickerItemTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  imagePickerButton: {
    height: 200,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePickerText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  videoPickerButton: {
    height: 120,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  videoSelectedText: {
    fontSize: 15,
    color: '#00C853',
    fontWeight: '500',
  },
  videoPickerText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  tierSelector: {
    flexDirection: 'row',
    gap: 16,
  },
  tierButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  tierButtonActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  tierButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  tierButtonTextActive: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  switchLabel: {
    fontSize: 15,
    color: Colors.text,
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
  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
