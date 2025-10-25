# API Endpoints Reference

## Overview

This document provides a comprehensive list of ALL API endpoints across the video platform, organized by feature module. Each endpoint includes HTTP method, authentication requirements, and brief descriptions.

**Total Endpoints**: 110+

---

## 1. Authentication & Authorization (10 endpoints)

### User Registration & Login
- `POST /api/auth/register` - User registration (no auth)
- `POST /api/auth/login` - User login (no auth)
- `POST /api/auth/refresh` - Refresh access token (no auth, refresh token required)
- `POST /api/auth/logout` - Logout user (auth required)

### User Profile
- `GET /api/auth/me` - Get current user info (auth required)
- `PATCH /api/auth/profile` - Update user profile (auth required)
- `POST /api/auth/change-password` - Change password (auth required)

### Password Reset
- `POST /api/auth/request-password-reset` - Request password reset email (no auth)
- `POST /api/auth/reset-password` - Reset password with token (no auth)

---

## 2. Subscription Management (9 endpoints)

### Plans
- `GET /api/subscriptions/plans` - Get all subscription plans (no auth)
- `GET /api/subscriptions/current` - Get user's current subscription (auth required)

### Subscription Operations
- `POST /api/subscriptions/create-checkout` - Create Stripe checkout session (auth required)
- `POST /api/subscriptions/create-ccbill-checkout` - Create CCBill checkout (auth required)
- `POST /api/payment/{provider}/checkout` - Create checkout session (alias, frontend pattern) (auth required)
- `POST /api/subscriptions/change` - Change subscription plan (auth required)
- `POST /api/subscriptions/cancel` - Cancel subscription (auth required)
- `GET /api/subscriptions/payment-history` - Get payment history (auth required)

### Webhooks
- `POST /api/webhooks/stripe` - Stripe webhook handler (Stripe signature verification)
- `POST /api/webhooks/ccbill` - CCBill webhook handler (CCBill signature verification)

---

## 3. Content Delivery (5 endpoints)

### Upload
- `POST /api/upload/initiate` - Initiate file upload (auth required)
- `POST /api/upload/complete` - Complete file upload (auth required)
- `GET /api/upload/status/:media_file_id` - Get transcoding status (auth required)

### Streaming
- `GET /api/videos/:id/stream` - Get signed streaming URL (auth required)
- `GET /api/videos/:id/thumbnails` - Get thumbnail URLs (no auth)

---

## 4. Video Management (10 endpoints)

### CRUD Operations
- `POST /api/videos/create` - Create video (auth required, creator)
- `GET /api/videos/my-videos` - Get user's videos (auth required)
- `GET /api/videos/:id` - Get video details (auth required)
- `PATCH /api/videos/:id` - Update video metadata (auth required, owner)
- `DELETE /api/videos/:id` - Delete video (auth required, owner)

### Additional Operations
- `PATCH /api/videos/:id/thumbnail` - Update thumbnail (auth required, owner)
- `GET /api/videos/categories` - Get all categories (no auth)
- `GET /api/videos/tags/suggest` - Get tag suggestions (auth required)
- `POST /api/videos/bulk-delete` - Bulk delete videos (auth required, owner)
- `POST /api/videos/bulk-update-privacy` - Bulk update privacy (auth required, owner)

---

## 5. Video Playback (10 endpoints)

### Viewing
- `POST /api/videos/:id/view` - Record video view (no auth)
- `POST /api/videos/:id/progress` - Save playback progress (auth required)

### Interactions
- `POST /api/videos/:id/like` - Like video (auth required)
- `DELETE /api/videos/:id/like` - Unlike video (auth required)

### Comments
- `GET /api/videos/:id/comments` - Get comments (no auth)
- `POST /api/videos/:id/comments` - Post comment (auth required)
- `DELETE /api/videos/:id/comments/:comment_id` - Delete comment (auth required, owner)
- `POST /api/videos/:id/comments/:comment_id/like` - Like comment (auth required)

### History & Recommendations
- `GET /api/users/watch-history` - Get watch history (auth required)
- `GET /api/videos/:id/recommendations` - Get recommended videos (no auth)

---

## 6. Short Management (10 endpoints)

### CRUD Operations
- `POST /api/shorts/create` - Create short (auth required, creator)
- `GET /api/shorts/my-shorts` - Get user's shorts (auth required)
- `GET /api/shorts/:id` - Get short details (auth required)
- `PATCH /api/shorts/:id` - Update short metadata (auth required, owner)
- `DELETE /api/shorts/:id` - Delete short (auth required, owner)

### Additional Operations
- `PATCH /api/shorts/:id/thumbnail` - Update thumbnail (auth required, owner)
- `GET /api/shorts/categories` - Get all categories (no auth)
- `GET /api/shorts/tags/suggest` - Get tag suggestions (auth required)
- `POST /api/shorts/bulk-delete` - Bulk delete shorts (auth required, owner)
- `POST /api/shorts/bulk-update-privacy` - Bulk update privacy (auth required, owner)

---

## 7. Short Playback (10 endpoints)

### Feed & Viewing
- `GET /api/shorts/feed` - Get shorts feed (no auth, personalized if logged in)
- `POST /api/shorts/:id/view` - Record short view (no auth)

### Interactions
- `POST /api/shorts/:id/like` - Like short (auth required)
- `DELETE /api/shorts/:id/like` - Unlike short (auth required)

### Comments
- `GET /api/shorts/:id/comments` - Get comments (no auth)
- `POST /api/shorts/:id/comments` - Post comment (auth required)
- `DELETE /api/shorts/:id/comments/:comment_id` - Delete comment (auth required, owner)
- `POST /api/shorts/:id/comments/:comment_id/like` - Like comment (auth required)

### History & Recommendations
- `GET /api/users/short-watch-history` - Get watch history (auth required)
- `GET /api/shorts/:id/recommendations` - Get recommended shorts (no auth)

---

## 8. Live Streaming (10 endpoints)

### Stream Management
- `POST /api/live/create` - Create live stream (auth required, creator)
- `GET /api/live/:id` - Get live stream details (no auth)
- `GET /api/live/:id/stream` - Get streaming URL (auth required)
- `POST /api/live/:id/start` - Start live stream (auth required, owner)
- `POST /api/live/:id/end` - End live stream (auth required, owner)

### Chat & Interactions
- `POST /api/live/:id/chat` - Send chat message (auth required)
- `POST /api/live/:id/superchat` - Send super chat (auth required)

### Discovery & Analytics
- `GET /api/live/active` - Get active live streams (no auth)
- `GET /api/live/:id/stats` - Get stream statistics (auth required, owner)
- `GET /api/live/:id/chat/history` - Get chat history (no auth)

---

## 9. Monetization (10 endpoints)

### Tips
- `POST /api/tips/send` - Send tip (auth required)
- `POST /api/payment/{provider}/tip` - Send tip (alias, frontend pattern) (auth required)
- `GET /api/tips/sent` - Get sent tips history (auth required)

### Earnings
- `GET /api/earnings/stats` - Get earnings overview (auth required, creator)
- `GET /api/earnings/history` - Get earnings history (auth required, creator)

### Withdrawals
- `GET /api/withdrawal/methods` - Get withdrawal methods (auth required, creator)
- `POST /api/withdrawal/methods/add` - Add withdrawal method (auth required, creator)
- `POST /api/withdrawal/request` - Request withdrawal (auth required, creator)
- `GET /api/withdrawal/history` - Get withdrawal history (auth required, creator)

### Tax & Payment Provider
- `POST /api/tax-info/register` - Register tax information (auth required, creator)
- `GET /api/payments/provider` - Get payment provider for content (auth required)

---

## 10. Social Features (10 endpoints)

### Follow System
- `POST /api/users/:user_id/follow` - Follow user (auth required)
- `DELETE /api/users/:user_id/follow` - Unfollow user (auth required)
- `GET /api/users/:user_id/follow-status` - Get follow status (auth required)
- `GET /api/users/:user_id/followers` - Get followers list (no auth)
- `GET /api/users/:user_id/following` - Get following list (no auth)

### Notifications
- `GET /api/notifications` - Get notifications (auth required)
- `PATCH /api/notifications/:id/read` - Mark notification as read (auth required)
- `POST /api/notifications/mark-all-read` - Mark all as read (auth required)
- `GET /api/notifications/unread-count` - Get unread count (auth required)

### Settings
- `GET /api/notifications/settings` - Get notification settings (auth required)
- `PATCH /api/notifications/settings` - Update notification settings (auth required)

---

## 11. Playlist Management (10 endpoints)

### CRUD Operations
- `POST /api/playlists/create` - Create playlist (auth required)
- `GET /api/playlists/my-playlists` - Get user's playlists (auth required)
- `GET /api/playlists/:id` - Get playlist details (no auth for public)
- `PATCH /api/playlists/:id` - Update playlist (auth required, owner)
- `DELETE /api/playlists/:id` - Delete playlist (auth required, owner)

### Video Management
- `POST /api/playlists/:id/videos/add` - Add video to playlist (auth required, owner)
- `DELETE /api/playlists/:id/videos/:video_id` - Remove video from playlist (auth required, owner)
- `POST /api/playlists/:id/videos/reorder` - Reorder videos (auth required, owner)
- `GET /api/playlists/:id/videos` - Get playlist videos (no auth for public)

### Viewing
- `POST /api/playlists/:id/view` - Record playlist view (no auth)

---

## 12. Search & Recommendations (10 endpoints)

### Search
- `GET /api/search` - Search content (no auth)
- `GET /api/search/suggest` - Get search suggestions (no auth)
- `GET /api/search/history` - Get search history (auth required)
- `DELETE /api/search/history` - Delete search history (auth required)
- `GET /api/search/popular` - Get popular searches (no auth)

### Trending
- `GET /api/trending/videos` - Get trending videos (no auth)
- `GET /api/trending/shorts` - Get trending shorts (no auth)

### Recommendations
- `GET /api/recommendations/feed` - Get personalized feed (auth required)
- `GET /api/recommendations/shorts` - Get recommended shorts (no auth)
- `GET /api/videos/:id/recommendations` - Get related videos (no auth)

---

## 13. Channel Creation & Management (10 endpoints)

### Creator Application
- `POST /api/creators/apply` - Apply for creator status (auth required)

### Channel Management
- `GET /api/channels/my-channel` - Get own channel info (auth required, creator)
- `PATCH /api/channels/my-channel` - Update channel info (auth required, creator)
- `PATCH /api/channels/my-channel/avatar` - Update channel avatar (auth required, creator)
- `PATCH /api/channels/my-channel/banner` - Update channel banner (auth required, creator)
- `GET /api/channels/:id` - Get channel public page (no auth)

### Analytics
- `GET /api/analytics/overview` - Get analytics overview (auth required, creator)
- `GET /api/analytics/details` - Get detailed analytics (auth required, creator)
- `GET /api/analytics/content/:content_type/:content_id` - Get content performance (auth required, creator)
- `GET /api/analytics/export` - Export analytics data (auth required, creator)

---

## 14. Netflix Content (10 endpoints)

### Content Discovery
- `GET /api/netflix` - Get Netflix content list (no auth)
- `GET /api/netflix/:id` - Get Netflix content details (auth required)

### Streaming
- `GET /api/netflix/:id/episodes/:episodeId/stream` - Get episode streaming URL (auth required)

### Content Management
- `POST /api/netflix/movies` - Create movie (auth required, creator)
- `POST /api/netflix/series` - Create series (auth required, creator)
- `PATCH /api/netflix/:id` - Update Netflix content (auth required, owner)
- `DELETE /api/netflix/:id` - Delete Netflix content (auth required, owner)

### IP Licenses
- `GET /api/ip-licenses` - Get IP licenses list (auth required)
- `POST /api/ip-licenses` - Create IP license (auth required, admin)

### Viewing
- `POST /api/netflix/:id/watch-progress` - Save watch progress (auth required)

---

## HTTP Status Codes

### Success Codes
- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `204 No Content` - Request successful, no content returned

### Client Error Codes
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

### Server Error Codes
- `500 Internal Server Error` - Server error
- `502 Bad Gateway` - Gateway error
- `503 Service Unavailable` - Service temporarily unavailable

---

## Authentication

### Bearer Token
Most endpoints require Bearer token authentication:

```
Authorization: Bearer <access_token>
```

### Access Token
- **Expiry**: 24 hours
- **Format**: JWT
- **Payload**: `{ sub, email, name, role, plan_id, has_adult_access, iat, exp }`

### Refresh Token
- **Expiry**: 30 days
- **Storage**: Database (hashed with SHA-256)
- **Usage**: POST /api/auth/refresh

---

## Rate Limits

### General Endpoints
- `100 requests/minute` - Authentication endpoints
- `200 requests/minute` - Search & discovery
- `1000 requests/minute` - Content retrieval

### Write Operations
- `10 requests/minute` - Content upload/creation
- `60 requests/minute` - Comments
- `30 requests/minute` - Likes/interactions

### Special Limits
- `5 requests/minute` - Tips/super chat
- `3 requests/hour` - Email sending (verification, password reset)

---

## Pagination

### Query Parameters
```
?page=1&limit=20
```

### Response Format
```json
{
  "data": [...],
  "pagination": {
    "total": 1234,
    "page": 1,
    "limit": 20,
    "total_pages": 62,
    "has_more": true
  }
}
```

### Default Limits
- Videos/Shorts: 20 per page (max 100)
- Comments: 20 per page (max 100)
- Playlists: 20 per page (max 100)
- Notifications: 20 per page (max 100)

---

## Error Response Format

```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": {
    "field": "field_name",
    "reason": "specific_reason"
  }
}
```

### Example: Validation Error
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

---

## Related Documents

- `specs/features/01-authentication.md` - Authentication API details
- `specs/features/02-subscription.md` - Subscription API details
- `specs/references/error-codes.md` - Complete error code reference
- `specs/references/business-rules.md` - Business rules & validation
- `specs/references/authentication.md` - Authentication deep dive
