# Issue: チャンネルページ遷移機能の実装

## 📋 問題の言語化 (What)

### 現状の問題

**症状:**
- Shortsタブの動画で投稿者のアバターをクリックしても何も起こらない
- Videosタブ（YouTube風）の動画カードで投稿者のアバターをクリックしても何も起こらない
- ユーザーはクリエイターのチャンネルページに移動できない

**発生箇所:**
- `components/ShortVideoPlayer.tsx`（Shortsのアバター）
- `components/VideoCard.tsx`（Videosのアバター）

**根本原因:**

```typescript
// ShortVideoPlayer.tsx:76-79
<View style={styles.avatarContainer}>
  <Image source={{ uri: short.user_avatar }} style={styles.avatar} />
</View>
// ← TouchableOpacityで囲まれていない、onPressハンドラーもない
```

```typescript
// VideoCard.tsx:68 (Grid layout)
<Image source={{ uri: video.user_avatar }} style={styles.gridAvatar} />
// ← TouchableOpacityで囲まれていない、onPressハンドラーもない
```

アバターは単なる`Image`コンポーネントで、クリック/タップ可能な要素（`TouchableOpacity`）で囲まれていない。

### 期待される動作

1. **Shortsのアバタークリック**: 投稿者のチャンネルページに遷移
2. **Videosのアバタークリック**: 投稿者のチャンネルページに遷移
3. **チャンネルページ**:
   - チャンネル情報（名前、説明、登録者数）表示
   - そのチャンネルがアップロードした動画一覧表示
   - チャンネル登録ボタン
   - レスポンシブ対応（Mobile/Desktop）

### 参考実装

**TikTok/Instagram Reels/YouTubeの動作:**
- アバターをタップ → クリエイターのプロフィール/チャンネルページに遷移
- チャンネルページでは投稿一覧、フォロワー数、説明文などが表示される
- YouTubeでは動画カードのチャンネル名やアバターをクリックでチャンネルページへ

## 🛠️ 修正方法 (How)

### 前提条件の確認と問題点

現在の型定義を確認すると：

```typescript
// types/index.ts
export interface Video {
  id: string;
  title: string;
  user_name: string;
  user_avatar: string;
  // ❌ user_idやchannel_idが存在しない
}

export interface Short {
  id: string;
  title: string;
  user_name: string;
  user_avatar: string;
  // ❌ user_idやchannel_idが存在しない
}
```

**課題:**
1. チャンネルページに遷移するための`user_id`/`channel_id`フィールドがない
2. チャンネルページのルート（`/channel/[id]`）が存在しない
3. チャンネル情報を取得するAPI関数がない
4. チャンネルデータのモックデータがない

### アプローチ: 段階的実装

#### Phase 1: 型定義の拡張

**1. `types/index.ts`の変更**

```typescript
// Video型にuser_idを追加
export interface Video {
  id: string;
  title: string;
  thumbnail_url: string;
  user_id: string; // ✨ 追加: チャンネルID
  user_name: string;
  user_avatar: string;
  view_count: number;
  created_at: string;
  duration: number;
  category: string;
  rating: number;
  is_adult: boolean;
}

// Short型にuser_idを追加
export interface Short {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string;
  user_id: string; // ✨ 追加: チャンネルID
  user_name: string;
  user_avatar: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  is_adult: boolean;
}

// ✨ 新規追加: Channel型
export interface Channel {
  id: string;
  name: string;
  avatar_url: string;
  banner_url?: string; // チャンネルバナー画像
  description: string;
  subscriber_count: number;
  video_count: number;
  created_at: string;
  is_verified: boolean; // 認証バッジ
}

// ✨ 新規追加: ChannelDetail型（チャンネルページ用）
export interface ChannelDetail extends Channel {
  videos: Video[]; // そのチャンネルの動画一覧
  shorts: Short[]; // そのチャンネルのShorts一覧
}
```

#### Phase 2: モックデータの更新

**1. `mock/channels.json`の作成**

```json
[
  {
    "id": "ch001",
    "name": "テクノロジー解説チャンネル",
    "avatar_url": "https://i.pravatar.cc/150?img=11",
    "banner_url": "https://picsum.photos/seed/tech/1600/400",
    "description": "最新のテクノロジーやガジェットについて分かりやすく解説します。",
    "subscriber_count": 125000,
    "video_count": 342,
    "created_at": "2020-03-15T00:00:00Z",
    "is_verified": true
  },
  {
    "id": "ch002",
    "name": "料理研究家 山田",
    "avatar_url": "https://i.pravatar.cc/150?img=5",
    "banner_url": "https://picsum.photos/seed/cooking/1600/400",
    "description": "簡単で美味しい家庭料理のレシピを毎週アップロードしています。",
    "subscriber_count": 89000,
    "video_count": 156,
    "created_at": "2019-06-20T00:00:00Z",
    "is_verified": false
  }
]
```

**2. 既存のモックデータに`user_id`を追加**

`mock/videos.json`の各動画に:
```json
{
  "id": "v001",
  "user_id": "ch001", // ✨ 追加
  "user_name": "テクノロジー解説チャンネル",
  ...
}
```

`mock/shorts.json`の各ショートに:
```json
{
  "id": "s001",
  "user_id": "ch001", // ✨ 追加
  "user_name": "テクノロジー解説チャンネル",
  ...
}
```

#### Phase 3: API関数の追加

**`utils/mockApi.ts`に追加**

```typescript
import channelsData from '../mock/channels.json';

// チャンネル一覧取得
export const getChannels = async (): Promise<Channel[]> => {
  await delay(300);
  return channelsData as Channel[];
};

// チャンネル詳細取得
export const getChannelDetail = async (channelId: string): Promise<ChannelDetail | null> => {
  await delay(300);

  const channels = await getChannels();
  const channel = channels.find((c) => c.id === channelId);

  if (!channel) {
    return null;
  }

  // そのチャンネルの動画を取得
  const allVideos = await getVideos();
  const channelVideos = allVideos.filter((v) => v.user_id === channelId);

  // そのチャンネルのShortsを取得
  const allShorts = await getShorts();
  const channelShorts = allShorts.filter((s) => s.user_id === channelId);

  return {
    ...channel,
    videos: channelVideos,
    shorts: channelShorts,
  };
};
```

#### Phase 4: チャンネルページの作成

**`app/channel/[id].tsx`の新規作成**

```typescript
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import VideoCard from '../../components/VideoCard';
import { ChannelDetail } from '../../types';
import { getChannelDetail } from '../../utils/mockApi';
import { Colors } from '../../constants/Colors';

export default function ChannelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [channel, setChannel] = useState<ChannelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [activeTab, setActiveTab] = useState<'videos' | 'shorts'>('videos');

  const isMobile = width < 768;

  useEffect(() => {
    loadChannel();
  }, [id]);

  const loadChannel = async () => {
    try {
      const data = await getChannelDetail(id);
      setChannel(data);
    } catch (error) {
      console.error('Failed to load channel:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = () => {
    setSubscribed(!subscribed);
  };

  const handleVideoPress = (videoId: string) => {
    router.push(`/video/${videoId}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!channel) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>チャンネルが見つかりません</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatSubscriberCount = (count: number): string => {
    if (count >= 10000) return `${(count / 10000).toFixed(1)}万人`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K人`;
    return `${count}人`;
  };

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {channel.name}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* バナー画像 */}
        {channel.banner_url && (
          <Image
            source={{ uri: channel.banner_url }}
            style={styles.banner}
            resizeMode="cover"
          />
        )}

        {/* チャンネル情報 */}
        <View style={[styles.channelInfo, isMobile && styles.channelInfoMobile]}>
          <View style={styles.avatarRow}>
            <Image source={{ uri: channel.avatar_url }} style={styles.avatar} />
            <View style={styles.channelMeta}>
              <View style={styles.channelNameRow}>
                <Text style={styles.channelName}>{channel.name}</Text>
                {channel.is_verified && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                )}
              </View>
              <Text style={styles.subscriberCount}>
                登録者 {formatSubscriberCount(channel.subscriber_count)}
              </Text>
              <Text style={styles.videoCount}>{channel.video_count}本の動画</Text>
            </View>
          </View>

          {/* 説明文 */}
          <Text style={styles.description}>{channel.description}</Text>

          {/* 登録ボタン */}
          <TouchableOpacity
            style={[styles.subscribeButton, subscribed && styles.subscribedButton]}
            onPress={handleSubscribe}
          >
            <Text style={[styles.subscribeButtonText, subscribed && styles.subscribedButtonText]}>
              {subscribed ? '登録済み' : 'チャンネル登録'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* タブ切り替え */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'videos' && styles.tabActive]}
            onPress={() => setActiveTab('videos')}
          >
            <Text style={[styles.tabText, activeTab === 'videos' && styles.tabTextActive]}>
              動画
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'shorts' && styles.tabActive]}
            onPress={() => setActiveTab('shorts')}
          >
            <Text style={[styles.tabText, activeTab === 'shorts' && styles.tabTextActive]}>
              Shorts
            </Text>
          </TouchableOpacity>
        </View>

        {/* コンテンツ一覧 */}
        <View style={styles.contentContainer}>
          {activeTab === 'videos' && (
            <>
              {channel.videos.length === 0 ? (
                <Text style={styles.emptyText}>動画がありません</Text>
              ) : (
                channel.videos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onPress={() => handleVideoPress(video.id)}
                    layout="grid"
                  />
                ))
              )}
            </>
          )}

          {activeTab === 'shorts' && (
            <>
              {channel.shorts.length === 0 ? (
                <Text style={styles.emptyText}>Shortsがありません</Text>
              ) : (
                <Text style={styles.emptyText}>Shorts一覧（実装予定）</Text>
              )}
            </>
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
  banner: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.border,
  },
  channelInfo: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  channelInfoMobile: {
    padding: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.border,
  },
  channelMeta: {
    flex: 1,
  },
  channelNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  channelName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subscriberCount: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  videoCount: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
    marginBottom: 16,
  },
  subscribeButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: 'center',
  },
  subscribedButton: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.background,
  },
  subscribedButtonText: {
    color: Colors.text,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  contentContainer: {
    padding: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 24,
  },
});
```

#### Phase 5: コンポーネントの更新

**1. `components/ShortVideoPlayer.tsx`の変更**

```typescript
interface ShortVideoPlayerProps {
  short: Short;
  onChannelPress?: (userId: string) => void; // ✨ 追加
}

export default function ShortVideoPlayer({ short, onChannelPress }: ShortVideoPlayerProps) {
  // ... 既存のコード

  const handleAvatarPress = () => {
    if (onChannelPress) {
      onChannelPress(short.user_id);
    }
  };

  return (
    <View style={[styles.container, { width, height: containerHeight }]}>
      <View style={[styles.videoWrapper, isDesktop && styles.videoWrapperDesktop]}>
        {/* ... 既存の動画プレーヤー */}

        {/* 右側アクションボタン */}
        <View style={[styles.actionsContainer, isDesktop && { right: (width - containerWidth) / 2 + 12 }]}>
          {/* 投稿者アバター */}
          <TouchableOpacity // ✨ 変更: ViewからTouchableOpacityへ
            style={styles.avatarContainer}
            onPress={handleAvatarPress} // ✨ 追加
            activeOpacity={0.7}
          >
            <Image source={{ uri: short.user_avatar }} style={styles.avatar} />
          </TouchableOpacity>

          {/* ... 既存のアクションボタン */}
        </View>

        {/* ... 既存の下部情報エリア */}
      </View>
    </View>
  );
}
```

**2. `app/(tabs)/shorts.tsx`の変更**

```typescript
export default function ShortsScreen() {
  const router = useRouter();
  // ... 既存のコード

  const handleChannelPress = (userId: string) => {
    router.push(`/channel/${userId}`);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={shorts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ShortVideoPlayer
            short={item}
            onChannelPress={handleChannelPress} // ✨ 追加
          />
        )}
        // ... 既存のプロップ
      />
    </View>
  );
}
```

**3. `components/VideoCard.tsx`の変更**

```typescript
interface VideoCardProps {
  video: Video;
  onPress: () => void;
  onChannelPress?: (userId: string) => void; // ✨ 追加
  layout?: 'list' | 'grid';
}

export default function VideoCard({ video, onPress, onChannelPress, layout = 'list' }: VideoCardProps) {
  const handleAvatarPress = (e: any) => {
    e.stopPropagation(); // 親のonPressを発火させない
    if (onChannelPress) {
      onChannelPress(video.user_id);
    }
  };

  if (layout === 'grid') {
    return (
      <TouchableOpacity style={styles.gridContainer} onPress={onPress} activeOpacity={0.7}>
        {/* サムネイル */}
        <View style={styles.gridThumbnailContainer}>
          {/* ... 既存のコード */}
        </View>

        {/* 動画情報 */}
        <View style={styles.gridInfoContainer}>
          {/* ユーザーアバター */}
          <TouchableOpacity onPress={handleAvatarPress}> {/* ✨ 追加 */}
            <Image source={{ uri: video.user_avatar }} style={styles.gridAvatar} />
          </TouchableOpacity>

          {/* ... 既存のテキスト情報 */}
        </View>
      </TouchableOpacity>
    );
  }

  // リストレイアウトでもアバターを追加する場合
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.contentContainer}>
        {/* サムネイル */}
        <View style={styles.thumbnailContainer}>
          {/* ... 既存のコード */}
        </View>

        {/* 動画情報 */}
        <View style={styles.infoContainer}>
          {/* タイトル */}
          <Text style={styles.title} numberOfLines={2}>
            {video.title}
          </Text>

          {/* チャンネル名（クリック可能） */}
          <TouchableOpacity onPress={handleAvatarPress}> {/* ✨ 追加 */}
            <View style={styles.metaContainer}>
              <Text style={[styles.meta, styles.channelName]}>
                {video.user_name}
              </Text>
              <Text style={styles.meta}>
                {' • '}{formatViewCount(video.view_count)}視聴 •{' '}
                {formatRelativeTime(video.created_at)}
              </Text>
            </View>
          </TouchableOpacity>

          {/* ... 既存のコード */}
        </View>

        {/* ... メニューアイコン */}
      </View>
    </TouchableOpacity>
  );
}
```

**4. `app/(tabs)/videos.tsx`の変更**

```typescript
export default function VideosScreen() {
  const router = useRouter();
  // ... 既存のコード

  const handleChannelPress = (userId: string) => {
    router.push(`/channel/${userId}`);
  };

  return (
    <View style={styles.container}>
      {/* ... 既存のヘッダー・フィルター */}

      {isGrid ? (
        <FlatList
          data={filteredAndSortedVideos}
          key={`grid-${numColumns}`}
          numColumns={numColumns}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.gridItem, { width: `${100 / numColumns}%` }]}>
              <VideoCard
                video={item}
                onPress={() => handleVideoPress(item.id)}
                onChannelPress={handleChannelPress} // ✨ 追加
                layout="grid"
              />
            </View>
          )}
          // ... 既存のプロップ
        />
      ) : (
        <FlatList
          data={filteredAndSortedVideos}
          key="list"
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <VideoCard
              video={item}
              onPress={() => handleVideoPress(item.id)}
              onChannelPress={handleChannelPress} // ✨ 追加
              layout="list"
            />
          )}
          // ... 既存のプロップ
        />
      )}
    </View>
  );
}
```

## ✅ 修正完了条件

### Phase 1: 型定義
- [ ] `types/index.ts`に`user_id`フィールドを`Video`型に追加
- [ ] `types/index.ts`に`user_id`フィールドを`Short`型に追加
- [ ] `types/index.ts`に`Channel`型を追加
- [ ] `types/index.ts`に`ChannelDetail`型を追加

### Phase 2: モックデータ
- [ ] `mock/channels.json`を作成
- [ ] 全ての`videos.json`データに`user_id`を追加
- [ ] 全ての`shorts.json`データに`user_id`を追加

### Phase 3: API関数
- [ ] `utils/mockApi.ts`に`getChannels()`関数を追加
- [ ] `utils/mockApi.ts`に`getChannelDetail()`関数を追加

### Phase 4: チャンネルページ
- [ ] `app/channel/[id].tsx`を作成
- [ ] チャンネル情報の表示
- [ ] 登録ボタンの実装
- [ ] タブ切り替え（動画/Shorts）
- [ ] レスポンシブ対応

### Phase 5: コンポーネント更新
- [ ] `ShortVideoPlayer.tsx`のアバターを`TouchableOpacity`で囲む
- [ ] `ShortVideoPlayer.tsx`に`onChannelPress` propを追加
- [ ] `VideoCard.tsx`のアバターを`TouchableOpacity`で囲む
- [ ] `VideoCard.tsx`に`onChannelPress` propを追加
- [ ] `shorts.tsx`に`handleChannelPress`ハンドラーを追加
- [ ] `videos.tsx`に`handleChannelPress`ハンドラーを追加

### Phase 6: 動作確認
- [ ] Shortsのアバタークリックでチャンネルページに遷移
- [ ] Videosのアバタークリック（Grid）でチャンネルページに遷移
- [ ] Videosのアバタークリック（List）でチャンネルページに遷移
- [ ] チャンネルページが正しく表示される
- [ ] チャンネル登録ボタンが動作する
- [ ] タブ切り替えが正常に動作する
- [ ] 戻るボタンで前のページに戻る
- [ ] デスクトップ/モバイルで正しく表示される

## 🔄 テストシナリオ

### 基本動作

1. **Shortsからチャンネル遷移**
   - Shortsタブを開く
   - 動画のアバターをタップ
   → チャンネルページに遷移

2. **Videos（Grid）からチャンネル遷移**
   - Videosタブを開く（デスクトップ/タブレット）
   - 動画カードのアバターをタップ
   → チャンネルページに遷移

3. **Videos（List）からチャンネル遷移**
   - Videosタブを開く（モバイル）
   - チャンネル名をタップ
   → チャンネルページに遷移

4. **チャンネルページの機能**
   - チャンネル情報が表示される
   - 「チャンネル登録」ボタンをタップ → 「登録済み」に変わる
   - もう一度タップ → 「チャンネル登録」に戻る
   - 「動画」タブ → 動画一覧が表示される
   - 「Shorts」タブ → Shorts一覧が表示される（または実装予定メッセージ）
   - 動画カードをタップ → 動画詳細ページに遷移

### エッジケース

1. **存在しないチャンネルID**
   - `/channel/invalid-id`にアクセス
   → 「チャンネルが見つかりません」エラーを表示

2. **動画がないチャンネル**
   - 動画が0件のチャンネルを表示
   → 「動画がありません」メッセージを表示

3. **レスポンシブ**
   - デスクトップで表示 → 適切な幅で表示される
   - モバイルで表示 → 全幅で表示される
   - ウィンドウサイズ変更 → レイアウトが動的に調整される

## 📝 参考資料

**React Navigation:**
- https://docs.expo.dev/router/introduction/
- Dynamic routes: `[id].tsx`

**React Native TouchableOpacity:**
- https://reactnative.dev/docs/touchableopacity
- `onPress`, `activeOpacity`

**YouTube Channel Page:**
- チャンネルヘッダー（バナー、アバター、登録者数）
- コンテンツタブ（動画、Shorts、プレイリスト、概要）
- レスポンシブデザイン

## 🚀 優先度

**High** - ユーザーがクリエイターのチャンネルを探索できるようにする重要な機能
