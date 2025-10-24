# Analytics Error & Edit Screen Improvements

## 概要

Creation Hubにおける2つの重要な問題を特定しました：

1. **アナリティクスのグラフ表示エラー** - Victory Nativeライブラリの誤用による実行時エラー
2. **編集画面の機能不足** - サムネイル変更を含む必須編集機能の欠如

---

## Issue 1: アナリティクスのグラフ表示エラー

### エラー内容

**エラーメッセージ:**
```
Element type is invalid: expected a string (for built-in components) or a class/function
(for composite components) but got: undefined.
```

**発生箇所:**
- File: `/components/creation/AnalyticsContent.tsx`
- Lines: 181-216 (グラフセクション)

**TypeScriptエラー:**
```
error TS2305: Module '"victory-native"' has no exported member 'VictoryLine'.
error TS2305: Module '"victory-native"' has no exported member 'VictoryChart'.
error TS2305: Module '"victory-native"' has no exported member 'VictoryAxis'.
```

### 根本原因

#### 問題の本質
コードは**旧Victory Native API**（Victory Web向け）を使用しようとしていますが、インストールされているのは**Victory Native XL** (v41.20.1) という全く異なるライブラリです。

#### 現在のコード（誤り）
```typescript
// /components/creation/AnalyticsContent.tsx:3
import { VictoryLine, VictoryChart, VictoryAxis } from 'victory-native';

// 使用例
<VictoryChart>
  <VictoryAxis />
  <VictoryLine data={...} />
</VictoryChart>
```

#### 実際のライブラリ構造

**インストール済み:**
- Package: `victory-native@41.20.1`
- 実体: Victory Native XL (Formidable Labs製の完全新規実装)
- レンダリング: React Native Skia ベース

**実際のエクスポート:**
```typescript
// victory-native v41.20.1 の実際のエクスポート
export { CartesianChart } from "./cartesian/CartesianChart";  // ← VictoryChart ではない
export { Line } from "./cartesian/components/Line";            // ← VictoryLine ではない
export { CartesianAxis } from "./cartesian/components/CartesianAxis"; // ← VictoryAxis ではない
// VictoryTheme は存在しない
```

Victory Native XLは旧Victory Nativeの後継ですが、**互換性のない完全新規API**を採用しています。

### 解決方法: react-native-chart-kitへの移行（推奨）

**理由:**
- クロスプラットフォーム対応（Web/iOS/Android）
- SVGベースでWeb互換性が高い
- シンプルなAPI
- メンテナンス継続中

**インストール:**
```bash
npm install react-native-chart-kit
```

**実装例:**
```typescript
import { LineChart } from 'react-native-chart-kit';

<LineChart
  data={{
    labels: analytics.views_timeline.map((d) => {
      const date = new Date(d.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    datasets: [{
      data: analytics.views_timeline.map((d) => d.views),
    }],
  }}
  width={isMobile ? width - 48 : 600}
  height={250}
  chartConfig={{
    backgroundColor: Colors.background,
    backgroundGradientFrom: Colors.surface,
    backgroundGradientTo: Colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => Colors.primary,
    labelColor: (opacity = 1) => Colors.textSecondary,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: Colors.primary,
    },
  }}
  bezier
  style={{
    marginVertical: 8,
    borderRadius: 16,
  }}
/>
```

**所要時間:** 2-3時間

---

## Issue 2: 編集画面の機能不足

### 現状分析

#### 編集可能な項目（現在）

| コンテンツタイプ | 編集可能 | 表示のみ | 編集不可（必須） |
|------------------|----------|----------|------------------|
| **動画** | • タイトル<br>• 説明<br>• カテゴリー<br>• 成人向けフラグ | • サムネイル | • サムネイル変更<br>• プライバシー設定<br>• タグ |
| **ショート** | • タイトル<br>• 説明<br>• カテゴリー<br>• 成人向けフラグ | • サムネイル | • サムネイル変更<br>• プライバシー設定<br>• タグ |
| **Netflix** | • タイトル<br>• 説明<br>• ジャンル（複数選択）<br>• 成人向けフラグ | なし | • ポスター画像変更<br>• プライバシー設定 |

#### ファイル別の詳細

**1. 動画編集画面**
- File: `/app/creation/video/[id]/edit.tsx`
- サムネイル表示: Lines 128-131
  ```typescript
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>サムネイル</Text>
    <Image source={{ uri: video.thumbnail_url }} style={styles.thumbnail} />
  </View>
  ```
- **問題**: `<Image>`で表示のみ、変更UIなし

**2. ショート編集画面**
- File: `/app/creation/short/[id]/edit.tsx`
- サムネイル表示: Lines 128-131
  ```typescript
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>サムネイル</Text>
    <Image source={{ uri: short.thumbnail_url }} style={styles.thumbnail} />
  </View>
  ```
- **問題**: `<Image>`で表示のみ、変更UIなし

**3. Netflix編集画面**
- File: `/app/creation/netflix/[id]/edit.tsx`
- **問題**: ポスター画像の表示すらなし

### 必要な改善項目

#### 1. サムネイル/ポスター画像の変更機能（最優先）

**実装内容:**
- 画像選択ボタンの追加（expo-image-pickerを使用）
- プレビュー機能
- 推奨サイズの表示
  - 動画: 16:9 (1280x720以上)
  - ショート: 9:16 (1080x1920)
  - Netflix: 2:3 ポスター
- 画像バリデーション（サイズ・形式チェック）
- APIエンドポイント対応
  - `updateVideoThumbnail(videoId, imageFile)`
  - `updateShortThumbnail(shortId, imageFile)`
  - `updateNetflixPoster(contentId, posterFile)`

**UI実装例:**
```typescript
// 動画・ショート共通
<View style={styles.section}>
  <Text style={styles.sectionTitle}>サムネイル</Text>
  <TouchableOpacity style={styles.thumbnailContainer} onPress={pickThumbnail}>
    <Image source={{ uri: thumbnailUri }} style={styles.thumbnail} />
    <View style={styles.thumbnailOverlay}>
      <Ionicons name="camera" size={32} color="#fff" />
      <Text style={styles.thumbnailOverlayText}>変更</Text>
    </View>
  </TouchableOpacity>
  <Text style={styles.thumbnailHint}>
    推奨: 1280x720 (16:9) • JPGまたはPNG • 2MB以下
  </Text>
</View>

const pickThumbnail = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('エラー', 'ライブラリへのアクセス許可が必要です');
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [16, 9],
    quality: 1,
  });

  if (!result.canceled && result.assets[0]) {
    setThumbnailUri(result.assets[0].uri);
    // APIアップロード処理
  }
};
```

**所要時間:** 4-6時間（3画面分）

#### 2. プライバシー設定

**実装内容:**
- プライバシー選択UI（ラジオボタン）
  - 公開: 誰でも視聴可能
  - 限定公開: URLを知っている人のみ
  - 非公開: 自分のみ
- APIエンドポイント対応

**UI実装例:**
```typescript
<View style={styles.section}>
  <Text style={styles.sectionTitle}>プライバシー</Text>

  <TouchableOpacity
    style={[styles.privacyOption, privacy === 'public' && styles.privacyOptionActive]}
    onPress={() => setPrivacy('public')}
  >
    <Ionicons
      name={privacy === 'public' ? 'radio-button-on' : 'radio-button-off'}
      size={24}
      color={privacy === 'public' ? Colors.primary : Colors.textSecondary}
    />
    <View style={styles.privacyOptionText}>
      <Text style={styles.privacyOptionTitle}>公開</Text>
      <Text style={styles.privacyOptionDescription}>誰でも視聴可能</Text>
    </View>
  </TouchableOpacity>

  {/* 限定公開・非公開も同様 */}
</View>
```

**参考:** `/app/go-live.tsx` (Lines 175-220) に同じUIが実装済み

**所要時間:** 2-3時間（3画面分）

#### 3. タグ機能

**実装内容:**
- タグ入力UI（チップ形式）
- 最大タグ数の制限（10個）
- 不適切タグのバリデーション

**UI実装例:**
```typescript
<View style={styles.section}>
  <Text style={styles.label}>タグ (最大10個)</Text>
  <View style={styles.tagContainer}>
    {tags.map((tag, index) => (
      <View key={index} style={styles.tagChip}>
        <Text style={styles.tagChipText}>{tag}</Text>
        <TouchableOpacity onPress={() => removeTag(index)}>
          <Ionicons name="close-circle" size={16} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
    ))}
  </View>
  <TextInput
    style={styles.input}
    value={tagInput}
    onChangeText={setTagInput}
    placeholder="タグを入力してEnter"
    placeholderTextColor={Colors.textSecondary}
    onSubmitEditing={addTag}
  />
</View>
```

**所要時間:** 3-4時間（3画面分）

#### 4. カテゴリー選択の改善

現在はテキスト入力のみで、タイポの可能性があります。

**実装内容:**
- プリセットカテゴリーから選択（go-live.tsxと同様）
- カテゴリーリスト:
  - 動画/ショート: ゲーム、音楽、エンタメ、教育、スポーツ、科学技術、料理、旅行、ファッション、その他
  - Netflix: アクション、コメディ、ドラマ、ホラー、SF、ロマンス、スリラー、ドキュメンタリー、アニメ、ファミリー（既に実装済み）

**参考:** `/app/go-live.tsx` (Lines 136-156)、`/app/creation/netflix/[id]/edit.tsx` (Lines 156-175)

**所要時間:** 2時間（動画・ショートのみ、Netflixは実装済み）

### 実装優先順位

| 機能 | 優先度 | 実装コスト | ユーザー価値 |
|------|--------|-----------|-------------|
| サムネイル変更 | 最高 | 中（4-6h） | 最高 |
| プライバシー設定 | 高 | 低（2-3h） | 高 |
| タグ機能 | 中 | 中（3-4h） | 中 |
| カテゴリー改善 | 中 | 低（2h） | 中 |

**合計所要時間:** 11-15時間

---

## まとめ

### Issue 1: アナリティクスエラー

**問題:** Victory Native XLのAPI不一致による実行時エラー

**解決策:** react-native-chart-kit への移行

**手順:**
1. `npm install react-native-chart-kit`
2. `/components/creation/AnalyticsContent.tsx` のVictory関連コードを削除
3. `LineChart` コンポーネントに置き換え

**所要時間:** 2-3時間

### Issue 2: 編集機能不足

**必須の追加機能:**
1. サムネイル/ポスター変更機能（4-6時間）
2. プライバシー設定（2-3時間）
3. タグ機能（3-4時間）
4. カテゴリー選択改善（2時間）

**合計所要時間:** 13-18時間（両Issue合わせて）

### 関連ファイル

**修正対象:**
- `/components/creation/AnalyticsContent.tsx` - グラフ修正
- `/app/creation/video/[id]/edit.tsx` - 動画編集強化
- `/app/creation/short/[id]/edit.tsx` - ショート編集強化
- `/app/creation/netflix/[id]/edit.tsx` - Netflix編集強化
- `/utils/mockApi.ts` - API拡張
- `/types/index.ts` - 型定義拡張

**参考実装:**
- `/app/go-live.tsx` - プライバシー設定UI、カテゴリー選択UI

---

*Document created: 2025-10-24*
