# CLAUDE.md

Video Platform - Monorepo (Frontend + Backend)

---

## Quick Start

```bash
# Frontend (Expo Router - iOS/Android/Web)
cd frontend
npm run web      # Web dev server (localhost:3000)
npm run ios      # iOS simulator
npm run android  # Android emulator

# Backend (Fastify API)
cd backend
npm run dev      # API server (localhost:4000)
npm test         # Run tests
```

---

## Frontend Architecture

### Tech Stack
- **Expo Router** (file-based routing, iOS/Android/Web unified)
- **TypeScript 5.x**
- **React Native**

### Key Patterns

**1. Routing**: `app/` directory = routes
```
app/(tabs)/videos.tsx    → /videos
app/video/[id].tsx       → /video/:id
app/creation/index.tsx   → /creation
```

**2. Platform-Specific Adult Content**
```typescript
import { canShowAdultContent } from '@/constants/Platform';
// Web: true (shows 18+ badge)
// iOS/Android: false (filters out completely)
```

**3. Responsive Design**
```typescript
const { width } = useWindowDimensions();
const isMobile = width < 768;
```

**4. Mock API** (現在)
- `utils/mockApi.ts` で実装
- Backend実装後、同じインターフェースで置き換え

**詳細**: `frontend/` 内のコード、特に `app/`, `components/`, `constants/`

---

## Backend Architecture

### Tech Stack
- **Fastify 4.x** (⚠️ **Express使用禁止**)
- **TypeScript 5.x**
- **Prisma** (PostgreSQL ORM)
- **InversifyJS** (DI Container)
- **Redis** (Cache)

### V2 Clean Architecture (4層)

```
backend/src/
├── interface/        # HTTP層 (Fastify controllers) - MODULE横断
├── application/      # Use cases層 - MODULE横断
├── modules/          # 機能モジュール
│   ├── auth/
│   │   ├── domain/          # ビジネスロジック
│   │   └── infrastructure/  # DB, 外部API
│   ├── video/
│   ├── subscription/
│   └── ...
└── shared/           # 共通ユーティリティ
```

**重要**:
- `interface/`, `application/` は **module外** (複数モジュールを横断)
- 各moduleは `domain/`, `infrastructure/` のみ
- DI Container (InversifyJS) から依存性注入

### TDD Workflow

**必須**: 実装前にテストを確認→実装→テスト通過→次へ

```bash
# 1. テスト確認
npm test -- tests/unit/auth/password-hash.test.ts

# 2. 実装
vim src/modules/auth/domain/password.ts

# 3. テスト実行
npm test -- password-hash.test.ts

# 4. 通過したら次のテストへ
```

**テストが通るまで次の実装に進まない**

### Implementation Rules

1. **Fastify必須**: Express記法禁止
   ```typescript
   // ❌ Express
   app.get('/api', (req, res) => res.json())

   // ✅ Fastify
   fastify.get('/api', async (request, reply) => reply.send())
   ```

2. **JWT plat claim必須**: RLS用
   ```typescript
   { sub: string, role: string, plat: 'general' | 'adult' }
   ```

3. **DI Container使用**
   ```typescript
   @injectable()
   class AuthService {
     constructor(@inject(TYPES.UserRepository) private repo: IUserRepository) {}
   }
   ```

4. **レイヤー責務厳守**
   - Interface: HTTP入出力のみ
   - Application: ユースケース調整
   - Domain: ビジネスロジック
   - Infrastructure: DB/外部サービス

**詳細**: `backend/README.md`, `backend/src/`

---

## Documentation

### Specifications
- `docs/specs/features/` - 14機能の詳細仕様
- `docs/specs/architecture/` - アーキテクチャ、スタック、セキュリティ
- `docs/specs/references/` - API、データモデル、認証、決済

### Implementation
- `docs/implementation/IMPLEMENTATION-PLAN-OVERVIEW.md` - MVP/Stretch Goals
- `docs/tests/` - テスト戦略（14機能）

### Backend Tests
- `backend/tests/` - 実装済みテストスイート
- `backend/TEST-FILES-SUMMARY.md` - テスト一覧

---

## Critical Rules

### MVP優先
- MVP機能のみ実装 (Stretch Goalsは条件付き)
- `docs/implementation/` で確認

### 外部サービス
- **Stripe** (MVP) / **CCBill** (Stretch Goal 4のみ)
- **AWS**: S3, CloudFront, MediaConvert
- **PostgreSQL 15** + **Redis 7**

### 禁止事項
- ❌ Express使用
- ❌ JWT plat claim未設定
- ❌ テスト未通過で次実装
- ❌ ドキュメント未確認の実装

### テストカバレッジ
- 目標: **>80%**
- Unit + Integration + E2E すべて実施

---

## Workflow

1. 仕様確認: `docs/specs/features/{feature}.md`
2. テスト確認: `backend/tests/{unit|integration|e2e}/{feature}/`
3. 実装: `backend/src/modules/{feature}/`
4. テスト実行: `npm test -- {feature}`
5. ✅ 通過 → 次へ / ❌ 失敗 → 修正

**原則**: Red (fail) → Green (pass) → Refactor → Next

---

## Implementation Process Rules

### 必須ルール（絶対厳守）

1. **実装計画に従うこと**
   - `docs/implementation/IMPLEMENTATION-PLAN-OVERVIEW.md` に従って進める
   - ユーザーに選択肢を聞かない
   - 実装計画の順序を守る

2. **適宜進捗を記録すること**
   - `docs/implementation/PROGRESS.md` を定期的に更新
   - 完了したタスクをマーク
   - 次のタスクを明確化

3. **適宜Gitコミットすること**
   - 機能単位でコミット
   - 意味のあるコミットメッセージ
   - 実装完了後に報告

4. **完了してから報告すること**
   - 途中で質問しない
   - 完了後にまとめて報告
   - エラーは自己解決を試みる

---

**Last Updated**: 2025-10-27
