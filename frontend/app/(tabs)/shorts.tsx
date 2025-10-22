// ショート画面（TikTok/YouTubeショート風）

import React, { useEffect, useState, useRef } from 'react';
import { View, FlatList, StyleSheet, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import ShortVideoPlayer from '../../components/ShortVideoPlayer';
import { Short } from '../../types';
import { getShorts } from '../../utils/mockApi';
import { Colors } from '../../constants/Colors';

const TAB_BAR_HEIGHT = 60;

export default function ShortsScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const [shorts, setShorts] = useState<Short[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeShortId, setActiveShortId] = useState<string | null>(null);

  // タブバーを引いた実際の表示可能高さ
  const contentHeight = height - TAB_BAR_HEIGHT;

  useEffect(() => {
    loadShorts();
  }, []);

  const loadShorts = async () => {
    try {
      const data = await getShorts();
      setShorts(data);
    } catch (error) {
      console.error('Failed to load shorts:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初回ロード時に最初の動画をアクティブに設定
  useEffect(() => {
    if (shorts.length > 0 && !activeShortId) {
      setActiveShortId(shorts[0].id);
    }
  }, [shorts]);

  // 表示中のアイテムが変わったときのハンドラー
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      // 最も多く表示されているアイテムを取得
      const mostVisible = viewableItems.reduce((prev: any, current: any) => {
        return (current.percentVisible || 0) > (prev.percentVisible || 0) ? current : prev;
      });

      if (mostVisible.item) {
        setActiveShortId(mostVisible.item.id);
      }
    }
  }).current;

  // viewability設定
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80, // 80%以上表示されたらアクティブ
    minimumViewTime: 300, // 最低300ms表示される必要がある
  }).current;

  const handleChannelPress = (userId: string) => {
    router.push(`/channel/${userId}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={shorts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ShortVideoPlayer
            short={item}
            isActive={activeShortId === item.id}
            onChannelPress={handleChannelPress}
          />
        )}
        pagingEnabled
        decelerationRate="fast"
        snapToInterval={contentHeight}
        snapToAlignment="start"
        showsVerticalScrollIndicator={false}
        disableIntervalMomentum
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.text,
  },
});
