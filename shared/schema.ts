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
export type Subscription = z.infer<typeof subscriptionSchema>;
export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;
export type DailyChallenge = z.infer<typeof dailyChallengeSchema>;
export type RaidHistoryEntry = z.infer<typeof raidHistoryEntrySchema>;

export const FILTERS = ['all', '1', '3', '5', 'mega', 'max', 'shadow'] as const;
export type FilterType = typeof FILTERS[number];

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
  createdAt: z.number().optional(),
});

export const insertFeedbackSchema = feedbackSchema.omit({ id: true, createdAt: true });

export type Feedback = z.infer<typeof feedbackSchema>;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type DbFeedback = typeof feedbackTable.$inferSelect;

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
