// 動画視聴ページ

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import VideoPlayer from '../../components/VideoPlayer';
import ActionSheet from '../../components/ActionSheet';
import TipModal from '../../components/TipModal';
import { VideoDetail, Comment, SubscriptionPlan } from '../../types';
import { getVideoDetail, getVideoComments, postComment, likeComment, saveContentForLater, reportContent, getCurrentSubscriptionPlan } from '../../utils/mockApi';
import { canAccessContent, needsPlanUpgrade } from '../../utils/contentAccess';
import { Colors } from '../../constants/Colors';

export default function VideoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  // コメント関連
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // アクションシート
  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  // 投げ銭モーダル
  const [tipModalVisible, setTipModalVisible] = useState(false);

  useEffect(() => {
    loadVideo();
    loadComments();
  }, [id]);

  const loadVideo = async () => {
    try {
      const [videoData, planData] = await Promise.all([
        getVideoDetail(id),
        getCurrentSubscriptionPlan(),
      ]);
      setVideo(videoData);
      setCurrentPlan(planData);
    } catch (error) {
      console.error('Failed to load video:', error);
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
      const newComment = await postComment(id, 'video', commentText.trim());
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
      // モックなので、UIを更新する必要がある場合はここで行う
    } catch (error) {
      console.error('Failed to like comment:', error);
    }
  };

  const handleShare = () => {
    Alert.alert('共有', '共有機能は開発中です');
  };

  const handleSaveForLater = async () => {
    try {
      await saveContentForLater(id, 'video');
      Alert.alert('保存完了', '後で見るに追加しました');
    } catch (error) {
      Alert.alert('エラー', '保存に失敗しました');
    }
  };

  const handleReport = async () => {
    Alert.alert(
      '報告',
      '報告する理由を選択してください',
      [
        { text: 'スパムまたは誤解を招く', onPress: () => submitReport('スパムまたは誤解を招く') },
        { text: '不適切なコンテンツ', onPress: () => submitReport('不適切なコンテンツ') },
        { text: '著作権侵害', onPress: () => submitReport('著作権侵害') },
        { text: 'キャンセル', style: 'cancel' },
      ]
    );
  };

  const submitReport = async (reason: string) => {
    try {
      await reportContent(id, 'video', reason);
      Alert.alert('報告完了', 'ご報告ありがとうございます');
    } catch (error) {
      Alert.alert('エラー', '報告に失敗しました');
    }
  };

  const formatViewCount = (count: number): string => {
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}万回`;
    }
    return `${count}回`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 60) return `${diffMinutes}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}ヶ月前`;
    return `${Math.floor(diffDays / 365)}年前`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!video) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>動画が見つかりません</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // アクセス権チェック
  if (currentPlan) {
    const accessCheck = canAccessContent(video, currentPlan);
    if (!accessCheck.canAccess) {
      const upgradeCheck = needsPlanUpgrade(video, currentPlan);
      return (
        <View style={styles.container}>
          {/* トップバー */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
              <Ionicons name="chevron-back" size={28} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {/* アクセス制限画面 */}
          <View style={styles.restrictedContainer}>
            <Ionicons name="lock-closed" size={64} color={Colors.textSecondary} />
            <Text style={styles.restrictedTitle}>このコンテンツは制限されています</Text>
            <Text style={styles.restrictedDescription}>{accessCheck.reason}</Text>
            {upgradeCheck.needsUpgrade && (
              <>
                <Text style={styles.upgradeInfo}>
                  {upgradeCheck.requiredPlan === 'premium_plus' ? 'プレミアム+プラン' : 'プレミアムプラン'}が必要です
                </Text>
                <TouchableOpacity
                  style={styles.upgradeButton}
                  onPress={() => router.push('/(tabs)/settings' as any)}
                >
                  <Text style={styles.upgradeButtonText}>プランを見る</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      );
    }
  }

  return (
    <View style={styles.container}>
      {/* トップバー */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="chevron-back" size={28} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActionSheetVisible(true)} style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* 動画プレーヤー */}
        <VideoPlayer videoUrl={video.video_url} />

        {/* 動画情報 */}
        <View style={styles.infoSection}>
          {/* タイトル */}
          <Text style={styles.title}>{video.title}</Text>

          {/* 視聴数・日付 */}
          <Text style={styles.meta}>
            {formatViewCount(video.view_count)}視聴 • {formatDate(video.created_at)}
          </Text>
        </View>

        {/* チャンネル情報 */}
        <View style={styles.channelSection}>
          <Image
            source={{ uri: video.user_avatar }}
            style={styles.avatar}
          />
          <View style={styles.channelInfo}>
            <Text style={styles.channelName}>{video.user_name}</Text>
          </View>
        </View>

        {/* アクションボタン */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="thumbs-up-outline" size={20} color={Colors.text} />
            <Text style={styles.actionText}>{video.like_count || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="thumbs-down-outline" size={20} color={Colors.text} />
            <Text style={styles.actionText}>低評価</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color={Colors.text} />
            <Text style={styles.actionText}>シェア</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => setTipModalVisible(true)}>
            <Ionicons name="gift-outline" size={20} color={Colors.primary} />
            <Text style={[styles.actionText, { color: Colors.primary }]}>投げ銭</Text>
          </TouchableOpacity>
        </View>

        {/* 説明文 */}
        <TouchableOpacity
          style={styles.descriptionSection}
          onPress={() => setDescriptionExpanded(!descriptionExpanded)}
        >
          <Text
            style={styles.description}
            numberOfLines={descriptionExpanded ? undefined : 3}
          >
            {video.description}
          </Text>
          <Text style={styles.expandText}>
            {descriptionExpanded ? '閉じる' : 'もっと見る'}
          </Text>
        </TouchableOpacity>

        {/* IP情報 */}
        {video.ip_license && (
          <View style={styles.ipSection}>
            <Text style={styles.ipSectionTitle}>使用IP</Text>
            <View style={styles.ipCard}>
              <Image
                source={{ uri: video.ip_license.thumbnail }}
                style={styles.ipThumbnail}
              />
              <View style={styles.ipInfo}>
                <Text style={styles.ipName}>{video.ip_license.name}</Text>
                <Text style={styles.ipLicense}>
                  {video.ip_license.license_type}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* コメントセクション */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsSectionTitle}>コメント {comments.length}件</Text>

          {/* コメント入力 */}
          <View style={styles.commentInputContainer}>
            <Image
              source={{ uri: 'https://i.pravatar.cc/150?u=current' }}
              style={styles.commentAvatar}
            />
            <TextInput
              style={styles.commentInput}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="コメントを追加..."
              placeholderTextColor={Colors.textSecondary}
              multiline
            />
            <TouchableOpacity
              style={[styles.commentPostButton, !commentText.trim() && styles.commentPostButtonDisabled]}
              onPress={handlePostComment}
              disabled={!commentText.trim() || postingComment}
            >
              {postingComment ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="send" size={20} color={commentText.trim() ? Colors.primary : Colors.textSecondary} />
              )}
            </TouchableOpacity>
          </View>

          {/* コメント一覧 */}
          {comments.map((comment) => (
            <View key={comment.id} style={styles.commentItem}>
              <Image
                source={{ uri: comment.user_avatar }}
                style={styles.commentAvatar}
              />
              <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentUsername}>{comment.user_name}</Text>
                  <Text style={styles.commentTimestamp}>{formatRelativeTime(comment.created_at)}</Text>
                </View>
                <Text style={styles.commentText}>{comment.content}</Text>
                <View style={styles.commentActions}>
                  <TouchableOpacity
                    style={styles.commentAction}
                    onPress={() => handleLikeComment(comment.id)}
                  >
                    <Ionicons name="thumbs-up-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.commentActionText}>{comment.like_count}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.commentAction}>
                    <Ionicons name="chatbubble-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.commentActionText}>返信</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* アクションシート */}
      <ActionSheet
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        actions={[
          {
            label: '共有',
            icon: 'share-outline',
            onPress: handleShare,
          },
          {
            label: '後で見る',
            icon: 'bookmark-outline',
            onPress: handleSaveForLater,
          },
          {
            label: '報告',
            icon: 'flag-outline',
            onPress: handleReport,
            destructive: true,
          },
        ]}
      />

      {/* 投げ銭モーダル */}
      <TipModal
        visible={tipModalVisible}
        onClose={() => setTipModalVisible(false)}
        contentId={video.id}
        contentType="video"
        contentTitle={video.title}
        creatorName={video.user_name}
        isAdultContent={video.is_adult}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backIcon: {
    padding: 8,
  },
  moreButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
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
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  restrictedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  restrictedTitle: {
    fontSize: 20,
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
    marginBottom: 16,
  },
  upgradeInfo: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 24,
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
  infoSection: {
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 24,
    marginBottom: 8,
  },
  meta: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  channelSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.border,
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  actionsSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  actionText: {
    fontSize: 13,
    color: Colors.text,
  },
  descriptionSection: {
    padding: 16,
  },
  description: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  expandText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  ipSection: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  ipSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  ipCard: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    gap: 12,
  },
  ipThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: Colors.border,
  },
  ipInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  ipName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  ipLicense: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  commentsSection: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  commentsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 24,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.border,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
    minHeight: 40,
    maxHeight: 120,
  },
  commentPostButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentPostButtonDisabled: {
    opacity: 0.5,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  commentTimestamp: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  commentText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 16,
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
