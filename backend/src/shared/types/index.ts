/**
 * Type Definitions for Dependency Injection
 *
 * Defines identifiers for InversifyJS container bindings.
 */

export const TYPES = {
  // Repositories
  UserRepository: Symbol.for('UserRepository'),
  SessionRepository: Symbol.for('SessionRepository'),
  PasswordResetRepository: Symbol.for('PasswordResetRepository'),
  EmailVerificationRepository: Symbol.for('EmailVerificationRepository'),

  // Services
  AuthService: Symbol.for('AuthService'),
  EmailService: Symbol.for('EmailService'),

  // Controllers
  AuthController: Symbol.for('AuthController'),

  // Infrastructure
  PrismaClient: Symbol.for('PrismaClient'),
  RedisClient: Symbol.for('RedisClient'),

  // External Services
  StripeClient: Symbol.for('StripeClient'),
  AWSClient: Symbol.for('AWSClient'),
} as const;

export type ServiceType = typeof TYPES[keyof typeof TYPES];
