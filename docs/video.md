# MICHE VIDEO コンセプト概要

## コンセプト
**MICHE VIDEO**は、STUDIOに登録されたIPを使った動画を投稿・視聴できるプラットフォーム。(IPに関係ない動画でもアップできる。)
YouTubeライクなシンプルな動画配信サービス。

---

## 目的
- クリエイターがIPを使った動画を投稿できる
- 視聴者が動画を楽しめる
- 視聴数などの収益情報をSTUDIOに送信し、IPホルダーとクリエイターで分配
- STUDIOのライセンス情報を参照して適切な権利管理

---

## 仕組み

```
クリエイター → 動画アップロード → MICHE VIDEO → 視聴者
                    ↓
            IPライセンス紐付け
                    ↓
            収益情報 → MICHE STUDIO → 分配
```

- クリエイターは動画アップロード時にSTUDIOに登録されたIPを選択
- 視聴数・収益情報は自動でSTUDIOに送信
- STUDIOがIPホルダーとクリエイターに収益を分配

---

## 必要最低限の機能

### 1. ユーザー認証
- Supabase Authでログイン/サインアップ
- プラットフォーム判定（app/web）

### 2. 動画アップロード
- Bunny.netへ動画をアップロード
- タイトル、説明文の入力
- STUDIO（APIを叩いて情報を取得）からIPを選択して紐付け
- 成人向けフラグ（is_adult）の設定

### 3. 動画視聴
- Bunny.netから動画を配信
- プラットフォーム別の成人コンテンツフィルタ（app=非表示, web=表示）
- 視聴数のカウント

### 4. 動画一覧
- 新着順で動画リストを表示
- サムネイル、タイトル、投稿者、視聴数の表示

### 5. STUDIOとの連携
- IPライセンス情報の参照
- 視聴数・収益情報の送信

---

## 後回しにする機能
以下は必要になったら追加する：
- コメント機能
- いいね/評価
- チャンネル登録
- レコメンド
- 再生リスト
- 通知
- ライブ配信
- 高度な検索

---

## データ構造（最小限）

### videos テーブル
```sql
id: uuid (primary key)
user_id: uuid (投稿者)
title: text (タイトル)
description: text (説明文)
video_url: text (Bunny.net URL)
thumbnail_url: text (サムネイル URL)
ip_license_id: uuid (STUDIO側のIPライセンスID)
is_adult: boolean (成人向けフラグ)
view_count: integer (視聴数)
created_at: timestamp
```

### video_views テーブル（収益記録用）
```sql
id: uuid (primary key)
video_id: uuid (動画ID)
user_id: uuid (視聴者、nullなら未ログイン)
ip_license_id: uuid (収益分配先のIP)
viewed_at: timestamp
```

---

## 技術スタック
- フロント：Expo (React Native) - iOS/Android/Web共通
- バックエンド：Node.js (TypeScript, Express/Fastify)
- DB/認証：Supabase (PostgreSQL + Auth)
- 動画ストレージ：Bunny.net
- デプロイ：EAS Build, Vercel, Render

---

**MICHE VIDEO = IPを使った動画の投稿・視聴・収益分配を担うシンプルな動画プラットフォーム。**

まずは動くものを作る。拡張は後で考える。
