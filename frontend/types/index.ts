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
  privacy?: 'public' | 'unlisted' | 'private'; // プライバシー設定
  tags?: string[]; // タグ
  // ライブ配信関連（ライブ配信の場合のみ）
  status?: 'live' | 'archived' | 'normal'; // ライブ配信状態
  current_viewers?: number; // 現在の視聴者数（ライブ中のみ）
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
  privacy?: 'public' | 'unlisted' | 'private'; // プライバシー設定
  tags?: string[]; // タグ
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
  bio?: string; // チャンネル説明文
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
  has_netflix_access: boolean; // Netflix型コンテンツ視聴可否
  has_ads: boolean; // 広告の有無
  has_adult_access: boolean; // アダルトコンテンツへのアクセス可否
  payment_provider: 'stripe' | 'ccbill' | 'epoch' | null; // 決済プロバイダー
}

// 請求履歴
export interface BillingHistory {
  id: string;
  date: string;
  amount: number;
  plan_name: string;
  payment_method: string;
  status: 'paid' | 'pending' | 'failed';
  invoice_url?: string;
}

// 支払い方法
export interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'paypal' | 'bank_transfer';
  last_four?: string;
  brand?: string; // 'Visa', 'Mastercard', etc.
  is_default: boolean;
  expires_at?: string;
}

// 収益統計
export interface EarningsStats {
  available_balance: number;      // 出金可能残高
  pending_balance: number;        // 保留中残高
  this_month_earnings: number;    // 今月の収益
  total_withdrawn: number;        // 累計出金額
  breakdown: {
    tips: number;                 // 投げ銭
    subscription_pool: number;    // サブスク分配プール
  };
}

// 出金方法
export interface WithdrawalMethod {
  id: string;
  type: 'bank_transfer' | 'paypal' | 'other';
  bank_name?: string;
  branch_name?: string;
  account_type?: 'checking' | 'savings';
  account_number?: string;  // マスク表示用
  account_holder?: string;
  paypal_email?: string;
  is_verified: boolean;
  is_default: boolean;
  created_at: string;
}

// 出金申請
export interface WithdrawalRequest {
  id: string;
  amount: number;
  method_id: string;
  method_type: string;
  method_display: string;  // 表示用
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requested_at: string;
  processed_at?: string;
  error_message?: string;
  fee: number;  // 手数料
  net_amount: number;  // 実際の振込額
}

// 税務情報
export interface TaxInfo {
  id: string;
  entity_type: 'individual' | 'business';
  individual_number?: string;     // マイナンバー
  business_number?: string;       // 法人番号
  name: string;
  address: string;
  is_verified: boolean;
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
  privacy?: 'public' | 'unlisted' | 'private'; // プライバシー設定
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

// アナリティクス関連の型定義
export interface AnalyticsOverview {
  period: string;
  total_views: number;
  total_watch_time_hours: number;
  avg_view_duration_seconds: number;
  subscribers_gained: number;
  total_likes: number;
  views_change_percent: number;
  watch_time_change_percent: number;
  subscribers_change_percent: number;
  likes_change_percent: number;
}

export interface ViewsTimelineData {
  date: string;
  views: number;
}

export interface ContentPerformance {
  id: string;
  type: 'video' | 'short';
  title: string;
  thumbnail_url: string;
  published_at: string;
  views: number;
  watch_time_hours: number;
  ctr: number;
  avg_view_duration: number;
  likes: number;
  comments: number;
  is_adult: boolean;
}

export interface AudienceData {
  age_distribution: {
    '13-17': number;
    '18-24': number;
    '25-34': number;
    '35-44': number;
    '45-54': number;
    '55+': number;
  };
  gender_distribution: {
    male: number;
    female: number;
    other: number;
  };
  top_regions: Array<{
    country: string;
    name: string;
    percentage: number;
  }>;
  devices: {
    mobile: number;
    desktop: number;
    tablet: number;
    tv: number;
  };
  active_hours: {
    [hour: string]: number;
  };
}

export interface TrafficSourcesData {
  search: number;
  suggested: number;
  external: number;
  direct: number;
  channel_page: number;
}

export interface EngagementData {
  like_rate: number;
  comment_rate: number;
  share_count: number;
  save_count: number;
  subscription_rate: number;
  avg_watch_percentage: number;
}

export interface Analytics {
  overview: AnalyticsOverview;
  views_timeline: ViewsTimelineData[];
  performance_by_content: ContentPerformance[];
  audience: AudienceData;
  traffic_sources: TrafficSourcesData;
  engagement: EngagementData;
}

// Netflix型コンテンツのアップロード関連型定義
export interface NetflixContentUpload {
  type: 'movie' | 'series';
  title: string;
  description: string;
  genres: string[];
  country: string;
  release_year: number;
  rating: number;
  poster_image?: File;
  backdrop_image?: File;
  region_restriction?: string[];

  // 映画の場合
  duration?: number;
  video_file?: File;

  // シリーズの場合
  seasons?: SeasonUpload[];
}

export interface SeasonUpload {
  season_number: number;
  episodes: EpisodeUpload[];
}

export interface EpisodeUpload {
  episode_number: number;
  title: string;
  description: string;
  duration: number;
  video_file: File;
  thumbnail?: File;
}

// ライブ配信関連型定義
export interface LiveStream {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnail_url: string;
  status: 'scheduled' | 'live' | 'ended';
  privacy: 'public' | 'unlisted' | 'private';
  is_adult: boolean;

  // 配信設定
  chat_enabled: boolean;
  super_chat_enabled: boolean;
  archive_enabled: boolean;

  // ストリーミング情報
  stream_url: string;
  stream_key: string;

  // 統計情報
  current_viewers?: number;
  peak_viewers?: number;
  total_likes?: number;
  total_super_chat?: number;

  // タイムスタンプ
  scheduled_start_time?: string;
  actual_start_time?: string;
  end_time?: string;
  created_at: string;
}

export interface LiveStreamCreate {
  title: string;
  description: string;
  category: string;
  thumbnail?: File;
  privacy: 'public' | 'unlisted' | 'private';
  is_adult: boolean;
  chat_enabled: boolean;
  super_chat_enabled: boolean;
  archive_enabled: boolean;
  scheduled_start_time?: string;
}

export interface LiveChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  message: string;
  is_super_chat: boolean;
  super_chat_amount?: number;
  timestamp: string;
}

export interface LiveStreamStats {
  stream_id: string;
  current_viewers: number;
  peak_viewers: number;
  total_views: number;
  total_likes: number;
  total_super_chat: number;
  average_watch_time: number;
}

// コメント機能
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
  replies?: Comment[]; // 返信コメント
}

// 決済プロバイダー関連
export type PaymentProvider = 'stripe' | 'ccbill' | 'epoch';

// 投げ銭リクエスト
export interface TipRequest {
  content_id: string;
  content_type: 'video' | 'short' | 'live';
  amount: number;
  message?: string;
  payment_provider: PaymentProvider;  // 自動選択される
}

// 投げ銭履歴
export interface TipHistory {
  id: string;
  content_id: string;
  content_title: string;
  content_thumbnail: string;
  creator_name: string;
  amount: number;
  message?: string;
  payment_provider: PaymentProvider;
  created_at: string;
  status: 'completed' | 'pending' | 'failed';
}
