# Issue: Creation Hub（クリエイター管理機能）の実装

## 📋 問題の言語化 (What)

### 現状の問題

**症状:**
- uploadタブが「新規アップロードのみ」の機能で限定的
- アップロード後にコンテンツを編集・管理する手段がない
- 自分がアップロードした動画/Shortsを一覧表示できない
- タイトル、説明文、サムネイルなどを後から変更できない
- 公開/非公開の切り替えができない
- 不要なコンテンツを削除できない

**発生箇所:**
- `app/(tabs)/upload.tsx`

**根本原因:**
単一機能（アップロードのみ）のタブになっており、YouTube Studioのような包括的なクリエイター管理機能が存在しない。

### 期待される動作

1. **Creation Hub**: クリエイターがコンテンツを管理できる統合ハブ
2. **コンテンツ一覧**: 自分のアップロードした動画/Shortsを一覧表示
3. **編集機能**: タイトル、説明文、サムネイル、カテゴリーなどを編集
4. **削除機能**: 不要なコンテンツを削除
5. **統計表示**: ダッシュボードで視聴回数、いいね数などを確認
6. **アップロード**: 新規コンテンツのアップロード（既存機能の移動）

### 参考実装

**YouTube Studio:**
- ダッシュボード（統計サマリー、最新コメント）
- コンテンツ（動画一覧、編集、削除）
- アナリティクス（詳細統計）
- コメント管理
- 収益化設定

**TikTok Creator Center:**
- 投稿管理
- アナリティクス
- クリエイターツール

## 🛠️ 修正方法 (How)

### 全体構造

```
Creation Hub (タブ)
├── /creation (ランディングページ)
│   └── 内部タブナビゲーション
│       ├── Dashboard (統計サマリー)
│       ├── Contents (コンテンツ一覧・管理)
│       ├── Upload (新規アップロード)
│       └── Analytics (詳細統計) ※将来実装
│
├── /creation/video/[id]/edit (動画編集ページ)
└── /creation/short/[id]/edit (Short編集ページ)
```

### Phase 1: タブの変更とCreationページの基盤

#### 1-1. タブバーの更新

**`app/(tabs)/_layout.tsx`の変更**

```typescript
<Tabs.Screen
  name="creation"
  options={{
    title: 'Creation',
    tabBarIcon: ({ color, focused }) => (
      <Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} size={28} color={color} />
    ),
  }}
/>
```

**古いuploadタブを削除:**
- `app/(tabs)/upload.tsx` を削除（後でcreation配下に移動）

#### 1-2. Creationメインページの作成

**`app/(tabs)/creation.tsx`の新規作成**

```typescript
// Creation Hub メインページ

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Colors } from '../../constants/Colors';

type CreationTab = 'dashboard' | 'contents' | 'upload' | 'analytics';

export default function CreationScreen() {
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<CreationTab>('dashboard');
  const isMobile = width < 768;

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Creation Hub</Text>
      </View>

      {/* 内部タブナビゲーション */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'dashboard' && styles.tabActive]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>
            ダッシュボード
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'contents' && styles.tabActive]}
          onPress={() => setActiveTab('contents')}
        >
          <Text style={[styles.tabText, activeTab === 'contents' && styles.tabTextActive]}>
            コンテンツ
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'upload' && styles.tabActive]}
          onPress={() => setActiveTab('upload')}
        >
          <Text style={[styles.tabText, activeTab === 'upload' && styles.tabTextActive]}>
            アップロード
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'analytics' && styles.tabActive]}
          onPress={() => setActiveTab('analytics')}
        >
          <Text style={[styles.tabText, activeTab === 'analytics' && styles.tabTextActive]}>
            アナリティクス
          </Text>
        </TouchableOpacity>
      </View>

      {/* コンテンツエリア */}
      <View style={styles.content}>
        {activeTab === 'dashboard' && <DashboardContent />}
        {activeTab === 'contents' && <ContentsContent />}
        {activeTab === 'upload' && <UploadContent />}
        {activeTab === 'analytics' && <AnalyticsContent />}
      </View>
    </View>
  );
}

// 各タブのコンテンツコンポーネント（Phase 2以降で実装）
function DashboardContent() { /* 実装 */ }
function ContentsContent() { /* 実装 */ }
function UploadContent() { /* 実装 */ }
function AnalyticsContent() { /* 実装 */ }
```

### Phase 2: ダッシュボード実装

**ダッシュボードコンポーネント**

```typescript
// components/creation/DashboardContent.tsx

export default function DashboardContent() {
  const [stats, setStats] = useState({
    totalViews: 0,
    totalLikes: 0,
    totalVideos: 0,
    totalShorts: 0,
  });

  return (
    <ScrollView style={styles.container}>
      {/* 統計カード */}
      <View style={styles.statsGrid}>
        <StatCard title="総視聴回数" value={formatNumber(stats.totalViews)} icon="eye" />
        <StatCard title="総いいね数" value={formatNumber(stats.totalLikes)} icon="heart" />
        <StatCard title="動画数" value={stats.totalVideos} icon="videocam" />
        <StatCard title="Shorts数" value={stats.totalShorts} icon="film" />
      </View>

      {/* 最近のコンテンツ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>最近のアップロード</Text>
        {/* コンテンツリスト */}
      </View>

      {/* クイックアクション */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>クイックアクション</Text>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="add-circle-outline" size={24} />
          <Text>新しい動画をアップロード</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
```

### Phase 3: コンテンツ一覧と管理

#### 3-1. コンテンツ一覧コンポーネント

**`components/creation/ContentsContent.tsx`の作成**

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Video, Short } from '../../types';
import { getUserVideos, getUserShorts } from '../../utils/mockApi';

type ContentType = 'videos' | 'shorts';

export default function ContentsContent() {
  const router = useRouter();
  const [contentType, setContentType] = useState<ContentType>('videos');
  const [videos, setVideos] = useState<Video[]>([]);
  const [shorts, setShorts] = useState<Short[]>([]);

  useEffect(() => {
    loadContents();
  }, []);

  const loadContents = async () => {
    const userVideos = await getUserVideos();
    const userShorts = await getUserShorts();
    setVideos(userVideos);
    setShorts(userShorts);
  };

  const handleEdit = (id: string, type: 'video' | 'short') => {
    router.push(`/creation/${type}/${id}/edit`);
  };

  const handleDelete = (id: string) => {
    // 削除確認ダイアログ → API呼び出し
  };

  return (
    <View style={styles.container}>
      {/* タブ切り替え */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, contentType === 'videos' && styles.tabActive]}
          onPress={() => setContentType('videos')}
        >
          <Text>動画 ({videos.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, contentType === 'shorts' && styles.tabActive]}
          onPress={() => setContentType('shorts')}
        >
          <Text>Shorts ({shorts.length})</Text>
        </TouchableOpacity>
      </View>

      {/* コンテンツリスト */}
      {contentType === 'videos' ? (
        <FlatList
          data={videos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ContentCard
              thumbnail={item.thumbnail_url}
              title={item.title}
              views={item.view_count}
              createdAt={item.created_at}
              onEdit={() => handleEdit(item.id, 'video')}
              onDelete={() => handleDelete(item.id)}
            />
          )}
        />
      ) : (
        <FlatList
          data={shorts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ContentCard
              thumbnail={item.thumbnail_url}
              title={item.title}
              views={item.view_count}
              createdAt={item.created_at}
              onEdit={() => handleEdit(item.id, 'short')}
              onDelete={() => handleDelete(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}

// ContentCardコンポーネント
function ContentCard({ thumbnail, title, views, createdAt, onEdit, onDelete }) {
  return (
    <View style={styles.card}>
      <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
      <View style={styles.info}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>{views}回視聴 • {formatDate(createdAt)}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={onEdit}>
          <Ionicons name="pencil" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete}>
          <Ionicons name="trash" size={24} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

#### 3-2. API関数の追加

**`utils/mockApi.ts`に追加**

```typescript
// ユーザーの動画を取得
export const getUserVideos = async (): Promise<Video[]> => {
  const allVideos = await getVideos();
  // 現在のユーザーIDでフィルタ（モックなので全て返す）
  return allVideos;
};

// ユーザーのShortsを取得
export const getUserShorts = async (): Promise<Short[]> => {
  const allShorts = await getShorts();
  // 現在のユーザーIDでフィルタ（モックなので全て返す）
  return allShorts;
};

// 動画を削除
export const deleteVideo = async (videoId: string): Promise<void> => {
  // モック実装
  await new Promise(resolve => setTimeout(resolve, 500));
};

// Shortを削除
export const deleteShort = async (shortId: string): Promise<void> => {
  // モック実装
  await new Promise(resolve => setTimeout(resolve, 500));
};

// 動画を更新
export const updateVideo = async (videoId: string, updates: Partial<Video>): Promise<Video> => {
  // モック実装
  await new Promise(resolve => setTimeout(resolve, 500));
  return { ...updates } as Video;
};

// Shortを更新
export const updateShort = async (shortId: string, updates: Partial<Short>): Promise<Short> => {
  // モック実装
  await new Promise(resolve => setTimeout(resolve, 500));
  return { ...updates } as Short;
};
```

### Phase 4: 編集ページの実装

#### 4-1. 動画編集ページ

**`app/creation/video/[id]/edit.tsx`の作成**

```typescript
// 動画編集ページ

import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Video } from '../../../../types';
import { getVideoDetail, updateVideo } from '../../../../utils/mockApi';

export default function EditVideoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [video, setVideo] = useState<Video | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isAdult, setIsAdult] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadVideo();
  }, [id]);

  const loadVideo = async () => {
    const data = await getVideoDetail(id);
    if (data) {
      setVideo(data);
      setTitle(data.title);
      setDescription(data.description || '');
      setCategory(data.category);
      setIsAdult(data.is_adult);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateVideo(id, {
        title,
        description,
        category,
        is_adult: isAdult,
      });
      router.back();
    } catch (error) {
      console.error('Failed to update video:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!video) return <Text>Loading...</Text>;

  return (
    <ScrollView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>動画を編集</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={styles.saveButton}>{saving ? '保存中...' : '保存'}</Text>
        </TouchableOpacity>
      </View>

      {/* サムネイルプレビュー */}
      <Image source={{ uri: video.thumbnail_url }} style={styles.thumbnail} />

      {/* フォーム */}
      <View style={styles.form}>
        <Text style={styles.label}>タイトル</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="タイトルを入力"
        />

        <Text style={styles.label}>説明</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="説明を入力"
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>カテゴリー</Text>
        <TextInput
          style={styles.input}
          value={category}
          onChangeText={setCategory}
          placeholder="カテゴリーを選択"
        />

        {/* 成人向けフラグ */}
        <View style={styles.switchRow}>
          <Text style={styles.label}>成人向けコンテンツ</Text>
          <Switch value={isAdult} onValueChange={setIsAdult} />
        </View>

        {/* 削除ボタン */}
        <TouchableOpacity style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>動画を削除</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
```

#### 4-2. Short編集ページ

**`app/creation/short/[id]/edit.tsx`の作成**

動画編集ページと同様の構造で、Short用に最適化したフォーム。

### Phase 5: アップロード機能の移動

**`components/creation/UploadContent.tsx`の作成**

既存の`app/(tabs)/upload.tsx`のコンテンツをコンポーネント化して移動。

```typescript
export default function UploadContent() {
  // 既存のupload.tsxのロジックをそのまま使用
  const [contentType, setContentType] = useState<'video' | 'short'>('video');

  return (
    <ScrollView style={styles.container}>
      {/* 既存のアップロードフォーム */}
    </ScrollView>
  );
}
```

### Phase 6: アナリティクス（将来実装）

**`components/creation/AnalyticsContent.tsx`の作成**

```typescript
export default function AnalyticsContent() {
  return (
    <View style={styles.container}>
      <Text style={styles.comingSoon}>アナリティクス機能は近日公開予定です</Text>
    </View>
  );
}
```

## ✅ 修正完了条件

### Phase 1: 基盤
- [ ] タブバーから`upload`を削除、`creation`を追加
- [ ] `app/(tabs)/creation.tsx`を作成
- [ ] 内部タブナビゲーション実装

### Phase 2: ダッシュボード
- [ ] `components/creation/DashboardContent.tsx`作成
- [ ] 統計カード表示
- [ ] 最近のコンテンツ表示

### Phase 3: コンテンツ管理
- [ ] `components/creation/ContentsContent.tsx`作成
- [ ] 動画/Shortsタブ切り替え
- [ ] コンテンツカード表示（サムネイル、タイトル、統計）
- [ ] 編集・削除ボタン
- [ ] API関数追加（getUserVideos, getUserShorts, deleteVideo, deleteShort）

### Phase 4: 編集ページ
- [ ] `app/creation/video/[id]/edit.tsx`作成
- [ ] タイトル・説明文編集フォーム
- [ ] カテゴリー選択
- [ ] 成人向けフラグ
- [ ] 保存・削除機能
- [ ] `app/creation/short/[id]/edit.tsx`作成（同様の機能）
- [ ] API関数追加（updateVideo, updateShort）

### Phase 5: アップロード移動
- [ ] `components/creation/UploadContent.tsx`作成
- [ ] 既存アップロード機能の移動
- [ ] 旧`app/(tabs)/upload.tsx`削除

### Phase 6: アナリティクス
- [ ] `components/creation/AnalyticsContent.tsx`作成
- [ ] 「近日公開」メッセージ表示

### 動作確認
- [ ] Creationタブをクリック → Creationページに遷移
- [ ] 内部タブ（Dashboard/Contents/Upload/Analytics）が切り替わる
- [ ] Contentsタブで自分のコンテンツ一覧が表示される
- [ ] 編集ボタンクリック → 編集ページに遷移
- [ ] 編集フォームで内容を変更して保存
- [ ] 削除ボタンでコンテンツを削除
- [ ] Uploadタブで新規アップロードが可能
- [ ] レスポンシブ対応（Mobile/Desktop）

## 🔄 テストシナリオ

### 基本動作

1. **Creationタブアクセス**
   - タブバーのCreationをクリック
   → Creationページが表示される

2. **ダッシュボード表示**
   - 統計カードが表示される
   - 最近のコンテンツが表示される

3. **コンテンツ一覧**
   - Contentsタブをクリック
   - 動画タブに自分の動画一覧が表示される
   - Shortsタブに自分のShorts一覧が表示される

4. **編集機能**
   - コンテンツカードの編集ボタンをクリック
   → 編集ページに遷移
   - タイトルを変更して保存
   → コンテンツ一覧に戻り、変更が反映される

5. **削除機能**
   - 削除ボタンをクリック
   → 確認ダイアログが表示される
   - 確認
   → コンテンツが一覧から削除される

6. **アップロード**
   - Uploadタブをクリック
   - 新規動画/Shortをアップロード
   → アップロード成功後、Contentsに表示される

### エッジケース

1. **コンテンツが0件**
   - 「コンテンツがありません」メッセージを表示

2. **編集中のバック操作**
   - 変更を保存せずに戻る
   → 確認ダイアログ表示

3. **レスポンシブ**
   - デスクトップ: 2カラムレイアウト
   - モバイル: 1カラムレイアウト

## 📐 UI/UX設計

### カラースキーム
- Primary: `Colors.primary` (アクション)
- Error: `Colors.error` (削除)
- Border: `Colors.border` (区切り)

### レイアウト
- ヘッダー: 固定、60px
- 内部タブ: 固定、50px
- コンテンツエリア: スクロール可能

### レスポンシブブレークポイント
- Mobile: `< 768px`
- Desktop: `>= 768px`

## 🚀 優先度

**Phase 1-3: High** - コンテンツ管理の基本機能として必須
**Phase 4: High** - 編集機能は重要
**Phase 5: Medium** - アップロードは既存機能の移動
**Phase 6: Low** - アナリティクスは将来実装

## 📝 参考資料

**YouTube Studio:**
- https://studio.youtube.com/
- コンテンツ管理UI
- ダッシュボードデザイン

**React Native Navigation:**
- タブナビゲーション
- ネストされたナビゲーション
