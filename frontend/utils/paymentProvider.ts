import { PaymentProvider } from '../types';

/**
 * ³óÆóÄn¢ÀëÈÕé°kúeDfijz×íĞ¤Àü’x
 */
export function selectPaymentProvider(isAdultContent: boolean): PaymentProvider {
  if (isAdultContent) {
    // ¢ÀëÈ³óÆóÄoºQ€z
    return 'ccbill';  // ~_o 'epoch'
  } else {
    // ^¢ÀëÈoStripe
    return 'stripe';
  }
}

/**
 * ×éónz×íĞ¤ÀükúeDfzURL’Ö—
 */
export function getPaymentUrl(
  provider: PaymentProvider,
  planId: string,
  amount: number
): string {
  switch (provider) {
    case 'stripe':
      return `/api/payment/stripe/checkout?plan=${planId}&amount=${amount}`;
    case 'ccbill':
      return `/api/payment/ccbill/checkout?plan=${planId}&amount=${amount}`;
    case 'epoch':
      return `/api/payment/epoch/checkout?plan=${planId}&amount=${amount}`;
    default:
      throw new Error(`Unknown payment provider: ${provider}`);
  }
}

/**
 * •R­nzæ
 */
export async function processTip(
  contentId: string,
  contentType: 'video' | 'short' | 'live',
  isAdultContent: boolean,
  amount: number,
  message?: string
): Promise<{ success: boolean; paymentUrl: string }> {
  const provider = selectPaymentProvider(isAdultContent);

  // Ÿ›nŸÅgoAPI³üë’LF
  const messageParam = message ? `&message=${encodeURIComponent(message)}` : '';
  const paymentUrl = `/api/payment/${provider}/tip?content=${contentId}&type=${contentType}&amount=${amount}${messageParam}`;

  return {
    success: true,
    paymentUrl,
  };
}

/**
 * z×íĞ¤Àünh:’Ö—
 */
export function getPaymentProviderDisplayName(provider: PaymentProvider): string {
  switch (provider) {
    case 'stripe':
      return 'Stripe';
    case 'ccbill':
      return 'CCBill';
    case 'epoch':
      return 'Epoch';
    default:
      return provider.toUpperCase();
  }
}
