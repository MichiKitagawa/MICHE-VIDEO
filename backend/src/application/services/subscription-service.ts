/**
 * Subscription Service
 *
 * Handles subscription management, payment processing, and webhook events.
 */

import { injectable, inject } from 'inversify';
import { SubscriptionPlan, UserSubscription, SubscriptionPaymentHistory } from '@prisma/client';
import Stripe from 'stripe';
import { TYPES } from '@/shared/types';
import {
  ISubscriptionPlanRepository,
  IUserSubscriptionRepository,
  ISubscriptionPaymentHistoryRepository,
} from '@/modules/subscription/infrastructure/interfaces';
import { IUserRepository } from '@/modules/auth/infrastructure/interfaces';
import * as stripeClient from '@/shared/infrastructure/stripe-client';

export interface CreateCheckoutSessionDto {
  userId: string;
  userEmail: string;
  planId: string;
}

export interface CancelSubscriptionDto {
  userId: string;
  immediately?: boolean;
}

@injectable()
export class SubscriptionService {
  constructor(
    @inject(TYPES.SubscriptionPlanRepository)
    private planRepository: ISubscriptionPlanRepository,
    @inject(TYPES.UserSubscriptionRepository)
    private subscriptionRepository: IUserSubscriptionRepository,
    @inject(TYPES.SubscriptionPaymentHistoryRepository)
    private paymentHistoryRepository: ISubscriptionPaymentHistoryRepository,
    @inject(TYPES.UserRepository)
    private userRepository: IUserRepository
  ) {}

  /**
   * Get all active subscription plans
   */
  async getPlans(): Promise<SubscriptionPlan[]> {
    return this.planRepository.findActive();
  }

  /**
   * Get current active subscription for a user
   */
  async getCurrentSubscription(userId: string): Promise<UserSubscription | null> {
    return this.subscriptionRepository.findActiveByUserId(userId);
  }

  /**
   * Create Stripe checkout session for subscription
   */
  async createCheckoutSession(dto: CreateCheckoutSessionDto): Promise<{
    checkoutUrl: string;
    sessionId: string;
  }> {
    const { userId, userEmail, planId } = dto;

    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get plan details
    const plan = await this.planRepository.findById(planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    if (!plan.isActive) {
      throw new Error('Plan is not active');
    }

    if (plan.paymentProvider !== 'stripe') {
      throw new Error('Plan does not support Stripe payment');
    }

    // Check if user already has an active subscription
    const existingSubscription = await this.subscriptionRepository.findActiveByUserId(userId);
    if (existingSubscription && existingSubscription.planId === planId) {
      throw new Error('User already has an active subscription to this plan');
    }

    // Get Stripe price ID from environment or plan metadata
    // For MVP, we'll use a simple mapping based on plan ID
    const stripePriceId = this.getStripePriceId(planId);

    // Create checkout session
    const successUrl = `${process.env.FRONTEND_URL}/settings?subscription=success`;
    const cancelUrl = `${process.env.FRONTEND_URL}/settings?subscription=cancelled`;

    const session = await stripeClient.createCheckoutSession(
      userId,
      userEmail,
      planId,
      stripePriceId,
      successUrl,
      cancelUrl
    );

    return {
      checkoutUrl: session.url || '',
      sessionId: session.id,
    };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }
  }

  /**
   * Cancel subscription (at period end or immediately)
   */
  async cancelSubscription(dto: CancelSubscriptionDto): Promise<UserSubscription> {
    const { userId, immediately = false } = dto;

    // Get active subscription
    const subscription = await this.subscriptionRepository.findActiveByUserId(userId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    // Cancel on Stripe
    if (subscription.externalSubscriptionId && subscription.paymentProvider === 'stripe') {
      await stripeClient.cancelSubscription(subscription.externalSubscriptionId, immediately);
    }

    // Update local subscription
    if (immediately) {
      return this.subscriptionRepository.cancelImmediately(subscription.id);
    } else {
      return this.subscriptionRepository.cancelAtPeriodEnd(subscription.id);
    }
  }

  /**
   * Get payment history for a user
   */
  async getPaymentHistory(userId: string, limit: number = 20): Promise<SubscriptionPaymentHistory[]> {
    return this.paymentHistoryRepository.findByUserId(userId, limit);
  }

  /**
   * Private: Handle checkout.session.completed event
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.client_reference_id;
    const planId = session.metadata?.planId;

    if (!userId || !planId) {
      console.error('Missing userId or planId in checkout session metadata');
      return;
    }

    // Get subscription details from Stripe
    const stripeSubscriptionId = session.subscription as string;
    const stripeSubscription = await stripeClient.getSubscription(stripeSubscriptionId);

    // Cancel any existing active subscription
    const existingSubscription = await this.subscriptionRepository.findActiveByUserId(userId);
    if (existingSubscription) {
      await this.subscriptionRepository.cancelImmediately(existingSubscription.id);
    }

    // Create new subscription record
    await this.subscriptionRepository.create({
      userId,
      planId,
      paymentProvider: 'stripe',
      externalSubscriptionId: stripeSubscription.id,
      externalCustomerId: stripeSubscription.customer as string,
      status: 'active',
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
    });
  }

  /**
   * Private: Handle invoice.payment_succeeded event
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const stripeSubscriptionId = invoice.subscription as string;
    if (!stripeSubscriptionId) return;

    // Find subscription by external ID
    const subscription = await this.subscriptionRepository.findByExternalId(stripeSubscriptionId);
    if (!subscription) {
      console.error(`Subscription not found for Stripe ID: ${stripeSubscriptionId}`);
      return;
    }

    // Record payment in history
    await this.paymentHistoryRepository.create({
      userSubscriptionId: subscription.id,
      paymentProvider: 'stripe',
      externalPaymentId: invoice.payment_intent as string,
      amount: invoice.amount_paid,
      currency: invoice.currency.toUpperCase(),
      status: 'succeeded',
      paymentMethodType: 'card',
      paidAt: new Date(invoice.status_transitions.paid_at! * 1000),
    });

    // Update subscription status to active if it was past_due
    if (subscription.status === 'past_due') {
      await this.subscriptionRepository.update(subscription.id, {
        status: 'active',
      });
    }
  }

  /**
   * Private: Handle invoice.payment_failed event
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const stripeSubscriptionId = invoice.subscription as string;
    if (!stripeSubscriptionId) return;

    // Find subscription by external ID
    const subscription = await this.subscriptionRepository.findByExternalId(stripeSubscriptionId);
    if (!subscription) {
      console.error(`Subscription not found for Stripe ID: ${stripeSubscriptionId}`);
      return;
    }

    // Record failed payment in history
    await this.paymentHistoryRepository.create({
      userSubscriptionId: subscription.id,
      paymentProvider: 'stripe',
      externalPaymentId: invoice.payment_intent as string,
      amount: invoice.amount_due,
      currency: invoice.currency.toUpperCase(),
      status: 'failed',
      paymentMethodType: 'card',
      failureReason: invoice.last_finalization_error?.message || 'Payment failed',
    });

    // Update subscription status to past_due
    await this.subscriptionRepository.update(subscription.id, {
      status: 'past_due',
    });

    // TODO: Send notification email to user
  }

  /**
   * Private: Handle customer.subscription.updated event
   */
  private async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription): Promise<void> {
    // Find subscription by external ID
    const subscription = await this.subscriptionRepository.findByExternalId(stripeSubscription.id);
    if (!subscription) {
      console.error(`Subscription not found for Stripe ID: ${stripeSubscription.id}`);
      return;
    }

    // Update subscription period and status
    await this.subscriptionRepository.update(subscription.id, {
      status: stripeSubscription.status === 'active' ? 'active' : 'canceled',
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    });
  }

  /**
   * Private: Handle customer.subscription.deleted event
   */
  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription): Promise<void> {
    // Find subscription by external ID
    const subscription = await this.subscriptionRepository.findByExternalId(stripeSubscription.id);
    if (!subscription) {
      console.error(`Subscription not found for Stripe ID: ${stripeSubscription.id}`);
      return;
    }

    // Mark subscription as canceled
    await this.subscriptionRepository.update(subscription.id, {
      status: 'canceled',
      canceledAt: new Date(),
    });
  }

  /**
   * Private: Get Stripe Price ID for a plan
   * In production, this should come from plan metadata or environment variables
   */
  private getStripePriceId(planId: string): string {
    const priceMapping: Record<string, string> = {
      plan_premium: process.env.STRIPE_PRICE_PREMIUM || 'price_premium_default',
      plan_premium_plus: process.env.STRIPE_PRICE_PREMIUM_PLUS || 'price_premium_plus_default',
    };

    const priceId = priceMapping[planId];
    if (!priceId) {
      throw new Error(`No Stripe price ID configured for plan: ${planId}`);
    }

    return priceId;
  }
}
