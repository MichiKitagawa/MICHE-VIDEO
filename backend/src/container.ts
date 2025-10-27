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

// Services
import { AuthService } from '@/application/services/auth-service';
import { VideoService } from '@/application/services/video-service';

// Controllers
import { AuthController } from '@/interface/http/controllers/auth-controller';
import { VideoController } from '@/interface/http/controllers/video-controller';

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

  // Bind Services
  container.bind<AuthService>(TYPES.AuthService).to(AuthService);
  container.bind<VideoService>(TYPES.VideoService).to(VideoService);

  // Bind Controllers
  container.bind<AuthController>(TYPES.AuthController).to(AuthController);
  container.bind<VideoController>(TYPES.VideoController).to(VideoController);

  return container;
}
