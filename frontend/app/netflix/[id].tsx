// Netflix コンテンツ詳細・再生ページ

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NetflixVideoPlayer from '../../components/NetflixVideoPlayer';
import SeasonEpisodeSelector from '../../components/SeasonEpisodeSelector';
import { NetflixContent, Episode } from '../../types';
import { getNetflixContentDetail } from '../../utils/mockApi';
import { Colors } from '../../constants/Colors';

export default function NetflixContentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [content, setContent] = useState<NetflixContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState<{episode: Episode; seasonNumber: number} | null>(null);

  const isMobile = width < 768;

  useEffect(() => {
    loadContent();
  }, [id]);

  const loadContent = async () => {
    try {
      const data = await getNetflixContentDetail(id);
      setContent(data);
    } catch (error) {
      console.error('Failed to load Netflix content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEpisodeSelect = (episode: Episode, seasonNumber: number) => {
    setCurrentEpisode({ episode, seasonNumber });
    // スクロールを一番上に戻す（動画プレーヤーが見えるように）
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!content) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>コンテンツが見つかりません</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 映画かシリーズか
  const isMovie = content.type === 'movie';

  // 現在再生中の動画URL
  const currentVideoUrl = isMovie
    ? content.video_url
    : currentEpisode?.episode.video_url;

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {content.title}
        </Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="heart-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* 動画プレーヤー（映画 or 選択されたエピソード） */}
        {currentVideoUrl && (
          <View style={styles.playerContainer}>
            <NetflixVideoPlayer
              videoUrl={currentVideoUrl}
              posterUrl={content.backdrop_url}
            />
          </View>
        )}

        {/* バックドロップ画像（動画がない場合） */}
        {!currentVideoUrl && (
          <Image
            source={{ uri: content.backdrop_url }}
            style={styles.backdrop}
            resizeMode="cover"
          />
        )}

        {/* コンテンツ情報 */}
        <View style={[styles.infoContainer, isMobile && styles.infoContainerMobile]}>
          {/* タイトル・メタ情報 */}
          <Text style={styles.title}>{content.title}</Text>

          <View style={styles.metaRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingText}>{content.rating.toFixed(1)}</Text>
            </View>
            <Text style={styles.metaText}>{content.release_year}年</Text>
            {isMovie && content.duration && (
              <Text style={styles.metaText}>{Math.floor(content.duration / 60)}時間{content.duration % 60}分</Text>
            )}
            <View style={styles.countryBadge}>
              <Text style={styles.countryText}>{content.country}</Text>
            </View>
          </View>

          {/* 再生ボタン（映画のみ、まだ動画がない場合） */}
          {isMovie && !currentVideoUrl && content.video_url && (
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => setCurrentEpisode(null)} // Trigger player
            >
              <Ionicons name="play" size={24} color={Colors.background} />
              <Text style={styles.playButtonText}>再生</Text>
            </TouchableOpacity>
          )}

          {/* 説明文 */}
          <View style={styles.descriptionContainer}>
            <Text
              style={styles.description}
              numberOfLines={descriptionExpanded ? undefined : 3}
            >
              {content.description}
            </Text>
            <TouchableOpacity onPress={() => setDescriptionExpanded(!descriptionExpanded)}>
              <Text style={styles.expandButton}>
                {descriptionExpanded ? '閉じる' : 'もっと見る'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ジャンル */}
          <View style={styles.genresContainer}>
            <Text style={styles.genresLabel}>ジャンル: </Text>
            <Text style={styles.genresText}>{content.genres.join(', ')}</Text>
          </View>

          {/* シリーズの場合：エピソード選択 */}
          {!isMovie && content.seasons && content.seasons.length > 0 && (
            <View style={styles.episodesSection}>
              <SeasonEpisodeSelector
                seasons={content.seasons}
                onEpisodeSelect={handleEpisodeSelect}
                currentEpisodeId={
                  currentEpisode
                    ? `s${currentEpisode.seasonNumber}e${currentEpisode.episode.episode_number}`
                    : undefined
                }
              />
            </View>
          )}
        </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: Colors.text,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
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
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  scrollView: {
    flex: 1,
  },
  playerContainer: {
    backgroundColor: Colors.text,
  },
  backdrop: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: Colors.border,
  },
  infoContainer: {
    padding: 24,
  },
  infoContainerMobile: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.card,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  metaText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  countryBadge: {
    backgroundColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countryText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
    marginBottom: 20,
  },
  playButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.background,
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.text,
    marginBottom: 8,
  },
  expandButton: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  genresContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  genresLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  genresText: {
    fontSize: 14,
    color: Colors.text,
  },
  episodesSection: {
    marginTop: 8,
  },
});
