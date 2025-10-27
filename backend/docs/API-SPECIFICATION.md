# Video Platform API Specification

**Version**: 1.0.0
**Base URL**: `http://localhost:4000` (Development)
**Production URL**: `https://api.example.com`

## Table of Contents

1. [Authentication](#authentication)
2. [Video Management](#video-management)
3. [Social Features](#social-features)
4. [Channel Management](#channel-management)
5. [Playlist Management](#playlist-management)
6. [Subscription & Payment](#subscription--payment)
7. [Monetization](#monetization)
8. [Error Codes](#error-codes)

---

## General Information

### Response Format

All API responses follow this structure:

**Success Response**:
```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}, // Optional
    "requestId": "request-id" // For debugging
  }
}
```

### Authentication

Most endpoints require authentication via Bearer token:

```
Authorization: Bearer <access_token>
```

### Rate Limiting

- **Global**: 100 requests per minute
- **Auth endpoints**: 5 requests per minute
- **Upload endpoints**: 10 requests per hour

Rate limit headers:
```
x-ratelimit-limit: 100
x-ratelimit-remaining: 95
x-ratelimit-reset: 1234567890
```

---

## Authentication

### POST /api/auth/register

Register a new user account.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe",
  "displayName": "Johnny" // Optional
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "displayName": "Johnny",
      "isEmailVerified": false,
      "isCreator": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### POST /api/auth/login

Login with email and password.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### POST /api/auth/refresh

Refresh access token using refresh token.

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### POST /api/auth/logout

Logout and invalidate refresh token.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

### GET /api/auth/me

Get current user profile.

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "displayName": "Johnny",
      "bio": "Content creator",
      "avatarUrl": "https://...",
      "isEmailVerified": true,
      "isCreator": false,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

---

## Video Management

### POST /api/videos

Create/upload a new video.

**Headers**: `Authorization: Bearer <token>`

**Request Body** (multipart/form-data):
```
title: "My Video Title"
description: "Video description"
categoryId: "category-uuid"
privacy: "public" | "unlisted" | "private"
isAdult: true | false
tags: ["tag1", "tag2"]
file: <video file>
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "video": {
      "id": "uuid",
      "title": "My Video Title",
      "description": "Video description",
      "userId": "user-uuid",
      "status": "processing",
      "thumbnailUrl": null,
      "duration": 0,
      "viewCount": 0,
      "likeCount": 0,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

### GET /api/videos

List videos with filters.

**Query Parameters**:
- `userId`: Filter by user ID
- `categoryId`: Filter by category
- `privacy`: Filter by privacy (public, unlisted, private)
- `isAdult`: Filter adult content (true/false)
- `search`: Search in title, description, tags
- `orderBy`: Sort field (createdAt, viewCount, likeCount)
- `orderDirection`: Sort direction (asc, desc)
- `limit`: Results per page (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "id": "uuid",
        "title": "Video Title",
        "description": "Description",
        "thumbnailUrl": "https://...",
        "duration": 120,
        "viewCount": 1500,
        "likeCount": 45,
        "user": {
          "id": "user-uuid",
          "name": "Creator Name",
          "avatarUrl": "https://..."
        },
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
    ],
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

### GET /api/videos/:id

Get video details by ID.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "video": {
      "id": "uuid",
      "title": "Video Title",
      "description": "Description",
      "userId": "user-uuid",
      "categoryId": "category-uuid",
      "thumbnailUrl": "https://...",
      "hlsUrl": "https://...",
      "duration": 120,
      "privacy": "public",
      "isAdult": false,
      "viewCount": 1500,
      "likeCount": 45,
      "commentCount": 12,
      "status": "ready",
      "user": {
        "id": "user-uuid",
        "name": "Creator Name",
        "displayName": "Johnny",
        "avatarUrl": "https://..."
      },
      "category": {
        "id": "category-uuid",
        "name": "Gaming"
      },
      "tags": [
        { "tag": "gaming" },
        { "tag": "tutorial" }
      ],
      "createdAt": "2025-01-01T00:00:00.000Z",
      "publishedAt": "2025-01-01T00:30:00.000Z"
    }
  }
}
```

### POST /api/videos/:id/like

Like a video.

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Video liked successfully"
  }
}
```

### DELETE /api/videos/:id/like

Unlike a video.

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Video unliked successfully"
  }
}
```

---

## Social Features

### POST /api/users/:userId/follow

Follow a user.

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Successfully followed user"
  }
}
```

### DELETE /api/users/:userId/follow

Unfollow a user.

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Successfully unfollowed user"
  }
}
```

### GET /api/users/:userId/followers

Get user's followers list.

**Query Parameters**:
- `limit`: Results per page (default: 20)
- `offset`: Pagination offset (default: 0)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "followers": [
      {
        "id": "follow-uuid",
        "followerId": "user-uuid",
        "follower": {
          "id": "user-uuid",
          "name": "Follower Name",
          "displayName": "Display",
          "avatarUrl": "https://...",
          "isCreator": false
        },
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
    ],
    "total": 150
  }
}
```

### GET /api/notifications

Get user's notifications.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `limit`: Results per page (default: 20)
- `offset`: Pagination offset (default: 0)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "type": "new_follower",
        "title": "New Follower",
        "message": "You have a new follower!",
        "thumbnailUrl": null,
        "linkUrl": null,
        "actorId": "user-uuid",
        "isRead": false,
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
    ],
    "unreadCount": 5
  }
}
```

---

## Channel Management

### GET /api/channels/:id

Get public channel profile.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "channel": {
      "id": "channel-uuid",
      "userId": "user-uuid",
      "name": "Channel Name",
      "description": "Channel description",
      "avatarUrl": "https://...",
      "bannerUrl": "https://...",
      "subscriberCount": 15000,
      "totalViews": 1500000,
      "totalVideos": 120,
      "user": {
        "id": "user-uuid",
        "name": "Creator Name"
      },
      "links": [
        {
          "platform": "twitter",
          "url": "https://twitter.com/..."
        }
      ],
      "stats": {
        "followerCount": 15000,
        "totalLikes": 45000
      },
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

### GET /api/channels/my-channel

Get own channel (auto-creates if doesn't exist).

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK): Same as GET /api/channels/:id

### PATCH /api/channels/my-channel

Update own channel.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "name": "New Channel Name",
  "description": "New description",
  "links": [
    {
      "platform": "twitter",
      "url": "https://twitter.com/..."
    },
    {
      "platform": "instagram",
      "url": "https://instagram.com/..."
    }
  ]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "channel": {
      // Updated channel object
    }
  }
}
```

### POST /api/creators/apply

Apply to become a creator (auto-approved in MVP).

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Creator application approved",
    "isCreator": true,
    "channel": {
      // Auto-created channel object
    }
  }
}
```

---

## Playlist Management

### POST /api/playlists

Create a new playlist.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "name": "My Playlist",
  "description": "Playlist description",
  "isPublic": true
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "playlist": {
      "id": "uuid",
      "userId": "user-uuid",
      "name": "My Playlist",
      "description": "Playlist description",
      "isPublic": true,
      "videoCount": 0,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

### POST /api/playlists/:id/videos

Add video to playlist.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "videoId": "video-uuid"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Video added to playlist",
    "playlistVideo": {
      "id": "uuid",
      "playlistId": "playlist-uuid",
      "videoId": "video-uuid",
      "position": 0
    }
  }
}
```

---

## Subscription & Payment

### GET /api/subscriptions/plans

Get available subscription plans.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "free",
        "name": "無料プラン",
        "nameEn": "Free Plan",
        "price": 0,
        "billingInterval": "month",
        "paymentProvider": "free",
        "features": ["Basic features"],
        "hasAdultAccess": false
      },
      {
        "id": "premium",
        "name": "プレミアムプラン",
        "nameEn": "Premium Plan",
        "price": 980,
        "billingInterval": "month",
        "paymentProvider": "stripe",
        "stripePriceId": "price_xxx",
        "features": ["All features", "Ad-free"],
        "hasAdultAccess": false
      }
    ]
  }
}
```

### POST /api/subscriptions/subscribe

Subscribe to a plan.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "planId": "premium",
  "paymentMethodId": "pm_xxx" // Stripe payment method ID
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "uuid",
      "userId": "user-uuid",
      "planId": "premium",
      "status": "active",
      "currentPeriodEnd": "2025-02-01T00:00:00.000Z"
    }
  }
}
```

---

## Monetization

### POST /api/tips

Send a tip to a creator.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "toUserId": "creator-uuid",
  "contentType": "video",
  "contentId": "video-uuid",
  "amount": 500, // JPY
  "message": "Great content!",
  "paymentMethodId": "pm_xxx"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "tip": {
      "id": "uuid",
      "amount": 500,
      "status": "completed",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

### GET /api/earnings

Get creator earnings.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `status`: Filter by status (pending, available, withdrawn)
- `limit`, `offset`: Pagination

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "earnings": [
      {
        "id": "uuid",
        "sourceType": "tip",
        "amount": 500,
        "platformFee": 150,
        "netAmount": 350,
        "status": "available",
        "availableAt": "2025-01-15T00:00:00.000Z",
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
    ],
    "totalAvailable": 15000,
    "totalPending": 5000
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `ALREADY_EXISTS` | 409 | Resource already exists |
| `CONFLICT` | 409 | Resource conflict |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |
| `PAYMENT_FAILED` | 402 | Payment processing failed |
| `INSUFFICIENT_PERMISSIONS` | 403 | Insufficient permissions |

---

## Pagination

All list endpoints support pagination:

**Query Parameters**:
- `limit`: Number of results (default: 20, max: 100)
- `offset`: Skip N results (default: 0)

**Response includes**:
```json
{
  "data": {
    "items": [...],
    "total": 500,
    "limit": 20,
    "offset": 0
  }
}
```

---

## Health Check

### GET /health

Check API health status.

**Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "uptime": 86400,
  "memory": {
    "heapUsed": "128MB",
    "heapTotal": "256MB"
  }
}
```

### GET /metrics

Get performance metrics (internal use).

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRequests": 15000,
      "avgResponseTime": 87,
      "errorRate": "2.5%"
    },
    "endpoints": [...],
    "memory": {...}
  }
}
```
