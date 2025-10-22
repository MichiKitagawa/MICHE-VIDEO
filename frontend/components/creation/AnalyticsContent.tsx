// アナリティクスコンテンツ（詳細統計）

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function AnalyticsContent() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>アナリティクス</Text>
      <Text style={styles.subtitle}>詳細な統計情報</Text>

      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>実装予定</Text>
        <Text style={styles.placeholderDescription}>
          グラフやチャートで詳細な統計情報を表示
        </Text>
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
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  placeholder: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  placeholderDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
