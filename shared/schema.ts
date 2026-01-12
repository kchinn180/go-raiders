import { z } from "zod";

// Team definitions
export const TEAMS = [
  { id: 'valor', name: 'Valor', color: 'text-red-600', bg: 'bg-red-600', border: 'border-red-600', gradient: 'from-red-600 to-red-950', tint: 'bg-red-500/10' },
  { id: 'mystic', name: 'Mystic', color: 'text-blue-600', bg: 'bg-blue-600', border: 'border-blue-600', gradient: 'from-blue-600 to-blue-950', tint: 'bg-blue-500/10' },
  { id: 'instinct', name: 'Instinct', color: 'text-yellow-500', bg: 'bg-yellow-500', border: 'border-yellow-500', gradient: 'from-yellow-500 to-yellow-950', tint: 'bg-yellow-500/10' },
  { id: 'neutral', name: 'Neutral', color: 'text-slate-400', bg: 'bg-slate-500', border: 'border-slate-500', gradient: 'from-slate-800 to-slate-900', tint: 'bg-slate-500/10' }
] as const;

export type TeamId = 'valor' | 'mystic' | 'instinct' | 'neutral';

// Boss definitions - Current raid Pokémon
export const BOSSES = [
  { id: 'rayquaza', name: 'Rayquaza', tier: 5, cp: 49808, image: 'https://img.pokemondb.net/sprites/home/normal/rayquaza.png', isShadow: false, isDynamax: false },
  { id: 'mewtwo', name: 'Mewtwo', tier: 5, cp: 54148, image: 'https://img.pokemondb.net/sprites/home/normal/mewtwo.png', isShadow: false, isDynamax: false },
  { id: 'groudon', name: 'Primal Groudon', tier: 6, cp: 92860, image: 'https://img.pokemondb.net/sprites/home/normal/groudon-primal.png', isShadow: false, isDynamax: false },
  { id: 'kyogre', name: 'Primal Kyogre', tier: 6, cp: 92860, image: 'https://img.pokemondb.net/sprites/home/normal/kyogre-primal.png', isShadow: false, isDynamax: false },
  { id: 'lugia', name: 'Shadow Lugia', tier: 5, cp: 45000, image: 'https://img.pokemondb.net/sprites/home/normal/lugia.png', isShadow: true, isDynamax: false },
  { id: 'beldum', name: 'Beldum (Max)', tier: 1, cp: 5000, image: 'https://img.pokemondb.net/sprites/home/normal/beldum.png', isShadow: false, isDynamax: true },
  { id: 'dialga', name: 'Dialga', tier: 5, cp: 53394, image: 'https://img.pokemondb.net/sprites/home/normal/dialga.png', isShadow: false, isDynamax: false },
  { id: 'palkia', name: 'Palkia', tier: 5, cp: 54793, image: 'https://img.pokemondb.net/sprites/home/normal/palkia.png', isShadow: false, isDynamax: false },
  { id: 'giratina', name: 'Giratina', tier: 5, cp: 41776, image: 'https://img.pokemondb.net/sprites/home/normal/giratina-altered.png', isShadow: false, isDynamax: false },
  { id: 'darkrai', name: 'Darkrai', tier: 5, cp: 53623, image: 'https://img.pokemondb.net/sprites/home/normal/darkrai.png', isShadow: false, isDynamax: false }
] as const;

export type Boss = typeof BOSSES[number];

// Zod schemas
export const playerSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  level: z.number().min(1).max(80),
  team: z.enum(['valor', 'mystic', 'instinct', 'neutral']),
  isReady: z.boolean(),
  isHost: z.boolean().optional(),
  isPremium: z.boolean().optional(),
  friendCode: z.string().optional(),
  hasSentRequest: z.boolean().optional()
});

export const subscriptionSchema = z.object({
  status: z.enum(['active', 'canceled', 'expired', 'none']),
  startDate: z.number().nullable(),
  renewalDate: z.number().nullable(),
  canceledAt: z.number().nullable(),
  plan: z.enum(['monthly', 'none']).default('none'),
  price: z.number().default(0)
});

export const notificationPrefsSchema = z.object({
  lobbyAlerts: z.boolean().default(true),
  friendRequests: z.boolean().default(true),
  raidReminders: z.boolean().default(true),
  marketing: z.boolean().default(false),
  hapticFeedback: z.boolean().default(true),
  soundEffects: z.boolean().default(true)
});

export const dailyChallengeSchema = z.object({
  lastSpinDate: z.string().nullable(),
  streak: z.number().default(0),
  totalSpins: z.number().default(0)
});

export const userSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  level: z.number().min(1).max(80),
  team: z.enum(['valor', 'mystic', 'instinct', 'neutral']),
  code: z.string().min(12),
  isPremium: z.boolean(),
  isVerified: z.boolean(),
  coins: z.number().default(0),
  subscription: subscriptionSchema.optional(),
  notifications: notificationPrefsSchema.optional(),
  dailyChallenge: dailyChallengeSchema.optional(),
  createdAt: z.number().optional()
});

export const lobbySchema = z.object({
  id: z.string(),
  bossId: z.string(),
  hostId: z.string(),
  hostName: z.string(),
  hostRating: z.string(),
  players: z.array(playerSchema),
  maxPlayers: z.number().default(6),
  team: z.enum(['valor', 'mystic', 'instinct', 'neutral']),
  minLevel: z.number().min(1).max(80).default(1),
  weather: z.boolean().default(false),
  createdAt: z.number(),
  timeLeft: z.number()
});

export const insertUserSchema = userSchema.omit({ id: true });
export const insertLobbySchema = lobbySchema.omit({ id: true, createdAt: true });

export type Player = z.infer<typeof playerSchema>;
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Lobby = z.infer<typeof lobbySchema>;
export type InsertLobby = z.infer<typeof insertLobbySchema>;
export type Subscription = z.infer<typeof subscriptionSchema>;
export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;
export type DailyChallenge = z.infer<typeof dailyChallengeSchema>;

export const FILTERS = ['all', '1', '3', '5', 'mega', 'max', 'shadow'] as const;
export type FilterType = typeof FILTERS[number];
