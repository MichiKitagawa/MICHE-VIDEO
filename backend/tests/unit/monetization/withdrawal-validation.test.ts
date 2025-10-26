/**
 * Withdrawal Validation Unit Tests
 *
 * Tests for minimum withdrawal amount (¥1,000) and balance validation
 * Reference: docs/tests/monetization-tests.md (TC-006, TC-002)
 */

import {
  validateWithdrawalAmount,
  calculateWithdrawalFee,
  validateWithdrawalMethod
} from '@/lib/monetization/withdrawal';

describe('Withdrawal Amount Validation', () => {
  describe('Valid Withdrawal Amounts', () => {
    it('should accept minimum withdrawal amount (¥1,000)', () => {
      const availableBalance = 10000;
      expect(() => validateWithdrawalAmount(1000, availableBalance)).not.toThrow();
    });

    it('should accept withdrawal up to available balance', () => {
      const availableBalance = 50000;
      expect(() => validateWithdrawalAmount(50000, availableBalance)).not.toThrow();
    });

    it('should accept common withdrawal amounts', () => {
      const availableBalance = 100000;
      const validAmounts = [1000, 5000, 10000, 50000, 100000];

      validAmounts.forEach(amount => {
        expect(() => validateWithdrawalAmount(amount, availableBalance)).not.toThrow();
      });
    });

    it('should accept withdrawal less than balance', () => {
      const availableBalance = 50000;
      expect(() => validateWithdrawalAmount(45000, availableBalance)).not.toThrow();
    });

    it('should accept large withdrawal amounts', () => {
      const availableBalance = 1000000;
      expect(() => validateWithdrawalAmount(500000, availableBalance)).not.toThrow();
    });
  });

  describe('Invalid Amounts - Below Minimum', () => {
    it('should reject withdrawal below minimum (¥1,000)', () => {
      const availableBalance = 10000;
      expect(() => validateWithdrawalAmount(500, availableBalance))
        .toThrow('最低出金額は¥1,000です');
    });

    it('should reject ¥999', () => {
      const availableBalance = 10000;
      expect(() => validateWithdrawalAmount(999, availableBalance))
        .toThrow('最低出金額は¥1,000です');
    });

    it('should reject ¥100', () => {
      const availableBalance = 10000;
      expect(() => validateWithdrawalAmount(100, availableBalance))
        .toThrow('最低出金額は¥1,000です');
    });

    it('should reject zero amount', () => {
      const availableBalance = 10000;
      expect(() => validateWithdrawalAmount(0, availableBalance))
        .toThrow('最低出金額は¥1,000です');
    });

    it('should reject negative amount', () => {
      const availableBalance = 10000;
      expect(() => validateWithdrawalAmount(-1000, availableBalance))
        .toThrow('最低出金額は¥1,000です');
    });
  });

  describe('Invalid Amounts - Exceeding Balance', () => {
    it('should reject withdrawal exceeding available balance', () => {
      const availableBalance = 10000;
      expect(() => validateWithdrawalAmount(15000, availableBalance))
        .toThrow('出金可能残高が不足しています');
    });

    it('should reject withdrawal when balance is zero', () => {
      const availableBalance = 0;
      expect(() => validateWithdrawalAmount(1000, availableBalance))
        .toThrow('出金可能残高が不足しています');
    });

    it('should reject withdrawal by ¥1 over balance', () => {
      const availableBalance = 10000;
      expect(() => validateWithdrawalAmount(10001, availableBalance))
        .toThrow('出金可能残高が不足しています');
    });

    it('should reject very large withdrawal with insufficient balance', () => {
      const availableBalance = 50000;
      expect(() => validateWithdrawalAmount(1000000, availableBalance))
        .toThrow('出金可能残高が不足しています');
    });
  });

  describe('Edge Cases', () => {
    it('should handle exact balance withdrawal', () => {
      const availableBalance = 50000;
      expect(() => validateWithdrawalAmount(50000, availableBalance)).not.toThrow();
    });

    it('should handle minimum balance scenario', () => {
      const availableBalance = 1000;
      expect(() => validateWithdrawalAmount(1000, availableBalance)).not.toThrow();
    });

    it('should reject when balance is below minimum', () => {
      const availableBalance = 999;
      expect(() => validateWithdrawalAmount(999, availableBalance))
        .toThrow('最低出金額は¥1,000です');
    });

    it('should handle null or undefined amount', () => {
      const availableBalance = 10000;
      expect(() => validateWithdrawalAmount(null as any, availableBalance)).toThrow();
      expect(() => validateWithdrawalAmount(undefined as any, availableBalance)).toThrow();
    });

    it('should handle null or undefined balance', () => {
      expect(() => validateWithdrawalAmount(1000, null as any)).toThrow();
      expect(() => validateWithdrawalAmount(1000, undefined as any)).toThrow();
    });

    it('should handle NaN amount', () => {
      const availableBalance = 10000;
      expect(() => validateWithdrawalAmount(NaN, availableBalance)).toThrow();
    });

    it('should handle string input', () => {
      const availableBalance = 10000;
      expect(() => validateWithdrawalAmount('5000' as any, availableBalance))
        .toThrow('金額は数値である必要があります');
    });

    it('should reject non-integer amounts', () => {
      const availableBalance = 10000;
      expect(() => validateWithdrawalAmount(5000.50, availableBalance))
        .toThrow('整数の金額が必要です');
    });
  });
});

describe('Withdrawal Fee Calculation', () => {
  describe('Bank Transfer Fee (¥250)', () => {
    it('should calculate ¥250 fee for bank transfer', () => {
      const amount = 10000;
      const fee = calculateWithdrawalFee(amount, 'bank_transfer');

      expect(fee).toBe(250);
    });

    it('should charge flat ¥250 regardless of amount', () => {
      const amounts = [1000, 5000, 10000, 50000, 100000];

      amounts.forEach(amount => {
        const fee = calculateWithdrawalFee(amount, 'bank_transfer');
        expect(fee).toBe(250);
      });
    });

    it('should calculate net amount after bank transfer fee', () => {
      const testCases = [
        { amount: 10000, fee: 250, expectedNet: 9750 },
        { amount: 45000, fee: 250, expectedNet: 44750 },
        { amount: 100000, fee: 250, expectedNet: 99750 }
      ];

      testCases.forEach(({ amount, fee, expectedNet }) => {
        const withdrawalFee = calculateWithdrawalFee(amount, 'bank_transfer');
        const netAmount = amount - withdrawalFee;

        expect(withdrawalFee).toBe(fee);
        expect(netAmount).toBe(expectedNet);
      });
    });
  });

  describe('PayPal Fee (¥0)', () => {
    it('should calculate ¥0 fee for PayPal', () => {
      const amount = 10000;
      const fee = calculateWithdrawalFee(amount, 'paypal');

      expect(fee).toBe(0);
    });

    it('should have no fee for any PayPal amount', () => {
      const amounts = [1000, 5000, 10000, 50000, 100000];

      amounts.forEach(amount => {
        const fee = calculateWithdrawalFee(amount, 'paypal');
        expect(fee).toBe(0);
      });
    });

    it('should calculate net amount with no fee for PayPal', () => {
      const amount = 10000;
      const fee = calculateWithdrawalFee(amount, 'paypal');
      const netAmount = amount - fee;

      expect(fee).toBe(0);
      expect(netAmount).toBe(10000);
    });
  });

  describe('Net Withdrawal Amount Calculation', () => {
    it('should calculate correct net for bank transfer', () => {
      const testCases = [
        { amount: 1000, expectedNet: 750 },
        { amount: 5000, expectedNet: 4750 },
        { amount: 10000, expectedNet: 9750 },
        { amount: 50000, expectedNet: 49750 }
      ];

      testCases.forEach(({ amount, expectedNet }) => {
        const fee = calculateWithdrawalFee(amount, 'bank_transfer');
        const net = amount - fee;

        expect(net).toBe(expectedNet);
      });
    });

    it('should calculate correct net for PayPal (no fee)', () => {
      const amounts = [1000, 5000, 10000, 50000];

      amounts.forEach(amount => {
        const fee = calculateWithdrawalFee(amount, 'paypal');
        const net = amount - fee;

        expect(net).toBe(amount);
      });
    });

    it('should ensure fee does not exceed amount', () => {
      const amount = 1000;
      const fee = calculateWithdrawalFee(amount, 'bank_transfer');

      expect(fee).toBeLessThan(amount);
      expect(amount - fee).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum withdrawal with bank transfer fee', () => {
      const amount = 1000;
      const fee = calculateWithdrawalFee(amount, 'bank_transfer');
      const net = amount - fee;

      expect(fee).toBe(250);
      expect(net).toBe(750); // Still above ¥0
    });

    it('should handle very large amounts', () => {
      const amount = 1000000;
      const bankFee = calculateWithdrawalFee(amount, 'bank_transfer');
      const paypalFee = calculateWithdrawalFee(amount, 'paypal');

      expect(bankFee).toBe(250); // Flat fee
      expect(paypalFee).toBe(0);
    });

    it('should handle invalid withdrawal method', () => {
      const amount = 10000;
      expect(() => calculateWithdrawalFee(amount, 'invalid' as any))
        .toThrow('無効な出金方法です');
    });

    it('should handle null or undefined method', () => {
      const amount = 10000;
      expect(() => calculateWithdrawalFee(amount, null as any)).toThrow();
      expect(() => calculateWithdrawalFee(amount, undefined as any)).toThrow();
    });

    it('should handle zero amount', () => {
      const fee = calculateWithdrawalFee(0, 'bank_transfer');
      expect(fee).toBe(250); // Still charges flat fee
    });

    it('should reject negative amounts', () => {
      expect(() => calculateWithdrawalFee(-1000, 'bank_transfer')).toThrow();
    });
  });
});

describe('Withdrawal Method Validation', () => {
  describe('Bank Transfer Validation', () => {
    it('should validate complete bank transfer information', () => {
      const method = {
        type: 'bank_transfer' as const,
        bank_name: 'みずほ銀行',
        branch_name: '渋谷支店',
        account_type: 'checking' as const,
        account_number: '1234567',
        account_holder: 'タナカ タロウ'
      };

      expect(() => validateWithdrawalMethod(method)).not.toThrow();
    });

    it('should reject bank transfer without bank_name', () => {
      const method = {
        type: 'bank_transfer' as const,
        branch_name: '渋谷支店',
        account_type: 'checking' as const,
        account_number: '1234567',
        account_holder: 'タナカ タロウ'
      } as any;

      expect(() => validateWithdrawalMethod(method))
        .toThrow('銀行名が必要です');
    });

    it('should reject bank transfer without account_number', () => {
      const method = {
        type: 'bank_transfer' as const,
        bank_name: 'みずほ銀行',
        branch_name: '渋谷支店',
        account_type: 'checking' as const,
        account_holder: 'タナカ タロウ'
      } as any;

      expect(() => validateWithdrawalMethod(method))
        .toThrow('口座番号が必要です');
    });

    it('should reject bank transfer without account_holder', () => {
      const method = {
        type: 'bank_transfer' as const,
        bank_name: 'みずほ銀行',
        branch_name: '渋谷支店',
        account_type: 'checking' as const,
        account_number: '1234567'
      } as any;

      expect(() => validateWithdrawalMethod(method))
        .toThrow('口座名義が必要です');
    });

    it('should accept both checking and savings account types', () => {
      const checkingMethod = {
        type: 'bank_transfer' as const,
        bank_name: 'みずほ銀行',
        branch_name: '渋谷支店',
        account_type: 'checking' as const,
        account_number: '1234567',
        account_holder: 'タナカ タロウ'
      };

      const savingsMethod = {
        ...checkingMethod,
        account_type: 'savings' as const
      };

      expect(() => validateWithdrawalMethod(checkingMethod)).not.toThrow();
      expect(() => validateWithdrawalMethod(savingsMethod)).not.toThrow();
    });

    it('should reject invalid account type', () => {
      const method = {
        type: 'bank_transfer' as const,
        bank_name: 'みずほ銀行',
        branch_name: '渋谷支店',
        account_type: 'invalid' as any,
        account_number: '1234567',
        account_holder: 'タナカ タロウ'
      };

      expect(() => validateWithdrawalMethod(method))
        .toThrow('無効な口座種別です');
    });
  });

  describe('PayPal Validation', () => {
    it('should validate PayPal with email', () => {
      const method = {
        type: 'paypal' as const,
        paypal_email: 'creator@example.com'
      };

      expect(() => validateWithdrawalMethod(method)).not.toThrow();
    });

    it('should reject PayPal without email', () => {
      const method = {
        type: 'paypal' as const
      } as any;

      expect(() => validateWithdrawalMethod(method))
        .toThrow('PayPalメールアドレスが必要です');
    });

    it('should reject PayPal with invalid email format', () => {
      const method = {
        type: 'paypal' as const,
        paypal_email: 'invalid-email'
      };

      expect(() => validateWithdrawalMethod(method))
        .toThrow('有効なメールアドレスを入力してください');
    });

    it('should accept various valid email formats', () => {
      const validEmails = [
        'creator@example.com',
        'user.name@example.co.jp',
        'test+tag@domain.com',
        'name123@test-domain.com'
      ];

      validEmails.forEach(email => {
        const method = {
          type: 'paypal' as const,
          paypal_email: email
        };

        expect(() => validateWithdrawalMethod(method)).not.toThrow();
      });
    });
  });

  describe('General Validation', () => {
    it('should reject invalid withdrawal method type', () => {
      const method = {
        type: 'invalid' as any
      };

      expect(() => validateWithdrawalMethod(method))
        .toThrow('無効な出金方法です');
    });

    it('should reject null or undefined method', () => {
      expect(() => validateWithdrawalMethod(null as any)).toThrow();
      expect(() => validateWithdrawalMethod(undefined as any)).toThrow();
    });

    it('should reject empty object', () => {
      expect(() => validateWithdrawalMethod({} as any))
        .toThrow('出金方法のタイプが必要です');
    });
  });

  describe('Security Validation', () => {
    it('should sanitize bank name for XSS', () => {
      const method = {
        type: 'bank_transfer' as const,
        bank_name: '<script>alert("XSS")</script>銀行',
        branch_name: '支店',
        account_type: 'checking' as const,
        account_number: '1234567',
        account_holder: 'タナカ タロウ'
      };

      const validated = validateWithdrawalMethod(method);
      expect(validated.bank_name).not.toContain('<script>');
    });

    it('should sanitize account holder name', () => {
      const method = {
        type: 'bank_transfer' as const,
        bank_name: 'みずほ銀行',
        branch_name: '渋谷支店',
        account_type: 'checking' as const,
        account_number: '1234567',
        account_holder: '<img src=x onerror="alert(1)">タナカ'
      };

      const validated = validateWithdrawalMethod(method);
      expect(validated.account_holder).not.toContain('onerror');
    });

    it('should validate account number format', () => {
      const method = {
        type: 'bank_transfer' as const,
        bank_name: 'みずほ銀行',
        branch_name: '渋谷支店',
        account_type: 'checking' as const,
        account_number: '12345ab', // Invalid: contains letters
        account_holder: 'タナカ タロウ'
      };

      expect(() => validateWithdrawalMethod(method))
        .toThrow('口座番号は数字のみです');
    });
  });

  describe('Real-World Scenarios', () => {
    it('should validate typical bank transfer for Japanese bank', () => {
      const method = {
        type: 'bank_transfer' as const,
        bank_name: '三井住友銀行',
        branch_name: '新宿支店',
        account_type: 'checking' as const,
        account_number: '7654321',
        account_holder: 'ヤマダ ハナコ'
      };

      expect(() => validateWithdrawalMethod(method)).not.toThrow();
    });

    it('should validate PayPal for international withdrawal', () => {
      const method = {
        type: 'paypal' as const,
        paypal_email: 'global.creator@example.com'
      };

      expect(() => validateWithdrawalMethod(method)).not.toThrow();
    });

    it('should handle complete withdrawal flow validation', () => {
      const availableBalance = 50000;
      const withdrawalAmount = 45000;

      // Validate amount
      expect(() => validateWithdrawalAmount(withdrawalAmount, availableBalance)).not.toThrow();

      // Validate method
      const method = {
        type: 'bank_transfer' as const,
        bank_name: 'みずほ銀行',
        branch_name: '渋谷支店',
        account_type: 'checking' as const,
        account_number: '1234567',
        account_holder: 'タナカ タロウ'
      };
      expect(() => validateWithdrawalMethod(method)).not.toThrow();

      // Calculate fee
      const fee = calculateWithdrawalFee(withdrawalAmount, 'bank_transfer');
      expect(fee).toBe(250);

      // Calculate net
      const netAmount = withdrawalAmount - fee;
      expect(netAmount).toBe(44750);
    });
  });
});
