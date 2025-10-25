# Error Codes Reference

## Overview

This document provides a comprehensive reference for all error codes used across the video platform. Each error code includes HTTP status codes, error messages (Japanese), handling strategies, and common scenarios.

**Total Error Categories**: 12 categories
**Total Unique Error Codes**: 50+ codes

---

## HTTP Status Code Summary

### Success Codes (2xx)
- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `204 No Content` - Request successful, no content returned

### Client Error Codes (4xx)
- `400 Bad Request` - Invalid request parameters or validation error
- `401 Unauthorized` - Authentication required or invalid token
- `402 Payment Required` - Subscription upgrade required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (duplicate, already exists)
- `413 Payload Too Large` - File size exceeds limit
- `415 Unsupported Media Type` - Invalid file format
- `425 Too Early` - Content still processing
- `429 Too Many Requests` - Rate limit exceeded

### Server Error Codes (5xx)
- `500 Internal Server Error` - Server error
- `502 Bad Gateway` - Gateway error
- `503 Service Unavailable` - Service temporarily unavailable

---

## 1. Authentication Errors (401, 403)

### 401 - UNAUTHORIZED

#### `auth_required`
```json
{
  "error": "auth_required",
  "message": "認証が必要です",
  "details": {
    "reason": "No authentication token provided"
  }
}
```
**Scenarios**: Accessing protected endpoint without token
**Handling**: Redirect to login page, clear local storage

#### `invalid_token`
```json
{
  "error": "invalid_token",
  "message": "トークンが無効です",
  "details": {
    "reason": "Token signature verification failed"
  }
}
```
**Scenarios**: Tampered JWT, wrong secret key
**Handling**: Clear token, redirect to login

#### `token_expired`
```json
{
  "error": "token_expired",
  "message": "トークンの有効期限が切れました",
  "details": {
    "expired_at": "2025-01-15T10:30:00Z"
  }
}
```
**Scenarios**: Access token expired (>24h old)
**Handling**: Attempt refresh token flow, fallback to login

#### `invalid_credentials`
```json
{
  "error": "invalid_credentials",
  "message": "メールアドレスまたはパスワードが正しくありません",
  "details": {
    "field": "email_or_password"
  }
}
```
**Scenarios**: Wrong email/password combination
**Handling**: Show error message, allow retry (max 5 attempts)

#### `account_disabled`
```json
{
  "error": "account_disabled",
  "message": "このアカウントは無効化されています",
  "details": {
    "reason": "Account suspended for policy violation"
  }
}
```
**Scenarios**: Banned account, policy violation
**Handling**: Show contact support message

#### `session_limit_exceeded`
```json
{
  "error": "session_limit_exceeded",
  "message": "同時セッション数の上限に達しました",
  "details": {
    "max_sessions": 5,
    "current_sessions": 5
  }
}
```
**Scenarios**: User has 5 active sessions
**Handling**: Show active sessions list, allow user to revoke one

### 403 - FORBIDDEN

#### `insufficient_permissions`
```json
{
  "error": "insufficient_permissions",
  "message": "この操作を実行する権限がありません",
  "details": {
    "required_role": "creator",
    "current_role": "user"
  }
}
```
**Scenarios**: User trying to access creator-only features
**Handling**: Show creator application prompt

#### `content_not_owned`
```json
{
  "error": "content_not_owned",
  "message": "このコンテンツを編集する権限がありません",
  "details": {
    "content_type": "video",
    "content_id": "vid_123"
  }
}
```
**Scenarios**: Editing someone else's video
**Handling**: Show error, redirect to content view page

---

## 2. Subscription Errors (402)

### 402 - PAYMENT REQUIRED

#### `subscription_required`
```json
{
  "error": "subscription_required",
  "message": "このコンテンツを視聴するにはサブスクリプションが必要です",
  "details": {
    "required_plan": "premium",
    "current_plan": "free"
  }
}
```
**Scenarios**: Free user accessing Premium content
**Handling**: Show subscription upgrade modal

#### `subscription_expired`
```json
{
  "error": "subscription_expired",
  "message": "サブスクリプションの有効期限が切れました",
  "details": {
    "expired_at": "2025-01-10T00:00:00Z",
    "plan_id": "premium"
  }
}
```
**Scenarios**: Subscription payment failed, cancelled
**Handling**: Show renewal prompt with payment options

#### `premium_plus_required`
```json
{
  "error": "premium_plus_required",
  "message": "このコンテンツを視聴するにはPremium+プランが必要です",
  "details": {
    "content_type": "netflix_series",
    "required_plan": "premium_plus"
  }
}
```
**Scenarios**: Premium user accessing Netflix/Adult content
**Handling**: Show Premium+ upgrade modal

#### `adult_content_restricted`
```json
{
  "error": "adult_content_restricted",
  "message": "アダルトコンテンツは18歳以上のPremium+会員のみ視聴可能です",
  "details": {
    "age_verified": false,
    "plan": "premium"
  }
}
```
**Scenarios**: Underage or non-Premium+ user accessing adult content
**Handling**: Show age verification + upgrade prompt

#### `ios_adult_blocked`
```json
{
  "error": "ios_adult_blocked",
  "message": "iOSアプリではアダルトコンテンツを視聴できません",
  "details": {
    "platform": "ios",
    "content_type": "adult_video"
  }
}
```
**Scenarios**: iOS user trying to access adult content
**Handling**: Show web browser redirect link

---

## 3. Validation Errors (400)

### 400 - BAD REQUEST

#### `validation_failed`
```json
{
  "error": "validation_failed",
  "message": "入力内容に誤りがあります",
  "details": [
    {
      "field": "email",
      "message": "有効なメールアドレスを入力してください"
    },
    {
      "field": "password",
      "message": "パスワードは8文字以上である必要があります"
    }
  ]
}
```
**Scenarios**: Invalid form input
**Handling**: Show field-specific error messages

#### `invalid_email_format`
```json
{
  "error": "invalid_email_format",
  "message": "メールアドレスの形式が正しくありません",
  "details": {
    "field": "email",
    "value": "invalid@"
  }
}
```
**Scenarios**: Malformed email address
**Handling**: Show inline validation error

#### `password_too_weak`
```json
{
  "error": "password_too_weak",
  "message": "パスワードは8文字以上64文字以下である必要があります",
  "details": {
    "min_length": 8,
    "max_length": 64,
    "current_length": 6
  }
}
```
**Scenarios**: Password doesn't meet requirements
**Handling**: Show password strength indicator

#### `invalid_video_duration`
```json
{
  "error": "invalid_video_duration",
  "message": "ショート動画は60秒以内である必要があります",
  "details": {
    "max_duration": 60,
    "actual_duration": 75
  }
}
```
**Scenarios**: Short video exceeds 60 seconds
**Handling**: Show error with trimming suggestion

#### `missing_required_field`
```json
{
  "error": "missing_required_field",
  "message": "必須項目が入力されていません",
  "details": {
    "field": "title",
    "message": "タイトルを入力してください"
  }
}
```
**Scenarios**: Empty required field
**Handling**: Highlight missing field

---

## 4. Resource Errors (404, 409)

### 404 - NOT FOUND

#### `resource_not_found`
```json
{
  "error": "resource_not_found",
  "message": "リソースが見つかりません",
  "details": {
    "resource_type": "video",
    "resource_id": "vid_123"
  }
}
```
**Scenarios**: Invalid video ID, deleted content
**Handling**: Show 404 page with search suggestions

#### `user_not_found`
```json
{
  "error": "user_not_found",
  "message": "ユーザーが見つかりません",
  "details": {
    "user_id": "usr_123"
  }
}
```
**Scenarios**: Invalid user ID, deleted account
**Handling**: Redirect to homepage

#### `channel_not_found`
```json
{
  "error": "channel_not_found",
  "message": "チャンネルが見つかりません",
  "details": {
    "channel_id": "ch_123"
  }
}
```
**Scenarios**: Invalid channel ID, not a creator
**Handling**: Show creator application prompt

### 409 - CONFLICT

#### `email_already_exists`
```json
{
  "error": "email_already_exists",
  "message": "このメールアドレスは既に登録されています",
  "details": {
    "field": "email"
  }
}
```
**Scenarios**: Registration with existing email
**Handling**: Show login link instead

#### `already_subscribed`
```json
{
  "error": "already_subscribed",
  "message": "既にこのプランに登録されています",
  "details": {
    "current_plan": "premium",
    "requested_plan": "premium"
  }
}
```
**Scenarios**: Trying to subscribe to current plan
**Handling**: Redirect to subscription management

#### `already_liked`
```json
{
  "error": "already_liked",
  "message": "既にいいねしています",
  "details": {
    "content_type": "video",
    "content_id": "vid_123"
  }
}
```
**Scenarios**: Double-liking content
**Handling**: Update UI to liked state

---

## 5. File Upload Errors (413, 415, 425)

### 413 - PAYLOAD TOO LARGE

#### `file_too_large`
```json
{
  "error": "file_too_large",
  "message": "ファイルサイズが上限を超えています",
  "details": {
    "max_size_mb": 5120,
    "actual_size_mb": 6000,
    "file_type": "video"
  }
}
```
**Scenarios**: Video >5GB, Short >500MB
**Handling**: Show compression suggestions

#### `plan_storage_limit_exceeded`
```json
{
  "error": "plan_storage_limit_exceeded",
  "message": "プランのストレージ上限に達しました",
  "details": {
    "plan": "free",
    "limit_gb": 10,
    "used_gb": 9.8
  }
}
```
**Scenarios**: Free plan storage limit reached
**Handling**: Show upgrade prompt or delete old content option

### 415 - UNSUPPORTED MEDIA TYPE

#### `invalid_file_format`
```json
{
  "error": "invalid_file_format",
  "message": "対応していないファイル形式です",
  "details": {
    "allowed_formats": ["mp4", "mov", "avi"],
    "actual_format": "wmv"
  }
}
```
**Scenarios**: Unsupported video format
**Handling**: Show supported formats list

#### `invalid_image_format`
```json
{
  "error": "invalid_image_format",
  "message": "画像はJPEG、PNG、GIF形式のみ対応しています",
  "details": {
    "allowed_formats": ["jpg", "jpeg", "png", "gif"],
    "actual_format": "bmp"
  }
}
```
**Scenarios**: Unsupported thumbnail format
**Handling**: Show format conversion tool link

### 425 - TOO EARLY

#### `content_still_processing`
```json
{
  "error": "content_still_processing",
  "message": "コンテンツはまだ処理中です",
  "details": {
    "content_id": "vid_123",
    "status": "transcoding",
    "progress": 45
  }
}
```
**Scenarios**: Accessing video before transcoding completes
**Handling**: Show processing progress bar, poll for completion

---

## 6. Rate Limit Errors (429)

### 429 - TOO MANY REQUESTS

#### `rate_limit_exceeded`
```json
{
  "error": "rate_limit_exceeded",
  "message": "リクエスト数が上限を超えました。しばらくしてから再度お試しください",
  "details": {
    "limit": 100,
    "window": "1 minute",
    "retry_after": 45
  }
}
```
**Scenarios**: Exceeding endpoint rate limits
**Handling**: Show countdown timer, disable submit button

#### `too_many_login_attempts`
```json
{
  "error": "too_many_login_attempts",
  "message": "ログイン試行回数が上限を超えました。30分後に再度お試しください",
  "details": {
    "attempts": 5,
    "lockout_duration": 1800
  }
}
```
**Scenarios**: 5 failed login attempts
**Handling**: Show lockout timer, suggest password reset

#### `too_many_uploads`
```json
{
  "error": "too_many_uploads",
  "message": "アップロード回数が上限を超えました",
  "details": {
    "limit": 10,
    "window": "1 minute",
    "retry_after": 30
  }
}
```
**Scenarios**: Rapid-fire uploads
**Handling**: Queue uploads, show estimated upload time

#### `tip_rate_limit`
```json
{
  "error": "tip_rate_limit",
  "message": "投げ銭の送信回数が上限を超えました",
  "details": {
    "limit": 5,
    "window": "1 minute"
  }
}
```
**Scenarios**: Sending >5 tips per minute
**Handling**: Show cooldown timer

---

## 7. Payment Errors (400, 402, 500)

### Payment Processing

#### `payment_failed`
```json
{
  "error": "payment_failed",
  "message": "お支払い処理に失敗しました",
  "details": {
    "provider": "stripe",
    "reason": "card_declined"
  }
}
```
**Scenarios**: Card declined, insufficient funds
**Handling**: Show payment method update prompt

#### `invalid_payment_method`
```json
{
  "error": "invalid_payment_method",
  "message": "決済方法が無効です",
  "details": {
    "payment_method_id": "pm_123"
  }
}
```
**Scenarios**: Expired card, invalid payment method
**Handling**: Redirect to payment method settings

#### `insufficient_balance`
```json
{
  "error": "insufficient_balance",
  "message": "残高が不足しています",
  "details": {
    "available": 3000,
    "required": 5000
  }
}
```
**Scenarios**: Withdrawal request exceeds balance
**Handling**: Show available balance, adjust amount

#### `minimum_withdrawal_not_met`
```json
{
  "error": "minimum_withdrawal_not_met",
  "message": "最低出金額は¥5,000です",
  "details": {
    "minimum": 5000,
    "requested": 3000
  }
}
```
**Scenarios**: Withdrawal <¥5,000
**Handling**: Show minimum requirement

#### `webhook_signature_invalid`
```json
{
  "error": "webhook_signature_invalid",
  "message": "Webhook signature verification failed",
  "details": {
    "provider": "stripe"
  }
}
```
**Scenarios**: Tampered webhook, wrong secret
**Handling**: Log security alert, reject webhook

---

## 8. Content Access Errors (403, 425)

### Access Control

#### `age_verification_required`
```json
{
  "error": "age_verification_required",
  "message": "年齢確認が必要です",
  "details": {
    "content_type": "adult_video",
    "required_age": 18
  }
}
```
**Scenarios**: Accessing adult content without age verification
**Handling**: Show age verification form

#### `geo_blocked`
```json
{
  "error": "geo_blocked",
  "message": "このコンテンツはお住まいの地域では利用できません",
  "details": {
    "content_id": "netflix_123",
    "user_country": "US",
    "allowed_countries": ["JP"]
  }
}
```
**Scenarios**: IP license restrictions
**Handling**: Show unavailable message

#### `content_private`
```json
{
  "error": "content_private",
  "message": "このコンテンツは非公開です",
  "details": {
    "content_id": "vid_123",
    "visibility": "private"
  }
}
```
**Scenarios**: Accessing private video without permission
**Handling**: Show 404 or access denied page

#### `content_deleted`
```json
{
  "error": "content_deleted",
  "message": "このコンテンツは削除されました",
  "details": {
    "content_id": "vid_123",
    "deleted_at": "2025-01-15T10:00:00Z"
  }
}
```
**Scenarios**: Accessing soft-deleted content
**Handling**: Show content unavailable message

---

## 9. Live Streaming Errors (400, 403, 425)

### Streaming

#### `stream_not_active`
```json
{
  "error": "stream_not_active",
  "message": "ライブ配信は終了しました",
  "details": {
    "stream_id": "live_123",
    "status": "ended"
  }
}
```
**Scenarios**: Accessing ended live stream
**Handling**: Show replay or redirect to channel

#### `concurrent_stream_limit`
```json
{
  "error": "concurrent_stream_limit",
  "message": "同時配信数の上限に達しています",
  "details": {
    "max_concurrent": 1,
    "active_streams": 1
  }
}
```
**Scenarios**: Starting second live stream
**Handling**: Show active stream, end first option

#### `invalid_rtmp_key`
```json
{
  "error": "invalid_rtmp_key",
  "message": "RTMP配信キーが無効です",
  "details": {
    "stream_id": "live_123"
  }
}
```
**Scenarios**: Wrong RTMP stream key
**Handling**: Show correct stream key

---

## 10. Search & Discovery Errors (400)

### Search

#### `invalid_search_query`
```json
{
  "error": "invalid_search_query",
  "message": "検索クエリが無効です",
  "details": {
    "min_length": 2,
    "actual_length": 1
  }
}
```
**Scenarios**: Search query <2 characters
**Handling**: Show minimum length requirement

#### `search_service_unavailable`
```json
{
  "error": "search_service_unavailable",
  "message": "検索サービスが一時的に利用できません",
  "details": {
    "service": "elasticsearch"
  }
}
```
**Scenarios**: Elasticsearch down
**Handling**: Fallback to database search or show error

---

## 11. Social Feature Errors (400, 409)

### Social Interactions

#### `cannot_follow_self`
```json
{
  "error": "cannot_follow_self",
  "message": "自分自身をフォローすることはできません",
  "details": {
    "user_id": "usr_123"
  }
}
```
**Scenarios**: Trying to follow yourself
**Handling**: Hide follow button for own profile

#### `already_following`
```json
{
  "error": "already_following",
  "message": "既にフォローしています",
  "details": {
    "user_id": "usr_456"
  }
}
```
**Scenarios**: Double-following user
**Handling**: Update UI to following state

#### `comment_too_long`
```json
{
  "error": "comment_too_long",
  "message": "コメントは1000文字以内にしてください",
  "details": {
    "max_length": 1000,
    "actual_length": 1200
  }
}
```
**Scenarios**: Comment exceeds limit
**Handling**: Show character counter

---

## 12. Server Errors (500, 502, 503)

### 500 - INTERNAL SERVER ERROR

#### `internal_server_error`
```json
{
  "error": "internal_server_error",
  "message": "サーバーエラーが発生しました。しばらくしてから再度お試しください",
  "details": {
    "error_id": "err_abc123",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```
**Scenarios**: Uncaught exceptions, database errors
**Handling**: Log error, show generic error page with retry button

#### `database_connection_failed`
```json
{
  "error": "database_connection_failed",
  "message": "データベース接続に失敗しました",
  "details": {
    "error_id": "err_db_456"
  }
}
```
**Scenarios**: Database unreachable
**Handling**: Retry with exponential backoff, alert ops team

### 503 - SERVICE UNAVAILABLE

#### `service_maintenance`
```json
{
  "error": "service_maintenance",
  "message": "メンテナンス中です。しばらくお待ちください",
  "details": {
    "estimated_end": "2025-01-15T12:00:00Z"
  }
}
```
**Scenarios**: Scheduled maintenance
**Handling**: Show maintenance page with estimated end time

#### `service_overloaded`
```json
{
  "error": "service_overloaded",
  "message": "サーバーが混雑しています。しばらくしてから再度お試しください",
  "details": {
    "retry_after": 60
  }
}
```
**Scenarios**: High traffic, resource exhaustion
**Handling**: Show retry countdown, implement request queuing

---

## Error Handling Strategies

### Client-Side

1. **Token Expiration**
   - Detect 401 with `token_expired`
   - Attempt refresh token flow
   - If refresh fails, redirect to login
   - Clear local storage

2. **Rate Limiting**
   - Parse `retry_after` from response
   - Disable submit buttons
   - Show countdown timer
   - Queue requests

3. **Validation Errors**
   - Show field-specific errors inline
   - Prevent form submission
   - Highlight invalid fields
   - Provide clear error messages

4. **Payment Errors**
   - Retry failed payments with exponential backoff
   - Update payment method on card decline
   - Show payment history
   - Contact support for persistent issues

5. **Upload Errors**
   - Show upload progress
   - Implement chunked uploads with resume
   - Validate file before upload
   - Show compression suggestions

### Server-Side

1. **Database Errors**
   - Implement connection pooling
   - Retry transient errors (3 attempts)
   - Log all database errors
   - Return generic 500 to client

2. **External Service Failures**
   - Circuit breaker pattern
   - Graceful degradation
   - Fallback responses
   - Alert monitoring system

3. **Webhook Failures**
   - Verify signatures
   - Implement idempotency
   - Retry failed webhooks (exponential backoff)
   - Log all webhook events

4. **Rate Limiting**
   - Implement per-user, per-IP limits
   - Use Redis for distributed rate limiting
   - Return `Retry-After` header
   - Log rate limit violations

---

## Error Logging

### Log Levels

- **ERROR**: 500, 502, 503 errors
- **WARN**: 429 rate limits, 402 payment issues
- **INFO**: 401, 403 auth issues
- **DEBUG**: 400 validation errors

### Log Format

```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "level": "ERROR",
  "error_code": "internal_server_error",
  "error_id": "err_abc123",
  "user_id": "usr_123",
  "request_id": "req_xyz789",
  "endpoint": "/api/videos/create",
  "method": "POST",
  "status_code": 500,
  "message": "Database connection timeout",
  "stack_trace": "..."
}
```

---

## Related Documents

- `specs/references/api-endpoints.md` - API endpoint reference
- `specs/references/business-rules.md` - Validation rules and limits
- `specs/references/authentication.md` - Auth error details
- `specs/features/01-authentication.md` - Authentication feature spec
- `specs/features/02-subscription.md` - Subscription error scenarios
