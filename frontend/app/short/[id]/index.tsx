// ショート動画詳細ページ（TikTok/Instagram Reels風）

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  TextInput,
  Alert,
  useWindowDimensions,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import ActionSheet from '../../../components/ActionSheet';
import TipModal from '../../../components/TipModal';
import { Short, Comment } from '../../../types';
import { getShortDetail, getVideoComments, postComment, likeComment, saveContentForLater, reportContent } from '../../../utils/mockApi';
import { Colors } from '../../../constants/Colors';

const TAB_BAR_HEIGHT = 0; // ショート詳細ページはフルスクリーン

// いいね数、視聴数を表示用にフォーマット
const formatCount = (count: number): string => {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

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

export default function ShortDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const videoRef = useRef<Video>(null);

  const [short, setShort] = useState<Short | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [status, setStatus] = useState<any>(null);

  // コメント関連
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // ActionSheet
  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  // TipModal
  const [tipModalVisible, setTipModalVisible] = useState(false);

  useEffect(() => {
    loadShort();
    loadComments();
  }, [id]);

  useEffect(() => {
    // コンポーネントマウント時に自動再生
    videoRef.current?.playAsync();

    return () => {
      // アンマウント時に停止
      videoRef.current?.stopAsync();
      videoRef.current?.unloadAsync();
    };
  }, []);

  const loadShort = async () => {
    try {
      const data = await getShortDetail(id);
      setShort(data);
    } catch (error) {
      console.error('Failed to load short:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const data = await getVideoComments(id);
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) return;

    setPostingComment(true);
    try {
      const newComment = await postComment(id, 'short', commentText.trim());
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
      // UI更新（実際のAPIでは返り値を使う）
      setComments(
        comments.map((c) =>
          c.id === commentId ? { ...c, like_count: c.like_count + 1 } : c
        )
      );
    } catch (error) {
      console.error('Failed to like comment:', error);
    }
  };

  const togglePlayPause = () => {
    if (status && 'isPlaying' in status) {
      if (status.isPlaying) {
        videoRef.current?.pauseAsync();
      } else {
        videoRef.current?.playAsync();
      }
    }
  };

  const handleChannelPress = () => {
    if (short) {
      router.push(`/channel/${short.user_id}`);
    }
  };

  const handleShare = () => {
    Alert.alert('共有', '共有機能は開発中です');
  };

  const handleSaveForLater = async () => {
    try {
      await saveContentForLater(id, 'short');
      Alert.alert('保存完了', '後で見るに追加しました');
    } catch (error) {
      Alert.alert('エラー', '保存に失敗しました');
    }
  };

  const handleReport = async () => {
    Alert.alert('報告', 'このショート動画を報告しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '報告',
        style: 'destructive',
        onPress: async () => {
          try {
            await reportContent(id, 'short');
            Alert.alert('報告完了', '報告を受け付けました');
          } catch (error) {
            Alert.alert('エラー', '報告に失敗しました');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { width, height }]}>
        <ActivityIndicator size="large" color={Colors.background} />
      </View>
    );
  }

  if (!short) {
    return (
      <View style={[styles.errorContainer, { width, height }]}>
        <Text style={styles.errorText}>ショート動画が見つかりません</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width, height }]}>
      {/* 動画プレーヤー */}
      <TouchableOpacity
        style={styles.videoContainer}
        activeOpacity={1}
        onPress={togglePlayPause}
      >
        <Video
          ref={videoRef}
          source={{ uri: short.video_url }}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay={true}
          isLooping
          onPlaybackStatusUpdate={(status) => setStatus(status)}
        />
      </TouchableOpacity>

      {/* トップバー（戻るボタン） */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIconButton}>
          <Ionicons name="chevron-back" size={32} color={Colors.background} />
        </TouchableOpacity>
      </View>

      {/* 右側アクションボタン */}
      <View style={styles.actionsContainer}>
        {/* 投稿者アバター */}
        <TouchableOpacity style={styles.avatarContainer} onPress={handleChannelPress}>
          <Image source={{ uri: short.user_avatar }} style={styles.avatar} />
        </TouchableOpacity>

        {/* いいね */}
        <TouchableOpacity style={styles.actionButton} onPress={() => setLiked(!liked)}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={32}
            color={liked ? '#FF0050' : Colors.background}
          />
          <Text style={styles.actionText}>{formatCount(short.like_count)}</Text>
        </TouchableOpacity>

        {/* コメント */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setCommentModalVisible(true)}
        >
          <Ionicons name="chatbubble-outline" size={32} color={Colors.background} />
          <Text style={styles.actionText}>{formatCount(short.comment_count)}</Text>
        </TouchableOpacity>

        {/* シェア */}
        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Ionicons name="arrow-redo-outline" size={32} color={Colors.background} />
          <Text style={styles.actionText}>シェア</Text>
        </TouchableOpacity>

        {/* 投げ銭 */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setTipModalVisible(true)}
        >
          <Ionicons name="gift-outline" size={32} color={Colors.primary} />
          <Text style={[styles.actionText, styles.tipButtonText]}>投げ銭</Text>
        </TouchableOpacity>

        {/* メニュー */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setActionSheetVisible(true)}
        >
          <Ionicons name="ellipsis-vertical" size={28} color={Colors.background} />
        </TouchableOpacity>
      </View>

      {/* 下部情報エリア */}
      <View style={styles.infoContainer}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>@{short.user_name}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {short.title}
        </Text>
        <View style={styles.metaInfo}>
          <Text style={styles.metaText}>{formatCount(short.view_count)}回視聴</Text>
          <Text style={styles.metaText}> • </Text>
          <Text style={styles.metaText}>{formatRelativeTime(short.created_at)}</Text>
        </View>
      </View>

      {/* コメントモーダル（ボトムシート風） */}
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

      {/* ActionSheet */}
      <ActionSheet
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        title={short.title}
        actions={[
          { label: '共有', icon: 'share-outline', onPress: handleShare },
          {
            label: '後で見る',
            icon: 'bookmark-outline',
            onPress: handleSaveForLater,
          },
          { label: '報告', icon: 'flag-outline', onPress: handleReport, destructive: true },
        ]}
      />

      {/* 投げ銭モーダル */}
      <TipModal
        visible={tipModalVisible}
        onClose={() => setTipModalVisible(false)}
        contentId={short.id}
        contentType="short"
        contentTitle={short.title}
        creatorName={short.user_name}
        isAdultContent={short.is_adult}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.text,
    position: 'relative',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.text,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.text,
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: Colors.background,
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
  videoContainer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 12,
    zIndex: 10,
  },
  backIconButton: {
    padding: 8,
  },
  actionsContainer: {
    position: 'absolute',
    right: 12,
    bottom: 100,
    alignItems: 'center',
    gap: 24,
    zIndex: 10,
  },
  avatarContainer: {
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  tipButtonText: {
    color: Colors.primary,
  },
  infoContainer: {
    position: 'absolute',
    left: 12,
    right: 80,
    bottom: 100,
    zIndex: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  title: {
    color: Colors.background,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: Colors.background,
    fontSize: 13,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
