/**
 * Password Reset Repository Implementation
 *
 * Implements password reset data access using Prisma ORM.
 */

import { injectable, inject } from 'inversify';
import { PrismaClient, PasswordReset } from '@prisma/client';
import { TYPES } from '@/shared/types';
import { IPasswordResetRepository, CreatePasswordResetDto } from './interfaces';

@injectable()
export class PasswordResetRepository implements IPasswordResetRepository {
  constructor(
    @inject(TYPES.PrismaClient) private prisma: PrismaClient
  ) {}

  async create(data: CreatePasswordResetDto): Promise<PasswordReset> {
    return this.prisma.passwordReset.create({
      data: {
        userId: data.userId,
        resetTokenHash: data.resetTokenHash,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findByTokenHash(hash: string): Promise<PasswordReset | null> {
    return this.prisma.passwordReset.findFirst({
      where: {
        resetTokenHash: hash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async markAsUsed(id: string): Promise<void> {
    await this.prisma.passwordReset.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async deleteExpired(): Promise<void> {
    await this.prisma.passwordReset.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }
}
