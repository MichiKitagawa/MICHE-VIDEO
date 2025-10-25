import { PaymentProvider } from '../types';

/**
 * コンテンツの種類に基づいて決済プロバイダーを選択
 */
export function selectPaymentProvider(isAdultContent: boolean): PaymentProvider {
  if (isAdultContent) {
    // アダルトコンテンツはCCBill (Premium+プラン)
    return 'ccbill';
  } else {
    // 一般コンテンツはStripe (Premiumプラン)
    return 'stripe';
  }
}

/**
 * 決済プロバイダーごとの決済URLを生成
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
    default:
      throw new Error(`Unknown payment provider: ${provider}`);
  }
}

/**
 * 投げ銭処理
 */
export async function processTip(
  contentId: string,
  contentType: 'video' | 'short' | 'live',
  isAdultContent: boolean,
  amount: number,
  message?: string
): Promise<{ success: boolean; paymentUrl: string }> {
  const provider = selectPaymentProvider(isAdultContent);

  // 決済プロバイダーのAPIエンドポイントを生成
  const messageParam = message ? `&message=${encodeURIComponent(message)}` : '';
  const paymentUrl = `/api/payment/${provider}/tip?content=${contentId}&type=${contentType}&amount=${amount}${messageParam}`;

  return {
    success: true,
    paymentUrl,
  };
}

/**
 * 決済プロバイダーの表示名を取得
 */
export function getPaymentProviderDisplayName(provider: PaymentProvider): string {
  switch (provider) {
    case 'stripe':
      return 'Stripe';
    case 'ccbill':
      return 'CCBill';
    default:
      return provider.toUpperCase();
  }
}
