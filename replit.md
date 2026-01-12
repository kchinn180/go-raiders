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

## Recent Changes
- Initial MVP implementation with full raid coordination features
- Dark/Light theme support
- Team-based styling (Valor/Mystic/Instinct colors)
- Premium subscription UI mockup
- PWA manifest and mobile viewport configuration
- Capacitor integration for native iOS/Android builds
- Safe-area padding for notched devices
- Multi-language internationalization (10 languages)
- Daily challenge spinning wheel mini-game with coin rewards
- Haptic feedback system with Capacitor integration
- Sound effects for raid countdown and user actions
- Quick Raid one-tap join feature
