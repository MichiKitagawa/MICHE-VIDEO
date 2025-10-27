/**
 * Subscription Plan Repository Implementation
 *
 * Implements subscription plan data access using Prisma ORM.
 */

import { injectable, inject } from 'inversify';
import { PrismaClient, SubscriptionPlan } from '@prisma/client';
import { TYPES } from '@/shared/types';
import { ISubscriptionPlanRepository } from './interfaces';

@injectable()
export class SubscriptionPlanRepository implements ISubscriptionPlanRepository {
  constructor(
    @inject(TYPES.PrismaClient) private prisma: PrismaClient
  ) {}

  async findAll(): Promise<SubscriptionPlan[]> {
    return this.prisma.subscriptionPlan.findMany({
      orderBy: {
        sortOrder: 'asc',
      },
    });
  }

  async findById(id: string): Promise<SubscriptionPlan | null> {
    return this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });
  }

  async findByPaymentProvider(provider: string): Promise<SubscriptionPlan[]> {
    return this.prisma.subscriptionPlan.findMany({
      where: {
        paymentProvider: provider,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });
  }

  async findActive(): Promise<SubscriptionPlan[]> {
    return this.prisma.subscriptionPlan.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });
  }
}
