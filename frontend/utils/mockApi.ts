// モックAPI

import { Video, VideoDetail, IPLicense, User, Short, Subscription, NetflixContent, SubscriptionPlan, SubscribedChannel, WatchHistory, Channel, ChannelDetail, Analytics, NetflixContentUpload, LiveStream, LiveStreamCreate, LiveStreamStats, Comment, LiveChatMessage, BillingHistory, PaymentMethod, EarningsStats, WithdrawalMethod, WithdrawalRequest, TipHistory, Notification, Playlist, PlaylistDetail } from '../types';
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
import billingHistoryData from '../mock/billing-history.json';
import earningsStatsData from '../mock/earnings-stats.json';
import withdrawalMethodsData from '../mock/withdrawal-methods.json';
import withdrawalHistoryData from '../mock/withdrawal-history.json';
import notificationsData from '../mock/notifications.json';
import playlistsData from '../mock/playlists.json';

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

// ショート動画を検索
export const searchShorts = async (query: string): Promise<Short[]> => {
  const shorts = await getShorts();

  if (!query.trim()) {
    return shorts;
  }

  const lowerQuery = query.toLowerCase();

  return shorts.filter(short =>
    short.title.toLowerCase().includes(lowerQuery) ||
    short.description?.toLowerCase().includes(lowerQuery) ||
    short.user_name.toLowerCase().includes(lowerQuery) ||
    short.category?.toLowerCase().includes(lowerQuery)
  );
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

// ===== サブスクリプション管理関連 =====

// プランをキャンセル
export const cancelSubscription = async (): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 500));
};

// プランをダウングレード
export const downgradePlan = async (planId: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 500));
};

// 請求履歴を取得
export const getBillingHistory = async (): Promise<BillingHistory[]> => {
  return billingHistoryData as BillingHistory[];
};

// 支払い方法一覧を取得
export const getPaymentMethods = async (): Promise<PaymentMethod[]> => {
  return [
    {
      id: 'pm_001',
      type: 'credit_card',
      last_four: '4242',
      brand: 'Visa',
      is_default: true,
      expires_at: '2027-12-31',
    },
  ];
};

// 支払い方法を追加
export const addPaymentMethod = async (
  method: Omit<PaymentMethod, 'id'>
): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 500));
};

// 支払い方法を削除
export const deletePaymentMethod = async (methodId: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 500));
};

// デフォルト支払い方法を設定
export const setDefaultPaymentMethod = async (methodId: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300));
};

// ===== 収益・出金管理関連 =====

const MINIMUM_WITHDRAWAL = 5000;  // 最低出金額
const WITHDRAWAL_FEE = 250;       // 出金手数料

// 収益統計を取得
export const getEarningsStats = async (): Promise<EarningsStats> => {
  return earningsStatsData as EarningsStats;
};

// 出金方法一覧を取得
export const getWithdrawalMethods = async (): Promise<WithdrawalMethod[]> => {
  return withdrawalMethodsData as WithdrawalMethod[];
};

// 出金方法を追加
export const addWithdrawalMethod = async (
  method: Omit<WithdrawalMethod, 'id' | 'is_verified' | 'created_at'>
): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 500));
};

// 出金方法を削除
export const deleteWithdrawalMethod = async (methodId: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 500));
};

// デフォルト出金方法を設定
export const setDefaultWithdrawalMethod = async (methodId: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300));
};

// 出金を申請
export const requestWithdrawal = async (
  amount: number,
  methodId: string
): Promise<WithdrawalRequest> => {
  if (amount < MINIMUM_WITHDRAWAL) {
    throw new Error(`最低出金額は¥${MINIMUM_WITHDRAWAL.toLocaleString()}です`);
  }

  const stats = await getEarningsStats();
  if (amount > stats.available_balance) {
    throw new Error('出金可能残高を超えています');
  }

  const method = (await getWithdrawalMethods()).find(m => m.id === methodId);
  if (!method) {
    throw new Error('出金方法が見つかりません');
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    id: 'wd_' + Date.now(),
    amount,
    method_id: methodId,
    method_type: method.type,
    method_display: method.type === 'bank_transfer'
      ? `${method.bank_name} ${method.branch_name}`
      : method.paypal_email || 'PayPal',
    status: 'pending',
    requested_at: new Date().toISOString(),
    fee: WITHDRAWAL_FEE,
    net_amount: amount - WITHDRAWAL_FEE,
  };
};

// 出金履歴を取得
export const getWithdrawalHistory = async (): Promise<WithdrawalRequest[]> => {
  return withdrawalHistoryData as WithdrawalRequest[];
};

// ========================================
// サブスクリプションプラン関連API
// ========================================

/**
 * 利用可能なサブスクプランの一覧を取得
 */
export const getAvailableSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const plans = require('../mock/subscription-plans.json');
  return new Promise(resolve => {
    setTimeout(() => resolve(plans), 300);
  });
};

/**
 * ユーザーの現在のプランを取得
 */
export const getCurrentSubscriptionPlan = async (): Promise<SubscriptionPlan> => {
  const plans = await getAvailableSubscriptionPlans();
  // 現在はフリープランを返す（モック）
  const currentPlan = plans.find(p => p.is_current) || plans.find(p => p.id === 'plan_free') || plans[0];
  return currentPlan;
};

/**
 * サブスクプランの変更
 */
export const changeSubscriptionPlan = async (
  planId: string
): Promise<{ success: boolean; paymentUrl?: string; error?: string }> => {
  const plans = await getAvailableSubscriptionPlans();
  const plan = plans.find(p => p.id === planId);

  if (!plan) {
    return { success: false, error: 'プランが見つかりません' };
  }

  if (plan.price === 0) {
    // フリープランへの変更は即座に完了
    return { success: true };
  }

  // 有料プランの場合は決済URLを返す
  const { getPaymentUrl } = require('./paymentProvider');
  const paymentUrl = getPaymentUrl(
    plan.payment_provider!,
    planId,
    plan.price
  );

  return { success: true, paymentUrl };
};

// ========================================
// 投げ銭関連API
// ========================================

/**
 * 投げ銭を送る
 */
export const sendTip = async (
  contentId: string,
  contentType: 'video' | 'short' | 'live',
  amount: number,
  message?: string
): Promise<{ success: boolean; paymentUrl?: string; error?: string }> => {
  // コンテンツ情報を取得してアダルトフラグを確認
  let isAdult = false;

  if (contentType === 'video') {
    const video = await getVideoDetail(contentId);
    isAdult = video.is_adult;
  } else if (contentType === 'short') {
    const shorts = await getShorts();
    const short = shorts.find(s => s.id === contentId);
    isAdult = short?.is_adult || false;
  }

  // 決済処理
  const { processTip } = require('./paymentProvider');
  const result = await processTip(contentId, contentType, isAdult, amount, message);

  return result;
};

/**
 * 投げ銭履歴を取得
 */
export const getTipHistory = async (): Promise<TipHistory[]> => {
  // モックデータ
  return new Promise(resolve => {
    setTimeout(() => resolve([
      {
        id: 'tip_1',
        content_id: 'video_1',
        content_title: 'Sample Video',
        content_thumbnail: 'https://picsum.photos/400/225',
        creator_name: 'Creator Name',
        amount: 500,
        message: 'Great content!',
        payment_provider: 'stripe',
        created_at: new Date().toISOString(),
        status: 'completed',
      },
    ]), 300);
  });
};

// ========================================
// 保存済みコンテンツ関連API
// ========================================

/**
 * 保存済みコンテンツを取得
 */
export const getSavedContents = async (): Promise<{
  videos: Video[];
  shorts: Short[];
}> => {
  // モック実装：実際にはサーバーから保存リストを取得
  return {
    videos: [],
    shorts: [],
  };
};

/**
 * 保存済みコンテンツを削除
 */
export const removeSavedContent = async (
  contentId: string,
  contentType: 'video' | 'short'
): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300));
};

// ========================================
// 通知関連API
// ========================================

/**
 * 通知一覧を取得
 */
export const getNotifications = async (): Promise<Notification[]> => {
  return notificationsData as Notification[];
};

/**
 * 通知を既読にする
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300));
};

/**
 * 未読通知数を取得
 */
export const getUnreadNotificationCount = async (): Promise<number> => {
  const notifications = await getNotifications();
  return notifications.filter(n => !n.is_read).length;
};

// ========================================
// プレイリスト関連API
// ========================================

/**
 * プレイリスト一覧を取得
 */
export const getPlaylists = async (): Promise<Playlist[]> => {
  return playlistsData as Playlist[];
};

/**
 * プレイリスト詳細を取得
 */
export const getPlaylistDetail = async (playlistId: string): Promise<PlaylistDetail | null> => {
  const playlists = playlistsData as Playlist[];
  const playlist = playlists.find(p => p.id === playlistId);

  if (!playlist) {
    return null;
  }

  // モック実装：実際のプレイリストの動画を取得する代わりに、全動画からランダムに取得
  const allVideos = await getVideos();
  const playlistVideos = allVideos.slice(0, playlist.video_count);

  return {
    ...playlist,
    videos: playlistVideos,
  };
};

/**
 * プレイリストを作成
 */
export const createPlaylist = async (name: string, description?: string): Promise<Playlist> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return {
    id: 'playlist_' + Date.now(),
    name,
    description,
    video_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_public: true,
  };
};

/**
 * プレイリストに動画を追加
 */
export const addVideoToPlaylist = async (playlistId: string, videoId: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300));
};

/**
 * プレイリストから動画を削除
 */
export const removeVideoFromPlaylist = async (playlistId: string, videoId: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300));
};

/**
 * プレイリストを削除
 */
export const deletePlaylist = async (playlistId: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 500));
};
