// ショート画面（TikTok/YouTubeショート風）

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Text,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ShortVideoPlayer from '../../components/ShortVideoPlayer';
import ActionSheet from '../../components/ActionSheet';
import { Short, Comment } from '../../types';
import { getShorts, getVideoComments, postComment, likeComment } from '../../utils/mockApi';
import { Colors } from '../../constants/Colors';

const TAB_BAR_HEIGHT = 60;

// 日時を相対表示
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '1日前';
  if (diffDays < 7) return `${diffDays}日前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}ヶ月前`;
  return `${Math.floor(diffDays / 365)}年前`;
};

export default function ShortsScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const [shorts, setShorts] = useState<Short[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeShortId, setActiveShortId] = useState<string | null>(null);

  // ActionSheet状態
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedShort, setSelectedShort] = useState<Short | null>(null);

  // コメントモーダル状態
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedShortForComment, setSelectedShortForComment] = useState<Short | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

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

  const handleMorePress = (short: Short) => {
    setSelectedShort(short);
    setActionSheetVisible(true);
  };

  const handleShare = () => {
    Alert.alert('共有', 'この機能は開発中です');
  };

  const handleSaveForLater = () => {
    Alert.alert('後で見る', '後で見るリストに追加しました');
  };

  const handleReport = () => {
    Alert.alert('報告', 'このショート動画を報告しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '報告', style: 'destructive', onPress: () => Alert.alert('報告完了', '報告を受け付けました') },
    ]);
  };

  const handleCommentPress = async (short: Short) => {
    setSelectedShortForComment(short);
    setCommentModalVisible(true);
    // コメントを読み込む
    try {
      const data = await getVideoComments(short.id);
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleSharePress = (short: Short) => {
    Alert.alert('共有', '共有機能は開発中です');
  };

  const handlePostComment = async () => {
    if (!commentText.trim() || !selectedShortForComment) return;

    setPostingComment(true);
    try {
      const newComment = await postComment(selectedShortForComment.id, 'short', commentText.trim());
      setComments([...comments, newComment]);
      setCommentText('');
    } catch (error) {
      Alert.alert('エラー', 'コメントの投稿に失敗しました');
    } finally {
      setPostingComment(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      await likeComment(commentId);
      // UI更新
      setComments(
        comments.map((c) =>
          c.id === commentId ? { ...c, like_count: c.like_count + 1 } : c
        )
      );
    } catch (error) {
      console.error('Failed to like comment:', error);
    }
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
            onMorePress={handleMorePress}
            onCommentPress={handleCommentPress}
            onSharePress={handleSharePress}
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

      {/* ActionSheet */}
      <ActionSheet
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        title={selectedShort?.title}
        actions={[
          { label: '共有', icon: 'share-outline', onPress: handleShare },
          { label: '後で見る', icon: 'bookmark-outline', onPress: handleSaveForLater },
          { label: '報告', icon: 'flag-outline', onPress: handleReport, destructive: true },
        ]}
      />

      {/* コメントモーダル（ボトムシート） */}
      <Modal
        visible={commentModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCommentModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setCommentModalVisible(false)}
        >
          <Pressable
            style={styles.commentSheet}
            onPress={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <View style={styles.commentHeader}>
              <Text style={styles.commentHeaderText}>
                コメント {comments.length}件
              </Text>
              <TouchableOpacity onPress={() => setCommentModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* コメント一覧 */}
            <ScrollView style={styles.commentList}>
              {comments.length === 0 ? (
                <Text style={styles.emptyCommentText}>
                  コメントはまだありません
                </Text>
              ) : (
                comments.map((comment) => (
                  <View key={comment.id} style={styles.commentItem}>
                    <Image
                      source={{ uri: comment.user_avatar }}
                      style={styles.commentAvatar}
                    />
                    <View style={styles.commentContent}>
                      <Text style={styles.commentUserName}>{comment.user_name}</Text>
                      <Text style={styles.commentText}>{comment.text}</Text>
                      <View style={styles.commentMeta}>
                        <Text style={styles.commentTime}>
                          {formatRelativeTime(comment.created_at)}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleLikeComment(comment.id)}
                        >
                          <View style={styles.commentLike}>
                            <Ionicons
                              name="heart-outline"
                              size={14}
                              color={Colors.textSecondary}
                            />
                            <Text style={styles.commentLikeCount}>
                              {comment.like_count}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {/* コメント入力欄 */}
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="コメントを追加..."
                placeholderTextColor={Colors.textSecondary}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.commentPostButton,
                  (!commentText.trim() || postingComment) &&
                    styles.commentPostButtonDisabled,
                ]}
                onPress={handlePostComment}
                disabled={!commentText.trim() || postingComment}
              >
                {postingComment ? (
                  <ActivityIndicator size="small" color={Colors.background} />
                ) : (
                  <Ionicons name="send" size={20} color={Colors.background} />
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  // コメントモーダル
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  commentSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  commentHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  commentList: {
    maxHeight: 400,
  },
  emptyCommentText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 14,
    marginVertical: 32,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 12,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.border,
  },
  commentContent: {
    flex: 1,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  commentTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  commentLike: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentLikeCount: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    maxHeight: 100,
  },
  commentPostButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentPostButtonDisabled: {
    backgroundColor: Colors.border,
  },
});
