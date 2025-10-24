import { Video, Short, NetflixContent, SubscriptionPlan } from '../types';
import { canShowAdultContent } from '../constants/Platform';

/**
 * コンテンツ（動画・ショート・Netflix）へのアクセス権限をチェック
 */
export function canAccessContent(
  content: Video | Short | NetflixContent,
  currentPlan: SubscriptionPlan
): { canAccess: boolean; reason?: string } {
  // プラットフォーム制限（iOS/Android）
  if (content.is_adult && !canShowAdultContent) {
    return {
      canAccess: false,
      reason: 'このプラットフォームではアダルトコンテンツは利用できません',
    };
  }

  // アダルトコンテンツのアクセス制御
  if (content.is_adult && !currentPlan.has_adult_access) {
    return {
      canAccess: false,
      reason: 'アダルトコンテンツを視聴するにはプレミアム+プランが必要です',
    };
  }

  // Netflixコンテンツのアクセス制御
  if ('type' in content && !currentPlan.has_netflix_access) {
    return {
      canAccess: false,
      reason: 'Netflixコンテンツを視聴するにはプレミアムプラン以上が必要です',
    };
  }

  return { canAccess: true };
}

/**
 * コンテンツ配列をプランでフィルタリング
 */
export function filterContentByPlan<T extends { is_adult: boolean }>(
  contents: T[],
  currentPlan: SubscriptionPlan
): T[] {
  return contents.filter(content => {
    // 一般コンテンツは常に表示
    if (!content.is_adult) {
      return true;
    }

    // プラットフォーム制限
    if (!canShowAdultContent) {
      return false;
    }

    // プランの権限チェック
    return currentPlan.has_adult_access;
  });
}

/**
 * Netflixコンテンツをプランでフィルタリング
 */
export function filterNetflixContentByPlan(
  contents: NetflixContent[],
  currentPlan: SubscriptionPlan
): NetflixContent[] {
  return contents.filter(content => {
    // Netflixアクセス権がない場合は除外
    if (!currentPlan.has_netflix_access) {
      return false;
    }

    // アダルトコンテンツの制御
    if (content.is_adult) {
      // プラットフォーム制限
      if (!canShowAdultContent) {
        return false;
      }
      // プランの権限チェック
      return currentPlan.has_adult_access;
    }

    return true;
  });
}

/**
 * コンテンツへのアクセスにプランアップグレードが必要か確認
 */
export function needsPlanUpgrade(
  content: Video | Short | NetflixContent,
  currentPlan: SubscriptionPlan
): { needsUpgrade: boolean; requiredPlan?: 'premium' | 'premium_plus' } {
  // アダルトコンテンツの場合はプレミアム+が必要
  if (content.is_adult && !currentPlan.has_adult_access) {
    return {
      needsUpgrade: true,
      requiredPlan: 'premium_plus',
    };
  }

  // Netflixコンテンツの場合はプランに応じて判定
  if ('type' in content && !currentPlan.has_netflix_access) {
    // アダルトかどうかで必要なプランが変わる
    return {
      needsUpgrade: true,
      requiredPlan: content.is_adult ? 'premium_plus' : 'premium',
    };
  }

  return { needsUpgrade: false };
}
