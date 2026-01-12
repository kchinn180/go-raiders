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

## Recent Changes
- Initial MVP implementation with full raid coordination features
- Dark/Light theme support
- Team-based styling (Valor/Mystic/Instinct colors)
- Premium subscription UI mockup
