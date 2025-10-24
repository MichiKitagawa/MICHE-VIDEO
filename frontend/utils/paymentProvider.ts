import { PaymentProvider } from '../types';

/**
 * �����n������k�eDfijz��Ф���x�
 */
export function selectPaymentProvider(isAdultContent: boolean): PaymentProvider {
  if (isAdultContent) {
    // ���ȳ����o�Q�z
    return 'ccbill';  // ~_o 'epoch'
  } else {
    // ^����oStripe
    return 'stripe';
  }
}

/**
 * ���nz��Ф��k�eDfzURL�֗
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
 * �R�nz�
 */
export async function processTip(
  contentId: string,
  contentType: 'video' | 'short' | 'live',
  isAdultContent: boolean,
  amount: number,
  message?: string
): Promise<{ success: boolean; paymentUrl: string }> {
  const provider = selectPaymentProvider(isAdultContent);

  // ��n��goAPI���LF
  const messageParam = message ? `&message=${encodeURIComponent(message)}` : '';
  const paymentUrl = `/api/payment/${provider}/tip?content=${contentId}&type=${contentType}&amount=${amount}${messageParam}`;

  return {
    success: true,
    paymentUrl,
  };
}

/**
 * z��Ф��nh:�֗
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
