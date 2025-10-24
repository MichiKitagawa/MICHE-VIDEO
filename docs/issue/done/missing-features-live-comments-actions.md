# 未実装機能・バグ報告

## 問題1: ライブ配信のLIVEバッジが表示されていない

### 現象
- ライブタブに表示される動画カードに「LIVE」バッジが表示されない
- 実装上はVideoCardコンポーネントに`status === 'live'`の条件でバッジを表示するコードがある

### 原因
- `/mock/videos.json`に`status`フィールドが存在しない
- モックデータに`status`と`current_viewers`フィールドが含まれていないため、条件が満たされずバッジが表示されない

### 修正方法
`/mock/videos.json`のライブ配信として表示したい動画データに以下のフィールドを追加：
```json
{
  "id": "live_1",
  "title": "ライブ配信タイトル",
  // ... 既存フィールド
  "status": "live",
  "current_viewers": 1234
}
```

---

## 問題2: VideoCardの3点リーダーが機能していない

### 現象
- 動画一覧のカード下部にある3点リーダー（...）ボタンをクリックしても何も起こらない
- ボタンは表示されているが、押すことすらできない状態

### 原因
`/components/VideoCard.tsx`の3点リーダーボタンの実装が空：
```typescript
<TouchableOpacity
  style={styles.gridMenuButton}
  onPress={(e) => {
    e.stopPropagation();
  }}
>
  <Ionicons name="ellipsis-vertical" size={20} color={Colors.textSecondary} />
</TouchableOpacity>
```

`e.stopPropagation()`のみで、実際のアクション処理が実装されていない。

### 修正方法
VideoCardコンポーネントを以下のように修正：

1. **propsにアクションコールバックを追加**:
```typescript
interface VideoCardProps {
  video: Video;
  onPress: () => void;
  onChannelPress?: (userId: string) => void;
  onMorePress?: (video: Video) => void; // 追加
  layout?: 'list' | 'grid';
}
```

2. **3点リーダーボタンに機能を追加**:
```typescript
<TouchableOpacity
  style={styles.gridMenuButton}
  onPress={(e) => {
    e.stopPropagation();
    onMorePress?.(video);
  }}
>
  <Ionicons name="ellipsis-vertical" size={20} color={Colors.textSecondary} />
</TouchableOpacity>
```

3. **親コンポーネント（動画一覧ページ）でActionSheetを実装**:
```typescript
const [actionSheetVisible, setActionSheetVisible] = useState(false);
const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

const handleMorePress = (video: Video) => {
  setSelectedVideo(video);
  setActionSheetVisible(true);
};

<VideoCard
  video={video}
  onPress={() => router.push(`/video/${video.id}`)}
  onMorePress={handleMorePress}
/>

<ActionSheet
  visible={actionSheetVisible}
  onClose={() => setActionSheetVisible(false)}
  actions={[
    { label: '共有', icon: 'share-outline', onPress: () => {} },
    { label: '後で見る', icon: 'bookmark-outline', onPress: () => {} },
    { label: '報告', icon: 'flag-outline', onPress: () => {}, destructive: true },
  ]}
/>
```

**影響範囲**:
- `/components/VideoCard.tsx`
- `/app/(tabs)/videos.tsx`（または動画一覧を表示する全てのページ）
- `/app/(tabs)/netflix.tsx`
- `/app/channel/[id]/index.tsx`

---

## 問題3: ショート動画でコメントができない

### 現象
- ショート動画詳細ページにコメント機能が存在しない
- 動画詳細ページではコメントができるが、ショートではできない

### 原因
- `/app/short/[id]/index.tsx`が存在しない
- ショート動画の詳細ページ自体が未実装

### 修正方法
`/app/short/[id]/index.tsx`を新規作成し、以下の機能を実装：

1. **ショート動画プレイヤー**
2. **コメントセクション**（動画詳細ページと同様）:
   - コメント一覧表示
   - コメント投稿フォーム
   - コメントいいね機能
   - 返信機能（UI）

3. **3点リーダーメニュー**:
   - 共有
   - 後で見る
   - 報告

4. **ショート特有のUI**:
   - 縦型フルスクリーン表示
   - 右側にアクションボタン配置（いいね、コメント数、シェア）
   - TikTok/Instagram Reels風のレイアウト

**参考実装**: `/app/video/[id].tsx`をベースに、ショート用にUI調整

---

## 問題4: ショート動画の3点リーダーも機能していない

### 現象
- ショート動画カード（一覧表示）の3点リーダーも機能しない

### 原因
- 問題2と同じ（VideoCardまたはショート専用カードコンポーネントの実装不足）
- ショート動画用の独立したカードコンポーネントが存在する場合、そちらにも同様の修正が必要

### 修正方法
- 問題2の修正方法を適用
- ショート動画一覧ページ（`/app/(tabs)/shorts.tsx`）にもActionSheetを実装

---

## 優先度と実装順序

### 高優先度
1. **問題3**: ショート動画詳細ページの作成（コメント機能含む）
2. **問題2**: VideoCardの3点リーダー機能実装

### 中優先度
3. **問題1**: LIVEバッジの表示（モックデータ修正）

### 実装時間見積もり
- 問題1: 5分（モックデータ編集のみ）
- 問題2: 30分（VideoCard修正 + 各一覧ページへの適用）
- 問題3: 2時間（ショート詳細ページ新規作成）
- 問題4: 問題2に含まれる

**合計**: 約2.5時間

---

## 補足

### ショート動画詳細ページのUI設計について
通常の動画詳細ページと異なり、以下の点を考慮：
1. **縦型フルスクリーン**: 画面全体を使用
2. **スワイプで次のショート**: 上下スワイプで前後のショートに移動
3. **右側にアクション配置**: いいね、コメント数、シェア、3点リーダー
4. **コメントは下からスライドアップ**: ボトムシート形式でコメント一覧を表示
5. **自動再生・ループ**: ショート動画は自動ループ再生

この設計はTikTok、Instagram Reels、YouTube Shortsの標準的なUIパターンに準拠。
