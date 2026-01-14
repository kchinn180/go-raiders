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

## Recent Changes
- **Production mode** - Test lobbies only appear in development mode; production shows only real host-created raids
- **Go to Game button** - Added button in lobby view to open Pokémon GO app directly via deep link
- **Real-time WebSocket** - Instant lobby updates when players ready up, invites sent, players join/leave
- **Push notifications** - All players receive push notification when host sends invites
- **UI: Bottom padding** - Increased bottom padding (pb-24) to fix last raid being cut off
- **UI: Removed scrollbar styling** - Natural page scrolling without hidden scrollbars
- **UI: Boss type indicators** - Added Mega (tier 4) and Max (isDynamax) badges to lobby cards alongside existing Shadow badge
- **UI: Scroll reset** - Pages now always start scrolled to the top when navigating
- **SECURITY: Client-side premium bypass vulnerability fixed** - Replaced `upgradeToPremium()` with `syncPremiumFromServer()`