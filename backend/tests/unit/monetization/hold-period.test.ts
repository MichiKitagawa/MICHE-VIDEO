/**
 * Hold Period Validation Unit Tests
 *
 * Tests for 14-day hold period before earnings become available
 * Reference: docs/tests/monetization-tests.md (TC-004)
 */

import {
  calculateAvailableDate,
  isAvailableForWithdrawal,
  getAvailableBalance,
  getPendingBalance
} from '@/lib/monetization/hold-period';

describe('Hold Period Validation', () => {
  describe('14-Day Hold Period Calculation', () => {
    it('should calculate available date as 14 days after earning date', () => {
      const earningDate = new Date('2025-10-26T10:00:00Z');
      const availableDate = calculateAvailableDate(earningDate);

      const expectedDate = new Date('2025-11-09T10:00:00Z'); // 14 days later
      expect(availableDate).toEqual(expectedDate);
    });

    it('should handle earnings from different dates', () => {
      const testCases = [
        {
          earning: new Date('2025-10-01T00:00:00Z'),
          expected: new Date('2025-10-15T00:00:00Z')
        },
        {
          earning: new Date('2025-10-15T12:00:00Z'),
          expected: new Date('2025-10-29T12:00:00Z')
        },
        {
          earning: new Date('2025-10-31T23:59:59Z'),
          expected: new Date('2025-11-14T23:59:59Z')
        }
      ];

      testCases.forEach(({ earning, expected }) => {
        const availableDate = calculateAvailableDate(earning);
        expect(availableDate).toEqual(expected);
      });
    });

    it('should preserve time when adding 14 days', () => {
      const earningDate = new Date('2025-10-26T15:30:45Z');
      const availableDate = calculateAvailableDate(earningDate);

      expect(availableDate.getHours()).toBe(15);
      expect(availableDate.getMinutes()).toBe(30);
      expect(availableDate.getSeconds()).toBe(45);
    });

    it('should handle month transitions', () => {
      const earningDate = new Date('2025-10-25T10:00:00Z');
      const availableDate = calculateAvailableDate(earningDate);

      const expectedDate = new Date('2025-11-08T10:00:00Z');
      expect(availableDate).toEqual(expectedDate);
    });

    it('should handle year transitions', () => {
      const earningDate = new Date('2025-12-25T10:00:00Z');
      const availableDate = calculateAvailableDate(earningDate);

      const expectedDate = new Date('2026-01-08T10:00:00Z');
      expect(availableDate).toEqual(expectedDate);
    });
  });

  describe('Availability Check', () => {
    it('should return false for earnings within 14-day hold period', () => {
      const now = new Date('2025-10-26T10:00:00Z');
      const earningDate = new Date('2025-10-20T10:00:00Z'); // 6 days ago

      const isAvailable = isAvailableForWithdrawal(earningDate, now);
      expect(isAvailable).toBe(false);
    });

    it('should return true for earnings after 14-day hold period', () => {
      const now = new Date('2025-10-26T10:00:00Z');
      const earningDate = new Date('2025-10-11T10:00:00Z'); // 15 days ago

      const isAvailable = isAvailableForWithdrawal(earningDate, now);
      expect(isAvailable).toBe(true);
    });

    it('should return true for earnings exactly 14 days old', () => {
      const now = new Date('2025-10-26T10:00:00Z');
      const earningDate = new Date('2025-10-12T10:00:00Z'); // Exactly 14 days ago

      const isAvailable = isAvailableForWithdrawal(earningDate, now);
      expect(isAvailable).toBe(true);
    });

    it('should handle edge case: 13 days 23 hours 59 minutes', () => {
      const now = new Date('2025-10-26T10:00:00Z');
      const earningDate = new Date('2025-10-12T10:00:01Z'); // Just under 14 days

      const isAvailable = isAvailableForWithdrawal(earningDate, now);
      expect(isAvailable).toBe(false);
    });

    it('should handle very old earnings', () => {
      const now = new Date('2025-10-26T10:00:00Z');
      const earningDate = new Date('2025-01-01T10:00:00Z'); // 9+ months ago

      const isAvailable = isAvailableForWithdrawal(earningDate, now);
      expect(isAvailable).toBe(true);
    });

    it('should handle future earnings (edge case)', () => {
      const now = new Date('2025-10-26T10:00:00Z');
      const earningDate = new Date('2025-10-27T10:00:00Z'); // Tomorrow

      const isAvailable = isAvailableForWithdrawal(earningDate, now);
      expect(isAvailable).toBe(false);
    });
  });

  describe('Available Balance Calculation', () => {
    it('should calculate available balance from eligible earnings', () => {
      const now = new Date('2025-10-26T10:00:00Z');
      const earnings = [
        {
          net_amount: 700,
          created_at: new Date('2025-10-11T10:00:00Z'), // 15 days ago - available
          status: 'completed'
        },
        {
          net_amount: 500,
          created_at: new Date('2025-10-20T10:00:00Z'), // 6 days ago - pending
          status: 'completed'
        },
        {
          net_amount: 350,
          created_at: new Date('2025-10-10T10:00:00Z'), // 16 days ago - available
          status: 'completed'
        }
      ];

      const availableBalance = getAvailableBalance(earnings, now);
      expect(availableBalance).toBe(1050); // 700 + 350
    });

    it('should exclude earnings still in hold period', () => {
      const now = new Date('2025-10-26T10:00:00Z');
      const earnings = [
        {
          net_amount: 1000,
          created_at: new Date('2025-10-25T10:00:00Z'), // 1 day ago
          status: 'completed'
        },
        {
          net_amount: 2000,
          created_at: new Date('2025-10-24T10:00:00Z'), // 2 days ago
          status: 'completed'
        }
      ];

      const availableBalance = getAvailableBalance(earnings, now);
      expect(availableBalance).toBe(0); // All in hold period
    });

    it('should handle empty earnings array', () => {
      const now = new Date('2025-10-26T10:00:00Z');
      const earnings: any[] = [];

      const availableBalance = getAvailableBalance(earnings, now);
      expect(availableBalance).toBe(0);
    });

    it('should exclude non-completed earnings', () => {
      const now = new Date('2025-10-26T10:00:00Z');
      const earnings = [
        {
          net_amount: 700,
          created_at: new Date('2025-10-11T10:00:00Z'),
          status: 'pending'
        },
        {
          net_amount: 500,
          created_at: new Date('2025-10-11T10:00:00Z'),
          status: 'failed'
        },
        {
          net_amount: 350,
          created_at: new Date('2025-10-11T10:00:00Z'),
          status: 'completed'
        }
      ];

      const availableBalance = getAvailableBalance(earnings, now);
      expect(availableBalance).toBe(350); // Only completed
    });

    it('should handle mixed earnings across hold period boundary', () => {
      const now = new Date('2025-10-26T10:00:00Z');
      const earnings = [
        {
          net_amount: 1000,
          created_at: new Date('2025-10-12T09:00:00Z'), // Available
          status: 'completed'
        },
        {
          net_amount: 2000,
          created_at: new Date('2025-10-12T11:00:00Z'), // Pending
          status: 'completed'
        },
        {
          net_amount: 3000,
          created_at: new Date('2025-10-01T10:00:00Z'), // Available
          status: 'completed'
        }
      ];

      const availableBalance = getAvailableBalance(earnings, now);
      expect(availableBalance).toBe(4000); // 1000 + 3000
    });
  });

  describe('Pending Balance Calculation', () => {
    it('should calculate pending balance from earnings in hold period', () => {
      const now = new Date('2025-10-26T10:00:00Z');
      const earnings = [
        {
          net_amount: 700,
          created_at: new Date('2025-10-20T10:00:00Z'), // 6 days ago - pending
          status: 'completed'
        },
        {
          net_amount: 500,
          created_at: new Date('2025-10-22T10:00:00Z'), // 4 days ago - pending
          status: 'completed'
        },
        {
          net_amount: 350,
          created_at: new Date('2025-10-11T10:00:00Z'), // 15 days ago - available
          status: 'completed'
        }
      ];

      const pendingBalance = getPendingBalance(earnings, now);
      expect(pendingBalance).toBe(1200); // 700 + 500
    });

    it('should exclude available earnings', () => {
      const now = new Date('2025-10-26T10:00:00Z');
      const earnings = [
        {
          net_amount: 1000,
          created_at: new Date('2025-10-11T10:00:00Z'), // Available
          status: 'completed'
        },
        {
          net_amount: 2000,
          created_at: new Date('2025-10-10T10:00:00Z'), // Available
          status: 'completed'
        }
      ];

      const pendingBalance = getPendingBalance(earnings, now);
      expect(pendingBalance).toBe(0); // All available
    });

    it('should handle no pending earnings', () => {
      const now = new Date('2025-10-26T10:00:00Z');
      const earnings: any[] = [];

      const pendingBalance = getPendingBalance(earnings, now);
      expect(pendingBalance).toBe(0);
    });

    it('should exclude non-completed earnings from pending', () => {
      const now = new Date('2025-10-26T10:00:00Z');
      const earnings = [
        {
          net_amount: 700,
          created_at: new Date('2025-10-20T10:00:00Z'),
          status: 'pending'
        },
        {
          net_amount: 500,
          created_at: new Date('2025-10-20T10:00:00Z'),
          status: 'completed'
        }
      ];

      const pendingBalance = getPendingBalance(earnings, now);
      expect(pendingBalance).toBe(500); // Only completed earnings in hold
    });
  });

  describe('Edge Cases', () => {
    it('should handle earnings at exact hold period boundary', () => {
      const now = new Date('2025-10-26T10:00:00.000Z');
      const earningDate = new Date('2025-10-12T10:00:00.000Z'); // Exactly 14 days

      const isAvailable = isAvailableForWithdrawal(earningDate, now);
      expect(isAvailable).toBe(true);
    });

    it('should handle milliseconds precision', () => {
      const now = new Date('2025-10-26T10:00:00.500Z');
      const earningDate = new Date('2025-10-12T10:00:00.499Z'); // Just available

      const isAvailable = isAvailableForWithdrawal(earningDate, now);
      expect(isAvailable).toBe(true);
    });

    it('should handle DST transitions', () => {
      // This test depends on implementation handling of DST
      const earningDate = new Date('2025-03-08T10:00:00Z'); // Around DST change
      const availableDate = calculateAvailableDate(earningDate);

      const daysDifference = Math.floor((availableDate.getTime() - earningDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDifference).toBe(14);
    });

    it('should handle very large balances', () => {
      const now = new Date('2025-10-26T10:00:00Z');
      const earnings = [
        {
          net_amount: 1000000,
          created_at: new Date('2025-10-11T10:00:00Z'),
          status: 'completed'
        },
        {
          net_amount: 2000000,
          created_at: new Date('2025-10-11T10:00:00Z'),
          status: 'completed'
        }
      ];

      const availableBalance = getAvailableBalance(earnings, now);
      expect(availableBalance).toBe(3000000);
    });

    it('should handle invalid dates gracefully', () => {
      expect(() => calculateAvailableDate(new Date('invalid'))).toThrow();
    });

    it('should handle null or undefined dates', () => {
      expect(() => calculateAvailableDate(null as any)).toThrow();
      expect(() => calculateAvailableDate(undefined as any)).toThrow();
    });
  });

  describe('Real-World Scenarios', () => {
    it('should correctly calculate for creator with mixed earnings', () => {
      const now = new Date('2025-10-26T10:00:00Z');
      const earnings = [
        // Tips from 20 days ago - available
        { net_amount: 700, created_at: new Date('2025-10-06T10:00:00Z'), status: 'completed' },
        { net_amount: 350, created_at: new Date('2025-10-06T11:00:00Z'), status: 'completed' },

        // Superchat from 10 days ago - pending
        { net_amount: 3500, created_at: new Date('2025-10-16T10:00:00Z'), status: 'completed' },

        // Subscription pool from 30 days ago - available
        { net_amount: 1000, created_at: new Date('2025-09-26T10:00:00Z'), status: 'completed' },

        // Recent tips from 5 days ago - pending
        { net_amount: 700, created_at: new Date('2025-10-21T10:00:00Z'), status: 'completed' },
        { net_amount: 350, created_at: new Date('2025-10-21T11:00:00Z'), status: 'completed' }
      ];

      const availableBalance = getAvailableBalance(earnings, now);
      const pendingBalance = getPendingBalance(earnings, now);

      expect(availableBalance).toBe(2050); // 700 + 350 + 1000
      expect(pendingBalance).toBe(4550); // 3500 + 700 + 350
    });

    it('should track earnings becoming available over time', () => {
      const earningDate = new Date('2025-10-12T10:00:00Z');
      const testDates = [
        { date: new Date('2025-10-20T10:00:00Z'), expected: false }, // 8 days
        { date: new Date('2025-10-24T10:00:00Z'), expected: false }, // 12 days
        { date: new Date('2025-10-26T10:00:00Z'), expected: true },  // 14 days
        { date: new Date('2025-10-30T10:00:00Z'), expected: true }   // 18 days
      ];

      testDates.forEach(({ date, expected }) => {
        const isAvailable = isAvailableForWithdrawal(earningDate, date);
        expect(isAvailable).toBe(expected);
      });
    });
  });
});
