/**
 * Type Definitions for Dependency Injection
 *
 * Defines identifiers for InversifyJS container bindings.
 */

export const TYPES = {
  // Repositories - Auth
  UserRepository: Symbol.for('UserRepository'),
  SessionRepository: Symbol.for('SessionRepository'),
  PasswordResetRepository: Symbol.for('PasswordResetRepository'),
  EmailVerificationRepository: Symbol.for('EmailVerificationRepository'),

  // Repositories - Video
  VideoRepository: Symbol.for('VideoRepository'),
  VideoLikeRepository: Symbol.for('VideoLikeRepository'),
  VideoCommentRepository: Symbol.for('VideoCommentRepository'),
  VideoViewRepository: Symbol.for('VideoViewRepository'),
  WatchHistoryRepository: Symbol.for('WatchHistoryRepository'),

  // Repositories - Subscription
  SubscriptionPlanRepository: Symbol.for('SubscriptionPlanRepository'),
  UserSubscriptionRepository: Symbol.for('UserSubscriptionRepository'),
  SubscriptionPaymentHistoryRepository: Symbol.for('SubscriptionPaymentHistoryRepository'),

  // Repositories - Monetization
  TipRepository: Symbol.for('TipRepository'),
  EarningRepository: Symbol.for('EarningRepository'),

  // Repositories - Playlist
  PlaylistRepository: Symbol.for('PlaylistRepository'),
  PlaylistVideoRepository: Symbol.for('PlaylistVideoRepository'),

  // Repositories - Social
  FollowRepository: Symbol.for('FollowRepository'),
  NotificationRepository: Symbol.for('NotificationRepository'),
  UserStatsRepository: Symbol.for('UserStatsRepository'),

  // Repositories - Channel
  ChannelRepository: Symbol.for('ChannelRepository'),
  ChannelLinkRepository: Symbol.for('ChannelLinkRepository'),

  // Services
  AuthService: Symbol.for('AuthService'),
  VideoService: Symbol.for('VideoService'),
  SubscriptionService: Symbol.for('SubscriptionService'),
  MonetizationService: Symbol.for('MonetizationService'),
  PlaylistService: Symbol.for('PlaylistService'),
  SocialService: Symbol.for('SocialService'),
  ChannelService: Symbol.for('ChannelService'),
  EmailService: Symbol.for('EmailService'),

  // Controllers
  AuthController: Symbol.for('AuthController'),
  VideoController: Symbol.for('VideoController'),
  SubscriptionController: Symbol.for('SubscriptionController'),
  MonetizationController: Symbol.for('MonetizationController'),
  PlaylistController: Symbol.for('PlaylistController'),
  SocialController: Symbol.for('SocialController'),
  ChannelController: Symbol.for('ChannelController'),

  // Infrastructure
  PrismaClient: Symbol.for('PrismaClient'),
  RedisClient: Symbol.for('RedisClient'),

  // External Services
  StripeClient: Symbol.for('StripeClient'),
  AWSClient: Symbol.for('AWSClient'),
} as const;

export type ServiceType = typeof TYPES[keyof typeof TYPES];
