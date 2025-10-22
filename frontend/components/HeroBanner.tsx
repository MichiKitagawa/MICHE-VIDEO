// Netflixヒーローバナー

import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NetflixContent } from '../types';
import { Colors } from '../constants/Colors';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface HeroBannerProps {
  content: NetflixContent;
  onPlay: () => void;
  onInfo: () => void;
}

export default function HeroBanner({ content, onPlay, onInfo }: HeroBannerProps) {
  return (
    <View style={styles.container}>
      <Image source={{ uri: content.backdrop_url }} style={styles.backdrop} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)', Colors.background]}
        style={styles.gradient}
      />
      <View style={styles.content}>
        <Text style={styles.title}>{content.title}</Text>
        <View style={styles.metadata}>
          <Text style={styles.year}>{content.release_year}</Text>
          <View style={styles.dot} />
          <Text style={styles.rating}>★ {content.rating.toFixed(1)}</Text>
          <View style={styles.dot} />
          <Text style={styles.genres}>{content.genres.slice(0, 2).join(' • ')}</Text>
        </View>
        <Text style={styles.description} numberOfLines={3}>
          {content.description}
        </Text>
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.playButton} onPress={onPlay}>
            <Ionicons name="play" size={24} color={Colors.background} />
            <Text style={styles.playButtonText}>再生</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.infoButton} onPress={onInfo}>
            <Ionicons name="information-circle-outline" size={24} color={Colors.background} />
            <Text style={styles.infoButtonText}>詳細情報</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: 500,
    marginBottom: 24,
  },
  backdrop: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  content: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.background,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  year: {
    fontSize: 14,
    color: Colors.background,
    fontWeight: '600',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.background,
    marginHorizontal: 8,
  },
  rating: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '600',
  },
  genres: {
    fontSize: 14,
    color: Colors.background,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: Colors.background,
    lineHeight: 20,
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  playButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    paddingVertical: 12,
    borderRadius: 6,
    gap: 8,
  },
  playButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  infoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 12,
    borderRadius: 6,
    gap: 8,
  },
  infoButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.background,
  },
});
