// プラットフォーム判定

import { Platform } from 'react-native';

// app / web の判定
export const isWeb = Platform.OS === 'web';
export const isApp = !isWeb;

// 成人向けコンテンツの表示可否
export const canShowAdultContent = isWeb;
