/**
 * Platform Fee Calculation Unit Tests
 *
 * Tests for platform fee calculation (30% for tips/superchat, 50% for subscription pool)
 * Reference: docs/tests/monetization-tests.md (TC-001)
 */

import { calculatePlatformFee, calculateNetAmount } from '@/lib/monetization/fees';

describe('Platform Fee Calculation', () => {
  describe('Tip Fee Calculation (30%)', () => {
    it('should calculate 30% platform fee for tips', () => {
      const amount = 1000;
      const fee = calculatePlatformFee(amount, 'tip');

      expect(fee).toBe(300); // 30%
    });

    it('should calculate fee for minimum tip (¥100)', () => {
      const amount = 100;
      const fee = calculatePlatformFee(amount, 'tip');

      expect(fee).toBe(30); // 30% of 100
    });

    it('should calculate fee for maximum tip (¥100,000)', () => {
      const amount = 100000;
      const fee = calculatePlatformFee(amount, 'tip');

      expect(fee).toBe(30000); // 30% of 100,000
    });

    it('should calculate fee for common tip amounts', () => {
      const testCases = [
        { amount: 500, expectedFee: 150 },
        { amount: 1000, expectedFee: 300 },
        { amount: 5000, expectedFee: 1500 },
        { amount: 10000, expectedFee: 3000 }
      ];

      testCases.forEach(({ amount, expectedFee }) => {
        const fee = calculatePlatformFee(amount, 'tip');
        expect(fee).toBe(expectedFee);
      });
    });

    it('should round fee to nearest integer', () => {
      const amount = 333; // 30% = 99.9
      const fee = calculatePlatformFee(amount, 'tip');

      expect(Number.isInteger(fee)).toBe(true);
      expect(fee).toBe(100); // Rounded up
    });
  });

  describe('Superchat Fee Calculation (30%)', () => {
    it('should calculate 30% platform fee for superchat', () => {
      const amount = 5000;
      const fee = calculatePlatformFee(amount, 'superchat');

      expect(fee).toBe(1500); // 30%
    });

    it('should calculate fee for various superchat amounts', () => {
      const testCases = [
        { amount: 1000, expectedFee: 300 },
        { amount: 3000, expectedFee: 900 },
        { amount: 5000, expectedFee: 1500 },
        { amount: 10000, expectedFee: 3000 }
      ];

      testCases.forEach(({ amount, expectedFee }) => {
        const fee = calculatePlatformFee(amount, 'superchat');
        expect(fee).toBe(expectedFee);
      });
    });

    it('should handle large superchat amounts', () => {
      const amount = 50000;
      const fee = calculatePlatformFee(amount, 'superchat');

      expect(fee).toBe(15000); // 30% of 50,000
    });
  });

  describe('Subscription Pool Fee Calculation (50%)', () => {
    it('should calculate 50% platform fee for subscription pool', () => {
      const amount = 2000;
      const fee = calculatePlatformFee(amount, 'subscription_pool');

      expect(fee).toBe(1000); // 50%
    });

    it('should calculate fee for various subscription amounts', () => {
      const testCases = [
        { amount: 1000, expectedFee: 500 },
        { amount: 2000, expectedFee: 1000 },
        { amount: 5000, expectedFee: 2500 },
        { amount: 10000, expectedFee: 5000 }
      ];

      testCases.forEach(({ amount, expectedFee }) => {
        const fee = calculatePlatformFee(amount, 'subscription_pool');
        expect(fee).toBe(expectedFee);
      });
    });

    it('should handle odd subscription amounts', () => {
      const amount = 1500;
      const fee = calculatePlatformFee(amount, 'subscription_pool');

      expect(fee).toBe(750); // 50% of 1,500
    });
  });

  describe('Rounding Precision', () => {
    it('should round 30% fee correctly for non-divisible amounts', () => {
      const testCases = [
        { amount: 333, expectedFee: 100 }, // 99.9 → 100
        { amount: 777, expectedFee: 233 }, // 233.1 → 233
        { amount: 1234, expectedFee: 370 } // 370.2 → 370
      ];

      testCases.forEach(({ amount, expectedFee }) => {
        const fee = calculatePlatformFee(amount, 'tip');
        expect(fee).toBe(expectedFee);
      });
    });

    it('should round 50% fee correctly', () => {
      const testCases = [
        { amount: 333, expectedFee: 167 }, // 166.5 → 167
        { amount: 777, expectedFee: 389 }, // 388.5 → 389
        { amount: 1111, expectedFee: 556 } // 555.5 → 556
      ];

      testCases.forEach(({ amount, expectedFee }) => {
        const fee = calculatePlatformFee(amount, 'subscription_pool');
        expect(fee).toBe(expectedFee);
      });
    });

    it('should always return integer fee', () => {
      const amounts = [123, 456, 789, 1234, 5678];

      amounts.forEach(amount => {
        const tipFee = calculatePlatformFee(amount, 'tip');
        const superchatFee = calculatePlatformFee(amount, 'superchat');
        const poolFee = calculatePlatformFee(amount, 'subscription_pool');

        expect(Number.isInteger(tipFee)).toBe(true);
        expect(Number.isInteger(superchatFee)).toBe(true);
        expect(Number.isInteger(poolFee)).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero amount', () => {
      const fee = calculatePlatformFee(0, 'tip');
      expect(fee).toBe(0);
    });

    it('should throw error for negative amount', () => {
      expect(() => calculatePlatformFee(-100, 'tip')).toThrow();
    });

    it('should throw error for invalid source type', () => {
      expect(() => calculatePlatformFee(1000, 'invalid' as any)).toThrow();
    });

    it('should handle very large amounts', () => {
      const amount = 1000000;
      const fee = calculatePlatformFee(amount, 'tip');

      expect(fee).toBe(300000); // 30% of 1,000,000
    });
  });
});

describe('Net Amount Calculation', () => {
  describe('Creator Receives 70% (Tip/Superchat)', () => {
    it('should calculate net amount after fee', () => {
      const amount = 1000;
      const platformFee = 300;
      const netAmount = calculateNetAmount(amount, platformFee);

      expect(netAmount).toBe(700);
    });

    it('should calculate net for minimum tip', () => {
      const amount = 100;
      const platformFee = 30;
      const netAmount = calculateNetAmount(amount, platformFee);

      expect(netAmount).toBe(70);
    });

    it('should calculate net for maximum tip', () => {
      const amount = 100000;
      const platformFee = 30000;
      const netAmount = calculateNetAmount(amount, platformFee);

      expect(netAmount).toBe(70000);
    });

    it('should calculate net for various amounts', () => {
      const testCases = [
        { amount: 500, fee: 150, expectedNet: 350 },
        { amount: 1000, fee: 300, expectedNet: 700 },
        { amount: 5000, fee: 1500, expectedNet: 3500 },
        { amount: 10000, fee: 3000, expectedNet: 7000 }
      ];

      testCases.forEach(({ amount, fee, expectedNet }) => {
        const netAmount = calculateNetAmount(amount, fee);
        expect(netAmount).toBe(expectedNet);
      });
    });
  });

  describe('Creator Receives 50% (Subscription Pool)', () => {
    it('should calculate net amount for 50% fee', () => {
      const amount = 2000;
      const platformFee = 1000;
      const netAmount = calculateNetAmount(amount, platformFee);

      expect(netAmount).toBe(1000);
    });

    it('should calculate net for subscription pool amounts', () => {
      const testCases = [
        { amount: 1000, fee: 500, expectedNet: 500 },
        { amount: 2000, fee: 1000, expectedNet: 1000 },
        { amount: 5000, fee: 2500, expectedNet: 2500 }
      ];

      testCases.forEach(({ amount, fee, expectedNet }) => {
        const netAmount = calculateNetAmount(amount, fee);
        expect(netAmount).toBe(expectedNet);
      });
    });
  });

  describe('Precision and Validation', () => {
    it('should return integer net amount', () => {
      const amount = 333;
      const platformFee = 100;
      const netAmount = calculateNetAmount(amount, platformFee);

      expect(Number.isInteger(netAmount)).toBe(true);
      expect(netAmount).toBe(233);
    });

    it('should validate fee does not exceed amount', () => {
      const amount = 1000;
      const platformFee = 1001;

      expect(() => calculateNetAmount(amount, platformFee)).toThrow('手数料が金額を超えています');
    });

    it('should handle zero fee', () => {
      const amount = 1000;
      const platformFee = 0;
      const netAmount = calculateNetAmount(amount, platformFee);

      expect(netAmount).toBe(1000);
    });

    it('should handle exact fee (100%)', () => {
      const amount = 1000;
      const platformFee = 1000;
      const netAmount = calculateNetAmount(amount, platformFee);

      expect(netAmount).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero amount with zero fee', () => {
      const netAmount = calculateNetAmount(0, 0);
      expect(netAmount).toBe(0);
    });

    it('should throw error for negative amount', () => {
      expect(() => calculateNetAmount(-100, 30)).toThrow();
    });

    it('should throw error for negative fee', () => {
      expect(() => calculateNetAmount(100, -30)).toThrow();
    });

    it('should handle very large amounts', () => {
      const amount = 1000000;
      const platformFee = 300000;
      const netAmount = calculateNetAmount(amount, platformFee);

      expect(netAmount).toBe(700000);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should calculate correct net for ¥1,000 tip', () => {
      const amount = 1000;
      const fee = calculatePlatformFee(amount, 'tip');
      const net = calculateNetAmount(amount, fee);

      expect(fee).toBe(300);
      expect(net).toBe(700);
      expect(fee + net).toBe(amount);
    });

    it('should calculate correct net for ¥5,000 superchat', () => {
      const amount = 5000;
      const fee = calculatePlatformFee(amount, 'superchat');
      const net = calculateNetAmount(amount, fee);

      expect(fee).toBe(1500);
      expect(net).toBe(3500);
      expect(fee + net).toBe(amount);
    });

    it('should calculate correct net for ¥2,000 subscription pool', () => {
      const amount = 2000;
      const fee = calculatePlatformFee(amount, 'subscription_pool');
      const net = calculateNetAmount(amount, fee);

      expect(fee).toBe(1000);
      expect(net).toBe(1000);
      expect(fee + net).toBe(amount);
    });

    it('should ensure fee + net equals original amount', () => {
      const amounts = [100, 500, 1000, 5000, 10000, 50000];

      amounts.forEach(amount => {
        const fee = calculatePlatformFee(amount, 'tip');
        const net = calculateNetAmount(amount, fee);

        expect(fee + net).toBe(amount);
      });
    });
  });
});
