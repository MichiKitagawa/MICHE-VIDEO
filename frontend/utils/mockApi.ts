// モックAPI

import { Video, VideoDetail, IPLicense, User, Short, Subscription, NetflixContent, SubscriptionPlan, SubscribedChannel, WatchHistory, Channel, ChannelDetail } from '../types';
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
