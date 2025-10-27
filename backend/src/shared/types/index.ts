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

  // Services
  AuthService: Symbol.for('AuthService'),
  VideoService: Symbol.for('VideoService'),
  SubscriptionService: Symbol.for('SubscriptionService'),
  MonetizationService: Symbol.for('MonetizationService'),
  PlaylistService: Symbol.for('PlaylistService'),
  EmailService: Symbol.for('EmailService'),

  // Controllers
  AuthController: Symbol.for('AuthController'),
  VideoController: Symbol.for('VideoController'),
  SubscriptionController: Symbol.for('SubscriptionController'),
  MonetizationController: Symbol.for('MonetizationController'),
  PlaylistController: Symbol.for('PlaylistController'),

  // Infrastructure
  PrismaClient: Symbol.for('PrismaClient'),
  RedisClient: Symbol.for('RedisClient'),

  // External Services
  StripeClient: Symbol.for('StripeClient'),
  AWSClient: Symbol.for('AWSClient'),
} as const;

export type ServiceType = typeof TYPES[keyof typeof TYPES];
