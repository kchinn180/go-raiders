# GO Raiders - Pokémon GO Raid Coordination App

## Overview
GO Raiders is a Pokémon GO raid coordination application that allows trainers to find and join raid lobbies, host their own raids, and coordinate with other players in real-time. The app uses Pokémon names/images from PokémonDB and official team names (Valor, Mystic, Instinct).

## Key Features
- **Onboarding**: New users set up their trainer profile with name, team (Valor/Mystic/Instinct), level, and friend code
- **Join Feed**: Browse available raid lobbies with filtering by tier (1, 3, 5, Mega, Max, Shadow)
- **Host Raids**: Create new raid lobbies with Pokémon boss selection and settings
- **Lobby View**: Real-time lobby with player list, ready status, and friend code coordination
- **Premium/Elite**: Subscription features including Auto Join, no wait time, and priority queue
- **Dark/Light Theme**: Full theme support with team-colored accents (volcanic/lava theme)

## Architecture

### Frontend (`client/src/`)
- **React** with TypeScript
- **Wouter** for routing
- **TanStack Query** for data fetching
- **Shadcn/ui** components with Tailwind CSS
- **Theme/User contexts** for global state
- **Capacitor** for native mobile deployment

### Backend (`server/`)
- **Express** server
- **In-memory storage** for lobbies and users
- RESTful API endpoints

### Shared (`shared/`)
- **Zod schemas** for validation
- Type definitions for User, Lobby, Player, Boss, Team

## API Endpoints
- `GET /api/lobbies` - List all active lobbies
- `GET /api/lobbies/:id` - Get specific lobby
- `POST /api/lobbies` - Create new lobby
- `POST /api/lobbies/:id/join` - Join a lobby
- `POST /api/lobbies/:id/leave` - Leave a lobby
- `PATCH /api/lobbies/:id/ready` - Update ready status
- `PATCH /api/lobbies/:id/sent-request` - Mark friend request as sent

## Running the App
The application runs with `npm run dev` which starts both the Express backend and Vite frontend on port 5000.

## Mobile Deployment (App Store / Play Store)

### PWA Features
- **manifest.json**: App name, icons, theme colors, standalone display mode
- **Mobile viewport**: Configured for notched devices with safe-area-inset support
- **iOS standalone**: Full screen app experience on iOS devices

### Capacitor Configuration
The app uses Capacitor to wrap the web app for native deployment:

```bash
# Build the web app first
npm run build

# Add native platforms
npx cap add ios
npx cap add android

# Sync web assets to native projects
npx cap sync

# Open in Xcode (for iOS)
npx cap open ios

# Open in Android Studio (for Android)
npx cap open android
```

### App Store Requirements
1. **Apple Developer Program** ($99/year)
2. **Bundle ID**: `com.goraiders.app`
3. **App Icons**: 1024x1024 for App Store, various sizes in `client/public/icons/`
4. **Screenshots**: 6.5" and 5.5" iPhone screenshots required
5. **Privacy Policy**: Required before submission
6. **Age Rating**: 4+ (no objectionable content)

### Play Store Requirements
1. **Google Play Console** ($25 one-time)
2. **Package Name**: `com.goraiders.app`
3. **App Icons**: 512x512 feature graphic
4. **Screenshots**: Phone screenshots required
5. **Privacy Policy**: Required URL
6. **Content Rating**: Complete questionnaire

## Internationalization
The app supports 10 languages via react-i18next:
- English, Spanish, Portuguese (Brazil), French, German
- Japanese, Korean, Chinese (Simplified/Traditional), Arabic
- Language selector in Settings view
- All translation files in `client/src/i18n/locales/`

## Haptic Feedback & Sound Effects
- **Haptics** (`client/src/lib/haptics.ts`): Uses Capacitor Haptics API with navigator.vibrate() fallback for web
- **Sounds** (`client/src/lib/sounds.ts`): Web Audio API for sound effects (no external files)
- Toggleable via user notification preferences in Settings
- Triggered on: join lobby, ready toggle, raid countdown (all ready), daily spin

## Daily Challenge Mini-Game
- Spinning wheel with weighted coin rewards (10-1000 coins)
- Streak tracking for consecutive daily spins
- User coins stored in user profile and displayed in header
- Daily spin limit tracked via lastSpinDate

## Quick Raid
- One-tap button to instantly join first available lobby with space
- Located in Join Feed alongside Daily Reward button
- Haptic/sound feedback on activation

## Host Raid Controls
- **Start Raid button**: Hosts can notify all joiners that invites are sent
- **Raid Started indicator**: Shows "RAID IN PROGRESS" status to all players
- Raid history is automatically recorded when host starts the raid

## Elite Early Access
- New lobbies have a 10-second lock for non-Elite users
- Real-time countdown timer shows remaining wait time
- Elite users can join immediately (priority access)
- Lock indicator clearly shows "Elite Early Access" branding

## Security & Scalability

### Security Measures
- **Helmet.js**: Comprehensive HTTP security headers (HSTS, CSP, X-Frame-Options, etc.)
- **CORS**: Configured for Replit domains with proper credentials handling
- **Rate Limiting**: API-wide (1000 req/15min), strict (30 req/min), auth (10 req/15min)
- **Input Sanitization**: All request bodies and query params are sanitized to prevent XSS
- **Content Security Policy**: Restricts script/style/image sources
- **Request Logging**: IP address and user agent tracking for audit trails

### Database (PostgreSQL)
- **Drizzle ORM** for type-safe database queries
- **Connection Pooling**: Max 20 connections with 30s idle timeout
- Tables: users, lobbies, sessions, audit_logs
- User data persistence (coins, raid history, preferences)

### Scalability Architecture
- Stateless API design for horizontal scaling
- In-memory lobby storage with database backup option
- Ready for Redis pub/sub for real-time updates at scale

## User Feedback System
- Feedback modal appears after leaving a completed raid
- Host rating (1-5 stars), app rating, issue reporting
- "Would you recommend" toggle with optional comments
- All feedback stored server-side for admin analysis

## Admin Dashboard
- Token-based authentication using ADMIN_TOKEN secret
- Access via Settings > Admin Dashboard
- View all user feedback with ratings and comments
- Ban users by friend code (permanently removes account)
- Unban users to allow re-registration
- Banned users cannot sign up again with same friend code

## iOS/Android Export
- Full Capacitor integration for native app builds
- See `IOS_DEPLOYMENT_GUIDE.md` for App Store submission
- Export files available in `export/` directory:
  - `go-raiders-complete.tar.gz` - Full project with build
  - `go-raiders-source-only.tar.gz` - Source code only

## Server-Side Raid Boss Validation
- Master list of 22 raid bosses defined in `ALL_BOSSES` (shared/schema.ts)
- Server controls which bosses are currently active via `isActive` flag
- Time windows (startTime/endTime) for automatic rotation expiry
- **API Endpoints**:
  - `GET /api/bosses/active` - Returns only currently available raid bosses
  - `GET /api/bosses/all` - Returns all bosses (for admin/display purposes)
- **Host View**: Fetches active bosses from server, shows loading state
- **Lobby Creation Validation**: Server rejects lobbies with inactive bosses
- Default active rotation: rayquaza, mewtwo, dialga, palkia, lugia, beldum, mega-charizard-x, machamp

## In-App Purchases (Elite Subscription)

### Overview
Elite subscription provides priority queue access, instant raid matching, and exclusive features. The subscription system uses Apple App Store and Google Play Store in-app purchases with secure server-side receipt verification.

### Security Architecture
- **Premium status is ONLY set by the backend** after server-side receipt verification
- Frontend CANNOT directly set `isPremium` - all purchases must go through the verification API
- Receipts are validated with Apple/Google servers before granting access
- All purchase attempts are logged for audit trails

### Product IDs (App Store Connect / Google Play Console)
| Plan | Apple Product ID | Google Product ID | Price |
|------|------------------|-------------------|-------|
| Monthly | `com.goraiders.elite.monthly` | `elite_monthly_subscription` | $4.99 |
| Yearly | `com.goraiders.elite.yearly` | `elite_yearly_subscription` | $49.99 |

### API Endpoints
- `GET /api/subscription/products` - Get available Elite products
- `POST /api/subscription/verify` - Verify purchase receipt (grants premium)
- `GET /api/subscription/status/:userId` - Get user's subscription status
- `POST /api/subscription/restore` - Restore previous purchases
- `GET /api/premium/features` - Premium-only endpoint (protected by middleware)

### Required Environment Variables (Production)
- `APPLE_SHARED_SECRET` - From App Store Connect > In-App Purchases
- `GOOGLE_PLAY_CREDENTIALS` - Service account JSON for Google Play Developer API

### Development Mode
When environment variables are not configured, the system operates in development mode:
- Simulates receipt verification with confirmation dialogs
- Grants premium access for testing purposes
- Logs all verification attempts to console

### Files
- `server/services/subscription.ts` - Receipt verification service
- `server/middleware/require-premium.ts` - Premium access middleware
- `client/src/lib/subscription.ts` - Frontend purchase flow
- `shared/schema.ts` - Subscription schema (subscriptionSchema)

### Elite Features
1. Skip the queue - instant raid matching
2. Priority placement in popular raids
3. No wait time for Elite-locked lobbies
4. Exclusive Elite badge
5. Advanced raid counters & tips

## Recent Changes
- **Secure In-App Purchase system** with Apple/Google receipt verification
- **Premium middleware** for protecting Elite-only API endpoints
- **Subscription API routes** for purchase verification, status checking, and restore
- Initial MVP implementation with full raid coordination features
- Dark/Light theme support
- Team-based styling (Valor/Mystic/Instinct colors)
- Premium subscription UI mockup
- PWA manifest and mobile viewport configuration
- Capacitor integration for native iOS/Android builds
- Safe-area padding for notched devices
- Multi-language internationalization (10 languages)
- Haptic feedback system with Capacitor integration
- Sound effects for raid countdown and user actions
- Quick Raid one-tap join feature
- Host "Raid Starting" notification button
- Raid history tracking in user profile settings
- Pull-to-refresh on join feed (swipe down or tap)
- 10-second Elite early access lock with countdown timer
- 15-minute lobby lifespan with automatic cleanup
- User feedback system with host/app ratings
- Admin dashboard for feedback analysis and user bans
- User ban system preventing re-registration
- Push notifications for raids, player joins, and events (Capacitor integration)
- Server-side raid boss validation with active rotation management
