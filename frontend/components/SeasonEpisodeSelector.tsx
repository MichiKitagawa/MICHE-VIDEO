// SeasonEpisodeSelector コンポーネント

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Season, Episode } from '../types';
import { Colors } from '../constants/Colors';

interface SeasonEpisodeSelectorProps {
  seasons: Season[];
  onEpisodeSelect: (episode: Episode, seasonNumber: number) => void;
  currentEpisodeId?: string;
}

export default function SeasonEpisodeSelector({
  seasons,
  onEpisodeSelect,
  currentEpisodeId,
}: SeasonEpisodeSelectorProps) {
  const [selectedSeason, setSelectedSeason] = useState(1);

  const currentSeason = seasons.find(s => s.season_number === selectedSeason) || seasons[0];

  return (
    <View style={styles.container}>
      {/* シーズンタブ */}
      {seasons.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.seasonTabsContainer}
          contentContainerStyle={styles.seasonTabsContent}
        >
          {seasons.map((season) => (
            <TouchableOpacity
              key={season.season_number}
              style={[
                styles.seasonTab,
                selectedSeason === season.season_number && styles.seasonTabActive,
              ]}
              onPress={() => setSelectedSeason(season.season_number)}
            >
              <Text
                style={[
                  styles.seasonTabText,
                  selectedSeason === season.season_number && styles.seasonTabTextActive,
                ]}
              >
                シーズン {season.season_number}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* エピソード一覧 */}
      <View style={styles.episodesContainer}>
        <Text style={styles.episodesTitle}>
          エピソード ({currentSeason.episodes.length})
        </Text>

        {currentSeason.episodes.map((episode) => {
          const episodeId = `s${selectedSeason}e${episode.episode_number}`;
          const isCurrentEpisode = episodeId === currentEpisodeId;

          return (
            <TouchableOpacity
              key={episode.episode_number}
              style={[
                styles.episodeCard,
                isCurrentEpisode && styles.episodeCardActive,
              ]}
              onPress={() => onEpisodeSelect(episode, selectedSeason)}
            >
              <View style={styles.episodeContent}>
                {/* サムネイル */}
                <View style={styles.episodeThumbnailContainer}>
                  <Image
                    source={{ uri: episode.thumbnail_url }}
                    style={styles.episodeThumbnail}
                  />
                  {isCurrentEpisode && (
                    <View style={styles.playingIndicator}>
                      <Ionicons name="play-circle" size={32} color={Colors.primary} />
                    </View>
                  )}
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>{episode.duration}分</Text>
                  </View>
                </View>

                {/* エピソード情報 */}
                <View style={styles.episodeInfo}>
                  <View style={styles.episodeHeader}>
                    <Text style={styles.episodeNumber}>
                      {episode.episode_number}. {episode.title}
                    </Text>
                    {isCurrentEpisode && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>再生中</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.episodeDescription} numberOfLines={2}>
                    {episode.description}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  seasonTabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  seasonTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  seasonTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  seasonTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  seasonTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  seasonTabTextActive: {
    color: Colors.background,
  },
  episodesContainer: {
    padding: 16,
  },
  episodesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  episodeCard: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  episodeCardActive: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  episodeContent: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  episodeThumbnailContainer: {
    position: 'relative',
  },
  episodeThumbnail: {
    width: 160,
    height: 90,
    borderRadius: 8,
    backgroundColor: Colors.border,
  },
  playingIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -16 }, { translateY: -16 }],
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  episodeInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  episodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  episodeNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  currentBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.background,
  },
  episodeDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
