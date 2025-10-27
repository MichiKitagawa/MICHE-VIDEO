/**
 * User Subscription Repository Implementation
 *
 * Implements user subscription data access using Prisma ORM.
 */

import { injectable, inject } from 'inversify';
import { PrismaClient, UserSubscription } from '@prisma/client';
import { TYPES } from '@/shared/types';
import { IUserSubscriptionRepository, CreateUserSubscriptionDto, UpdateUserSubscriptionDto } from './interfaces';

@injectable()
export class UserSubscriptionRepository implements IUserSubscriptionRepository {
  constructor(
    @inject(TYPES.PrismaClient) private prisma: PrismaClient
  ) {}

  async create(data: CreateUserSubscriptionDto): Promise<UserSubscription> {
    return this.prisma.userSubscription.create({
      data,
      include: {
        plan: true,
      },
    });
  }

  async findById(id: string): Promise<UserSubscription | null> {
    return this.prisma.userSubscription.findUnique({
      where: { id },
      include: {
        plan: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async findByUserId(userId: string): Promise<UserSubscription[]> {
    return this.prisma.userSubscription.findMany({
      where: { userId },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findActiveByUserId(userId: string): Promise<UserSubscription | null> {
    const now = new Date();

    return this.prisma.userSubscription.findFirst({
      where: {
        userId,
        status: 'active',
        currentPeriodEnd: {
          gte: now,
        },
      },
      include: {
        plan: true,
      },
      orderBy: {
        currentPeriodEnd: 'desc',
      },
    });
  }

  async findByExternalId(externalSubscriptionId: string): Promise<UserSubscription | null> {
    return this.prisma.userSubscription.findFirst({
      where: { externalSubscriptionId },
      include: {
        plan: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async update(id: string, data: UpdateUserSubscriptionDto): Promise<UserSubscription> {
    return this.prisma.userSubscription.update({
      where: { id },
      data,
      include: {
        plan: true,
      },
    });
  }

  async cancelAtPeriodEnd(id: string): Promise<UserSubscription> {
    return this.prisma.userSubscription.update({
      where: { id },
      data: {
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
      },
      include: {
        plan: true,
      },
    });
  }

  async cancelImmediately(id: string): Promise<UserSubscription> {
    return this.prisma.userSubscription.update({
      where: { id },
      data: {
        status: 'canceled',
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
        currentPeriodEnd: new Date(),
      },
      include: {
        plan: true,
      },
    });
  }
}
