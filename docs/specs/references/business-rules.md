# Business Rules Reference

## Overview

This document consolidates all business rules, validation constraints, permission matrices, and operational policies across the video platform.

**Rule Categories**: 12 categories
**Total Rules**: 100+ rules

---

## 1. Subscription & Pricing Rules

### 1.1 Subscription Plans

| Plan | Price | Billing | Payment Provider | Features |
|------|-------|---------|------------------|----------|
| **Free** | ¥0 | N/A | N/A | Videos, Shorts, Live, Ads |
| **Premium** | ¥980/month | Monthly | Stripe | No ads, HD, offline, background play |
| **Premium+** | ¥1,980/month | Monthly | CCBill | Premium + Netflix + Adult content |

**Business Rules**:
- Free tier is永久無料 (permanently free)
- Premium plan requires valid Stripe payment method
- Premium+ plan requires valid CCBill payment method (adult content payment processor)
- Users can upgrade/downgrade between plans at any time
- Downgrades take effect at next billing cycle
- Upgrades take effect immediately with prorated billing
- Trial period: None (to prevent abuse)
- Refund policy: No refunds for partial months

### 1.2 Subscription State Machine

```
[No Subscription] --> [Active] --> [Cancelled] --> [Expired]
                         |            |
                         v            v
                    [Past Due] --> [Expired]
                         |
                         v
                    [Active] (payment recovered)
```

**State Transitions**:
- **Active**: Payment successful, full access
- **Past Due**: Payment failed, grace period (7 days), limited access
- **Cancelled**: User cancelled, access until period end
- **Expired**: No access, treated as Free tier

### 1.3 Content Access by Plan

| Content Type | Free | Premium | Premium+ |
|--------------|------|---------|----------|
| User Videos | ✓ | ✓ | ✓ |
| User Shorts | ✓ | ✓ | ✓ |
| Live Streams | ✓ | ✓ | ✓ |
| Netflix Movies/Series | ✗ | ✗ | ✓ |
| Adult Content | ✗ | ✗ | ✓ (18+) |
| Ads | Yes | No | No |
| HD Streaming | 720p | 1080p | 1080p |
| 4K Streaming | ✗ | ✗ | ✓ |
| Offline Download | ✗ | ✓ | ✓ |
| Background Play | ✗ | ✓ | ✓ |

**Business Rules**:
- Free users see ads every 5 minutes during video playback
- Adult content requires age verification (18+) + Premium+ subscription
- iOS users cannot access adult content (App Store policy)
- Netflix content requires active Premium+ subscription
- Downloaded content expires after 30 days or when subscription ends

### 1.4 Platform-Specific Restrictions

| Platform | Adult Content | Netflix Content | In-App Purchase |
|----------|---------------|-----------------|-----------------|
| Web | ✓ (Premium+) | ✓ (Premium+) | Stripe |
| Android | ✓ (Premium+) | ✓ (Premium+) | Google Play + Stripe |
| iOS | ✗ (Blocked) | ✓ (Premium+) | App Store only |

**Business Rules**:
- iOS: No adult content browsing/viewing (redirects to web)
- iOS: In-app subscriptions must use App Store billing (Apple's 30% cut)
- Android: Can choose between Google Play or Stripe payment
- Web: Full access to all content types

---

## 2. User Roles & Permissions

### 2.1 User Role Hierarchy

```
Admin (最高権限)
  └── Creator (コンテンツ作成者)
        └── User (一般ユーザー)
```

### 2.2 Permission Matrix

| Action | User | Creator | Admin |
|--------|------|---------|-------|
| **Content Viewing** |
| View public videos | ✓ | ✓ | ✓ |
| View premium content | Premium+ | Premium+ | ✓ |
| View adult content | Premium+ (18+) | Premium+ (18+) | ✓ |
| **Content Creation** |
| Upload videos | ✗ | ✓ | ✓ |
| Upload shorts | ✗ | ✓ | ✓ |
| Start live stream | ✗ | ✓ | ✓ |
| Create Netflix content | ✗ | ✗ | ✓ |
| **Content Management** |
| Edit own content | N/A | ✓ | ✓ |
| Delete own content | N/A | ✓ | ✓ |
| Edit others' content | ✗ | ✗ | ✓ |
| Delete others' content | ✗ | ✗ | ✓ |
| **Monetization** |
| Send tips | ✓ | ✓ | ✓ |
| Receive tips | ✗ | ✓ | ✓ |
| Request withdrawal | ✗ | ✓ | ✓ |
| **Social Features** |
| Follow users | ✓ | ✓ | ✓ |
| Comment on content | ✓ | ✓ | ✓ |
| Like content | ✓ | ✓ | ✓ |
| **Admin Functions** |
| Ban users | ✗ | ✗ | ✓ |
| Manage IP licenses | ✗ | ✗ | ✓ |
| View all analytics | ✗ | Own only | ✓ |
| Manage subscriptions | Own only | Own only | ✓ |

### 2.3 Creator Application Requirements

**Eligibility Criteria**:
- Account age: Minimum 30 days
- Account status: Active, not banned
- Email verification: Required
- Profile completion: Name, bio, avatar required
- Age: 18+ (for monetization)
- Tax information: Required for withdrawal (can submit after approval)

**Approval Process**:
1. User submits application with:
   - Channel name (3-50 characters)
   - Channel description (10-500 characters)
   - Content category selection
   - Agreement to creator terms
2. Automated checks (account age, email verification)
3. Admin review (manual, 1-3 business days)
4. Approval notification + creator badge assigned

**Business Rules**:
- One creator application per account
- Rejected applications can reapply after 30 days
- Creator status can be revoked for policy violations
- Creator role is永久的 (permanent unless revoked)

---

## 3. Content Validation Rules

### 3.1 Video Upload Rules

| Attribute | Free | Premium | Premium+ |
|-----------|------|---------|----------|
| **File Size** | Max 2GB | Max 5GB | Max 5GB |
| **Duration** | Max 2 hours | Max 4 hours | Max 4 hours |
| **Resolution** | Max 1080p | Max 4K | Max 4K |
| **Formats** | mp4, mov, avi, mkv | mp4, mov, avi, mkv | mp4, mov, avi, mkv |
| **Concurrent Uploads** | 1 | 3 | 5 |
| **Daily Uploads** | 10 | 50 | 100 |

**Validation Rules**:
- Title: 3-100 characters, required
- Description: 0-5000 characters, optional
- Tags: 0-10 tags, 2-30 characters each
- Category: Must be valid category ID, required
- Thumbnail: JPG/PNG, max 2MB, 1280x720px recommended
- Visibility: public, unlisted, private, scheduled
- Scheduled publish: Must be future date/time
- Age restriction: 18+ flag available

### 3.2 Short Video Rules

| Attribute | All Plans |
|-----------|-----------|
| **Duration** | Max 60 seconds |
| **File Size** | Max 500MB |
| **Resolution** | Max 1080p (vertical) |
| **Aspect Ratio** | 9:16 (vertical) required |
| **Formats** | mp4, mov |
| **Daily Uploads** | 50 |

**Validation Rules**:
- Title: 3-100 characters, required
- Description: 0-500 characters, optional
- Tags: 0-10 tags
- Hashtags: Extracted from description, max 30
- Thumbnail: Auto-generated from first frame
- Visibility: public or private only (no unlisted/scheduled)
- Vertical format: Rejected if aspect ratio ≠ 9:16

### 3.3 Live Stream Rules

| Attribute | Free | Premium | Premium+ |
|-----------|------|---------|----------|
| **Max Duration** | 2 hours | 6 hours | 12 hours |
| **Bitrate** | Max 4 Mbps | Max 6 Mbps | Max 8 Mbps |
| **Resolution** | Max 720p | Max 1080p | Max 1080p |
| **Concurrent Streams** | 1 | 1 | 1 |
| **Chat Message Rate** | 5/min | 20/min | 50/min |

**Validation Rules**:
- Title: 3-100 characters, required
- Description: 0-1000 characters, optional
- Category: Required
- RTMP key: Auto-generated, expires after 7 days
- Scheduled start: Optional, must be future time
- Auto-end: Stream ends if no data for 5 minutes
- DVR: Disabled for Free, enabled for Premium/Premium+

### 3.4 Netflix Content Rules (Admin Only)

**Movies**:
- Title: 1-200 characters, required
- Description: 10-5000 characters, required
- Release year: 1900-current year
- Runtime: 1-300 minutes
- Rating: G, PG, PG-13, R, NC-17
- Video file: Max 10GB, 1080p or 4K
- Subtitles: SRT format, multiple languages supported
- IP license: Must have valid license ID

**TV Series**:
- All movie rules apply
- Seasons: 1-50 seasons
- Episodes per season: 1-100 episodes
- Episode runtime: 1-120 minutes
- Episode numbering: S01E01 format

---

## 4. Monetization Rules

### 4.1 Tips (投げ銭)

**Sending Tips**:
- Minimum: ¥100
- Maximum: ¥50,000 per transaction
- Daily limit: ¥100,000 per user
- Rate limit: 5 tips per minute
- Payment methods: Credit card (Stripe), balance
- Available to: All authenticated users

**Receiving Tips**:
- Available to: Creators only
- Platform fee: 30%
- Creator receives: 70%
- Payout hold: 14 days (fraud prevention)
- Tax reporting: Required for withdrawals >¥200,000/year

### 4.2 Super Chat (スーパーチャット)

**During Live Streams**:
- Minimum: ¥100
- Maximum: ¥50,000
- Tiers:
  - ¥100-¥499: Blue (5 seconds highlight)
  - ¥500-¥999: Cyan (10 seconds highlight)
  - ¥1,000-¥1,999: Green (30 seconds highlight)
  - ¥2,000-¥4,999: Yellow (1 minute highlight)
  - ¥5,000-¥9,999: Orange (2 minutes highlight)
  - ¥10,000+: Red (5 minutes highlight, pinned)
- Message: 0-200 characters
- Platform fee: 30%
- Rate limit: 5 super chats per minute

### 4.3 Subscription Revenue Pool

**Premium Subscription Pool**:
- 50% of Premium subscription fees distributed to creators
- Distribution formula: (Creator watch time / Total watch time) × Pool
- Calculated monthly
- Minimum watch time: 1000 minutes to qualify
- Payout: Next month (14-day hold applied)

**Business Rules**:
- Only Premium/Premium+ subscription watch time counts
- Free tier views do not contribute to pool
- Live stream watch time counts
- Downloaded content views do not count

### 4.4 Withdrawal Rules

**Eligibility**:
- Creator account required
- Tax information submitted
- Bank account verified
- Minimum balance: ¥5,000

**Withdrawal Process**:
- Request window: Anytime
- Processing time: 3-5 business days
- Bank transfer fee: ¥250 (deducted from withdrawal)
- Hold period: 14 days after earning
- Monthly limit: No limit
- Payment methods: Bank transfer (Japan only)

**Tax Requirements**:
- Individual creators: My Number required
- Business creators: Corporate number required
- Tax withholding: 10.21% for >¥100,000/payment
- Annual tax report: Issued in January

---

## 5. Rate Limiting Rules

### 5.1 Authentication Endpoints

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/auth/register | 5 | 1 hour |
| POST /api/auth/login | 5 | 15 minutes |
| POST /api/auth/refresh | 20 | 1 hour |
| POST /api/auth/request-password-reset | 3 | 1 hour |
| POST /api/auth/reset-password | 5 | 1 hour |

**Lockout Policy**:
- 5 failed login attempts = 30-minute lockout
- 10 failed attempts in 24h = 24-hour lockout
- Password reset available during lockout

### 5.2 Content Endpoints

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/videos/create | 10 | 1 hour |
| POST /api/shorts/create | 50 | 1 day |
| POST /api/upload/initiate | 10 | 1 minute |
| GET /api/videos/:id | 1000 | 1 minute |
| POST /api/videos/:id/view | 100 | 1 minute |

### 5.3 Social Endpoints

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/videos/:id/like | 30 | 1 minute |
| POST /api/videos/:id/comments | 60 | 1 hour |
| POST /api/users/:user_id/follow | 50 | 1 hour |
| POST /api/tips/send | 5 | 1 minute |
| POST /api/live/:id/chat | Free: 5, Premium: 20, Premium+: 50 | 1 minute |

### 5.4 Search & Discovery

| Endpoint | Limit | Window |
|----------|-------|--------|
| GET /api/search | 200 | 1 minute |
| GET /api/trending/videos | 100 | 1 minute |
| GET /api/recommendations/feed | 100 | 1 minute |

---

## 6. Content Moderation Rules

### 6.1 Age Restrictions

**18+ Content Markers**:
- Adult content: Premium+ required, age verification required
- Violent content: Age gate (18+), no subscription required
- Explicit language: Age gate (18+), no subscription required

**Age Verification**:
- Method: Government ID upload (one-time)
- Verification time: 24-48 hours
- Age gate: DOB input for non-adult content
- iOS restriction: Adult content completely blocked

### 6.2 Content Flags

| Flag | Description | Action |
|------|-------------|--------|
| **is_adult** | Adult/pornographic content | Premium+ only, iOS blocked |
| **is_violent** | Violent/graphic content | Age gate 18+ |
| **has_explicit_language** | Strong profanity | Age gate 18+ |
| **is_sponsored** | Sponsored content | "Sponsored" label displayed |
| **is_paid_promotion** | Paid promotion | "Includes paid promotion" label |

### 6.3 Prohibited Content

**Automatic Rejection**:
- Child sexual abuse material (CSAM)
- Terrorism/violent extremism
- Hate speech
- Copyright infringement (ContentID match)
- Malware/phishing

**Manual Review Required**:
- Borderline adult content
- Potential copyright disputes
- Violence in news/educational context
- Political content in some regions

---

## 7. Session Management Rules

### 7.1 Session Limits

**Concurrent Sessions**:
- Maximum: 5 active sessions per user
- Device tracking: Device ID, IP address, user agent
- Session timeout: 30 days of inactivity
- Force logout: Available in account settings

**Session Priority**:
- Most recent login remains active
- Oldest session revoked when limit exceeded
- User notified of new session via email

### 7.2 Token Expiration

| Token Type | Expiration | Refresh | Storage |
|------------|------------|---------|---------|
| Access Token | 24 hours | Via refresh token | Client-side (memory) |
| Refresh Token | 30 days | Manual re-login | Database (hashed) |
| Password Reset Token | 1 hour | Single use | Database |
| Email Verification Token | 24 hours | Single use | Database |
| RTMP Stream Key | 7 days | Regenerate | Database |

---

## 8. Storage & Bandwidth Rules

### 8.1 Storage Quotas

| Plan | Storage Limit | Per-Video Limit |
|------|---------------|-----------------|
| Free | 10GB | 2GB |
| Premium | 100GB | 5GB |
| Premium+ | 500GB | 5GB |
| Creator (Free) | 50GB | 5GB |
| Creator (Premium) | 500GB | 5GB |
| Creator (Premium+) | 1TB | 5GB |

**Business Rules**:
- Deleted content removed from quota after 30 days (soft delete)
- Transcoded versions do not count toward quota
- Thumbnails do not count toward quota
- Live stream recordings count toward quota

### 8.2 Bandwidth Limits

| Plan | Monthly Bandwidth | Throttling |
|------|-------------------|------------|
| Free | 100GB | After limit: 480p max |
| Premium | Unlimited | No throttling |
| Premium+ | Unlimited | No throttling |

**Viewer Bandwidth**:
- Free users: Unlimited views, ads every 5 minutes
- Premium users: Unlimited views, no ads
- Premium+ users: Unlimited views, no ads, 4K available

---

## 9. Playlist Rules

### 9.1 Playlist Limits

| Plan | Max Playlists | Videos per Playlist |
|------|---------------|---------------------|
| Free | 10 | 50 |
| Premium | 50 | 200 |
| Premium+ | 100 | 500 |

**Validation Rules**:
- Title: 3-100 characters, required
- Description: 0-500 characters, optional
- Visibility: public, unlisted, private
- Collaboration: Owner only can edit
- Video order: Manual reordering allowed
- Duplicate videos: Allowed in same playlist

---

## 10. Search & Recommendation Rules

### 10.1 Trending Algorithm

**Video Trending Score**:
```
score = (views × 1.0) + (likes × 2.0) + (comments × 3.0) + (watch_time_minutes × 0.5)
```

**Time Decay**:
- Last 24 hours: weight × 1.0
- 24-48 hours: weight × 0.7
- 48-72 hours: weight × 0.4
- >72 hours: weight × 0.1

**Trending Requirements**:
- Minimum views: 1,000 in last 24 hours
- Minimum engagement rate: 5% (likes + comments / views)
- Not flagged for moderation
- Public visibility

### 10.2 Recommendation Algorithm

**Personalized Feed**:
- Watch history: 40% weight
- Liked videos: 30% weight
- Followed creators: 20% weight
- Category preferences: 10% weight

**New User (Cold Start)**:
- Trending videos: 60%
- Popular in category: 30%
- Random sampling: 10%

**Business Rules**:
- No duplicate videos in single feed fetch
- Maximum 20 videos per request
- Refresh feed every 30 minutes
- Age-appropriate content only
- Subscription-appropriate content only

---

## 11. Notification Rules

### 11.1 Notification Types

| Type | Trigger | Default Enabled | Rate Limit |
|------|---------|-----------------|------------|
| **New Upload** | Creator uploads video | ✓ | 1 per creator per hour |
| **Live Start** | Creator goes live | ✓ | 1 per creator per stream |
| **Comment Reply** | Someone replies to your comment | ✓ | 10 per hour |
| **New Follower** | Someone follows you | ✓ | Batched every 1 hour |
| **Like** | Someone likes your content | ✗ | Batched daily |
| **Tip Received** | You receive a tip | ✓ | Immediate |
| **Super Chat** | Super chat during your live | ✓ | Immediate |

### 11.2 Notification Channels

| Channel | Availability | User Preference |
|---------|--------------|-----------------|
| **In-App** | All users | Always on |
| **Push (Mobile)** | All users | Default on |
| **Email** | Verified email | Default off |
| **SMS** | Phone verified | Premium+ only |

**Business Rules**:
- Notification batching: Max 1 email per hour for non-critical
- Critical notifications: Tips, super chat, live start (immediate)
- Unread badge: Updates in real-time via WebSocket
- Notification retention: 30 days, then archived

---

## 12. Analytics & Reporting Rules

### 12.1 Creator Analytics Access

**Available Metrics**:
- Views (total, unique)
- Watch time (minutes)
- Engagement rate (likes + comments / views)
- Revenue (tips, super chat, subscription pool)
- Follower growth
- Demographics (age, gender, location)

**Time Ranges**:
- Real-time: Last 60 minutes (live streams only)
- Last 7 days: Available to all creators
- Last 30 days: Available to all creators
- Last 90 days: Premium+ creators only
- All time: Premium+ creators only

**Business Rules**:
- Analytics updated every 1 hour
- Revenue data updated daily
- Demographics require minimum 100 views (privacy)
- Export available: CSV, JSON (Premium+ only)

---

## Related Documents

- `specs/references/api-endpoints.md` - API endpoints
- `specs/references/error-codes.md` - Error handling
- `specs/references/data-models.md` - Database schemas
- `specs/features/02-subscription.md` - Subscription details
- `specs/features/09-monetization.md` - Monetization rules
