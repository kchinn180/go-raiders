# GO Raiders - Pokémon GO Raid Coordination App

## Overview
GO Raiders is a Pokémon GO raid coordination application designed to help trainers find and join raid lobbies, host their own raids, and coordinate with other players in real-time. The app aims to enhance the Pokémon GO raiding experience by providing robust coordination tools, real-time updates, and an intuitive user interface. It leverages official Pokémon names/images from PokémonDB and integrates official team names (Valor, Mystic, Instinct) to create an immersive and authentic experience for players.

The project's vision is to become the leading platform for Pokémon GO raid coordination, offering seamless integration with mobile platforms and providing premium features for advanced users.

## User Preferences
I want the agent to use clear and concise language. When making changes, prioritize maintainability and scalability. Before implementing significant architectural changes, please ask for confirmation. I prefer an iterative development approach, with regular updates on progress and proposed next steps.

## System Architecture

### UI/UX Decisions
The application features a responsive design with full dark/light theme support, accented by team-specific colors (volcanic/lava theme). It uses Shadcn/ui components with Tailwind CSS for a modern and consistent look. Mobile deployment is prioritized with Capacitor for native iOS/Android builds, including PWA features, safe-area-inset support for notched devices, and optimized mobile viewport configurations. Boss type indicators (Shadow, Mega, Max) are visually distinct on lobby cards, and the UI includes pull-to-refresh functionality on feeds and scroll-to-top behavior for page navigation.

### Technical Implementations
The frontend is built with **React** and **TypeScript**, utilizing **Wouter** for routing and **TanStack Query** for data fetching. Global state management is handled via React Contexts (Theme/User). The backend is an **Express** server, initially using in-memory storage for lobbies and users, with a **PostgreSQL** database and **Drizzle ORM** for persistent user data (coins, raid history, preferences). The application uses **Zod schemas** for validation and shared type definitions across frontend and backend.

### Feature Specifications
- **User Onboarding**: Profile setup including trainer name, team, level, and friend code.
- **Raid Coordination**: Users can browse and filter raid lobbies by tier and Pokémon, host new raids with boss selection, and manage real-time lobby views with player lists, ready statuses, and friend code exchange.
- **In-App Purchases**: Elite subscription offers features like Auto Join, no wait time, and priority queue, secured by server-side receipt verification (Apple App Store & Google Play Store).
- **Mini-Games & Rewards**: Daily Challenge mini-game with a spinning wheel for coin rewards and streak tracking.
- **Host Controls**: Hosts can adjust lobby capacity (2-10 players), notify players when a raid is starting, and manage raid settings.
- **Internationalization**: Support for 10 languages (English, Spanish, Portuguese, French, German, Japanese, Korean, Chinese S/T, Arabic) with a language selector.
- **Haptic & Sound Feedback**: Integrated haptics via Capacitor and Web Audio API for sound effects on key interactions.
- **Security**: Implemented with Helmet.js for HTTP headers, CORS configuration, API rate limiting, input sanitization, and Content Security Policy.
- **Admin Tools**: An admin dashboard allows viewing user feedback, managing user bans (by friend code), and reviewing reports.
- **Server-Side Validation**: Raid boss selection is validated against an active server-controlled list with time windows for rotation. Elite Early Access is strictly enforced server-side with anti-spoofing measures.

## External Dependencies

- **PokémonDB**: For Pokémon names and images.
- **Capacitor**: For native mobile deployment (iOS, Android) and PWA features.
- **Apple App Store**: For iOS app distribution and in-app purchases.
- **Google Play Store**: For Android app distribution and in-app purchases.
- **PostgreSQL**: Relational database for user data persistence.
- **Helmet.js**: For enhancing HTTP security headers.
- **react-i18next**: For internationalization and localization.
- **Zod**: For schema validation.
- **Drizzle ORM**: For type-safe database queries with PostgreSQL.

## UI Features

### Boss Type Indicators (lobby-card.tsx)
- **Shadow**: Purple badge for Shadow raid bosses (uses `boss.isShadow` flag)
- **Mega**: Orange badge for Mega Evolution bosses (uses `boss.tier === 4`)
- **Max**: Pink badge for Dynamax/Gigantamax bosses (uses `boss.isDynamax` flag)
- Badges are styled consistently with similar size (text-[9px]) to avoid visual clutter

### Pull-to-Refresh (join-feed.tsx)
- Pull-down gesture triggers refresh with spinning icon indicator
- No visible button - swipe down only
- Queue bar positioned at top of feed, immediately under header

### Scroll Reset Behavior (home.tsx)
- All pages scroll to top when view changes
- Uses ref on main content area with `scrollTo({ top: 0, behavior: 'auto' })`
- Prevents pages from opening at previous scroll position

## Queue System Architecture

### Structured Fairness Queue (server/storage.ts)
- **Priority Score**: Lower score = higher priority. Modifiers: Premium users get -10 boost; frequent leavers get +5 per leave; no-response penalty +10 per ignored promotion
- **Rejoin Protection**: Original join timestamp preserved on rejoin so cycling doesn't reset position
- **Rapid Rejoin Cooldown**: Leaving within 30s of joining triggers a 60-second cooldown before rejoining
- **Reservation System**: When a slot opens, user is `reserved` (not placed) and has 20 seconds to accept via WebSocket notification
- **Disconnect Handling**: Free users removed after 30s disconnect; Premium users get 2 minutes
- **Background Jobs**: Heartbeat check every 10s, reservation expiry every 5s, queue matching every 15s
- **Anti-Abuse Tracking**: Persistent `UserAbuseRecord` per user — survives queue leave/rejoin cycles

### New Queue API Endpoints
- `POST /api/queue/heartbeat` — keep slot alive (called every 10s by frontend)
- `POST /api/queue/accept` — accept reservation and enter lobby
- `POST /api/queue/reject` — decline reservation (penalty applied)

### WebSocket Queue Channel
- Clients subscribe to a boss queue with `subscribe_queue` message
- `queue_update` events broadcast to all watchers when queue changes
- `queue_promotion` event sent directly to the reserved user

## Recent Changes
- **QUEUE: Structured fairness system** - Full queue overhaul with priority scoring, reservation system, anti-abuse, and disconnect handling
- **QUEUE: WebSocket real-time updates** - Queue position updates and promotion notifications via WebSocket (no polling required)
- **QUEUE: Reservation UI** - 20-second countdown with circular progress ring, Accept/Skip buttons when promoted
- **QUEUE: Almost your turn indicator** - Amber highlighting when at position 1 or 2
- **QUEUE: Heartbeat system** - Frontend sends heartbeat every 10s to maintain queue slot; disconnect tolerance 30s (free) / 2min (premium)
- **QUEUE: Anti-abuse cooldowns** - Rapid rejoin (< 30s) triggers 60-second cooldown; penalizes ignoring promotions
- **QUEUE: Position change animation** - Position number scales on change + medium haptic feedback
- **No mock lobbies** - Removed all test/mock lobbies; queue is empty until hosts create real raids (both dev and production)
- **In-App Purchases** - Elite subscriptions via Apple App Store and Google Play Store only ($6.99/month, $69.90/year)
- **Webhook endpoints** - Added /api/webhooks/apple and /api/webhooks/google for subscription lifecycle events
- **Restore purchases** - Added restore purchases functionality per App Store guidelines
- **Go to Game button** - Added button in lobby view to open Pokémon GO app directly via deep link (blue color)
- **UI: Smaller lobby buttons** - All lobby buttons reduced in size with py-3 and text-sm
- **UI: Ready button colors** - Yellow initially, green after ready up
- **UI: Joiner combined button** - Friend request + ready combined into single button for joiners
- **UI: Host invite button** - Resend invites button uses ghost variant (background color)
- **BUG FIX: Ready button crash** - Fixed WebSocket cleanup and wrapped haptic calls in try-catch
- **Real-time WebSocket** - Instant lobby updates when players ready up, invites sent, players join/leave
- **Push notifications** - All players receive push notification when host sends invites
- **HOST: Combined Ready + Send Invites** - Single button that marks host ready and sends invites; host cannot unready after pressing
- **HOST: Capacity slider on setup page** - Raid capacity (2-6) now configured before lobby creation, not inside lobby
- **OPTIMISTIC UPDATES** - Buttons respond instantly with local state, synced when server confirms
- **HOST: One raid at a time** - Server enforces hosts can only host ONE raid; must close current to start new
- **JOINER: One lobby at a time** - Server enforces joiners can only join ONE lobby at a time
- **HOST LEAVES = LOBBY CLOSED** - When host leaves, entire lobby is deleted and all joiners notified via WebSocket
- **UI: Bottom padding** - Increased bottom padding (pb-24) to fix last raid being cut off
- **UI: Removed member count** - Removed "X/Y Raiders" display from lobby, only Ready count shown
- **UI: Boss types displayed** - Pokemon types now shown next to tier and CP in lobby (e.g., "Bug/Steel")
- **RAID LOCK** - After host clicks "Start Raid", no new users can join the lobby
- **UI: Removed scrollbar styling** - Natural page scrolling without hidden scrollbars
- **UI: Boss type indicators** - Added Mega (tier 4) and Max (isDynamax) badges to lobby cards alongside existing Shadow badge
- **UI: Scroll reset** - Pages now always start scrolled to the top when navigating
- **SECURITY: Client-side premium bypass vulnerability fixed** - Replaced `upgradeToPremium()` with `syncPremiumFromServer()`