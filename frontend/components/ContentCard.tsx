// Netflix型コンテンツカード

import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { NetflixContent } from '../types';
import { Colors } from '../constants/Colors';

interface ContentCardProps {
  content: NetflixContent;
  onPress: () => void;
}

export default function ContentCard({ content, onPress }: ContentCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Image source={{ uri: content.poster_url }} style={styles.poster} />
      <View style={styles.overlay}>
        <Text style={styles.rating}>★ {content.rating.toFixed(1)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 140,
    marginRight: 12,
  },
  poster: {
    width: 140,
    height: 210,
    borderRadius: 8,
    backgroundColor: Colors.border,
  },
  overlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  rating: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
});
