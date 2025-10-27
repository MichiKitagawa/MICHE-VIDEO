/**
 * Session Repository Implementation
 *
 * Implements session data access using Prisma ORM.
 */

import { injectable, inject } from 'inversify';
import { PrismaClient, UserSession } from '@prisma/client';
import { TYPES } from '@/shared/types';
import { ISessionRepository, CreateSessionDto } from './interfaces';

@injectable()
export class SessionRepository implements ISessionRepository {
  constructor(
    @inject(TYPES.PrismaClient) private prisma: PrismaClient
  ) {}

  async create(data: CreateSessionDto): Promise<UserSession> {
    return this.prisma.userSession.create({
      data: {
        userId: data.userId,
        refreshTokenHash: data.refreshTokenHash,
        deviceInfo: data.deviceInfo,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findById(id: string): Promise<UserSession | null> {
    return this.prisma.userSession.findUnique({
      where: { id },
    });
  }

  async findByRefreshTokenHash(hash: string): Promise<UserSession | null> {
    return this.prisma.userSession.findFirst({
      where: {
        refreshTokenHash: hash,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async findByUserId(userId: string): Promise<UserSession[]> {
    return this.prisma.userSession.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.userSession.update({
      where: { id },
      data: { isRevoked: true },
    });
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }

  async deleteExpired(): Promise<void> {
    await this.prisma.userSession.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }
}
