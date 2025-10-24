// モックAPI

import { Video, VideoDetail, IPLicense, User, Short, Subscription, NetflixContent, SubscriptionPlan, SubscribedChannel, WatchHistory, Channel, ChannelDetail, Analytics, NetflixContentUpload, LiveStream, LiveStreamCreate, LiveStreamStats, Comment, LiveChatMessage } from '../types';
import { canShowAdultContent } from '../constants/Platform';

// モックデータのインポート
import videosData from '../mock/videos.json';
import videoDetailData from '../mock/video-detail.json';
import ipLicensesData from '../mock/ip-licenses.json';
import userData from '../mock/user.json';
import shortsData from '../mock/shorts.json';
import subscriptionsData from '../mock/subscriptions.json';
import netflixContentsData from '../mock/netflix-contents.json';
import subscriptionPlansData from '../mock/subscription-plans.json';
import watchHistoryData from '../mock/watch-history.json';
import channelsData from '../mock/channels.json';
import analyticsData from '../mock/analytics.json';
import videoCommentsData from '../mock/video-comments.json';
import shortCommentsData from '../mock/short-comments.json';
import liveChatMessagesData from '../mock/live-chat-messages.json';

// 動画一覧を取得
export const getVideos = async (): Promise<Video[]> => {
  // プラットフォームに応じて成人向けコンテンツをフィルタ
  const videos = videosData as Video[];

  if (canShowAdultContent) {
    return videos;
  } else {
    return videos.filter(video => !video.is_adult);
  }
};

// 動画詳細を取得
export const getVideoDetail = async (id: string): Promise<VideoDetail | null> => {
  // 実際にはAPIでidに基づいて取得するが、モックなので固定データを返す
  const video = videoDetailData as VideoDetail;

  // 成人向けコンテンツの場合、プラットフォームをチェック
  if (video.is_adult && !canShowAdultContent) {
    return null;
  }

  return video;
};

// IPライセンス一覧を取得
export const getIPLicenses = async (): Promise<IPLicense[]> => {
  return ipLicensesData as IPLicense[];
};

// ユーザー情報を取得
export const getUser = async (): Promise<User> => {
  return userData as User;
};

// モックログイン
export const mockLogin = async (email: string, password: string): Promise<User> => {
  // モックなので常に成功
  return userData as User;
};

// モックサインアップ
export const mockSignup = async (
  name: string,
  email: string,
  password: string
): Promise<User> => {
  // モックなので常に成功
  return {
    ...userData,
    name,
    email,
  } as User;
};

// ショート動画一覧を取得
export const getShorts = async (): Promise<Short[]> => {
  const shorts = shortsData as Short[];

  if (canShowAdultContent) {
    return shorts;
  } else {
    return shorts.filter(short => !short.is_adult);
  }
};

// ショート動画詳細を取得
export const getShortDetail = async (id: string): Promise<Short | null> => {
  const shorts = await getShorts();
  const short = shorts.find(s => s.id === id);
  return short || null;
};

// サブスクリプション一覧を取得
export const getSubscriptions = async (): Promise<Subscription[]> => {
  return subscriptionsData as Subscription[];
};

// Netflix型コンテンツ一覧を取得
export const getNetflixContents = async (): Promise<NetflixContent[]> => {
  const contents = netflixContentsData as NetflixContent[];

  if (canShowAdultContent) {
    return contents;
  } else {
    return contents.filter(content => !content.is_adult);
  }
};

// Netflix型コンテンツ詳細を取得
export const getNetflixContentDetail = async (id: string): Promise<NetflixContent | null> => {
  const contents = await getNetflixContents();
  const content = contents.find(c => c.id === id);

  if (!content) {
    return null;
  }

  // 成人向けコンテンツの場合、プラットフォームをチェック
  if (content.is_adult && !canShowAdultContent) {
    return null;
  }

  return content;
};

// 登録チャンネル一覧を取得（旧：getSubscriptions）
export const getSubscribedChannels = async (): Promise<SubscribedChannel[]> => {
  return subscriptionsData as SubscribedChannel[];
};

// サブスクリプションプラン一覧を取得
export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  return subscriptionPlansData as SubscriptionPlan[];
};

// 現在のプランを取得
export const getCurrentPlan = async (): Promise<SubscriptionPlan | null> => {
  const plans = subscriptionPlansData as SubscriptionPlan[];
  return plans.find(plan => plan.is_current) || null;
};

// プランをアップグレード（モック）
export const upgradePlan = async (planId: string): Promise<void> => {
  // モックなので何もしない
  await new Promise(resolve => setTimeout(resolve, 500));
};

// 視聴履歴を取得
export const getWatchHistory = async (): Promise<WatchHistory[]> => {
  return watchHistoryData as WatchHistory[];
};

// チャンネル一覧を取得
export const getChannels = async (): Promise<Channel[]> => {
  return channelsData as Channel[];
};

// チャンネル詳細を取得
export const getChannelDetail = async (channelId: string): Promise<ChannelDetail | null> => {
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

// 現在のユーザーの動画一覧を取得（モックなので全データを返す）
export const getUserVideos = async (): Promise<Video[]> => {
  const allVideos = await getVideos();
  // モック環境では全ての動画を返す（実際のAPIでは user.id でフィルター）
  return allVideos;
};

// 現在のユーザーのショート一覧を取得（モックなので全データを返す）
export const getUserShorts = async (): Promise<Short[]> => {
  const allShorts = await getShorts();
  // モック環境では全てのショートを返す（実際のAPIでは user.id でフィルター）
  return allShorts;
};

// 動画を削除（モック）
export const deleteVideo = async (videoId: string): Promise<void> => {
  // モックなので何もしない
  await new Promise(resolve => setTimeout(resolve, 500));
};

// ショートを削除（モック）
export const deleteShort = async (shortId: string): Promise<void> => {
  // モックなので何もしない
  await new Promise(resolve => setTimeout(resolve, 500));
};

// 動画を更新（モック）
export const updateVideo = async (
  videoId: string,
  updates: Partial<Video>
): Promise<void> => {
  // モックなので何もしない
  await new Promise(resolve => setTimeout(resolve, 500));
};

// ショートを更新（モック）
export const updateShort = async (
  shortId: string,
  updates: Partial<Short>
): Promise<void> => {
  // モックなので何もしない
  await new Promise(resolve => setTimeout(resolve, 500));
};

// ユーザープロフィールを更新（モック）
export const updateUser = async (
  updates: Partial<User>
): Promise<void> => {
  // モックなので何もしない
  await new Promise(resolve => setTimeout(resolve, 500));
};

// アナリティクスデータを取得
export const getAnalytics = async (): Promise<Analytics> => {
  return analyticsData as Analytics;
};

// ===== Netflix型コンテンツ関連 =====

// ユーザーのNetflix型コンテンツ一覧を取得
export const getUserNetflixContents = async (): Promise<NetflixContent[]> => {
  // モック環境では全てのNetflixコンテンツを返す（実際のAPIでは user.id でフィルター）
  return await getNetflixContents();
};

// Netflix型コンテンツ作成
export const createNetflixContent = async (data: NetflixContentUpload): Promise<void> => {
  // モックなので何もしない
  await new Promise(resolve => setTimeout(resolve, 500));
};

// Netflix型コンテンツ更新
export const updateNetflixContent = async (
  id: string,
  updates: Partial<NetflixContent>
): Promise<void> => {
  // モックなので何もしない
  await new Promise(resolve => setTimeout(resolve, 500));
};

// Netflix型コンテンツ削除
export const deleteNetflixContent = async (id: string): Promise<void> => {
  // モックなので何もしない
  await new Promise(resolve => setTimeout(resolve, 500));
};

// ===== ライブ配信関連 =====

// ライブ配信作成
export const createLiveStream = async (data: LiveStreamCreate): Promise<LiveStream> => {
  // モックライブ配信データを返す
  return {
    id: 'stream_' + Date.now(),
    title: data.title,
    description: data.description,
    category: data.category,
    thumbnail_url: '',
    status: 'scheduled',
    privacy: data.privacy,
    is_adult: data.is_adult,
    chat_enabled: data.chat_enabled,
    super_chat_enabled: data.super_chat_enabled,
    archive_enabled: data.archive_enabled,
    stream_url: 'rtmp://stream.example.com/live',
    stream_key: 'live_' + Date.now(),
    created_at: new Date().toISOString(),
  };
};

// ライブ配信開始
export const startLiveStream = async (streamId: string): Promise<void> => {
  // モックなので何もしない
  await new Promise(resolve => setTimeout(resolve, 500));
};

// ライブ配信終了
export const endLiveStream = async (streamId: string): Promise<void> => {
  // モックなので何もしない
  await new Promise(resolve => setTimeout(resolve, 500));
};

// ユーザーのライブ配信一覧を取得
export const getUserLiveStreams = async (): Promise<LiveStream[]> => {
  // モック環境では空配列を返す
  return [];
};

// ライブ配信統計取得
export const getLiveStreamStats = async (streamId: string): Promise<LiveStreamStats> => {
  // モック統計データを返す
  return {
    stream_id: streamId,
    current_viewers: 1234,
    peak_viewers: 2345,
    total_views: 5678,
    total_likes: 890,
    total_super_chat: 12345,
    average_watch_time: 600,
  };
};

// ===== サムネイル/画像更新関連 =====

// 動画サムネイル更新
export const updateVideoThumbnail = async (videoId: string, imageUri: string): Promise<void> => {
  // モックなので何もしない
  await new Promise(resolve => setTimeout(resolve, 500));
};

// ショートサムネイル更新
export const updateShortThumbnail = async (shortId: string, imageUri: string): Promise<void> => {
  // モックなので何もしない
  await new Promise(resolve => setTimeout(resolve, 500));
};

// Netflix型コンテンツポスター更新
export const updateNetflixPoster = async (contentId: string, posterUri: string): Promise<void> => {
  // モックなので何もしない
  await new Promise(resolve => setTimeout(resolve, 500));
};

// ===== コメント機能関連 =====

// 動画のコメント取得
export const getVideoComments = async (videoId: string): Promise<Comment[]> => {
  return videoCommentsData.filter(c => c.video_id === videoId) as Comment[];
};

// ショートのコメント取得
export const getShortComments = async (shortId: string): Promise<Comment[]> => {
  return shortCommentsData.filter(c => c.short_id === shortId) as Comment[];
};

// コメント投稿
export const postComment = async (
  contentId: string,
  contentType: 'video' | 'short',
  content: string,
  parentCommentId?: string
): Promise<Comment> => {
  // モックで新規コメントを返す
  const newComment: Comment = {
    id: 'comment_' + Date.now(),
    ...(contentType === 'video' ? { video_id: contentId } : { short_id: contentId }),
    user_id: 'user_current',
    user_name: '現在のユーザー',
    user_avatar: 'https://i.pravatar.cc/150?u=current',
    content,
    like_count: 0,
    created_at: new Date().toISOString(),
    parent_comment_id: parentCommentId,
  };
  await new Promise(resolve => setTimeout(resolve, 500));
  return newComment;
};

// コメントにいいね
export const likeComment = async (commentId: string): Promise<void> => {
  // モックなので何もしない
  await new Promise(resolve => setTimeout(resolve, 300));
};

// コメント削除
export const deleteComment = async (commentId: string): Promise<void> => {
  // モックなので何もしない
  await new Promise(resolve => setTimeout(resolve, 500));
};

// コンテンツを保存（後で見る）
export const saveContentForLater = async (
  contentId: string,
  contentType: 'video' | 'short'
): Promise<void> => {
  // モックなので何もしない
  await new Promise(resolve => setTimeout(resolve, 500));
};

// コンテンツを報告
export const reportContent = async (
  contentId: string,
  contentType: 'video' | 'short',
  reason: string
): Promise<void> => {
  // モックなので何もしない
  await new Promise(resolve => setTimeout(resolve, 500));
};

// ===== ライブ配信チャット関連 =====

// ライブチャットメッセージ取得
export const getLiveChatMessages = async (streamId: string): Promise<LiveChatMessage[]> => {
  return liveChatMessagesData as LiveChatMessage[];
};

// ライブチャットメッセージ送信
export const sendLiveChatMessage = async (
  streamId: string,
  message: string
): Promise<LiveChatMessage> => {
  const newMessage: LiveChatMessage = {
    id: 'chat_' + Date.now(),
    user_id: 'user_current',
    user_name: '現在のユーザー',
    user_avatar: 'https://i.pravatar.cc/150?u=current',
    message,
    is_super_chat: false,
    timestamp: new Date().toISOString(),
  };
  await new Promise(resolve => setTimeout(resolve, 300));
  return newMessage;
};

// スーパーチャット送信
export const sendSuperChat = async (
  streamId: string,
  amount: number,
  message: string
): Promise<LiveChatMessage> => {
  const superChatMessage: LiveChatMessage = {
    id: 'superchat_' + Date.now(),
    user_id: 'user_current',
    user_name: '現在のユーザー',
    user_avatar: 'https://i.pravatar.cc/150?u=current',
    message,
    is_super_chat: true,
    super_chat_amount: amount,
    timestamp: new Date().toISOString(),
  };
  await new Promise(resolve => setTimeout(resolve, 500));
  return superChatMessage;
};
