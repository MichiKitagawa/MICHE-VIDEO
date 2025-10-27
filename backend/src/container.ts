/**
 * Dependency Injection Container
 *
 * Configures InversifyJS container with all bindings.
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { TYPES } from '@/shared/types';

// Repositories - Auth
import {
  IUserRepository,
  ISessionRepository,
  IPasswordResetRepository,
  IEmailVerificationRepository,
} from '@/modules/auth/infrastructure/interfaces';
import { UserRepository } from '@/modules/auth/infrastructure/user-repository';
import { SessionRepository } from '@/modules/auth/infrastructure/session-repository';
import { PasswordResetRepository } from '@/modules/auth/infrastructure/password-reset-repository';
import { EmailVerificationRepository } from '@/modules/auth/infrastructure/email-verification-repository';

// Repositories - Video
import {
  IVideoRepository,
  IVideoLikeRepository,
  IVideoCommentRepository,
  IVideoViewRepository,
  IWatchHistoryRepository,
} from '@/modules/video/infrastructure/interfaces';
import { VideoRepository } from '@/modules/video/infrastructure/video-repository';
import { VideoLikeRepository } from '@/modules/video/infrastructure/video-like-repository';
import { VideoCommentRepository } from '@/modules/video/infrastructure/video-comment-repository';
import { VideoViewRepository } from '@/modules/video/infrastructure/video-view-repository';
import { WatchHistoryRepository } from '@/modules/video/infrastructure/watch-history-repository';

// Repositories - Subscription
import {
  ISubscriptionPlanRepository,
  IUserSubscriptionRepository,
  ISubscriptionPaymentHistoryRepository,
} from '@/modules/subscription/infrastructure/interfaces';
import { SubscriptionPlanRepository } from '@/modules/subscription/infrastructure/subscription-plan-repository';
import { UserSubscriptionRepository } from '@/modules/subscription/infrastructure/user-subscription-repository';
import { SubscriptionPaymentHistoryRepository } from '@/modules/subscription/infrastructure/payment-history-repository';

// Repositories - Monetization
import {
  ITipRepository,
  IEarningRepository,
} from '@/modules/monetization/infrastructure/interfaces';
import { TipRepository } from '@/modules/monetization/infrastructure/tip-repository';
import { EarningRepository } from '@/modules/monetization/infrastructure/earning-repository';

// Repositories - Playlist
import {
  IPlaylistRepository,
  IPlaylistVideoRepository,
} from '@/modules/playlist/infrastructure/interfaces';
import { PlaylistRepository } from '@/modules/playlist/infrastructure/playlist-repository';
import { PlaylistVideoRepository } from '@/modules/playlist/infrastructure/playlist-video-repository';

// Repositories - Social
import {
  IFollowRepository,
  INotificationRepository,
  IUserStatsRepository,
} from '@/modules/social/infrastructure/interfaces';
import { FollowRepository } from '@/modules/social/infrastructure/follow-repository';
import { NotificationRepository } from '@/modules/social/infrastructure/notification-repository';
import { UserStatsRepository } from '@/modules/social/infrastructure/user-stats-repository';

// Services
import { AuthService } from '@/application/services/auth-service';
import { VideoService } from '@/application/services/video-service';
import { SubscriptionService } from '@/application/services/subscription-service';
import { MonetizationService } from '@/application/services/monetization-service';
import { PlaylistService } from '@/application/services/playlist-service';
import { SocialService } from '@/application/services/social-service';

// Controllers
import { AuthController } from '@/interface/http/controllers/auth-controller';
import { VideoController } from '@/interface/http/controllers/video-controller';
import { SubscriptionController } from '@/interface/http/controllers/subscription-controller';
import { MonetizationController } from '@/interface/http/controllers/monetization-controller';
import { PlaylistController } from '@/interface/http/controllers/playlist-controller';
import { SocialController } from '@/interface/http/controllers/social-controller';

/**
 * Create and configure the DI container.
 */
export function createContainer(): Container {
  const container = new Container();

  // Bind Prisma Client (singleton)
  container.bind<PrismaClient>(TYPES.PrismaClient).toConstantValue(new PrismaClient());

  // Bind Repositories - Auth
  container.bind<IUserRepository>(TYPES.UserRepository).to(UserRepository);
  container.bind<ISessionRepository>(TYPES.SessionRepository).to(SessionRepository);
  container.bind<IPasswordResetRepository>(TYPES.PasswordResetRepository).to(PasswordResetRepository);
  container.bind<IEmailVerificationRepository>(TYPES.EmailVerificationRepository).to(EmailVerificationRepository);

  // Bind Repositories - Video
  container.bind<IVideoRepository>(TYPES.VideoRepository).to(VideoRepository);
  container.bind<IVideoLikeRepository>(TYPES.VideoLikeRepository).to(VideoLikeRepository);
  container.bind<IVideoCommentRepository>(TYPES.VideoCommentRepository).to(VideoCommentRepository);
  container.bind<IVideoViewRepository>(TYPES.VideoViewRepository).to(VideoViewRepository);
  container.bind<IWatchHistoryRepository>(TYPES.WatchHistoryRepository).to(WatchHistoryRepository);

  // Bind Repositories - Subscription
  container.bind<ISubscriptionPlanRepository>(TYPES.SubscriptionPlanRepository).to(SubscriptionPlanRepository);
  container.bind<IUserSubscriptionRepository>(TYPES.UserSubscriptionRepository).to(UserSubscriptionRepository);
  container.bind<ISubscriptionPaymentHistoryRepository>(TYPES.SubscriptionPaymentHistoryRepository).to(SubscriptionPaymentHistoryRepository);

  // Bind Repositories - Monetization
  container.bind<ITipRepository>(TYPES.TipRepository).to(TipRepository);
  container.bind<IEarningRepository>(TYPES.EarningRepository).to(EarningRepository);

  // Bind Repositories - Playlist
  container.bind<IPlaylistRepository>(TYPES.PlaylistRepository).to(PlaylistRepository);
  container.bind<IPlaylistVideoRepository>(TYPES.PlaylistVideoRepository).to(PlaylistVideoRepository);

  // Bind Repositories - Social
  container.bind<IFollowRepository>(TYPES.FollowRepository).to(FollowRepository);
  container.bind<INotificationRepository>(TYPES.NotificationRepository).to(NotificationRepository);
  container.bind<IUserStatsRepository>(TYPES.UserStatsRepository).to(UserStatsRepository);

  // Bind Services
  container.bind<AuthService>(TYPES.AuthService).to(AuthService);
  container.bind<VideoService>(TYPES.VideoService).to(VideoService);
  container.bind<SubscriptionService>(TYPES.SubscriptionService).to(SubscriptionService);
  container.bind<MonetizationService>(TYPES.MonetizationService).to(MonetizationService);
  container.bind<PlaylistService>(TYPES.PlaylistService).to(PlaylistService);
  container.bind<SocialService>(TYPES.SocialService).to(SocialService);

  // Bind Controllers
  container.bind<AuthController>(TYPES.AuthController).to(AuthController);
  container.bind<VideoController>(TYPES.VideoController).to(VideoController);
  container.bind<SubscriptionController>(TYPES.SubscriptionController).to(SubscriptionController);
  container.bind<MonetizationController>(TYPES.MonetizationController).to(MonetizationController);
  container.bind<PlaylistController>(TYPES.PlaylistController).to(PlaylistController);
  container.bind<SocialController>(TYPES.SocialController).to(SocialController);

  return container;
}
