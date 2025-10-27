/**
 * Subscription Payment History Repository Implementation
 *
 * Implements payment history data access using Prisma ORM.
 */

import { injectable, inject } from 'inversify';
import { PrismaClient, SubscriptionPaymentHistory } from '@prisma/client';
import { TYPES } from '@/shared/types';
import { ISubscriptionPaymentHistoryRepository, CreatePaymentHistoryDto } from './interfaces';

@injectable()
export class SubscriptionPaymentHistoryRepository implements ISubscriptionPaymentHistoryRepository {
  constructor(
    @inject(TYPES.PrismaClient) private prisma: PrismaClient
  ) {}

  async create(data: CreatePaymentHistoryDto): Promise<SubscriptionPaymentHistory> {
    return this.prisma.subscriptionPaymentHistory.create({
      data,
    });
  }

  async findById(id: string): Promise<SubscriptionPaymentHistory | null> {
    return this.prisma.subscriptionPaymentHistory.findUnique({
      where: { id },
      include: {
        userSubscription: {
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
        },
      },
    });
  }

  async findBySubscriptionId(userSubscriptionId: string): Promise<SubscriptionPaymentHistory[]> {
    return this.prisma.subscriptionPaymentHistory.findMany({
      where: { userSubscriptionId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByUserId(userId: string, limit: number = 20): Promise<SubscriptionPaymentHistory[]> {
    return this.prisma.subscriptionPaymentHistory.findMany({
      where: {
        userSubscription: {
          userId,
        },
      },
      include: {
        userSubscription: {
          include: {
            plan: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  async findByExternalPaymentId(externalPaymentId: string): Promise<SubscriptionPaymentHistory | null> {
    return this.prisma.subscriptionPaymentHistory.findFirst({
      where: { externalPaymentId },
      include: {
        userSubscription: {
          include: {
            plan: true,
          },
        },
      },
    });
  }
}
