import { z } from "zod";
import { pgTable, text, integer, boolean, timestamp, jsonb, varchar, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const usersTable = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  level: integer("level").notNull().default(1),
  team: text("team").notNull().default("neutral"),
  code: text("code").notNull(),
  isPremium: boolean("is_premium").notNull().default(false),
  isVerified: boolean("is_verified").notNull().default(false),
  coins: integer("coins").notNull().default(0),
  subscription: jsonb("subscription"),
  notifications: jsonb("notifications"),
  dailyChallenge: jsonb("daily_challenge"),
  raidHistory: jsonb("raid_history"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const lobbiesTable = pgTable("lobbies", {
  id: varchar("id", { length: 36 }).primaryKey(),
  bossId: text("boss_id").notNull(),
  hostId: text("host_id").notNull(),
  hostName: text("host_name").notNull(),
  hostRating: text("host_rating").notNull().default("4.8"),
  players: jsonb("players").notNull().default([]),
  maxPlayers: integer("max_players").notNull().default(6),
  team: text("team").notNull().default("neutral"),
  minLevel: integer("min_level").notNull().default(1),
  weather: boolean("weather").notNull().default(false),
  timeLeft: integer("time_left").notNull().default(900),
  raidStarted: boolean("raid_started").notNull().default(false),
  invitesSent: boolean("invites_sent").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sessionsTable = pgTable("sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 36 }),
  action: text("action").notNull(),
  resource: text("resource"),
  resourceId: text("resource_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type DbUser = typeof usersTable.$inferSelect;
export type DbLobby = typeof lobbiesTable.$inferSelect;
export type DbSession = typeof sessionsTable.$inferSelect;
export type DbAuditLog = typeof auditLogsTable.$inferSelect;

// Team definitions
export const TEAMS = [
  { id: 'valor', name: 'Valor', color: 'text-red-600', bg: 'bg-red-600', border: 'border-red-600', gradient: 'from-red-600 to-red-950', tint: 'bg-red-500/10' },
  { id: 'mystic', name: 'Mystic', color: 'text-blue-600', bg: 'bg-blue-600', border: 'border-blue-600', gradient: 'from-blue-600 to-blue-950', tint: 'bg-blue-500/10' },
  { id: 'instinct', name: 'Instinct', color: 'text-yellow-500', bg: 'bg-yellow-500', border: 'border-yellow-500', gradient: 'from-yellow-500 to-yellow-950', tint: 'bg-yellow-500/10' },
  { id: 'neutral', name: 'Neutral', color: 'text-slate-400', bg: 'bg-slate-500', border: 'border-slate-500', gradient: 'from-slate-800 to-slate-900', tint: 'bg-slate-500/10' }
] as const;

export type TeamId = 'valor' | 'mystic' | 'instinct' | 'neutral';

// All available raid bosses (master list - server controls which are active)
// Updated to January 2026 Pokemon GO raid rotation
export const ALL_BOSSES = [
  // 5-Star Legendary Raids (Current: January 2026)
  { id: 'genesect-burn', name: 'Genesect (Burn Drive)', tier: 5, cp: 47836, image: 'https://img.pokemondb.net/sprites/home/normal/genesect-burn.png', isShadow: false, isDynamax: false },
  { id: 'genesect-chill', name: 'Genesect (Chill Drive)', tier: 5, cp: 47836, image: 'https://img.pokemondb.net/sprites/home/normal/genesect-douse.png', isShadow: false, isDynamax: false },
  { id: 'thundurus-incarnate', name: 'Thundurus (Incarnate)', tier: 5, cp: 46044, image: 'https://img.pokemondb.net/sprites/home/normal/thundurus-incarnate.png', isShadow: false, isDynamax: false },
  { id: 'tornadus-incarnate', name: 'Tornadus (Incarnate)', tier: 5, cp: 46044, image: 'https://img.pokemondb.net/sprites/home/normal/tornadus-incarnate.png', isShadow: false, isDynamax: false },
  // Shadow Raids (5-Star)
  { id: 'shadow-cresselia', name: 'Shadow Cresselia', tier: 5, cp: 33794, image: 'https://img.pokemondb.net/sprites/home/normal/cresselia.png', isShadow: true, isDynamax: false },
  // Shadow Raids (3-Star)
  { id: 'shadow-scyther', name: 'Shadow Scyther', tier: 3, cp: 17358, image: 'https://img.pokemondb.net/sprites/home/normal/scyther.png', isShadow: true, isDynamax: false },
  { id: 'shadow-aerodactyl', name: 'Shadow Aerodactyl', tier: 3, cp: 18678, image: 'https://img.pokemondb.net/sprites/home/normal/aerodactyl.png', isShadow: true, isDynamax: false },
  { id: 'shadow-sableye', name: 'Shadow Sableye', tier: 3, cp: 8266, image: 'https://img.pokemondb.net/sprites/home/normal/sableye.png', isShadow: true, isDynamax: false },
  // Shadow Raids (1-Star)
  { id: 'shadow-drowzee', name: 'Shadow Drowzee', tier: 1, cp: 4122, image: 'https://img.pokemondb.net/sprites/home/normal/drowzee.png', isShadow: true, isDynamax: false },
  { id: 'shadow-ralts', name: 'Shadow Ralts', tier: 1, cp: 2859, image: 'https://img.pokemondb.net/sprites/home/normal/ralts.png', isShadow: true, isDynamax: false },
  { id: 'shadow-bagon', name: 'Shadow Bagon', tier: 1, cp: 4484, image: 'https://img.pokemondb.net/sprites/home/normal/bagon.png', isShadow: true, isDynamax: false },
  { id: 'shadow-snover', name: 'Shadow Snover', tier: 1, cp: 3896, image: 'https://img.pokemondb.net/sprites/home/normal/snover.png', isShadow: true, isDynamax: false },
  // Mega Raids
  { id: 'mega-blaziken', name: 'Mega Blaziken', tier: 4, cp: 52318, image: 'https://img.pokemondb.net/sprites/home/normal/blaziken-mega.png', isShadow: false, isDynamax: false },
  { id: 'mega-sceptile', name: 'Mega Sceptile', tier: 4, cp: 45349, image: 'https://img.pokemondb.net/sprites/home/normal/sceptile-mega.png', isShadow: false, isDynamax: false },
  { id: 'mega-ampharos', name: 'Mega Ampharos', tier: 4, cp: 50693, image: 'https://img.pokemondb.net/sprites/home/normal/ampharos-mega.png', isShadow: false, isDynamax: false },
  // Tier 3 Raids
  { id: 'onix', name: 'Onix', tier: 3, cp: 7988, image: 'https://img.pokemondb.net/sprites/home/normal/onix.png', isShadow: false, isDynamax: false },
  { id: 'magmar', name: 'Magmar', tier: 3, cp: 14670, image: 'https://img.pokemondb.net/sprites/home/normal/magmar.png', isShadow: false, isDynamax: false },
  { id: 'diggersby', name: 'Diggersby', tier: 3, cp: 11051, image: 'https://img.pokemondb.net/sprites/home/normal/diggersby.png', isShadow: false, isDynamax: false },
  // Tier 1 Raids
  { id: 'ponyta', name: 'Ponyta', tier: 1, cp: 5116, image: 'https://img.pokemondb.net/sprites/home/normal/ponyta.png', isShadow: false, isDynamax: false },
  { id: 'krabby', name: 'Krabby', tier: 1, cp: 4638, image: 'https://img.pokemondb.net/sprites/home/normal/krabby.png', isShadow: false, isDynamax: false },
  { id: 'sandygast', name: 'Sandygast', tier: 1, cp: 4795, image: 'https://img.pokemondb.net/sprites/home/normal/sandygast.png', isShadow: false, isDynamax: false },
  { id: 'scorbunny', name: 'Scorbunny', tier: 1, cp: 3988, image: 'https://img.pokemondb.net/sprites/home/normal/scorbunny.png', isShadow: false, isDynamax: false },
  // Max Battles (Dynamax)
  { id: 'drampa-max', name: 'Drampa (Max)', tier: 1, cp: 6500, image: 'https://img.pokemondb.net/sprites/home/normal/drampa.png', isShadow: false, isDynamax: true },
  { id: 'roggenrola-max', name: 'Roggenrola (Max)', tier: 1, cp: 4200, image: 'https://img.pokemondb.net/sprites/home/normal/roggenrola.png', isShadow: false, isDynamax: true },
  { id: 'beldum-max', name: 'Beldum (Max)', tier: 1, cp: 4100, image: 'https://img.pokemondb.net/sprites/home/normal/beldum.png', isShadow: false, isDynamax: true },
] as const;

// RaidBoss with active status (server-controlled)
export interface RaidBoss {
  id: string;
  name: string;
  tier: number;
  cp: number;
  image: string;
  isShadow: boolean;
  isDynamax: boolean;
  isActive: boolean;
  startTime?: number;
  endTime?: number;
}

// Schema for raid boss validation
export const raidBossSchema = z.object({
  id: z.string(),
  name: z.string(),
  tier: z.number(),
  cp: z.number(),
  image: z.string(),
  isShadow: z.boolean(),
  isDynamax: z.boolean(),
  isActive: z.boolean(),
  startTime: z.number().optional(),
  endTime: z.number().optional(),
});

// Legacy BOSSES export for backward compatibility (now computed from active bosses)
export const BOSSES = ALL_BOSSES;

export type Boss = typeof ALL_BOSSES[number];

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

/**
 * Subscription Schema - Server-Controlled Premium Access
 * 
 * SECURITY: Premium status is ONLY granted after server-side verification
 * of purchase receipts from Apple App Store or Google Play Store.
 * The frontend CANNOT set isPremium directly - it must go through
 * the /api/subscription/verify endpoint which validates receipts.
 */
export const subscriptionSchema = z.object({
  status: z.enum(['active', 'canceled', 'expired', 'pending', 'none']),
  startDate: z.number().nullable(),
  renewalDate: z.number().nullable(),
  canceledAt: z.number().nullable(),
  plan: z.enum(['elite_monthly', 'elite_yearly', 'none']).default('none'),
  price: z.number().default(0),
  // Store-specific fields for receipt verification
  storeType: z.enum(['apple', 'google', 'none']).default('none'),
  originalTransactionId: z.string().nullable().optional(),
  productId: z.string().nullable().optional(),
  // Server verification tracking
  lastVerifiedAt: z.number().nullable().optional(),
  verificationStatus: z.enum(['verified', 'pending', 'failed', 'none']).default('none'),
});

export type Subscription = z.infer<typeof subscriptionSchema>;

export const notificationPrefsSchema = z.object({
  pushEnabled: z.boolean().default(true),
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

export const raidHistoryEntrySchema = z.object({
  id: z.string(),
  bossId: z.string(),
  bossName: z.string(),
  completedAt: z.number(),
  wasHost: z.boolean(),
  playerCount: z.number()
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
  raidHistory: z.array(raidHistoryEntrySchema).optional(),
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
  timeLeft: z.number(),
  raidStarted: z.boolean().default(false),
  invitesSent: z.boolean().default(false)
});

export const insertUserSchema = userSchema.omit({ id: true });
export const insertLobbySchema = lobbySchema.omit({ id: true, createdAt: true });

export type Player = z.infer<typeof playerSchema>;
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Lobby = z.infer<typeof lobbySchema>;
export type InsertLobby = z.infer<typeof insertLobbySchema>;
export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;
export type DailyChallenge = z.infer<typeof dailyChallengeSchema>;
export type RaidHistoryEntry = z.infer<typeof raidHistoryEntrySchema>;

export const FILTERS = ['all', '1', '3', '5', 'mega', 'max', 'shadow'] as const;
export type FilterType = typeof FILTERS[number];

// Queue system for PokeGenie-style boss matching
export const queueEntrySchema = z.object({
  id: z.string(),
  bossId: z.string(),
  userId: z.string(),
  userName: z.string(),
  userLevel: z.number(),
  userTeam: z.enum(['valor', 'mystic', 'instinct', 'neutral']),
  friendCode: z.string(),
  isPremium: z.boolean().default(false),
  joinedAt: z.number(),
  status: z.enum(['waiting', 'matched', 'expired', 'cancelled']).default('waiting'),
  matchedLobbyId: z.string().optional(),
});

export type QueueEntry = z.infer<typeof queueEntrySchema>;
export type InsertQueueEntry = Omit<QueueEntry, 'id' | 'joinedAt' | 'status'>;

export interface QueueStatus {
  bossId: string;
  bossName: string;
  position: number;
  totalInQueue: number;
  estimatedWaitSeconds: number;
  status: 'waiting' | 'matched' | 'expired' | 'cancelled';
  matchedLobbyId?: string;
}

export const feedbackTable = pgTable("feedback", {
  id: serial("id").primaryKey(),
  lobbyId: text("lobby_id").notNull(),
  userId: text("user_id").notNull(),
  hostId: text("host_id").notNull(),
  hostRating: integer("host_rating").notNull(),
  hadIssues: boolean("had_issues").notNull().default(false),
  issueDescription: text("issue_description"),
  appRating: integer("app_rating"),
  wouldRecommend: boolean("would_recommend"),
  comments: text("comments"),
  didParticipate: boolean("did_participate"),
  bossAsSpecified: text("boss_as_specified"),
  trainerCount: text("trainer_count"),
  didWin: text("did_win"),
  thankHostAmount: integer("thank_host_amount"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const feedbackSchema = z.object({
  id: z.number().optional(),
  lobbyId: z.string().min(1, "Lobby ID required").trim(),
  userId: z.string().min(1, "User ID required").trim(),
  hostId: z.string().min(1, "Host ID required").trim(),
  hostRating: z.number().int().min(1).max(5),
  hadIssues: z.boolean().default(false),
  issueDescription: z.string().trim().optional(),
  appRating: z.number().int().min(1).max(5).optional(),
  wouldRecommend: z.boolean().optional(),
  comments: z.string().trim().max(1000).optional(),
  didParticipate: z.boolean().optional(),
  bossAsSpecified: z.enum(['yes', 'no', 'unknown']).optional(),
  trainerCount: z.enum(['unknown', '3orless', '4', '5', '6', '7ormore']).optional(),
  didWin: z.enum(['yes', 'no', 'unknown']).optional(),
  thankHostAmount: z.number().int().min(0).max(20).optional(),
  createdAt: z.number().optional(),
});

export const insertFeedbackSchema = feedbackSchema.omit({ id: true, createdAt: true });

export type Feedback = z.infer<typeof feedbackSchema>;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type DbFeedback = typeof feedbackTable.$inferSelect;

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  lobbyId: text("lobby_id").notNull(),
  reporterId: text("reporter_id").notNull(),
  reporterName: text("reporter_name").notNull(),
  reportedUserId: text("reported_user_id").notNull(),
  reportedUserName: text("reported_user_name").notNull(),
  reason: text("reason").notNull(),
  description: text("description"),
  status: text("status").notNull().default('pending'),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reportSchema = z.object({
  id: z.number().optional(),
  lobbyId: z.string().min(1, "Lobby ID required").trim(),
  reporterId: z.string().min(1, "Reporter ID required").trim(),
  reporterName: z.string().min(1, "Reporter name required").trim(),
  reportedUserId: z.string().min(1, "Reported user ID required").trim(),
  reportedUserName: z.string().min(1, "Reported user name required").trim(),
  reason: z.enum(['no_invite', 'wrong_boss', 'left_early', 'harassment', 'cheating', 'other']),
  description: z.string().trim().max(500).optional(),
  status: z.enum(['pending', 'reviewed', 'resolved', 'dismissed']).default('pending'),
  createdAt: z.number().optional(),
});

export const insertReportSchema = reportSchema.omit({ id: true, createdAt: true, status: true });

export type Report = z.infer<typeof reportSchema>;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type DbReport = typeof reportsTable.$inferSelect;

export const bannedUsersTable = pgTable("banned_users", {
  id: serial("id").primaryKey(),
  friendCode: text("friend_code").notNull().unique(),
  reason: text("reason"),
  bannedBy: text("banned_by").notNull(),
  bannedAt: timestamp("banned_at").defaultNow(),
});

export const bannedUserSchema = z.object({
  id: z.number().optional(),
  friendCode: z.string().min(1).trim(),
  reason: z.string().trim().optional(),
  bannedBy: z.string().min(1).trim(),
  bannedAt: z.number().optional(),
});

export type BannedUser = z.infer<typeof bannedUserSchema>;

export const pushTokensTable = pgTable("push_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  token: text("token").notNull().unique(),
  platform: text("platform").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  lastUsed: timestamp("last_used").defaultNow(),
});

export const pushTokenSchema = z.object({
  id: z.number().optional(),
  userId: z.string().min(1).trim(),
  token: z.string().min(1).trim(),
  platform: z.enum(['ios', 'android', 'web']),
  createdAt: z.number().optional(),
  lastUsed: z.number().optional(),
});

export const insertPushTokenSchema = pushTokenSchema.omit({ id: true, createdAt: true, lastUsed: true });

export type PushToken = z.infer<typeof pushTokenSchema>;
export type InsertPushToken = z.infer<typeof insertPushTokenSchema>;
export type DbPushToken = typeof pushTokensTable.$inferSelect;

export const notificationTypeSchema = z.enum([
  'raid_invite',
  'raid_starting',
  'friend_request',
  'lobby_joined',
  'all_ready',
  'event_announcement'
]);

export type NotificationType = z.infer<typeof notificationTypeSchema>;

// ============================================================================
// POKÉMON TYPE SYSTEM AND DETAILED DATA
// ============================================================================

/**
 * All 18 Pokémon types in the game
 * Used for type effectiveness calculations, weaknesses, and resistances
 */
export const POKEMON_TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
] as const;

export type PokemonType = typeof POKEMON_TYPES[number];

/**
 * Type effectiveness multipliers
 * 1.6 = super effective (1.6x damage in Pokémon GO)
 * 0.625 = not very effective (0.625x damage)
 * 0.390625 = doubly resisted (0.625 * 0.625)
 * 0.244140625 = immune/triply resisted
 */
export const TYPE_EFFECTIVENESS: Record<PokemonType, Partial<Record<PokemonType, number>>> = {
  normal: { rock: 0.625, ghost: 0.390625, steel: 0.625 },
  fire: { fire: 0.625, water: 0.625, grass: 1.6, ice: 1.6, bug: 1.6, rock: 0.625, dragon: 0.625, steel: 1.6 },
  water: { fire: 1.6, water: 0.625, grass: 0.625, ground: 1.6, rock: 1.6, dragon: 0.625 },
  electric: { water: 1.6, electric: 0.625, grass: 0.625, ground: 0.390625, flying: 1.6, dragon: 0.625 },
  grass: { fire: 0.625, water: 1.6, grass: 0.625, poison: 0.625, ground: 1.6, flying: 0.625, bug: 0.625, rock: 1.6, dragon: 0.625, steel: 0.625 },
  ice: { fire: 0.625, water: 0.625, grass: 1.6, ice: 0.625, ground: 1.6, flying: 1.6, dragon: 1.6, steel: 0.625 },
  fighting: { normal: 1.6, ice: 1.6, poison: 0.625, flying: 0.625, psychic: 0.625, bug: 0.625, rock: 1.6, ghost: 0.390625, dark: 1.6, steel: 1.6, fairy: 0.625 },
  poison: { grass: 1.6, poison: 0.625, ground: 0.625, rock: 0.625, ghost: 0.625, steel: 0.390625, fairy: 1.6 },
  ground: { fire: 1.6, electric: 1.6, grass: 0.625, poison: 1.6, flying: 0.390625, bug: 0.625, rock: 1.6, steel: 1.6 },
  flying: { electric: 0.625, grass: 1.6, fighting: 1.6, bug: 1.6, rock: 0.625, steel: 0.625 },
  psychic: { fighting: 1.6, poison: 1.6, psychic: 0.625, dark: 0.390625, steel: 0.625 },
  bug: { fire: 0.625, grass: 1.6, fighting: 0.625, poison: 0.625, flying: 0.625, psychic: 1.6, ghost: 0.625, dark: 1.6, steel: 0.625, fairy: 0.625 },
  rock: { fire: 1.6, ice: 1.6, fighting: 0.625, ground: 0.625, flying: 1.6, bug: 1.6, steel: 0.625 },
  ghost: { normal: 0.390625, psychic: 1.6, ghost: 1.6, dark: 0.625 },
  dragon: { dragon: 1.6, steel: 0.625, fairy: 0.390625 },
  dark: { fighting: 0.625, psychic: 1.6, ghost: 1.6, dark: 0.625, fairy: 0.625 },
  steel: { fire: 0.625, water: 0.625, electric: 0.625, ice: 1.6, rock: 1.6, steel: 0.625, fairy: 1.6 },
  fairy: { fire: 0.625, fighting: 1.6, poison: 0.625, dragon: 1.6, dark: 1.6, steel: 0.625 }
};

/**
 * Move data structure for fast and charged moves
 */
export interface PokemonMove {
  name: string;
  type: PokemonType;
  damage: number;
  energy: number; // Energy gain (fast) or cost (charged)
  duration: number; // In seconds
  isLegacy?: boolean;
  isElite?: boolean;
}

/**
 * Base stats for a Pokémon (Attack, Defense, Stamina)
 */
export interface PokemonStats {
  attack: number;
  defense: number;
  stamina: number;
}

/**
 * Extended Pokémon details for the details modal
 * Includes types, moves, stats, and calculated weaknesses/resistances
 */
export interface PokemonDetails {
  id: string;
  name: string;
  types: PokemonType[];
  stats: PokemonStats;
  fastMoves: PokemonMove[];
  chargedMoves: PokemonMove[];
  weaknesses: { type: PokemonType; multiplier: number }[];
  resistances: { type: PokemonType; multiplier: number }[];
  tier?: number;
  cp?: number;
  image: string;
  raidEndTime?: number; // Unix timestamp when raid ends
}

/**
 * Counter Pokémon recommendation with effectiveness score
 */
export interface CounterPokemon {
  id: string;
  name: string;
  types: PokemonType[];
  stats: PokemonStats;
  image: string;
  fastMove: PokemonMove;
  chargedMove: PokemonMove;
  effectivenessScore: number; // Calculated DPS * effectiveness
  dps: number; // Damage per second
}

/**
 * Complete raid boss details response from API
 */
export interface RaidBossDetails {
  pokemon: PokemonDetails;
  counters: CounterPokemon[];
  estimatedPlayers: number; // Minimum players recommended
}

// Zod schemas for validation
export const pokemonMoveSchema = z.object({
  name: z.string(),
  type: z.enum(POKEMON_TYPES),
  damage: z.number(),
  energy: z.number(),
  duration: z.number(),
  isLegacy: z.boolean().optional(),
  isElite: z.boolean().optional()
});

export const pokemonStatsSchema = z.object({
  attack: z.number(),
  defense: z.number(),
  stamina: z.number()
});

export const pokemonDetailsSchema = z.object({
  id: z.string(),
  name: z.string(),
  types: z.array(z.enum(POKEMON_TYPES)),
  stats: pokemonStatsSchema,
  fastMoves: z.array(pokemonMoveSchema),
  chargedMoves: z.array(pokemonMoveSchema),
  weaknesses: z.array(z.object({ type: z.enum(POKEMON_TYPES), multiplier: z.number() })),
  resistances: z.array(z.object({ type: z.enum(POKEMON_TYPES), multiplier: z.number() })),
  tier: z.number().optional(),
  cp: z.number().optional(),
  image: z.string(),
  raidEndTime: z.number().optional()
});

export const counterPokemonSchema = z.object({
  id: z.string(),
  name: z.string(),
  types: z.array(z.enum(POKEMON_TYPES)),
  stats: pokemonStatsSchema,
  image: z.string(),
  fastMove: pokemonMoveSchema,
  chargedMove: pokemonMoveSchema,
  effectivenessScore: z.number(),
  dps: z.number()
});

export const raidBossDetailsSchema = z.object({
  pokemon: pokemonDetailsSchema,
  counters: z.array(counterPokemonSchema),
  estimatedPlayers: z.number()
});
