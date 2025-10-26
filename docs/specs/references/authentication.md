# Authentication Reference

## Overview

This document provides comprehensive details on authentication mechanisms, JWT structure, session management, password policies, and security measures across the video platform.

**Authentication Methods**: 3 (Email/Password, OAuth, Refresh Token)
**Security Features**: JWT, bcrypt, rate limiting, session management

---

## 1. Authentication Methods

### 1.1 Email/Password Authentication

**Registration Flow**:
```
1. Client sends POST /api/auth/register
   {
     "email": "user@example.com",
     "password": "securePassword123",
     "name": "User Name"
   }

2. Server validates:
   - Email format (RFC 5322)
   - Email uniqueness
   - Password strength (8-64 characters)
   - Name length (2-50 characters)

3. Server creates:
   - User record with hashed password (bcrypt cost 12)
   - Email verification token (24h expiry)

4. Server sends verification email

5. Server returns:
   {
     "user": {
       "id": "usr_123",
       "email": "user@example.com",
       "name": "User Name",
       "email_verified": false,
       "role": "user"
     },
     "access_token": "eyJhbGc...",
     "refresh_token": "rt_abc123...",
     "expires_in": 86400
   }
```

**Login Flow**:
```
1. Client sends POST /api/auth/login
   {
     "email": "user@example.com",
     "password": "securePassword123",
     "device_id": "dev_abc123" // optional
   }

2. Server validates:
   - Email exists
   - Password matches (bcrypt verify)
   - Account not banned
   - Rate limit not exceeded (5 attempts per 15 min)

3. Server creates:
   - Access token (JWT, 24h expiry)
   - Refresh token (SHA-256 hashed, 30d expiry)
   - Session record (device tracking)

4. Server returns:
   {
     "user": {
       "id": "usr_123",
       "email": "user@example.com",
       "name": "User Name",
       "role": "user",
       "plan": "free",
       "email_verified": true
     },
     "access_token": "eyJhbGc...",
     "refresh_token": "rt_abc123...",
     "expires_in": 86400
   }
```

### 1.2 OAuth Authentication

**Supported Providers**:
- Google OAuth 2.0
- Apple Sign In
- Twitter OAuth 2.0

**OAuth Flow** (Google Example):
```
1. Client redirects to Google OAuth:
   GET https://accounts.google.com/o/oauth2/v2/auth?
     client_id=CLIENT_ID&
     redirect_uri=REDIRECT_URI&
     response_type=code&
     scope=email profile

2. User authorizes on Google

3. Google redirects back with authorization code:
   GET https://platform.com/auth/callback?code=AUTH_CODE

4. Server exchanges code for tokens:
   POST https://oauth2.googleapis.com/token
   {
     "code": "AUTH_CODE",
     "client_id": "CLIENT_ID",
     "client_secret": "CLIENT_SECRET",
     "redirect_uri": "REDIRECT_URI",
     "grant_type": "authorization_code"
   }

5. Server fetches user profile:
   GET https://www.googleapis.com/oauth2/v2/userinfo
   Authorization: Bearer GOOGLE_ACCESS_TOKEN

6. Server creates or updates user:
   - If email exists: Link OAuth account
   - If new: Create user account (email pre-verified)

7. Server returns platform tokens (same as email/password login)
```

**OAuth Account Linking**:
- Multiple OAuth providers can link to one account
- Email must match for auto-linking
- Manual linking requires password confirmation
- Unlinking requires at least one auth method remains

### 1.3 Refresh Token Flow

**Token Refresh**:
```
1. Client detects access token expiration (401 with token_expired)

2. Client sends POST /api/auth/refresh
   {
     "refresh_token": "rt_abc123..."
   }

3. Server validates:
   - Refresh token exists in database (hashed)
   - Token not expired (<30 days old)
   - Token not revoked
   - Associated user not banned

4. Server creates:
   - New access token (24h expiry)
   - New refresh token (30d expiry)
   - Revokes old refresh token

5. Server returns:
   {
     "access_token": "eyJhbGc...",
     "refresh_token": "rt_xyz789...",
     "expires_in": 86400
   }
```

**Automatic Retry Logic** (Client-Side):
```javascript
async function apiRequest(url, options) {
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (response.status === 401) {
    const error = await response.json();
    if (error.error === 'token_expired') {
      // Attempt token refresh
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry original request with new token
        response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${newAccessToken}`
          }
        });
      } else {
        // Refresh failed, redirect to login
        redirectToLogin();
      }
    }
  }

  return response;
}
```

---

## 2. JWT Structure

### 2.1 Access Token (JWT)

**Header**:
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload**:
```json
{
  "sub": "usr_123",
  "email": "user@example.com",
  "name": "User Name",
  "role": "user",
  "plat": "general",
  "plan_id": "free",
  "has_adult_access": false,
  "iat": 1642435200,
  "exp": 1642521600
}
```

**Claims Explanation**:
- `sub`: User ID (subject)
- `email`: User email address
- `name`: User display name
- `role`: User role (`user`, `creator`, `admin`)
- **`plat`**: Platform claim - **REQUIRED** (`"general"` | `"adult"`) - Used for PostgreSQL RLS enforcement
- `plan_id`: Current subscription plan (`free`, `premium`, `premium_plus`)
- `has_adult_access`: Boolean, true if Premium+ and age verified
- `iat`: Issued at timestamp (Unix epoch)
- `exp`: Expiration timestamp (Unix epoch, iat + 24 hours)

**Signature**:
```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  SECRET_KEY
)
```

**Environment Variables**:
- `JWT_SECRET`: 256-bit secret key (stored in environment)
- `JWT_EXPIRY`: 86400 (24 hours in seconds)

### 2.2 Refresh Token

**Format**: Opaque token (not JWT)
```
rt_abc123def456ghi789...
```

**Properties**:
- Prefix: `rt_` (refresh token identifier)
- Length: 64 characters (random alphanumeric)
- Storage: Database (SHA-256 hashed)
- Expiry: 30 days from issue
- Single-use: Revoked after successful refresh

**Database Schema** (from refresh_tokens table):
```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  token_hash VARCHAR(64) NOT NULL, -- SHA-256 hash
  device_id VARCHAR(255),
  device_name VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  INDEX idx_token_hash (token_hash),
  INDEX idx_user_id (user_id)
);
```

---

## 3. Password Security

### 3.1 Password Requirements

**Validation Rules**:
- Minimum length: 8 characters
- Maximum length: 64 characters
- No specific complexity requirements (to allow passphrases)
- No common passwords (checked against top 10,000 list)
- No email substring in password

**Rejected Passwords**:
```
- "password"
- "12345678"
- "qwerty123"
- "user@example" (contains email substring)
```

### 3.2 Password Hashing

**Algorithm**: bcrypt
**Cost Factor**: 12 (2^12 = 4096 iterations)

**Hash Generation**:
```javascript
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

async function hashPassword(plainPassword) {
  const hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
  return hash; // e.g., $2b$12$KIXxLVE7w...
}
```

**Hash Verification**:
```javascript
async function verifyPassword(plainPassword, hash) {
  const isValid = await bcrypt.compare(plainPassword, hash);
  return isValid;
}
```

**Why bcrypt?**:
- Adaptive: Cost factor can increase as hardware improves
- Salt built-in: Automatic per-password salt generation
- Slow: Prevents brute-force attacks
- Industry standard: Well-tested and widely adopted

### 3.3 Password Reset Flow

**Request Reset**:
```
1. Client sends POST /api/auth/request-password-reset
   {
     "email": "user@example.com"
   }

2. Server validates:
   - Email exists
   - Rate limit (3 requests per hour)

3. Server creates:
   - Password reset token (64-char random)
   - Token expiry (1 hour)
   - Stores hashed token in database

4. Server sends email:
   Subject: パスワード再設定のご案内
   Body: https://platform.com/reset-password?token=TOKEN

5. Server returns:
   {
     "message": "パスワード再設定メールを送信しました"
   }
   // Always returns success (prevent email enumeration)
```

**Reset Password**:
```
1. Client sends POST /api/auth/reset-password
   {
     "token": "reset_token_123...",
     "new_password": "newSecurePassword123"
   }

2. Server validates:
   - Token exists and not expired (<1h old)
   - Token not already used
   - New password meets requirements
   - New password different from old password

3. Server updates:
   - User password (new hash)
   - Revokes all refresh tokens (force re-login all devices)
   - Marks reset token as used

4. Server returns:
   {
     "message": "パスワードを再設定しました"
   }
```

### 3.4 Password Change Flow

**Change Password** (Authenticated):
```
1. Client sends POST /api/auth/change-password
   Authorization: Bearer ACCESS_TOKEN
   {
     "current_password": "oldPassword123",
     "new_password": "newPassword456"
   }

2. Server validates:
   - Current password correct
   - New password meets requirements
   - New password different from current

3. Server updates:
   - User password
   - Keeps current session active
   - Revokes other sessions (optional, user preference)

4. Server returns:
   {
     "message": "パスワードを変更しました"
   }
```

---

## 4. Session Management

### 4.1 Session Tracking

**Session Record**:
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  refresh_token_id UUID REFERENCES refresh_tokens(id),
  device_id VARCHAR(255),
  device_name VARCHAR(255),
  device_type VARCHAR(50), -- 'web', 'ios', 'android'
  ip_address INET,
  user_agent TEXT,
  last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_last_active (last_active_at)
);
```

**Session Limits**:
- Maximum concurrent sessions: 5 per user
- Session timeout: 30 days of inactivity
- Automatic cleanup: Sessions inactive >30 days deleted daily

**Session Creation**:
```javascript
async function createSession(userId, deviceInfo, ipAddress) {
  // Check session count
  const sessionCount = await db.query(
    'SELECT COUNT(*) FROM sessions WHERE user_id = $1',
    [userId]
  );

  if (sessionCount >= 5) {
    // Revoke oldest session
    await db.query(
      'DELETE FROM sessions WHERE user_id = $1 ORDER BY last_active_at ASC LIMIT 1',
      [userId]
    );
  }

  // Create new session
  const session = await db.query(
    'INSERT INTO sessions (user_id, device_id, device_name, device_type, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [userId, deviceInfo.id, deviceInfo.name, deviceInfo.type, ipAddress, deviceInfo.userAgent]
  );

  return session;
}
```

### 4.2 Device Tracking

**Device Information**:
```json
{
  "device_id": "dev_abc123",
  "device_name": "iPhone 13 Pro",
  "device_type": "ios",
  "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
  "ip_address": "192.168.1.100"
}
```

**Device ID Generation**:
- Web: Browser fingerprint + localStorage UUID
- Mobile: Device UUID (iOS: identifierForVendor, Android: ANDROID_ID)
- Consistent across app reinstalls (mobile)
- Persistent in localStorage (web)

### 4.3 Session Management UI

**Active Sessions List**:
```
GET /api/auth/sessions
Authorization: Bearer ACCESS_TOKEN

Response:
{
  "sessions": [
    {
      "id": "sess_123",
      "device_name": "iPhone 13 Pro",
      "device_type": "ios",
      "ip_address": "192.168.1.100",
      "location": "Tokyo, Japan",
      "last_active_at": "2025-01-15T10:30:00Z",
      "is_current": true
    },
    {
      "id": "sess_456",
      "device_name": "Chrome on Windows",
      "device_type": "web",
      "ip_address": "192.168.1.101",
      "location": "Tokyo, Japan",
      "last_active_at": "2025-01-14T08:20:00Z",
      "is_current": false
    }
  ]
}
```

**Revoke Session**:
```
DELETE /api/auth/sessions/:session_id
Authorization: Bearer ACCESS_TOKEN

Response:
{
  "message": "セッションを終了しました"
}
```

**Revoke All Other Sessions**:
```
POST /api/auth/logout-all-devices
Authorization: Bearer ACCESS_TOKEN

Response:
{
  "message": "他のすべてのデバイスからログアウトしました"
}
```

---

## 5. Authorization & Permissions

### 5.1 Role-Based Access Control (RBAC)

**Roles**:
- `user`: Default role, basic access
- `creator`: Content creation access
- `admin`: Full platform access

**Middleware Implementation (Fastify)**:
```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

interface JWTPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  plat: 'general' | 'adult';  // REQUIRED for RLS
  plan_id: string;
  has_adult_access: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = request.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return reply.status(401).send({
      error: 'auth_required',
      message: '認証が必要です'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // Validate plat claim (REQUIRED)
    if (!decoded.plat || !['general', 'adult'].includes(decoded.plat)) {
      return reply.status(401).send({
        error: 'invalid_token',
        message: 'Platform claim is missing or invalid'
      });
    }

    request.user = decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return reply.status(401).send({
        error: 'token_expired',
        message: 'トークンの有効期限が切れました'
      });
    }
    return reply.status(401).send({
      error: 'invalid_token',
      message: 'トークンが無効です'
    });
  }
}

function requireRole(role: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'auth_required' });
    }

    if (request.user.role !== role && request.user.role !== 'admin') {
      return reply.status(403).send({
        error: 'insufficient_permissions',
        message: 'この操作を実行する権限がありません',
        details: {
          required_role: role,
          current_role: request.user.role
        }
      });
    }
  };
}

function requirePlan(plan: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'auth_required' });
    }

    const planHierarchy: Record<string, number> = {
      free: 0,
      premium: 1,
      premium_plus: 2
    };
    const requiredLevel = planHierarchy[plan];
    const userLevel = planHierarchy[request.user.plan_id];

    if (userLevel < requiredLevel) {
      return reply.status(402).send({
        error: 'subscription_required',
        message: 'このコンテンツを視聴するにはサブスクリプションが必要です',
        details: {
          required_plan: plan,
          current_plan: request.user.plan_id
        }
      });
    }
  };
}

// Usage in Fastify:
// app.get('/api/protected', {
//   preHandler: [requireAuth, requirePlan('premium')]
// }, handler);
```

**Usage**:
```javascript
// Requires authentication
app.get('/api/videos/my-videos', requireAuth, getMyVideos);

// Requires creator role
app.post('/api/videos/create', requireAuth, requireRole('creator'), createVideo);

// Requires Premium+ plan
app.get('/api/netflix/:id', requireAuth, requirePlan('premium_plus'), getNetflixContent);
```

### 5.2 Content Ownership

**Ownership Check**:
```javascript
async function requireOwnership(req, res, next) {
  const contentId = req.params.id;
  const userId = req.user.sub;

  const content = await db.query(
    'SELECT user_id FROM videos WHERE id = $1',
    [contentId]
  );

  if (!content || content.user_id !== userId) {
    return res.status(403).json({
      error: 'content_not_owned',
      message: 'このコンテンツを編集する権限がありません'
    });
  }

  req.content = content;
  next();
}

// Usage
app.patch('/api/videos/:id', requireAuth, requireOwnership, updateVideo);
```

---

## 6. Security Measures

### 6.1 Rate Limiting

**Implementation** (Redis-based):
```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function rateLimiter(key, limit, window) {
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, window);
  }

  if (current > limit) {
    const ttl = await redis.ttl(key);
    throw {
      status: 429,
      error: 'rate_limit_exceeded',
      message: 'リクエスト数が上限を超えました',
      retry_after: ttl
    };
  }

  return current;
}

// Middleware
function rateLimit(limit, window) {
  return async (req, res, next) => {
    const key = `rate_limit:${req.ip}:${req.path}`;

    try {
      await rateLimiter(key, limit, window);
      next();
    } catch (error) {
      res.status(error.status).json(error);
    }
  };
}

// Usage
app.post('/api/auth/login', rateLimit(5, 900), login); // 5 per 15 minutes
```

### 6.2 CSRF Protection

**Token Generation**:
```javascript
const crypto = require('crypto');

function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Store in session
req.session.csrfToken = generateCSRFToken();
```

**Token Validation**:
```javascript
function validateCSRF(req, res, next) {
  const token = req.headers['x-csrf-token'];
  const sessionToken = req.session.csrfToken;

  if (!token || token !== sessionToken) {
    return res.status(403).json({
      error: 'invalid_csrf_token',
      message: 'CSRF token validation failed'
    });
  }

  next();
}

// Usage (for state-changing operations)
app.post('/api/videos/create', requireAuth, validateCSRF, createVideo);
```

### 6.3 XSS Prevention

**Input Sanitization**:
```javascript
const xss = require('xss');

function sanitizeInput(input) {
  return xss(input, {
    whiteList: {
      b: [], i: [], u: [], a: ['href'], br: []
    },
    stripIgnoreTag: true
  });
}

// Sanitize user input
const sanitizedTitle = sanitizeInput(req.body.title);
```

**Output Encoding**:
- Server: Send `Content-Type: application/json` header
- Client: React automatically escapes JSX content
- HTML contexts: Use `DOMPurify` for rich text

### 6.4 SQL Injection Prevention

**Parameterized Queries**:
```javascript
// SAFE: Parameterized query
const result = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

// UNSAFE: String concatenation (NEVER DO THIS)
const result = await db.query(
  `SELECT * FROM users WHERE email = '${email}'`
);
```

**ORM Usage** (Prisma):
```javascript
const user = await prisma.user.findUnique({
  where: { email: email }
});
```

---

## 7. Email Verification

### 7.1 Verification Flow

**Send Verification Email**:
```
1. Server generates verification token (64-char random)
2. Server stores hashed token in database (24h expiry)
3. Server sends email:
   Subject: メールアドレスの確認
   Body: https://platform.com/verify-email?token=TOKEN
```

**Verify Email**:
```
1. Client sends GET /api/auth/verify-email?token=TOKEN

2. Server validates:
   - Token exists and not expired
   - Token not already used

3. Server updates:
   - User.email_verified = true
   - Marks token as used

4. Server redirects to login page with success message
```

### 7.2 Resend Verification

```
POST /api/auth/resend-verification
Authorization: Bearer ACCESS_TOKEN

Response:
{
  "message": "確認メールを再送信しました"
}
```

**Rate Limit**: 3 emails per hour

---

## 8. Two-Factor Authentication (Future Enhancement)

### 8.1 TOTP (Time-Based One-Time Password)

**Setup Flow** (Not yet implemented):
```
1. User enables 2FA in settings
2. Server generates TOTP secret
3. Server returns QR code (otpauth://totp/...)
4. User scans QR with authenticator app
5. User enters 6-digit code to confirm
6. Server verifies code and enables 2FA
7. Server generates backup codes (10 codes)
```

**Login with 2FA**:
```
1. User enters email/password
2. Server validates credentials
3. Server returns { requires_2fa: true, temp_token: "..." }
4. User enters 6-digit code
5. Server validates TOTP code
6. Server returns access + refresh tokens
```

---

## Related Documents

- `specs/references/api-endpoints.md` - Authentication endpoints
- `specs/references/error-codes.md` - Authentication error codes
- `specs/references/business-rules.md` - Session limits and policies
- `specs/features/01-authentication.md` - Authentication feature spec
- `specs/references/data-models.md` - Users, sessions, refresh_tokens tables
