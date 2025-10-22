フロントエンド  
- Expo (React Native)  
  - iOS / Android / Web 共通コードベース  
  - EXPO_PLATFORM でビルド環境を切り替え  
  - App：成人非表示 / Web：成人表示  

バックエンド  
- Node.js (TypeScript, Express)  
  - APIサーバー  
  - JWT発行とプラットフォーム判定  
  - Stripe / CCBill などの決済連携  

データベース / 認証  
- Supabase (PostgreSQL + Auth)  
  - is_adult フラグで商品・コンテンツ区別  
  - RLS（行レベルセキュリティ）でアクセス制御  
  - Authでユーザー管理  

ストレージ  
- Supabase Storage：静止画、コミック、一般素材  

デプロイ  
- Expo EAS Build：スマホアプリ  
- Vercel ：Web版  
- Render ：APIサーバー  

CDN / DNS  
- Cloudflare：HTTPS、ドメイン、キャッシュ管理  
