# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start web development server (http://localhost:3000)
npm run web

# Start iOS development (requires Mac + Xcode)
npm run ios

# Start Android development (requires Android Studio)
npm run android

# Type checking
npx tsc --noEmit
```

## Architecture Overview

### Expo Router File-Based Routing

This app uses **Expo Router** with file-based routing. The `app/` directory structure directly maps to routes:

- `app/(tabs)/` - Tab-based navigation (bottom nav on mobile)
  - `videos.tsx` - Main video feed (YouTube-style)
  - `shorts.tsx` - TikTok-style vertical short videos
  - `netflix.tsx` - Netflix-style subscription content
  - `settings.tsx` - User settings with internal tab navigation
- `app/video/[id].tsx` - Dynamic route for video player
- `app/channel/[id].tsx` - Channel detail pages
- `app/creation/` - Creation Hub (YouTube Studio-like creator tools)
  - `index.tsx` - Main hub with left sidebar navigation (desktop) or top tabs (mobile)
  - `video/[id]/edit.tsx` - Video editing page
  - `short/[id]/edit.tsx` - Short editing page

### Platform-Specific Behavior

**Critical**: Adult content filtering is platform-dependent via `constants/Platform.ts`:
- **Web**: Shows adult content with "18+" badges (`canShowAdultContent = true`)
- **iOS/Android**: Completely filters out adult content (`canShowAdultContent = false`)

Always use `canShowAdultContent` from `constants/Platform.ts` when filtering content by `is_adult` flag.

### Mock API Pattern

Currently uses mock data from `mock/*.json` files via `utils/mockApi.ts`. All API functions are async to simulate real API calls:

```typescript
// All return promises even though data is local
await getVideos()      // Returns all videos, filtered by platform
await getUserVideos()  // Returns user's videos (currently returns all for demo)
await getShorts()      // Returns shorts
await getChannelDetail(id)  // Returns channel with videos/shorts
```

When implementing real backend, replace functions in `mockApi.ts` while keeping the same interface.

### Type System

All types defined in `types/index.ts`:
- `Video` - has optional `like_count` and `description`
- `Short` - has optional `category` and `description`
- `VideoDetail` extends `Video` with required `description` and `video_url`
- `NetflixContent` - for subscription-based content with seasons/episodes

### Color System

`constants/Colors.ts` defines YouTube-like colors:
- `primary: '#065FD4'` - YouTube blue for buttons/links
- `surface: '#F9F9F9'` - Card backgrounds
- `card: '#FFFFFF'` - Card containers
- `adult: '#FF0000'` - 18+ badge color

Always use `Colors.*` instead of hardcoded hex values.

### Responsive Design Pattern

Components use `useWindowDimensions()` with `isMobile = width < 768` breakpoint:

```typescript
const { width } = useWindowDimensions();
const isMobile = width < 768;

// Different layouts for mobile vs desktop
{isMobile ? <MobileLayout /> : <DesktopLayout />}
```

Desktop layouts often use left sidebar navigation (like `settings.tsx` and `creation/index.tsx`), while mobile uses top horizontal tabs.

### Video Player Integration

Uses `expo-av` for video playback. All video URLs in mock data are placeholder URLs.

Key patterns:
- TikTok-style shorts use `pagingEnabled` FlatList with `snapToInterval`
- Active video determined by `onViewableItemsChanged` callback
- Only the active video autoplays

### Creation Hub Architecture

`app/creation/index.tsx` is the main creator dashboard:
- Left sidebar navigation (desktop) with tabs: Dashboard, Contents, Upload, Analytics
- Top horizontal tabs (mobile)
- Tab content rendered via separate components in `components/creation/`:
  - `DashboardContent.tsx` - Statistics overview
  - `ContentsContent.tsx` - Video/Short management with edit/delete
  - `UploadContent.tsx` - Upload interface
  - `AnalyticsContent.tsx` - Detailed analytics (placeholder)

Edit pages at `app/creation/video/[id]/edit.tsx` and `app/creation/short/[id]/edit.tsx` allow editing:
- Title, description, category, adult flag
- Uses `updateVideo()` and `updateShort()` API functions

### Settings Page Pattern

`app/(tabs)/settings.tsx` uses internal tab navigation (not router-based):
- Left sidebar tabs (desktop) / top tabs (mobile)
- State-based tab switching with `activeTab` state
- Each tab renders different content in the same page
- Tabs: Profile, Channels, Plan, Creation, Notifications, History, Account

## Key Implementation Notes

- **Hot reload**: Changes to code should hot reload automatically. If not, use Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows) for hard refresh in browser
- **TypeScript errors**: Run `npx tsc --noEmit` to check for type errors before committing
- **Navigation**: Use `router.push()` from `expo-router` for navigation, not React Navigation
- **Icons**: Use `@expo/vector-icons` Ionicons for all icons
- **Image picker**: Use `expo-image-picker` for video/image selection in upload flows

## Common Patterns

### Filtering by Adult Content
```typescript
import { canShowAdultContent } from '../constants/Platform';

const videos = await getVideos(); // Already filtered by platform
// No additional filtering needed in components
```

### Navigation to Dynamic Routes
```typescript
import { useRouter } from 'expo-router';

const router = useRouter();
router.push(`/video/${videoId}`);
router.push(`/creation/video/${id}/edit` as any); // Type cast for complex paths
```

### Responsive Layouts
```typescript
const { width } = useWindowDimensions();
const isMobile = width < 768;

<View style={[styles.container, isMobile && styles.containerMobile]}>
```
