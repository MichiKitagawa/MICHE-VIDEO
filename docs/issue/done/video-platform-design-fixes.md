# ビデオプラットフォーム設計修正ドキュメント

## 概要
動画プラットフォームにおける以下の設計問題を特定し、修正方針をまとめる。

---

## 問題1: Netflix - サブスクリプションティア選択の設計ミス

### 何が問題か
**現状**: `/app/creation/netflix/upload.tsx` で「サブスクリプションティア」（プレミアム/ビジネス）をコンテンツアップロード者に選択させている。

**問題点**:
- サブスクリプションの管理はプラットフォーム側の責任であり、コンテンツクリエイターが決定すべきものではない
- 現在の設計では「このコンテンツはプレミアム会員のみ」のような制限をクリエイターが設定できてしまう
- これによりプラットフォームのサブスク戦略とコンテンツ配信が乖離する可能性がある

### どうすべきか
- サブスクリプション加入者は、すべてのNetflixコンテンツを視聴可能にする
- コンテンツのティア管理はプラットフォーム管理画面で行う（クリエイターUIには表示しない）

### どう修正すべきか

#### `/app/creation/netflix/upload.tsx`
```typescript
// 削除すべき部分（行数は実際のファイルに基づいて調整）
// サブスクリプションティア選択のUI（ラジオボタン）を削除
// subscription_tier の state を削除
// subscription_tier の validation を削除
// createNetflixContent() の引数から subscription_tier を削除
```

#### `/types/index.ts`
```typescript
// NetflixContentUpload インターフェースから削除
export interface NetflixContentUpload {
  // ...
  // subscription_tier: 'premium' | 'business'; // この行を削除
}
```

#### `/utils/mockApi.ts`
```typescript
// createNetflixContent() の型定義から subscription_tier を削除
```

---

## 問題2: Netflix - 成人向けコンテンツ設定の設計ミス

### 何が問題か
**現状**: `/app/creation/netflix/upload.tsx` および `/app/creation/netflix/[id]/edit.tsx` で「18歳以上」トグルをクリエイターに提供している。

**問題点**:
- Netflixコンテンツ（映画・ドラマ）の年齢制限は、映画のレーティング（G, PG-13, R, NC-17など）に基づく
- これはプラットフォーム側が映画のメタデータに基づいて自動的に決定すべき情報
- クリエイターが任意に設定できるものではない（法的・規制的な問題）
- 普通の動画やショート動画の場合、クリエイターが自身のコンテンツについて判断するのは妥当
- しかしNetflixコンテンツは既存の映画・ドラマであり、年齢制限は既に決まっている

### どうすべきか
- **動画・ショート**: 18+設定を維持（クリエイターが自身のコンテンツについて判断）
- **Netflix**: 18+設定を削除（プラットフォームが映画のレーティングに基づいて自動設定）

### どう修正すべきか

#### `/app/creation/netflix/upload.tsx`
```typescript
// 削除すべき部分
// 「18歳以上のコンテンツ」トグルUIを削除
// is_adult の state を削除
// createNetflixContent() の引数から is_adult を削除（またはデフォルト値 false で送信）
```

#### `/app/creation/netflix/[id]/edit.tsx`
```typescript
// 削除すべき部分
// 「18歳以上のコンテンツ」トグルUIを削除
// is_adult の state を削除
// updateNetflixContent() の引数から is_adult を削除
```

#### 備考
- バックエンド実装時には、映画のレーティング情報から自動的に `is_adult` を設定するロジックを追加
- 例: rating が "R", "NC-17" などの場合、自動的に `is_adult = true` を設定

---

## 問題3: 動画・ショート - コメント機能の欠如

### 何が問題か
**現状**: 動画詳細画面（`/app/video/[id]/index.tsx`）およびショート詳細画面にコメント機能がない。

**問題点**:
- ビデオプラットフォームの基本機能であるコメント（コミュニティ機能）が実装されていない
- ユーザーエンゲージメントの核となる機能が欠けている
- `types/index.ts` にコメント関連の型定義がない

### どうすべきか
以下の機能を実装する：
1. コメント一覧の表示（ユーザー名、アバター、コメント本文、投稿日時、いいね数）
2. コメント投稿フォーム
3. コメントへのいいね機能
4. コメントへの返信機能（ネストされたコメント）
5. コメントの並び替え（最新順、人気順）

### どう修正すべきか

#### `/types/index.ts`
```typescript
// 追加すべき型定義
export interface Comment {
  id: string;
  video_id?: string; // 動画の場合
  short_id?: string; // ショートの場合
  user_id: string;
  user_name: string;
  user_avatar: string;
  content: string; // コメント本文
  like_count: number;
  created_at: string;
  parent_comment_id?: string; // 返信の場合、親コメントのID
  replies?: Comment[]; // 返信コメント（オプション、ネスト構造）
}
```

#### `/utils/mockApi.ts`
```typescript
// 追加すべきAPI関数
export const getVideoComments = async (videoId: string): Promise<Comment[]> => {
  // モックデータを返す
};

export const getShortComments = async (shortId: string): Promise<Comment[]> => {
  // モックデータを返す
};

export const postComment = async (
  contentId: string,
  contentType: 'video' | 'short',
  content: string,
  parentCommentId?: string
): Promise<Comment> => {
  // モックで新規コメントを返す
};

export const likeComment = async (commentId: string): Promise<void> => {
  // モック（何もしない）
};

export const deleteComment = async (commentId: string): Promise<void> => {
  // モック（何もしない）
};
```

#### `/mock/video-comments.json`
```json
[
  {
    "id": "comment_1",
    "video_id": "video_1",
    "user_id": "user_2",
    "user_name": "田中太郎",
    "user_avatar": "https://example.com/avatar2.jpg",
    "content": "素晴らしい動画でした！",
    "like_count": 42,
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### `/app/video/[id]/index.tsx`
```typescript
// 追加すべきコンポーネント
// 1. コメント一覧セクション（スクロール可能）
// 2. コメント投稿フォーム（テキスト入力 + 送信ボタン）
// 3. 各コメント項目（ユーザー情報、コメント本文、いいねボタン、返信ボタン）
// 4. 並び替えオプション（最新順、人気順）

// 実装場所: 動画説明文の下、推薦動画の上
```

#### `/app/short/[id]/index.tsx`
```typescript
// 動画と同様のコメント機能を実装
```

---

## 問題4: 動画・ショート - 3点リーダーメニューの機能不足

### 何が問題か
**現状**: 動画/ショート詳細画面に3点リーダー（...）ボタンはあるが、タップしても何も起こらない。

**問題点**:
- ビデオプラットフォームで一般的な機能（共有、保存など）がない
- UIに存在するボタンが機能しない（ユーザー体験の問題）

### どうすべきか
3点リーダーメニューで以下の機能を提供：
1. **共有** - SNS、リンクコピー
2. **保存/後で見る** - プレイリストに追加
3. **報告** - 不適切なコンテンツの報告
4. **字幕設定**（オプション）
5. **再生速度**（オプション）

### どう修正すべきか

#### `/components/ActionSheet.tsx`（新規作成）
```typescript
// React Nativeのモーダル/アクションシートコンポーネントを作成
// オプション: 共有、保存、報告などのアクション

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  actions: Array<{
    label: string;
    icon: string;
    onPress: () => void;
  }>;
}
```

#### `/app/video/[id]/index.tsx`
```typescript
// 3点リーダーボタンの onPress ハンドラーを実装
const handleMorePress = () => {
  // アクションシートを表示
  setActionSheetVisible(true);
};

// アクションシートのアクション定義
const actions = [
  { label: '共有', icon: 'share-outline', onPress: handleShare },
  { label: '後で見る', icon: 'bookmark-outline', onPress: handleSaveForLater },
  { label: '報告', icon: 'flag-outline', onPress: handleReport },
];
```

#### `/utils/mockApi.ts`
```typescript
// 追加すべきAPI関数
export const saveVideoForLater = async (videoId: string): Promise<void> => {
  // モック（何もしない）
};

export const reportContent = async (
  contentId: string,
  contentType: 'video' | 'short',
  reason: string
): Promise<void> => {
  // モック（何もしない）
};
```

---

## 問題5: ライブ配信 - ライブ識別の欠如

### 何が問題か
**現状**: ライブ配信中の動画が通常の動画と視覚的に区別できない。

**問題点**:
- サムネイルに「LIVE」バッジがない
- 動画一覧でライブ配信を識別できない
- リアルタイム性を示す視覚的要素がない

### どうすべきか
以下の視覚的要素を追加：
1. サムネイル左上に赤背景の「LIVE」バッジ
2. 現在の視聴者数表示（「👁 1,234人視聴中」）
3. ライブ配信の優先表示（オプション）

### どう修正すべきか

#### `/components/VideoCard.tsx`
```typescript
// Video 型に status?: 'live' | 'archived' | 'normal' を追加するか、
// LiveStream 型と Video 型を統合するか検討

// サムネイル上にLIVEバッジを追加
{video.status === 'live' && (
  <View style={styles.liveBadge}>
    <Text style={styles.liveBadgeText}>LIVE</Text>
  </View>
)}

// 視聴者数を表示
{video.status === 'live' && video.current_viewers && (
  <View style={styles.viewerCount}>
    <Ionicons name="eye" size={12} color="#fff" />
    <Text style={styles.viewerCountText}>
      {video.current_viewers.toLocaleString()}人視聴中
    </Text>
  </View>
)}
```

#### スタイル
```typescript
liveBadge: {
  position: 'absolute',
  top: 8,
  left: 8,
  backgroundColor: '#ff0000',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 4,
},
liveBadgeText: {
  color: '#fff',
  fontSize: 12,
  fontWeight: 'bold',
},
viewerCount: {
  position: 'absolute',
  bottom: 8,
  left: 8,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 4,
},
```

---

## 問題6: ライブ配信 - ライブ体験の欠如

### 何が問題か
**現状**: ライブ配信ページが普通の動画再生と同じで、ライブ特有の機能がない。

**問題点**:
- リアルタイムチャットがない
- スーパーチャット（投げ銭）機能がない
- ライブ配信特有のUI/UXがない
- 通常の動画とライブ配信の区別がつかない

### どうすべきか

#### 6-1: リアルタイムチャット機能
**実装すべき要素**:
1. チャット表示エリア（画面右側または下部）
2. チャット入力フォーム（常時表示、Enterで送信）
3. メッセージの自動スクロール（最新メッセージが下）
4. ユーザーアイコン、名前、メッセージ、タイムスタンプ
5. スーパーチャットメッセージの強調表示

**通常のコメントとの違い**:
- 通常のコメント: 静的リスト、投稿後に表示、編集・削除可能
- ライブチャット: リアルタイムストリーム、自動スクロール、編集不可

#### 6-2: スーパーチャット機能
**実装すべき要素**:
1. チャット入力欄の「$」アイコン（スーパーチャット送信ボタン）
2. 金額選択モーダル（¥100, ¥500, ¥1,000, ¥5,000など）
3. メッセージ入力（オプション）
4. スーパーチャットメッセージの特別表示（色付き背景、ピン留め）
5. 配信者への通知（画面上部にポップアップ表示）

**データ型**:
```typescript
export interface LiveChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  message: string;
  is_super_chat: boolean;
  super_chat_amount?: number; // 円
  timestamp: string;
}
```

#### 6-3: 統計情報のリアルタイム表示
**実装すべき要素**:
1. 現在の視聴者数（リアルタイム更新）
2. 総いいね数
3. スーパーチャット総額（配信者のみ表示）

#### 6-4: ライブ配信終了後のアーカイブ
**実装方針**:
- `archive_enabled: true` の場合、配信終了後に通常の動画として保存
- アーカイブ動画には「ライブアーカイブ」バッジを表示
- チャットメッセージをタイムスタンプ付きで保存し、再生時に再現（オプション）

### どう修正すべきか

#### `/types/index.ts`
```typescript
// 既に定義されているので追加不要：
// - LiveStream
// - LiveChatMessage
// - LiveStreamStats
```

#### `/utils/mockApi.ts`
```typescript
// 追加すべきAPI関数
export const getLiveChatMessages = async (streamId: string): Promise<LiveChatMessage[]> => {
  // モックチャットメッセージを返す
};

export const sendLiveChatMessage = async (
  streamId: string,
  message: string
): Promise<LiveChatMessage> => {
  // モックで新規メッセージを返す
};

export const sendSuperChat = async (
  streamId: string,
  amount: number,
  message: string
): Promise<LiveChatMessage> => {
  // モックでスーパーチャットメッセージを返す
};
```

#### `/mock/live-chat-messages.json`（新規作成）
```json
[
  {
    "id": "chat_1",
    "stream_id": "stream_123",
    "user_id": "user_2",
    "user_name": "田中太郎",
    "user_avatar": "https://example.com/avatar2.jpg",
    "message": "こんにちは！",
    "is_super_chat": false,
    "timestamp": "2024-01-20T14:30:15Z"
  },
  {
    "id": "chat_2",
    "stream_id": "stream_123",
    "user_id": "user_3",
    "user_name": "佐藤花子",
    "user_avatar": "https://example.com/avatar3.jpg",
    "message": "応援しています！",
    "is_super_chat": true,
    "super_chat_amount": 500,
    "timestamp": "2024-01-20T14:31:00Z"
  }
]
```

#### `/app/live/[id]/index.tsx`（新規作成）
```typescript
// ライブ配信専用の視聴ページ
// 実装要素：
// 1. 動画プレイヤー
// 2. ライブ統計情報（視聴者数、いいね数）
// 3. リアルタイムチャット表示エリア
// 4. チャット入力フォーム
// 5. スーパーチャット送信ボタン
```

#### `/components/live/LiveChat.tsx`（新規作成）
```typescript
// リアルタイムチャットコンポーネント
interface LiveChatProps {
  streamId: string;
  messages: LiveChatMessage[];
  onSendMessage: (message: string) => void;
  onSendSuperChat: (amount: number, message: string) => void;
}

// 実装要素：
// - メッセージリスト（スクロール可能）
// - 自動スクロール（最新メッセージを追跡）
// - スーパーチャットメッセージの強調表示
// - チャット入力フォーム
```

#### `/components/live/SuperChatModal.tsx`（新規作成）
```typescript
// スーパーチャット送信モーダル
interface SuperChatModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (amount: number, message: string) => void;
}

// 実装要素：
// - 金額選択ボタン
// - メッセージ入力フィールド
// - 送信ボタン
```

---

## 実装優先度

### 高優先度（即座に修正すべき）
1. **Netflix - サブスクリプションティア選択の削除**
2. **Netflix - 18+設定の削除**

### 中優先度（次のフェーズで実装）
3. **動画・ショート - コメント機能**
4. **ライブ配信 - LIVEバッジ表示**

### 低優先度（将来的に実装）
5. **3点リーダーメニューの機能拡充**
6. **ライブ配信 - リアルタイムチャット・スーパーチャット**

---

## 備考

### ライブ配信の設計について
- リアルタイム機能（チャット、視聴者数更新）は、実際のバックエンド実装時にWebSocketまたはServer-Sent Eventsが必要
- モック環境では、定期的なポーリングまたは静的データで代替可能
- スーパーチャット機能は収益化戦略に関わるため、ビジネス要件を確認してから実装

### コメント機能の設計について
- 返信機能（ネストされたコメント）の実装深度は要検討（1階層のみ、または無制限）
- スパム対策、不適切なコメントのフィルタリングは将来的な課題
- コメントの編集・削除権限（本人のみ、または配信者も可能）は要検討
