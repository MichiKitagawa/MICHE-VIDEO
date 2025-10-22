// Netflixカテゴリー行

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { NetflixContent } from '../types';
import ContentCard from './ContentCard';
import { Colors } from '../constants/Colors';

interface CategoryRowProps {
  title: string;
  contents: NetflixContent[];
  onContentPress: (content: NetflixContent) => void;
}

export default function CategoryRow({ title, contents, onContentPress }: CategoryRowProps) {
  if (contents.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {contents.map((content) => (
          <ContentCard
            key={content.id}
            content={content}
            onPress={() => onContentPress(content)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
});
