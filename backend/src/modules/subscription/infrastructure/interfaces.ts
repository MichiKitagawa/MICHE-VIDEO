/**
 * Repository Interfaces for Subscription Module
 *
 * Defines contracts for subscription data access layer.
 */

import { SubscriptionPlan, UserSubscription, SubscriptionPaymentHistory } from '@prisma/client';

export interface CreateUserSubscriptionDto {
  userId: string;
  planId: string;
  paymentProvider: 'stripe' | 'ccbill' | 'free';
  externalSubscriptionId?: string;
  externalCustomerId?: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}

export interface UpdateUserSubscriptionDto {
  status?: 'active' | 'canceled' | 'past_due' | 'unpaid';
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date;
}

export interface CreatePaymentHistoryDto {
  userSubscriptionId: string;
  paymentProvider: 'stripe' | 'ccbill';
  externalPaymentId?: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending' | 'refunded';
  paymentMethodType?: string;
  failureReason?: string;
  paidAt?: Date;
}

/**
 * Subscription Plan Repository Interface
 */
export interface ISubscriptionPlanRepository {
  findAll(): Promise<SubscriptionPlan[]>;
  findById(id: string): Promise<SubscriptionPlan | null>;
  findByPaymentProvider(provider: string): Promise<SubscriptionPlan[]>;
  findActive(): Promise<SubscriptionPlan[]>;
}

/**
 * User Subscription Repository Interface
 */
export interface IUserSubscriptionRepository {
  create(data: CreateUserSubscriptionDto): Promise<UserSubscription>;
  findById(id: string): Promise<UserSubscription | null>;
  findByUserId(userId: string): Promise<UserSubscription[]>;
  findActiveByUserId(userId: string): Promise<UserSubscription | null>;
  findByExternalId(externalSubscriptionId: string): Promise<UserSubscription | null>;
  update(id: string, data: UpdateUserSubscriptionDto): Promise<UserSubscription>;
  cancelAtPeriodEnd(id: string): Promise<UserSubscription>;
  cancelImmediately(id: string): Promise<UserSubscription>;
}

/**
 * Subscription Payment History Repository Interface
 */
export interface ISubscriptionPaymentHistoryRepository {
  create(data: CreatePaymentHistoryDto): Promise<SubscriptionPaymentHistory>;
  findById(id: string): Promise<SubscriptionPaymentHistory | null>;
  findBySubscriptionId(userSubscriptionId: string): Promise<SubscriptionPaymentHistory[]>;
  findByUserId(userId: string, limit?: number): Promise<SubscriptionPaymentHistory[]>;
  findByExternalPaymentId(externalPaymentId: string): Promise<SubscriptionPaymentHistory | null>;
}
