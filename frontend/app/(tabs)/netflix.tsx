// Netflixタブ

import React, { useEffect, useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import HeroBanner from '../../components/HeroBanner';
import CategoryRow from '../../components/CategoryRow';
import NetflixHeader from '../../components/NetflixHeader';
import { NetflixContent, SubscriptionPlan } from '../../types';
import { getNetflixContents, getCurrentSubscriptionPlan } from '../../utils/mockApi';
import { filterNetflixContentByPlan } from '../../utils/contentAccess';
import { Colors } from '../../constants/Colors';

type CategoryType = 'home' | 'series' | 'movie';
type SortType = 'popular' | 'newest' | 'rating' | 'title';

export default function NetflixScreen() {
  const router = useRouter();
  const [contents, setContents] = useState<NetflixContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);

  // フィルター・ソート状態
  const [activeCategory, setActiveCategory] = useState<CategoryType>('home');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortType>('popular');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [contentsData, planData] = await Promise.all([
        getNetflixContents(),
        getCurrentSubscriptionPlan(),
      ]);
      setContents(contentsData);
      setCurrentPlan(planData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContentPress = (content: NetflixContent) => {
    // 詳細画面へ遷移
    router.push(`/netflix/${content.id}`);
  };

  const handlePlay = (content: NetflixContent) => {
    // 再生画面へ遷移
    router.push(`/netflix/${content.id}`);
  };

  const handleProfilePress = () => {
    router.push('/auth');
  };

  // フィルター・ソート処理
  const filteredAndSortedContents = useMemo(() => {
    let result = [...contents];

    // プランによるフィルタリング（Netflix アクセス & アダルトコンテンツ）
    if (currentPlan) {
      result = filterNetflixContentByPlan(result, currentPlan);
    }

    // カテゴリーフィルター
    if (activeCategory === 'series') {
      result = result.filter(c => c.type === 'series');
    } else if (activeCategory === 'movie') {
      result = result.filter(c => c.type === 'movie');
    }

    // ジャンルフィルター
    if (selectedGenre) {
      result = result.filter(c => c.genres.includes(selectedGenre));
    }

    // 国フィルター
    if (selectedCountry) {
      result = result.filter(c => c.country === selectedCountry);
    }

    // ソート
    switch (sortBy) {
      case 'popular':
        // ratingが高い順（人気順と仮定）
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        // release_yearが新しい順
        result.sort((a, b) => b.release_year - a.release_year);
        break;
      case 'rating':
        // rating順
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'title':
        // タイトルのA-Z順（日本語の場合は文字コード順）
        result.sort((a, b) => a.title.localeCompare(b.title, 'ja'));
        break;
    }

    return result;
  }, [contents, currentPlan, activeCategory, selectedGenre, selectedCountry, sortBy]);

  if (loading) {
    return (
      <View style={styles.container}>
        <NetflixHeader
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          selectedGenre={selectedGenre}
          onGenreChange={setSelectedGenre}
          selectedCountry={selectedCountry}
          onCountryChange={setSelectedCountry}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onProfilePress={handleProfilePress}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  // Netflix視聴制限チェック
  if (currentPlan && !currentPlan.has_netflix_access) {
    return (
      <View style={styles.container}>
        <NetflixHeader
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          selectedGenre={selectedGenre}
          onGenreChange={setSelectedGenre}
          selectedCountry={selectedCountry}
          onCountryChange={setSelectedCountry}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onProfilePress={handleProfilePress}
        />
        <View style={styles.restrictedContainer}>
          <Ionicons name="lock-closed" size={64} color={Colors.textSecondary} />
          <Text style={styles.restrictedTitle}>Netflix型コンテンツは有料プランで視聴できます</Text>
          <Text style={styles.restrictedDescription}>
            有料スタンダードまたは有料プレミアムにアップグレードして、
            {'\n'}
            Netflix型の高品質コンテンツをお楽しみください
          </Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => router.push('/(tabs)/settings' as any)}
          >
            <Text style={styles.upgradeButtonText}>プランを見る</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // カテゴリー別にコンテンツを分類（ホーム画面用）
  const featuredContent = filteredAndSortedContents[0]; // ヒーローバナー用
  const movies = filteredAndSortedContents.filter(c => c.type === 'movie');
  const series = filteredAndSortedContents.filter(c => c.type === 'series');
  const recentlyAdded = [...filteredAndSortedContents]
    .sort((a, b) => b.release_year - a.release_year)
    .slice(0, 5);

  return (
    <View style={styles.container}>
      <NetflixHeader
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        selectedGenre={selectedGenre}
        onGenreChange={setSelectedGenre}
        selectedCountry={selectedCountry}
        onCountryChange={setSelectedCountry}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onProfilePress={handleProfilePress}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeCategory === 'home' && (
          <>
            {/* ヒーローバナー */}
            {featuredContent && (
              <HeroBanner
                content={featuredContent}
                onPlay={() => handlePlay(featuredContent)}
                onInfo={() => handleContentPress(featuredContent)}
              />
            )}

            {/* カテゴリー行 */}
            {recentlyAdded.length > 0 && (
              <CategoryRow
                title="最近追加されたコンテンツ"
                contents={recentlyAdded}
                onContentPress={handleContentPress}
              />
            )}

            {series.length > 0 && (
              <CategoryRow
                title="人気のシリーズ"
                contents={series}
                onContentPress={handleContentPress}
              />
            )}

            {movies.length > 0 && (
              <CategoryRow
                title="おすすめの映画"
                contents={movies}
                onContentPress={handleContentPress}
              />
            )}

            {filteredAndSortedContents.length > 0 && (
              <CategoryRow
                title="すべてのコンテンツ"
                contents={filteredAndSortedContents}
                onContentPress={handleContentPress}
              />
            )}
          </>
        )}

        {activeCategory === 'series' && (
          <>
            {/* シリーズのヒーローバナー */}
            {featuredContent && featuredContent.type === 'series' && (
              <HeroBanner
                content={featuredContent}
                onPlay={() => handlePlay(featuredContent)}
                onInfo={() => handleContentPress(featuredContent)}
              />
            )}

            {/* シリーズ一覧 */}
            {filteredAndSortedContents.length > 0 && (
              <CategoryRow
                title="シリーズ"
                contents={filteredAndSortedContents}
                onContentPress={handleContentPress}
              />
            )}
          </>
        )}

        {activeCategory === 'movie' && (
          <>
            {/* 映画のヒーローバナー */}
            {featuredContent && featuredContent.type === 'movie' && (
              <HeroBanner
                content={featuredContent}
                onPlay={() => handlePlay(featuredContent)}
                onInfo={() => handleContentPress(featuredContent)}
              />
            )}

            {/* 映画一覧 */}
            {filteredAndSortedContents.length > 0 && (
              <CategoryRow
                title="映画"
                contents={filteredAndSortedContents}
                onContentPress={handleContentPress}
              />
            )}
          </>
        )}
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
  },
  scrollView: {
    flex: 1,
  },
  restrictedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  restrictedTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  restrictedDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  upgradeButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});
