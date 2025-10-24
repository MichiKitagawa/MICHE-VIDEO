// 動画タブ（YouTube風）

import React, { useEffect, useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, useWindowDimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Header from '../../components/Header';
import CategoryChipsBar from '../../components/CategoryChipsBar';
import VideoCard from '../../components/VideoCard';
import ActionSheet from '../../components/ActionSheet';
import { Video } from '../../types';
import { getVideos } from '../../utils/mockApi';
import { Colors } from '../../constants/Colors';

type SortType = 'relevance' | 'upload_date' | 'view_count' | 'rating';

export default function VideosScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  // フィルター・ソート状態
  const [activeCategory, setActiveCategory] = useState('すべて');
  const [sortBy, setSortBy] = useState<SortType>('relevance');
  const [searchQuery, setSearchQuery] = useState('');

  // ActionSheet状態
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  // カテゴリー一覧を動的に生成
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(videos.map((v) => v.category)));
    return ['すべて', ...uniqueCategories.sort()];
  }, [videos]);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const data = await getVideos();
      setVideos(data);
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoPress = (videoId: string) => {
    router.push(`/video/${videoId}`);
  };

  const handleChannelPress = (userId: string) => {
    router.push(`/channel/${userId}`);
  };

  const handleProfilePress = () => {
    router.push('/auth');
  };

  const handleMorePress = (video: Video) => {
    setSelectedVideo(video);
    setActionSheetVisible(true);
  };

  const handleShare = () => {
    Alert.alert('共有', 'この機能は開発中です');
  };

  const handleSaveForLater = () => {
    Alert.alert('後で見る', '後で見るリストに追加しました');
  };

  const handleReport = () => {
    Alert.alert('報告', 'この動画を報告しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '報告', style: 'destructive', onPress: () => Alert.alert('報告完了', '報告を受け付けました') },
    ]);
  };

  // フィルター・ソート・検索処理
  const filteredAndSortedVideos = useMemo(() => {
    let result = [...videos];

    // 検索フィルター
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.title.toLowerCase().includes(query) ||
          v.user_name.toLowerCase().includes(query)
      );
    }

    // カテゴリーフィルター
    if (activeCategory !== 'すべて') {
      result = result.filter((v) => v.category === activeCategory);
    }

    // ソート
    switch (sortBy) {
      case 'relevance':
        // 関連度（デフォルト）: 評価 × 視聴回数の複合スコア
        result.sort((a, b) => {
          const scoreA = a.rating * Math.log10(a.view_count + 1);
          const scoreB = b.rating * Math.log10(b.view_count + 1);
          return scoreB - scoreA;
        });
        break;
      case 'upload_date':
        // アップロード日が新しい順
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'view_count':
        // 視聴回数が多い順
        result.sort((a, b) => b.view_count - a.view_count);
        break;
      case 'rating':
        // 評価が高い順
        result.sort((a, b) => b.rating - a.rating);
        break;
    }

    return result;
  }, [videos, activeCategory, sortBy, searchQuery]);

  // レスポンシブ対応：グリッド列数を計算
  const numColumns = useMemo(() => {
    if (width >= 1200) return 3; // デスクトップ
    if (width >= 768) return 2; // タブレット
    return 1; // モバイル
  }, [width]);

  // グリッドレイアウトかどうか
  const isGrid = numColumns > 1;

  if (loading) {
    return (
      <View style={styles.container}>
        <Header showSearch showProfile onProfilePress={handleProfilePress} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        showSearch
        showProfile
        onProfilePress={handleProfilePress}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <CategoryChipsBar
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {isGrid ? (
        // グリッドレイアウト
        <FlatList
          data={filteredAndSortedVideos}
          key={`grid-${numColumns}`} // numColumns変更時に再レンダリング
          numColumns={numColumns}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.gridItem, { width: `${100 / numColumns}%` }]}>
              <VideoCard
                video={item}
                onPress={() => handleVideoPress(item.id)}
                onChannelPress={handleChannelPress}
                onMorePress={handleMorePress}
                layout="grid"
              />
            </View>
          )}
          style={styles.list}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
        />
      ) : (
        // リストレイアウト
        <FlatList
          data={filteredAndSortedVideos}
          key="list"
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <VideoCard
              video={item}
              onPress={() => handleVideoPress(item.id)}
              onChannelPress={handleChannelPress}
              onMorePress={handleMorePress}
              layout="list"
            />
          )}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* ActionSheet */}
      <ActionSheet
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        title={selectedVideo?.title}
        actions={[
          { label: '共有', icon: 'share-outline', onPress: handleShare },
          { label: '後で見る', icon: 'bookmark-outline', onPress: handleSaveForLater },
          { label: '報告', icon: 'flag-outline', onPress: handleReport, destructive: true },
        ]}
      />
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
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  gridRow: {
    gap: 16,
  },
  gridItem: {
    paddingHorizontal: 8,
  },
});
