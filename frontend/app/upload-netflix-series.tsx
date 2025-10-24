// Netflix型コンテンツアップロード - シリーズ

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

interface Episode {
  id: string;
  title: string;
  description: string;
  duration: string;
  videoUri: string | null;
}

interface Season {
  id: string;
  seasonNumber: number;
  episodes: Episode[];
}

export default function UploadNetflixSeriesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Basic info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [country, setCountry] = useState('JP');
  const [releaseYear, setReleaseYear] = useState(new Date().getFullYear().toString());

  // Images
  const [posterUri, setPosterUri] = useState<string | null>(null);
  const [backdropUri, setBackdropUri] = useState<string | null>(null);

  // Seasons & Episodes
  const [seasons, setSeasons] = useState<Season[]>([
    {
      id: '1',
      seasonNumber: 1,
      episodes: [],
    },
  ]);

  // Settings are managed by platform

  const toggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter((g) => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const pickImage = async (type: 'poster' | 'backdrop') => {
    const { status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
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

  const addSeason = () => {
    const newSeasonNumber = seasons.length + 1;
    setSeasons([
      ...seasons,
      {
        id: Date.now().toString(),
        seasonNumber: newSeasonNumber,
        episodes: [],
      },
    ]);
  };

  const addEpisode = (seasonId: string) => {
    Alert.alert(
      'エピソード追加',
      'エピソードの詳細を入力してください',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '追加',
          onPress: () => {
            const season = seasons.find((s) => s.id === seasonId);
            if (season) {
              const newEpisode: Episode = {
                id: Date.now().toString(),
                title: `エピソード ${season.episodes.length + 1}`,
                description: '',
                duration: '45',
                videoUri: null,
              };
              setSeasons(
                seasons.map((s) =>
                  s.id === seasonId ? { ...s, episodes: [...s.episodes, newEpisode] } : s
                )
              );
            }
          },
        },
      ]
    );
  };

  const removeEpisode = (seasonId: string, episodeId: string) => {
    setSeasons(
      seasons.map((s) =>
        s.id === seasonId
          ? { ...s, episodes: s.episodes.filter((e) => e.id !== episodeId) }
          : s
      )
    );
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
    if (seasons.every((s) => s.episodes.length === 0)) {
      Alert.alert('エラー', '少なくとも1つのエピソードを追加してください');
      return;
    }

    Alert.alert(
      '成功',
      'Netflix型シリーズのアップロードが完了しました',
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
        <Text style={styles.headerTitle}>Netflix型シリーズ</Text>
      </View>

      {/* Content Type Info */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color={Colors.primary} />
        <Text style={styles.infoText}>
          シリーズの基本情報を入力し、シーズンとエピソードを管理してください
        </Text>
      </View>

      {/* Basic Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>基本情報</Text>

        <Text style={styles.label}>シリーズタイトル *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="シリーズのタイトルを入力"
          placeholderTextColor={Colors.textSecondary}
        />

        <Text style={styles.label}>説明 *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="シリーズの説明を入力"
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
      </View>

      {/* Seasons & Episodes Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>シーズン管理</Text>

        {seasons.map((season) => (
          <View key={season.id} style={styles.seasonCard}>
            <View style={styles.seasonHeader}>
              <Text style={styles.seasonTitle}>シーズン {season.seasonNumber}</Text>
              <Text style={styles.episodeCount}>{season.episodes.length} エピソード</Text>
            </View>

            {season.episodes.map((episode) => (
              <View key={episode.id} style={styles.episodeItem}>
                <View style={styles.episodeInfo}>
                  <Ionicons name="play-circle" size={20} color={Colors.primary} />
                  <View style={styles.episodeDetails}>
                    <Text style={styles.episodeTitle}>{episode.title}</Text>
                    <Text style={styles.episodeDuration}>{episode.duration}分</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeEpisode(season.id, episode.id)}
                >
                  <Ionicons name="close-circle" size={24} color="#D32F2F" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addEpisodeButton}
              onPress={() => addEpisode(season.id)}
            >
              <Ionicons name="add-circle" size={20} color={Colors.primary} />
              <Text style={styles.addEpisodeText}>エピソードを追加</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addSeasonButton} onPress={addSeason}>
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.addSeasonText}>シーズンを追加</Text>
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
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.primary + '10',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
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
  seasonCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  seasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seasonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  episodeCount: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  episodeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  episodeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  episodeDetails: {
    flex: 1,
  },
  episodeTitle: {
    fontSize: 15,
    color: Colors.text,
    marginBottom: 2,
  },
  episodeDuration: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  removeButton: {
    padding: 4,
  },
  addEpisodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  addEpisodeText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '500',
  },
  addSeasonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
  },
  addSeasonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
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
