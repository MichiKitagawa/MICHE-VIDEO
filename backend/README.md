# Video Platform Backend

## Overview

This is the backend API for the video streaming platform, built with Test-Driven Development (TDD) principles.

## Project Status

✅ **Phase 1 (85% Complete)**: Foundation & Authentication
- ✅ Project structure & test suite
- ✅ Domain layer (Password, JWT, Validation)
- ✅ Infrastructure layer (Repositories)
- ✅ Application layer (Auth Service)
- ✅ Interface layer (Controllers & Routes)
- ✅ DI Container (InversifyJS)
- ✅ Fastify server setup
- ⏳ Database setup & Integration tests

⏳ **Phase 2**: Content Delivery
⏳ **Phase 3**: Integration with frontend and deployment

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # E2E tests only

# Run with coverage
npm run test:coverage

# Development mode
npm run dev
```

## Architecture

This project follows **V2 Clean Architecture** with:
- **Interface Layer**: HTTP controllers (Fastify)
- **Application Layer**: Use cases and business logic
- **Domain Layer**: Entities and domain logic
- **Infrastructure Layer**: Database, external services

## Technology Stack

### Core
- **Runtime**: Node.js 20+
- **Language**: TypeScript 5+
- **Framework**: Fastify
- **DI Container**: InversifyJS

### Database & Cache
- **Database**: PostgreSQL 15+
- **ORM**: Prisma
- **Cache**: Redis

### Authentication
- **Password**: bcrypt
- **Tokens**: JWT (jsonwebtoken)

### Payment
- **Standard**: Stripe
- **Adult Content**: CCBill

### Storage
- **Video**: AWS S3
- **Email**: AWS SES

### Testing
- **Unit/Integration**: Jest + ts-jest
- **API Testing**: Supertest
- **E2E**: Playwright
- **Mocking**: nock, aws-sdk-mock

## Test Suite

**Total Tests**: ~218 across 16 test files

### Coverage by Feature

#### ✅ Authentication (Complete)
- 4 unit test files (password, JWT, validation)
- 6 integration test files (all 9 API endpoints)
- 2 E2E test files (user flows)
- **Total**: ~144 tests

#### ✅ Subscription (Partial)
- 2 unit test files (proration, webhooks)
- 2 integration test files (plans, checkout)
- **Total**: ~55 tests

#### ⏳ Remaining Features
- Content Delivery
- Video Management
- Video Playback
- Short-form Content
- Live Streaming
- Monetization
- Social Features
- Playlists
- Search/Recommendations
- Channel Management
- Netflix Content

### Test Commands

```bash
# All tests
npm test

# Watch mode (auto-rerun on changes)
npm run test:watch

# Coverage report
npm run test:coverage

# Specific file
npm test -- tests/unit/auth/password-hash.test.ts

# Specific pattern
npm test -- --testNamePattern="should hash password"
```

## Environment Setup

### 1. Create Test Environment

```bash
# Copy example environment
cp .env.test .env.local

# Update with your values
# - Database connection
# - Redis connection
# - Stripe test keys
# - AWS credentials
```

### 2. Database Setup

```bash
# Create test database
createdb video_platform_test

# Create development database
createdb video_platform_dev

# Run migrations (when schema is ready)
npx prisma migrate dev
```

### 3. Redis Setup

```bash
# Start Redis (macOS with Homebrew)
brew services start redis

# Or with Docker
docker run -d -p 6379:6379 redis:alpine
```

## API Endpoints

### Health Check
- `GET /health` - Server health check

### Authentication (Implemented ✅)
- `POST /api/auth/register` - Register new user ✅
- `POST /api/auth/login` - Login user ✅
- `POST /api/auth/refresh` - Refresh access token ✅
- `POST /api/auth/logout` - Logout user ✅
- `GET /api/auth/me` - Get current user ✅
- `PATCH /api/auth/profile` - Update profile ✅
- `PATCH /api/auth/change-password` - Change password ✅
- `POST /api/auth/request-password-reset` - Request password reset (Pending)
- `POST /api/auth/reset-password` - Reset password (Pending)

### Subscriptions
- `GET /api/subscriptions/plans` - List all plans
- `POST /api/subscriptions/create-checkout` - Create Stripe checkout
- `POST /api/subscriptions/create-ccbill-checkout` - Create CCBill checkout
- `POST /api/subscriptions/change-plan` - Change subscription plan
- `POST /api/subscriptions/cancel` - Cancel subscription
- `POST /webhooks/stripe` - Stripe webhook handler
- `POST /webhooks/ccbill` - CCBill webhook handler

## Architecture

### V2 Clean Architecture

```
src/
├── modules/              # Feature modules
│   └── auth/
│       ├── domain/       # Business logic (password, jwt)
│       └── infrastructure/  # Data access (repositories)
├── application/          # Use cases (services)
├── interface/            # HTTP layer (controllers, routes)
├── shared/               # Shared utilities
│   ├── types/           # TypeScript types & DI symbols
│   ├── utils/           # Validation utilities
│   └── infrastructure/  # Redis, etc.
└── container.ts          # DI container configuration
```

### Technology Stack

- **Framework**: Fastify 4.x
- **DI**: InversifyJS
- **ORM**: Prisma
- **Database**: PostgreSQL 15+
- **Cache**: Redis 7+
- **Auth**: bcrypt + JWT
- **Testing**: Jest + Supertest + Playwright

## Development Workflow

### TDD Cycle

1. **Red**: Write failing test ✅
2. **Green**: Write minimal code to pass ✅
3. **Refactor**: Improve code quality ✅

### Example

```bash
# 1. Write test
vim tests/unit/auth/password-hash.test.ts

# 2. Run test (should fail)
npm test -- password-hash.test.ts

# 3. Implement feature
vim src/modules/auth/domain/password.ts

# 4. Run test (should pass)
npm test -- password-hash.test.ts

# 5. Refactor if needed
```

## Code Quality

### Linting

```bash
# Check code style
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### Formatting

```bash
# Format all files
npm run format
```

### Pre-commit Hooks

Husky runs automatically before commits:
- Linting
- Type checking
- Tests (unit only for speed)

## Project Structure

```
backend/
├── package.json              # Dependencies
├── tsconfig.json            # TypeScript config
├── jest.config.js           # Jest config
├── .env.test                # Test environment
├── README.md                # This file
├── TEST-FILES-SUMMARY.md    # Detailed test documentation
│
├── src/                     # Source code (to be implemented)
│   ├── interface/           # HTTP controllers
│   │   └── http/
│   │       └── controllers/
│   ├── application/         # Use cases
│   │   └── services/
│   ├── modules/             # Feature modules
│   │   ├── auth/
│   │   │   ├── domain/
│   │   │   └── infrastructure/
│   │   ├── subscription/
│   │   │   ├── domain/
│   │   │   └── infrastructure/
│   │   └── ...
│   ├── shared/              # Shared utilities
│   │   ├── types/
│   │   └── utils/
│   ├── container.ts         # DI container
│   ├── app.ts              # Fastify app
│   └── server.ts           # Server entry point
│
└── tests/                   # Test suite ✅
    ├── setup.ts            # Global test setup
    ├── fixtures/           # Test data
    │   ├── users.ts
    │   └── subscriptions.ts
    ├── helpers/            # Test utilities
    │   ├── auth-helper.ts
    │   └── stripe-helper.ts
    ├── unit/               # Unit tests
    │   ├── auth/
    │   └── subscription/
    ├── integration/        # Integration tests
    │   ├── auth/
    │   └── subscription/
    └── e2e/               # End-to-end tests
        └── auth/
```

## Contributing

### Adding New Tests

1. Create test file in appropriate directory:
   - `tests/unit/` for pure functions
   - `tests/integration/` for API endpoints
   - `tests/e2e/` for user flows

2. Follow naming convention:
   - Unit: `function-name.test.ts`
   - Integration: `endpoint-name.test.ts`
   - E2E: `flow-name.test.ts`

3. Use AAA pattern:
   ```typescript
   it('should do something', () => {
     // Arrange
     const input = 'test';

     // Act
     const result = doSomething(input);

     // Assert
     expect(result).toBe('expected');
   });
   ```

4. Run tests before committing:
   ```bash
   npm test
   ```

### Adding New Features

1. Write tests first (TDD)
2. Implement minimal code to pass
3. Refactor for quality
4. Update documentation
5. Ensure coverage > 80%

## Troubleshooting

### Tests Failing

```bash
# Clear Jest cache
npm test -- --clearCache

# Run with verbose output
npm test -- --verbose

# Run single test for debugging
npm test -- --testNamePattern="specific test name"
```

### Database Issues

```bash
# Reset test database
dropdb video_platform_test && createdb video_platform_test
npx prisma migrate reset
```

### Redis Issues

```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Clear Redis cache
redis-cli FLUSHALL
```

## Documentation

- **Test Specifications**: `/docs/tests/`
- **Feature Specifications**: `/docs/specs/features/`
- **Implementation Plan**: `/docs/implementation/`
- **Test Summary**: `TEST-FILES-SUMMARY.md`

## Security

### Best Practices

- ✅ Passwords hashed with bcrypt (cost 12)
- ✅ JWT with short expiration (15 min access, 30 day refresh)
- ✅ Rate limiting on authentication endpoints
- ✅ XSS prevention (input sanitization)
- ✅ SQL injection prevention (parameterized queries)
- ✅ CSRF protection
- ✅ Webhook signature verification

### Environment Variables

Never commit:
- Database credentials
- JWT secrets
- API keys (Stripe, CCBill, AWS)
- Webhook secrets

## Performance

### Targets

- API Response: < 200ms (P95)
- Database Queries: < 50ms
- Test Execution: < 30s (unit), < 2min (integration)

### Optimization

- Database indexing
- Redis caching
- Connection pooling
- Query optimization

## Deployment

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- PM2 or similar process manager

### Build

```bash
npm run build
```

### Start

```bash
npm start
```

### Health Check

```bash
curl http://localhost:3000/health
```

## License

Proprietary - All rights reserved

## Contact

For questions or issues, please contact the development team.

---

**Last Updated**: 2025-10-26
**Version**: 1.0.0
**Status**: Tests Complete, Implementation Pending
