import { z } from "zod";

// Team definitions - Generic faction names
export const TEAMS = [
  { id: 'ember', name: 'Ember', color: 'text-red-600', bg: 'bg-red-600', border: 'border-red-600', gradient: 'from-red-600 to-red-950', tint: 'bg-red-500/10' },
  { id: 'frost', name: 'Frost', color: 'text-blue-600', bg: 'bg-blue-600', border: 'border-blue-600', gradient: 'from-blue-600 to-blue-950', tint: 'bg-blue-500/10' },
  { id: 'storm', name: 'Storm', color: 'text-yellow-500', bg: 'bg-yellow-500', border: 'border-yellow-500', gradient: 'from-yellow-500 to-yellow-950', tint: 'bg-yellow-500/10' },
  { id: 'neutral', name: 'Neutral', color: 'text-slate-400', bg: 'bg-slate-500', border: 'border-slate-500', gradient: 'from-slate-800 to-slate-900', tint: 'bg-slate-500/10' }
] as const;

export type TeamId = 'ember' | 'frost' | 'storm' | 'neutral';

// Boss definitions - Generic fantasy creatures (no copyrighted names or images)
export const BOSSES = [
  { id: 'skydrake', name: 'Sky Drake', tier: 5, cp: 49808, image: '', isShadow: false, isDynamax: false },
  { id: 'mindweaver', name: 'Mind Weaver', tier: 5, cp: 54148, image: '', isShadow: false, isDynamax: false },
  { id: 'lavagolem', name: 'Lava Golem', tier: 6, cp: 92860, image: '', isShadow: false, isDynamax: false },
  { id: 'deepleviathan', name: 'Deep Leviathan', tier: 6, cp: 92860, image: '', isShadow: false, isDynamax: false },
  { id: 'shadowwing', name: 'Shadow Wing', tier: 5, cp: 45000, image: '', isShadow: true, isDynamax: false },
  { id: 'ironsprite', name: 'Iron Sprite', tier: 1, cp: 5000, image: '', isShadow: false, isDynamax: true },
  { id: 'chronobeast', name: 'Chrono Beast', tier: 5, cp: 53394, image: '', isShadow: false, isDynamax: false },
  { id: 'voidwalker', name: 'Void Walker', tier: 5, cp: 54793, image: '', isShadow: false, isDynamax: false },
  { id: 'phantomwyrm', name: 'Phantom Wyrm', tier: 5, cp: 41776, image: '', isShadow: false, isDynamax: false },
  { id: 'nightstalker', name: 'Night Stalker', tier: 5, cp: 53623, image: '', isShadow: false, isDynamax: false }
] as const;

export type Boss = typeof BOSSES[number];

// Zod schemas
export const playerSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  level: z.number().min(1).max(50),
  team: z.enum(['ember', 'frost', 'storm', 'neutral']),
  isReady: z.boolean(),
  isHost: z.boolean().optional(),
  friendCode: z.string().optional(),
  hasSentRequest: z.boolean().optional()
});

export const userSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  level: z.number().min(1).max(50),
  team: z.enum(['ember', 'frost', 'storm', 'neutral']),
  code: z.string().min(12),
  isPremium: z.boolean(),
  isVerified: z.boolean()
});

export const lobbySchema = z.object({
  id: z.string(),
  bossId: z.string(),
  hostId: z.string(),
  hostName: z.string(),
  hostRating: z.string(),
  players: z.array(playerSchema),
  maxPlayers: z.number().default(6),
  team: z.enum(['ember', 'frost', 'storm', 'neutral']),
  minLevel: z.number().min(1).max(50).default(1),
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

export const FILTERS = ['all', '1', '3', '5', 'mega', 'max', 'shadow'] as const;
export type FilterType = typeof FILTERS[number];
