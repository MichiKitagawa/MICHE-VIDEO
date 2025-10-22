# Issue: Shorts 全再生問題の修正

## 📋 問題の言語化 (What)

### 現状の問題

**症状:**
- Shortsタブに移動すると、FlatListに読み込まれているすべてのShort動画が同時に再生される
- 複数の動画の音声が重なって聞こえる（音声カオス状態）
- ユーザーが見ていない動画も再生され続ける

**発生箇所:**
- `app/(tabs)/shorts.tsx`
- `components/ShortVideoPlayer.tsx`

**根本原因:**
```typescript
// ShortVideoPlayer.tsx:68
<Video
  ref={videoRef}
  source={{ uri: short.video_url }}
  style={styles.video}
  resizeMode={ResizeMode.COVER}
  shouldPlay  // ← これが常にtrueなので全部再生される
  isLooping
  onPlaybackStatusUpdate={(status) => setStatus(status)}
/>
```

すべてのShortVideoPlayerコンポーネントが`shouldPlay`プロップなしで常に再生される設定になっている。

### 期待される動作

1. **単一再生**: 現在viewportに表示されている1つのShort動画のみが再生される
2. **自動切り替え**: スクロールして次の動画が表示されたら
   - 前の動画は自動的に停止
   - 新しい動画が自動的に再生開始
3. **メモリ効率**: 表示されていない動画はバッファも解放

### 参考実装

**TikTok/Instagram Reels/YouTubeショートの動作:**
- 画面に80%以上表示された動画のみ再生
- 他の動画は一時停止状態
- スワイプで次の動画に移動すると即座に再生開始

## 🛠️ 修正方法 (How)

### アプローチ1: Viewability Based Playback (推奨)

FlatListの`viewabilityConfig`と`onViewableItemsChanged`を使用して、表示中のアイテムを検出し再生を制御する。

#### 修正箇所

**1. `app/(tabs)/shorts.tsx` の変更**

```typescript
export default function ShortsScreen() {
  const { height } = useWindowDimensions();
  const [shorts, setShorts] = useState<Short[]>([]);
  const [loading, setLoading] = useState(true);

  // ✨ 追加: 現在表示中のShort IDを管理
  const [activeShortId, setActiveShortId] = useState<string | null>(null);

  const contentHeight = height - TAB_BAR_HEIGHT;

  // ... loadShorts()は変更なし

  // ✨ 追加: 表示中のアイテムが変わったときのハンドラー
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      // 最も多く表示されているアイテムを取得
      const mostVisible = viewableItems.reduce((prev: any, current: any) => {
        return (current.percentVisible > prev.percentVisible) ? current : prev;
      });

      setActiveShortId(mostVisible.item.id);
    }
  }).current;

  // ✨ 追加: viewability設定
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80, // 80%以上表示されたらアクティブ
    minimumViewTime: 300, // 最低300ms表示される必要がある
  }).current;

  return (
    <View style={styles.container}>
      <FlatList
        data={shorts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ShortVideoPlayer
            short={item}
            isActive={activeShortId === item.id} // ✨ 追加
          />
        )}
        pagingEnabled
        decelerationRate="fast"
        snapToInterval={contentHeight}
        snapToAlignment="start"
        showsVerticalScrollIndicator={false}
        disableIntervalMomentum
        viewabilityConfig={viewabilityConfig} // ✨ 追加
        onViewableItemsChanged={onViewableItemsChanged} // ✨ 追加
      />
    </View>
  );
}
```

**2. `components/ShortVideoPlayer.tsx` の変更**

```typescript
interface ShortVideoPlayerProps {
  short: Short;
  isActive?: boolean; // ✨ 追加: この動画がアクティブかどうか
}

export default function ShortVideoPlayer({ short, isActive = false }: ShortVideoPlayerProps) {
  const { width, height } = useWindowDimensions();
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [liked, setLiked] = useState(false);

  // ✨ 追加: isActiveが変わったときに再生/停止を制御
  useEffect(() => {
    if (isActive) {
      videoRef.current?.playAsync();
    } else {
      videoRef.current?.pauseAsync();
    }
  }, [isActive]);

  // タブバーを引いた実際の表示可能高さ
  const contentHeight = height - TAB_BAR_HEIGHT;

  // ... 以下既存のコード

  return (
    <View style={[styles.container, { width, height: containerHeight }]}>
      <View style={[styles.videoWrapper, isDesktop && styles.videoWrapperDesktop]}>
        <TouchableOpacity
          style={[styles.videoContainer, { width: containerWidth, height: containerHeight }]}
          activeOpacity={1}
          onPress={togglePlayPause}
        >
          <Video
            ref={videoRef}
            source={{ uri: short.video_url }}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false} // ✨ 変更: useEffectで制御するのでfalse
            isLooping
            onPlaybackStatusUpdate={(status) => setStatus(status)}
          />
        </TouchableOpacity>

        {/* 既存のUI要素は変更なし */}
      </View>
    </View>
  );
}
```

### アプローチ2: Index Based Playback（代替案）

現在のスクロール位置（index）に基づいて再生を制御する方法。

**利点:**
- シンプルな実装
- 確実に1つだけ再生

**欠点:**
- スクロール中の挙動が若干不自然
- アイテムの表示割合を考慮しない

```typescript
// shorts.tsx
const [currentIndex, setCurrentIndex] = useState(0);

const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
  if (viewableItems.length > 0) {
    setCurrentIndex(viewableItems[0].index);
  }
}).current;

<FlatList
  // ...
  renderItem={({ item, index }) => (
    <ShortVideoPlayer
      short={item}
      isActive={currentIndex === index}
    />
  )}
/>
```

### パフォーマンス最適化

**1. 動画のアンロード**

表示されていない動画は完全にアンマウントして、メモリを解放する：

```typescript
// ShortVideoPlayer.tsx
useEffect(() => {
  return () => {
    // コンポーネントがアンマウントされたら動画を停止
    videoRef.current?.stopAsync();
    videoRef.current?.unloadAsync();
  };
}, []);
```

**2. 初回表示時の自動再生**

Shortsタブを開いた直後、最初の動画を自動再生する：

```typescript
// shorts.tsx
useEffect(() => {
  if (shorts.length > 0 && !activeShortId) {
    setActiveShortId(shorts[0].id);
  }
}, [shorts]);
```

## 📐 詳細設計

### State管理

```typescript
// shorts.tsx
const [activeShortId, setActiveShortId] = useState<string | null>(null);

// 初回ロード時に最初の動画をアクティブに
useEffect(() => {
  if (shorts.length > 0) {
    setActiveShortId(shorts[0].id);
  }
}, [shorts]);
```

### Viewability設定

```typescript
const viewabilityConfig = {
  itemVisiblePercentThreshold: 80,  // 80%以上表示
  minimumViewTime: 300,              // 300ms以上表示
  waitForInteraction: false,         // インタラクション不要
};
```

**`itemVisiblePercentThreshold`の調整:**
- `50`: より敏感に切り替わる（スクロール途中で切り替わりやすい）
- `80`: バランスが良い（推奨）
- `95`: ほぼ完全に表示されてから切り替わる

### エッジケース処理

**1. 複数のアイテムが80%以上表示される場合**

```typescript
const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
  if (viewableItems.length > 0) {
    // percentVisibleが最大のものを選択
    const mostVisible = viewableItems.reduce((prev: any, current: any) => {
      return (current.percentVisible > prev.percentVisible) ? current : prev;
    });

    setActiveShortId(mostVisible.item.id);
  }
}).current;
```

**2. すべてのアイテムが非表示の場合**

```typescript
const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
  if (viewableItems.length === 0) {
    // すべて非表示 → 全て停止
    setActiveShortId(null);
  } else {
    // 最も表示されているものを再生
    const mostVisible = viewableItems.reduce((prev: any, current: any) => {
      return (current.percentVisible > prev.percentVisible) ? current : prev;
    });

    setActiveShortId(mostVisible.item.id);
  }
}).current;
```

**3. 高速スクロール時の処理**

`minimumViewTime`により、一瞬だけ表示されたアイテムは無視される：

```typescript
const viewabilityConfig = {
  itemVisiblePercentThreshold: 80,
  minimumViewTime: 300, // 300ms未満は無視
};
```

## ✅ 修正完了条件

- [ ] `app/(tabs)/shorts.tsx`に`activeShortId` state追加
- [ ] `onViewableItemsChanged`コールバック実装
- [ ] `viewabilityConfig`設定
- [ ] `ShortVideoPlayer`に`isActive` prop追加
- [ ] `isActive`に応じた再生/停止ロジック実装
- [ ] 初回表示時の自動再生機能
- [ ] アンマウント時のクリーンアップ処理
- [ ] 動作確認:
  - [ ] Shortsタブを開くと最初の動画のみ再生
  - [ ] スクロールすると前の動画が停止、新しい動画が再生
  - [ ] 音声が重ならない
  - [ ] 高速スクロールでも正常動作

## 🔄 テストシナリオ

### 基本動作
1. Shortsタブを開く → 最初の動画のみ再生される
2. 下にスワイプ → 前の動画停止、次の動画再生
3. 上にスワイプ → 前の動画停止、前の動画再生
4. 高速スクロール → 音が重ならない

### エッジケース
1. Shortsが1件のみ → 正常に再生
2. Shortsが0件 → エラーなし
3. 他のタブに切り替え → 再生停止
4. Shortsタブに戻る → 現在の位置の動画が再生

## 📝 参考資料

**React Native FlatList Viewability:**
- https://reactnative.dev/docs/flatlist#onviewableitemschanged
- https://reactnative.dev/docs/flatlist#viewabilityconfig

**expo-av Video:**
- https://docs.expo.dev/versions/latest/sdk/video/
- `shouldPlay` prop
- `playAsync()` / `pauseAsync()` methods

## 🚀 優先度

**High** - ユーザーエクスペリエンスに直接影響する重要な修正
