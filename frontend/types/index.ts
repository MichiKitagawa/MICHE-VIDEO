// 型定義

export interface Video {
  id: string;
  title: string;
  description?: string;
  thumbnail_url: string;
  user_id: string; // チャンネルID
  user_name: string;
  user_avatar: string;
  view_count: number;
  like_count?: number;
  created_at: string;
  duration: number; // 再生時間（秒）
  category: string; // カテゴリー
  rating: number; // 評価（0-5）
  is_adult: boolean;
}

export interface VideoDetail extends Video {
  description: string;
  video_url: string;
  ip_license: IPLicense | null;
}

export interface Short {
  id: string;
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url: string;
  user_id: string; // チャンネルID
  user_name: string;
  user_avatar: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  category?: string;
  is_adult: boolean;
}

export interface IPLicense {
  id: string;
  name: string;
  thumbnail: string;
  license_type: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
}

// 登録チャンネル（旧：Subscription）
export interface SubscribedChannel {
  id: string;
  channel_name: string;
  channel_avatar: string;
  subscriber_count: number;
  subscribed_at: string;
}

// 後方互換性のためのエイリアス
export type Subscription = SubscribedChannel;

// サブスクリプションプラン（有料プラン管理）
export interface SubscriptionPlan {
  id: string;
  name: string; // "無料プラン", "プレミアムプラン", "ビジネスプラン"
  price: number; // 月額料金（円）
  features: string[]; // 機能一覧
  is_current: boolean; // 現在のプラン
  billing_cycle: 'monthly' | 'yearly';
  next_billing_date?: string; // 次回請求日
}

// 視聴履歴
export interface WatchHistory {
  id: string;
  video_id: string;
  video_title: string;
  thumbnail_url: string;
  user_name: string;
  user_avatar: string;
  watched_at: string;
  progress: number; // 視聴進捗（0-100%）
}

export interface NetflixContent {
  id: string;
  title: string;
  type: 'movie' | 'series';
  poster_url: string;
  backdrop_url: string;
  description: string;
  release_year: number;
  duration?: number; // 映画の場合（分）
  video_url?: string; // 映画の場合の動画URL
  seasons?: Season[]; // シリーズの場合
  genres: string[];
  rating: number;
  is_adult: boolean;
  country: string; // 制作国（'JP' | 'US' | 'KR' | 'UK' など）
}

export interface Season {
  season_number: number;
  episodes: Episode[];
}

export interface Episode {
  episode_number: number;
  title: string;
  description: string;
  duration: number;
  video_url: string;
  thumbnail_url: string;
}

// チャンネル情報
export interface Channel {
  id: string;
  name: string;
  avatar_url: string;
  banner_url?: string; // チャンネルバナー画像
  description: string;
  subscriber_count: number;
  video_count: number;
  created_at: string;
  is_verified: boolean; // 認証バッジ
}

// チャンネル詳細（チャンネルページ用）
export interface ChannelDetail extends Channel {
  videos: Video[]; // そのチャンネルの動画一覧
  shorts: Short[]; // そのチャンネルのShorts一覧
}
