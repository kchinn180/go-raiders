import { pgTable, text, integer, boolean, timestamp, jsonb, varchar, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
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

export const lobbies = pgTable("lobbies", {
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

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

export const auditLogs = pgTable("audit_logs", {
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

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertLobbySchema = createInsertSchema(lobbies).omit({ id: true, createdAt: true });
export const insertSessionSchema = createInsertSchema(sessions).omit({ createdAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });

export type DbUser = typeof users.$inferSelect;
export type InsertDbUser = z.infer<typeof insertUserSchema>;
export type DbLobby = typeof lobbies.$inferSelect;
export type InsertDbLobby = z.infer<typeof insertLobbySchema>;
export type DbSession = typeof sessions.$inferSelect;
export type InsertDbSession = z.infer<typeof insertSessionSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
