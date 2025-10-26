/**
 * Proration Calculation Unit Tests
 *
 * Tests for subscription plan change proration logic
 * Reference: docs/tests/subscription-tests.md (TC-001)
 */

import { calculateProration } from '@/modules/subscription/domain/proration';

describe('Proration Calculation', () => {
  describe('Upgrade Proration', () => {
    it('should calculate prorated amount correctly for mid-cycle upgrade', () => {
      const currentPlan = { price: 980, billingCycle: 'monthly' as const };
      const newPlan = { price: 1980, billingCycle: 'monthly' as const };
      const daysRemaining = 15; // 15 days remaining
      const daysInMonth = 30;

      const prorated = calculateProration(currentPlan, newPlan, daysRemaining, daysInMonth);

      // (1980 - 980) * (15 / 30) = 500
      expect(prorated).toBe(500);
    });

    it('should calculate prorated amount for beginning of month', () => {
      const currentPlan = { price: 980, billingCycle: 'monthly' as const };
      const newPlan = { price: 1980, billingCycle: 'monthly' as const };
      const daysRemaining = 30;
      const daysInMonth = 30;

      const prorated = calculateProration(currentPlan, newPlan, daysRemaining, daysInMonth);

      // Full month difference
      expect(prorated).toBe(1000);
    });

    it('should calculate prorated amount for end of month', () => {
      const currentPlan = { price: 980, billingCycle: 'monthly' as const };
      const newPlan = { price: 1980, billingCycle: 'monthly' as const };
      const daysRemaining = 1; // Last day
      const daysInMonth = 30;

      const prorated = calculateProration(currentPlan, newPlan, daysRemaining, daysInMonth);

      // Minimal proration
      expect(prorated).toBe(Math.round(1000 * (1 / 30)));
    });

    it('should handle upgrade from Free to Premium', () => {
      const currentPlan = { price: 0, billingCycle: 'monthly' as const };
      const newPlan = { price: 980, billingCycle: 'monthly' as const };
      const daysRemaining = 15;
      const daysInMonth = 30;

      const prorated = calculateProration(currentPlan, newPlan, daysRemaining, daysInMonth);

      expect(prorated).toBe(490); // 980 * (15 / 30)
    });

    it('should handle upgrade from Premium to Premium+', () => {
      const currentPlan = { price: 980, billingCycle: 'monthly' as const };
      const newPlan = { price: 1980, billingCycle: 'monthly' as const };
      const daysRemaining = 10;
      const daysInMonth = 30;

      const prorated = calculateProration(currentPlan, newPlan, daysRemaining, daysInMonth);

      expect(prorated).toBe(Math.round(1000 * (10 / 30)));
    });
  });

  describe('Downgrade Proration', () => {
    it('should return 0 for downgrade (credit applied)', () => {
      const currentPlan = { price: 1980, billingCycle: 'monthly' as const };
      const newPlan = { price: 980, billingCycle: 'monthly' as const };
      const daysRemaining = 15;
      const daysInMonth = 30;

      const prorated = calculateProration(currentPlan, newPlan, daysRemaining, daysInMonth);

      // Downgrade applies credit, no immediate charge
      expect(prorated).toBe(0);
    });

    it('should calculate credit for downgrade', () => {
      const currentPlan = { price: 1980, billingCycle: 'monthly' as const };
      const newPlan = { price: 980, billingCycle: 'monthly' as const };
      const daysRemaining = 15;
      const daysInMonth = 30;

      const credit = calculateProration(currentPlan, newPlan, daysRemaining, daysInMonth, true);

      // Credit: (1980 - 980) * (15 / 30) = 500
      expect(credit).toBe(500);
    });
  });

  describe('Edge Cases', () => {
    it('should handle February (28 days)', () => {
      const currentPlan = { price: 980, billingCycle: 'monthly' as const };
      const newPlan = { price: 1980, billingCycle: 'monthly' as const };
      const daysRemaining = 14;
      const daysInMonth = 28;

      const prorated = calculateProration(currentPlan, newPlan, daysRemaining, daysInMonth);

      expect(prorated).toBe(500); // Half month
    });

    it('should handle leap year February (29 days)', () => {
      const currentPlan = { price: 980, billingCycle: 'monthly' as const };
      const newPlan = { price: 1980, billingCycle: 'monthly' as const };
      const daysRemaining = 14;
      const daysInMonth = 29;

      const prorated = calculateProration(currentPlan, newPlan, daysRemaining, daysInMonth);

      expect(prorated).toBeCloseTo(483, 0);
    });

    it('should handle months with 31 days', () => {
      const currentPlan = { price: 980, billingCycle: 'monthly' as const };
      const newPlan = { price: 1980, billingCycle: 'monthly' as const };
      const daysRemaining = 31;
      const daysInMonth = 31;

      const prorated = calculateProration(currentPlan, newPlan, daysRemaining, daysInMonth);

      expect(prorated).toBe(1000);
    });

    it('should handle 0 days remaining', () => {
      const currentPlan = { price: 980, billingCycle: 'monthly' as const };
      const newPlan = { price: 1980, billingCycle: 'monthly' as const };
      const daysRemaining = 0;
      const daysInMonth = 30;

      const prorated = calculateProration(currentPlan, newPlan, daysRemaining, daysInMonth);

      expect(prorated).toBe(0);
    });

    it('should handle same price plans', () => {
      const currentPlan = { price: 980, billingCycle: 'monthly' as const };
      const newPlan = { price: 980, billingCycle: 'monthly' as const };
      const daysRemaining = 15;
      const daysInMonth = 30;

      const prorated = calculateProration(currentPlan, newPlan, daysRemaining, daysInMonth);

      expect(prorated).toBe(0);
    });
  });

  describe('Rounding', () => {
    it('should round to nearest integer', () => {
      const currentPlan = { price: 980, billingCycle: 'monthly' as const };
      const newPlan = { price: 1980, billingCycle: 'monthly' as const };
      const daysRemaining = 7; // Results in fractional amount
      const daysInMonth = 30;

      const prorated = calculateProration(currentPlan, newPlan, daysRemaining, daysInMonth);

      expect(Number.isInteger(prorated)).toBe(true);
    });

    it('should handle fractional days correctly', () => {
      const currentPlan = { price: 1000, billingCycle: 'monthly' as const };
      const newPlan = { price: 2000, billingCycle: 'monthly' as const };
      const daysRemaining = 10.5; // Fractional day
      const daysInMonth = 30;

      const prorated = calculateProration(currentPlan, newPlan, daysRemaining, daysInMonth);

      expect(Number.isInteger(prorated)).toBe(true);
    });
  });

  describe('Currency Precision', () => {
    it('should maintain JPY precision (no decimals)', () => {
      const currentPlan = { price: 980, billingCycle: 'monthly' as const };
      const newPlan = { price: 1980, billingCycle: 'monthly' as const };
      const daysRemaining = 15;
      const daysInMonth = 30;

      const prorated = calculateProration(currentPlan, newPlan, daysRemaining, daysInMonth);

      expect(prorated % 1).toBe(0); // No decimal places
    });

    it('should handle USD precision (2 decimals)', () => {
      const currentPlan = { price: 9.99, billingCycle: 'monthly' as const };
      const newPlan = { price: 19.99, billingCycle: 'monthly' as const };
      const daysRemaining = 15;
      const daysInMonth = 30;

      const prorated = calculateProration(currentPlan, newPlan, daysRemaining, daysInMonth, false, 'USD');

      expect(prorated).toBeCloseTo(5.00, 2);
    });
  });
});
