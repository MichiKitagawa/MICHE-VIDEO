/**
 * Dependency Injection Container
 *
 * Configures InversifyJS container with all bindings.
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { TYPES } from '@/shared/types';

// Repositories
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

// Services
import { AuthService } from '@/application/services/auth-service';

// Controllers
import { AuthController } from '@/interface/http/controllers/auth-controller';

/**
 * Create and configure the DI container.
 */
export function createContainer(): Container {
  const container = new Container();

  // Bind Prisma Client (singleton)
  container.bind<PrismaClient>(TYPES.PrismaClient).toConstantValue(new PrismaClient());

  // Bind Repositories
  container.bind<IUserRepository>(TYPES.UserRepository).to(UserRepository);
  container.bind<ISessionRepository>(TYPES.SessionRepository).to(SessionRepository);
  container.bind<IPasswordResetRepository>(TYPES.PasswordResetRepository).to(PasswordResetRepository);
  container.bind<IEmailVerificationRepository>(TYPES.EmailVerificationRepository).to(EmailVerificationRepository);

  // Bind Services
  container.bind<AuthService>(TYPES.AuthService).to(AuthService);

  // Bind Controllers
  container.bind<AuthController>(TYPES.AuthController).to(AuthController);

  return container;
}
