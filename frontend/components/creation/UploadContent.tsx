// アップロードコンテンツ（動画・ショートアップロード）

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

export default function UploadContent() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>アップロード</Text>
      <Text style={styles.subtitle}>新しい動画・ショートをアップロード</Text>

      <View style={[styles.uploadCardsContainer, isMobile && styles.uploadCardsContainerMobile]}>
        {/* 通常動画 */}
        <TouchableOpacity
          style={[styles.uploadCard, isMobile && styles.uploadCardMobile]}
          onPress={() => router.push('/upload-video')}
        >
          <View style={styles.uploadCardIconContainer}>
            <Ionicons name="videocam" size={64} color={Colors.primary} />
          </View>
          <Text style={styles.uploadCardTitle}>通常動画</Text>
          <Text style={styles.uploadCardDescription}>
            横型の動画をアップロード{'\n'}
            詳細な情報とIPライセンスを設定可能
          </Text>
          <View style={styles.uploadCardFeatures}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
              <Text style={styles.featureText}>長尺対応</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
              <Text style={styles.featureText}>IP設定可能</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
              <Text style={styles.featureText}>詳細設定</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ショート */}
        <TouchableOpacity
          style={[styles.uploadCard, isMobile && styles.uploadCardMobile]}
          onPress={() => router.push('/upload-short')}
        >
          <View style={styles.uploadCardIconContainer}>
            <Ionicons name="phone-portrait" size={64} color="#FF0050" />
          </View>
          <Text style={styles.uploadCardTitle}>ショート</Text>
          <Text style={styles.uploadCardDescription}>
            縦型の短い動画をアップロード{'\n'}
            素早く簡単に投稿
          </Text>
          <View style={styles.uploadCardFeatures}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#FF0050" />
              <Text style={styles.featureText}>60秒以下推奨</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#FF0050" />
              <Text style={styles.featureText}>縦型動画</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#FF0050" />
              <Text style={styles.featureText}>簡単投稿</Text>
            </View>
          </View>
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
    marginBottom: 32,
  },
  uploadCardsContainer: {
    flexDirection: 'row',
    gap: 24,
    justifyContent: 'center',
  },
  uploadCardsContainerMobile: {
    flexDirection: 'column',
  },
  uploadCard: {
    flex: 1,
    maxWidth: 400,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  uploadCardMobile: {
    maxWidth: '100%',
    marginBottom: 16,
  },
  uploadCardIconContainer: {
    marginBottom: 20,
  },
  uploadCardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  uploadCardDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  uploadCardFeatures: {
    width: '100%',
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: Colors.text,
  },
});
