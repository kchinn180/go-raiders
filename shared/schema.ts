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

/**
 * CurrentBoss — the only boss type used by the app's selection UI.
 * Populated entirely from live scraping of the three raid-rotation sources.
 * No hardcoded data, no historical database.
 */
export interface CurrentBoss {
  /** URL-safe slug: "mega-heracross", "shadow-regirock" */
  id: string;
  /** Display name: "Mega Heracross", "Shadow Regirock", "Cresselia" */
  name: string;
  /** Raid tier: 1 | 3 | 4 (mega) | 5 | 6 (elite/dynamax) */
  tier: number;
  /** Human-readable category: "Tier 1" | "Tier 3" | "Tier 5" | "Mega" | "Shadow" | "Dynamax" | "Elite" */
  category: string;
  /** "Normal" | "Mega" | "Shadow" | "Dynamax" */
  variant: string;
  isShadow: boolean;
  isDynamax: boolean;
  /** Best-effort pokemondb.net sprite URL — SafeImage handles 404s gracefully */
  image?: string;
}

// All available raid bosses (master list - server controls which are active)
// Cross-referenced with live sources — accurate as of May 2026
export const ALL_BOSSES = [
  // ── 5-Star Legendary Raids ───────────────────────────────────
  { id: 'mewtwo',              name: 'Mewtwo',              tier: 5, cp: 54148, image: 'https://img.pokemondb.net/sprites/home/normal/mewtwo.png',              isShadow: false, isDynamax: false, types: ['Psychic'] as const },
  { id: 'articuno',            name: 'Articuno',            tier: 5, cp: 37603, image: 'https://img.pokemondb.net/sprites/home/normal/articuno.png',            isShadow: false, isDynamax: false, types: ['Ice', 'Flying'] as const },
  { id: 'zapdos',              name: 'Zapdos',              tier: 5, cp: 46857, image: 'https://img.pokemondb.net/sprites/home/normal/zapdos.png',              isShadow: false, isDynamax: false, types: ['Electric', 'Flying'] as const },
  { id: 'moltres',             name: 'Moltres',             tier: 5, cp: 46941, image: 'https://img.pokemondb.net/sprites/home/normal/moltres.png',             isShadow: false, isDynamax: false, types: ['Fire', 'Flying'] as const },
  { id: 'lugia',               name: 'Lugia',               tier: 5, cp: 45925, image: 'https://img.pokemondb.net/sprites/home/normal/lugia.png',               isShadow: false, isDynamax: false, types: ['Psychic', 'Flying'] as const },
  { id: 'ho-oh',               name: 'Ho-Oh',               tier: 5, cp: 46578, image: 'https://img.pokemondb.net/sprites/home/normal/ho-oh.png',               isShadow: false, isDynamax: false, types: ['Fire', 'Flying'] as const },
  { id: 'raikou',              name: 'Raikou',              tier: 5, cp: 45435, image: 'https://img.pokemondb.net/sprites/home/normal/raikou.png',              isShadow: false, isDynamax: false, types: ['Electric'] as const },
  { id: 'entei',               name: 'Entei',               tier: 5, cp: 46019, image: 'https://img.pokemondb.net/sprites/home/normal/entei.png',               isShadow: false, isDynamax: false, types: ['Fire'] as const },
  { id: 'suicune',             name: 'Suicune',             tier: 5, cp: 37108, image: 'https://img.pokemondb.net/sprites/home/normal/suicune.png',             isShadow: false, isDynamax: false, types: ['Water'] as const },
  { id: 'regirock',            name: 'Regirock',            tier: 5, cp: 39130, image: 'https://img.pokemondb.net/sprites/home/normal/regirock.png',            isShadow: false, isDynamax: false, types: ['Rock'] as const },
  { id: 'regice',              name: 'Regice',              tier: 5, cp: 33085, image: 'https://img.pokemondb.net/sprites/home/normal/regice.png',              isShadow: false, isDynamax: false, types: ['Ice'] as const },
  { id: 'registeel',           name: 'Registeel',           tier: 5, cp: 30596, image: 'https://img.pokemondb.net/sprites/home/normal/registeel.png',           isShadow: false, isDynamax: false, types: ['Steel'] as const },
  { id: 'latias',              name: 'Latias',              tier: 5, cp: 43470, image: 'https://img.pokemondb.net/sprites/home/normal/latias.png',              isShadow: false, isDynamax: false, types: ['Dragon', 'Psychic'] as const },
  { id: 'latios',              name: 'Latios',              tier: 5, cp: 45826, image: 'https://img.pokemondb.net/sprites/home/normal/latios.png',              isShadow: false, isDynamax: false, types: ['Dragon', 'Psychic'] as const },
  { id: 'kyogre',              name: 'Kyogre',              tier: 5, cp: 56473, image: 'https://img.pokemondb.net/sprites/home/normal/kyogre.png',              isShadow: false, isDynamax: false, types: ['Water'] as const },
  { id: 'groudon',             name: 'Groudon',             tier: 5, cp: 54411, image: 'https://img.pokemondb.net/sprites/home/normal/groudon.png',             isShadow: false, isDynamax: false, types: ['Ground'] as const },
  { id: 'rayquaza',            name: 'Rayquaza',            tier: 5, cp: 49808, image: 'https://img.pokemondb.net/sprites/home/normal/rayquaza.png',            isShadow: false, isDynamax: false, types: ['Dragon', 'Flying'] as const },
  { id: 'uxie',                name: 'Uxie',                tier: 5, cp: 29966, image: 'https://img.pokemondb.net/sprites/home/normal/uxie.png',                isShadow: false, isDynamax: false, types: ['Psychic'] as const },
  { id: 'mesprit',             name: 'Mesprit',             tier: 5, cp: 34745, image: 'https://img.pokemondb.net/sprites/home/normal/mesprit.png',             isShadow: false, isDynamax: false, types: ['Psychic'] as const },
  { id: 'azelf',               name: 'Azelf',               tier: 5, cp: 38664, image: 'https://img.pokemondb.net/sprites/home/normal/azelf.png',               isShadow: false, isDynamax: false, types: ['Psychic'] as const },
  { id: 'dialga',              name: 'Dialga',              tier: 5, cp: 49441, image: 'https://img.pokemondb.net/sprites/home/normal/dialga.png',              isShadow: false, isDynamax: false, types: ['Steel', 'Dragon'] as const },
  { id: 'palkia',              name: 'Palkia',              tier: 5, cp: 47011, image: 'https://img.pokemondb.net/sprites/home/normal/palkia.png',              isShadow: false, isDynamax: false, types: ['Water', 'Dragon'] as const },
  { id: 'heatran',             name: 'Heatran',             tier: 5, cp: 46430, image: 'https://img.pokemondb.net/sprites/home/normal/heatran.png',             isShadow: false, isDynamax: false, types: ['Fire', 'Steel'] as const },
  { id: 'regigigas',           name: 'Regigigas',           tier: 5, cp: 38888, image: 'https://img.pokemondb.net/sprites/home/normal/regigigas.png',           isShadow: false, isDynamax: false, types: ['Normal'] as const },
  { id: 'giratina-altered',    name: 'Giratina (Altered)',  tier: 5, cp: 45435, image: 'https://img.pokemondb.net/sprites/home/normal/giratina-altered.png',    isShadow: false, isDynamax: false, types: ['Ghost', 'Dragon'] as const },
  { id: 'giratina-origin',     name: 'Giratina (Origin)',   tier: 5, cp: 45564, image: 'https://img.pokemondb.net/sprites/home/normal/giratina-origin.png',     isShadow: false, isDynamax: false, types: ['Ghost', 'Dragon'] as const },
  { id: 'cresselia',           name: 'Cresselia',           tier: 5, cp: 33794, image: 'https://img.pokemondb.net/sprites/home/normal/cresselia.png',           isShadow: false, isDynamax: false, types: ['Psychic'] as const },
  { id: 'darkrai',             name: 'Darkrai',             tier: 5, cp: 53623, image: 'https://img.pokemondb.net/sprites/home/normal/darkrai.png',             isShadow: false, isDynamax: false, types: ['Dark'] as const },
  { id: 'cobalion',            name: 'Cobalion',            tier: 5, cp: 40285, image: 'https://img.pokemondb.net/sprites/home/normal/cobalion.png',            isShadow: false, isDynamax: false, types: ['Steel', 'Fighting'] as const },
  { id: 'terrakion',           name: 'Terrakion',           tier: 5, cp: 47532, image: 'https://img.pokemondb.net/sprites/home/normal/terrakion.png',           isShadow: false, isDynamax: false, types: ['Rock', 'Fighting'] as const },
  { id: 'virizion',            name: 'Virizion',            tier: 5, cp: 37555, image: 'https://img.pokemondb.net/sprites/home/normal/virizion.png',            isShadow: false, isDynamax: false, types: ['Grass', 'Fighting'] as const },
  { id: 'tornadus-incarnate',  name: 'Tornadus',            tier: 5, cp: 41758, image: 'https://img.pokemondb.net/sprites/home/normal/tornadus.png',            isShadow: false, isDynamax: false, types: ['Flying'] as const },
  { id: 'thundurus-incarnate', name: 'Thundurus',           tier: 5, cp: 44668, image: 'https://img.pokemondb.net/sprites/home/normal/thundurus.png',           isShadow: false, isDynamax: false, types: ['Electric', 'Flying'] as const },
  { id: 'landorus-incarnate',  name: 'Landorus',            tier: 5, cp: 49695, image: 'https://img.pokemondb.net/sprites/home/normal/landorus.png',            isShadow: false, isDynamax: false, types: ['Ground', 'Flying'] as const },
  { id: 'reshiram',            name: 'Reshiram',            tier: 5, cp: 53623, image: 'https://img.pokemondb.net/sprites/home/normal/reshiram.png',            isShadow: false, isDynamax: false, types: ['Dragon', 'Fire'] as const },
  { id: 'zekrom',              name: 'Zekrom',              tier: 5, cp: 52858, image: 'https://img.pokemondb.net/sprites/home/normal/zekrom.png',              isShadow: false, isDynamax: false, types: ['Dragon', 'Electric'] as const },
  { id: 'kyurem',              name: 'Kyurem',              tier: 5, cp: 45079, image: 'https://img.pokemondb.net/sprites/home/normal/kyurem.png',              isShadow: false, isDynamax: false, types: ['Dragon', 'Ice'] as const },
  { id: 'xerneas',             name: 'Xerneas',             tier: 5, cp: 52818, image: 'https://img.pokemondb.net/sprites/home/normal/xerneas.png',             isShadow: false, isDynamax: false, types: ['Fairy'] as const },
  { id: 'yveltal',             name: 'Yveltal',             tier: 5, cp: 52042, image: 'https://img.pokemondb.net/sprites/home/normal/yveltal.png',             isShadow: false, isDynamax: false, types: ['Dark', 'Flying'] as const },
  { id: 'diancie',             name: 'Diancie',             tier: 5, cp: 37408, image: 'https://img.pokemondb.net/sprites/home/normal/diancie.png',             isShadow: false, isDynamax: false, types: ['Rock', 'Fairy'] as const },
  { id: 'hoopa',               name: 'Hoopa Unbound',       tier: 5, cp: 55717, image: 'https://img.pokemondb.net/sprites/home/normal/hoopa.png',               isShadow: false, isDynamax: false, types: ['Psychic', 'Dark'] as const },
  { id: 'volcanion',           name: 'Volcanion',           tier: 5, cp: 44590, image: 'https://img.pokemondb.net/sprites/home/normal/volcanion.png',           isShadow: false, isDynamax: false, types: ['Fire', 'Water'] as const },
  { id: 'tapu-koko',           name: 'Tapu Koko',           tier: 5, cp: 42076, image: 'https://img.pokemondb.net/sprites/home/normal/tapu-koko.png',           isShadow: false, isDynamax: false, types: ['Electric', 'Fairy'] as const },
  { id: 'tapu-lele',           name: 'Tapu Lele',           tier: 5, cp: 42501, image: 'https://img.pokemondb.net/sprites/home/normal/tapu-lele.png',           isShadow: false, isDynamax: false, types: ['Psychic', 'Fairy'] as const },
  { id: 'tapu-bulu',           name: 'Tapu Bulu',           tier: 5, cp: 46044, image: 'https://img.pokemondb.net/sprites/home/normal/tapu-bulu.png',           isShadow: false, isDynamax: false, types: ['Grass', 'Fairy'] as const },
  { id: 'tapu-fini',           name: 'Tapu Fini',           tier: 5, cp: 40765, image: 'https://img.pokemondb.net/sprites/home/normal/tapu-fini.png',           isShadow: false, isDynamax: false, types: ['Water', 'Fairy'] as const },
  { id: 'nihilego',            name: 'Nihilego',            tier: 5, cp: 48499, image: 'https://img.pokemondb.net/sprites/home/normal/nihilego.png',            isShadow: false, isDynamax: false, types: ['Poison', 'Rock'] as const },
  { id: 'buzzwole',            name: 'Buzzwole',            tier: 5, cp: 42905, image: 'https://img.pokemondb.net/sprites/home/normal/buzzwole.png',            isShadow: false, isDynamax: false, types: ['Bug', 'Fighting'] as const },
  { id: 'pheromosa',           name: 'Pheromosa',           tier: 5, cp: 44370, image: 'https://img.pokemondb.net/sprites/home/normal/pheromosa.png',           isShadow: false, isDynamax: false, types: ['Bug', 'Fighting'] as const },
  { id: 'xurkitree',           name: 'Xurkitree',           tier: 5, cp: 50127, image: 'https://img.pokemondb.net/sprites/home/normal/xurkitree.png',           isShadow: false, isDynamax: false, types: ['Electric'] as const },
  { id: 'celesteela',          name: 'Celesteela',          tier: 5, cp: 43264, image: 'https://img.pokemondb.net/sprites/home/normal/celesteela.png',          isShadow: false, isDynamax: false, types: ['Steel', 'Flying'] as const },
  { id: 'kartana',             name: 'Kartana',             tier: 5, cp: 46779, image: 'https://img.pokemondb.net/sprites/home/normal/kartana.png',             isShadow: false, isDynamax: false, types: ['Grass', 'Steel'] as const },
  { id: 'guzzlord',            name: 'Guzzlord',            tier: 5, cp: 46613, image: 'https://img.pokemondb.net/sprites/home/normal/guzzlord.png',            isShadow: false, isDynamax: false, types: ['Dark', 'Dragon'] as const },
  { id: 'necrozma',            name: 'Necrozma',            tier: 5, cp: 40108, image: 'https://img.pokemondb.net/sprites/home/normal/necrozma.png',            isShadow: false, isDynamax: false, types: ['Psychic'] as const },
  { id: 'stakataka',           name: 'Stakataka',           tier: 5, cp: 43273, image: 'https://img.pokemondb.net/sprites/home/normal/stakataka.png',           isShadow: false, isDynamax: false, types: ['Rock', 'Steel'] as const },
  { id: 'blacephalon',         name: 'Blacephalon',         tier: 5, cp: 49392, image: 'https://img.pokemondb.net/sprites/home/normal/blacephalon.png',         isShadow: false, isDynamax: false, types: ['Fire', 'Ghost'] as const },
  { id: 'zacian',              name: 'Zacian',              tier: 5, cp: 55712, image: 'https://img.pokemondb.net/sprites/home/normal/zacian.png',              isShadow: false, isDynamax: false, types: ['Fairy'] as const },
  { id: 'zamazenta',           name: 'Zamazenta',           tier: 5, cp: 52428, image: 'https://img.pokemondb.net/sprites/home/normal/zamazenta.png',           isShadow: false, isDynamax: false, types: ['Fighting'] as const },
  { id: 'regieleki',           name: 'Regieleki',           tier: 5, cp: 44116, image: 'https://img.pokemondb.net/sprites/home/normal/regieleki.png',           isShadow: false, isDynamax: false, types: ['Electric'] as const },
  { id: 'regidrago',           name: 'Regidrago',           tier: 5, cp: 39509, image: 'https://img.pokemondb.net/sprites/home/normal/regidrago.png',           isShadow: false, isDynamax: false, types: ['Dragon'] as const },
  { id: 'calyrex-shadow',      name: 'Calyrex (Shadow)',    tier: 5, cp: 56018, image: 'https://img.pokemondb.net/sprites/home/normal/calyrex.png',             isShadow: false, isDynamax: false, types: ['Psychic', 'Ghost'] as const },
  { id: 'calyrex-ice',         name: 'Calyrex (Ice)',       tier: 5, cp: 53141, image: 'https://img.pokemondb.net/sprites/home/normal/calyrex.png',             isShadow: false, isDynamax: false, types: ['Psychic', 'Ice'] as const },
  { id: 'enamorus',            name: 'Enamorus',            tier: 5, cp: 46683, image: 'https://img.pokemondb.net/sprites/home/normal/enamorus.png',            isShadow: false, isDynamax: false, types: ['Fairy', 'Flying'] as const },
  { id: 'koraidon',            name: 'Koraidon',            tier: 5, cp: 54362, image: 'https://img.pokemondb.net/sprites/home/normal/koraidon.png',            isShadow: false, isDynamax: false, types: ['Fighting', 'Dragon'] as const },
  { id: 'miraidon',            name: 'Miraidon',            tier: 5, cp: 54362, image: 'https://img.pokemondb.net/sprites/home/normal/miraidon.png',            isShadow: false, isDynamax: false, types: ['Electric', 'Dragon'] as const },
  { id: 'walking-wake',        name: 'Walking Wake',        tier: 5, cp: 49721, image: 'https://img.pokemondb.net/sprites/home/normal/walking-wake.png',        isShadow: false, isDynamax: false, types: ['Water', 'Dragon'] as const },
  { id: 'iron-leaves',         name: 'Iron Leaves',         tier: 5, cp: 49721, image: 'https://img.pokemondb.net/sprites/home/normal/iron-leaves.png',         isShadow: false, isDynamax: false, types: ['Grass', 'Psychic'] as const },
  { id: 'gouging-fire',        name: 'Gouging Fire',        tier: 5, cp: 52816, image: 'https://img.pokemondb.net/sprites/home/normal/gouging-fire.png',        isShadow: false, isDynamax: false, types: ['Fire', 'Dragon'] as const },
  { id: 'raging-bolt',         name: 'Raging Bolt',         tier: 5, cp: 52816, image: 'https://img.pokemondb.net/sprites/home/normal/raging-bolt.png',         isShadow: false, isDynamax: false, types: ['Electric', 'Dragon'] as const },
  { id: 'iron-boulder',        name: 'Iron Boulder',        tier: 5, cp: 49700, image: 'https://img.pokemondb.net/sprites/home/normal/iron-boulder.png',        isShadow: false, isDynamax: false, types: ['Rock', 'Psychic'] as const },
  { id: 'iron-crown',          name: 'Iron Crown',          tier: 5, cp: 49700, image: 'https://img.pokemondb.net/sprites/home/normal/iron-crown.png',          isShadow: false, isDynamax: false, types: ['Steel', 'Psychic'] as const },
  { id: 'terapagos',           name: 'Terapagos',           tier: 5, cp: 54000, image: 'https://img.pokemondb.net/sprites/home/normal/terapagos.png',           isShadow: false, isDynamax: false, types: ['Normal'] as const },
  // ── Shadow 5-Star Raids ──────────────────────────────────────
  { id: 'shadow-mewtwo',       name: 'Shadow Mewtwo',       tier: 5, cp: 54148, image: 'https://img.pokemondb.net/sprites/home/normal/mewtwo.png',              isShadow: true,  isDynamax: false, types: ['Psychic'] as const },
  { id: 'shadow-lugia',        name: 'Shadow Lugia',        tier: 5, cp: 45925, image: 'https://img.pokemondb.net/sprites/home/normal/lugia.png',               isShadow: true,  isDynamax: false, types: ['Psychic', 'Flying'] as const },
  { id: 'shadow-ho-oh',        name: 'Shadow Ho-Oh',        tier: 5, cp: 46578, image: 'https://img.pokemondb.net/sprites/home/normal/ho-oh.png',               isShadow: true,  isDynamax: false, types: ['Fire', 'Flying'] as const },
  { id: 'shadow-raikou',       name: 'Shadow Raikou',       tier: 5, cp: 45435, image: 'https://img.pokemondb.net/sprites/home/normal/raikou.png',              isShadow: true,  isDynamax: false, types: ['Electric'] as const },
  { id: 'shadow-entei',        name: 'Shadow Entei',        tier: 5, cp: 46019, image: 'https://img.pokemondb.net/sprites/home/normal/entei.png',               isShadow: true,  isDynamax: false, types: ['Fire'] as const },
  { id: 'shadow-suicune',      name: 'Shadow Suicune',      tier: 5, cp: 37108, image: 'https://img.pokemondb.net/sprites/home/normal/suicune.png',             isShadow: true,  isDynamax: false, types: ['Water'] as const },
  { id: 'shadow-articuno',     name: 'Shadow Articuno',     tier: 5, cp: 37603, image: 'https://img.pokemondb.net/sprites/home/normal/articuno.png',            isShadow: true,  isDynamax: false, types: ['Ice', 'Flying'] as const },
  { id: 'shadow-zapdos',       name: 'Shadow Zapdos',       tier: 5, cp: 46857, image: 'https://img.pokemondb.net/sprites/home/normal/zapdos.png',              isShadow: true,  isDynamax: false, types: ['Electric', 'Flying'] as const },
  { id: 'shadow-moltres',      name: 'Shadow Moltres',      tier: 5, cp: 46941, image: 'https://img.pokemondb.net/sprites/home/normal/moltres.png',             isShadow: true,  isDynamax: false, types: ['Fire', 'Flying'] as const },
  { id: 'shadow-cresselia',    name: 'Shadow Cresselia',    tier: 5, cp: 33794, image: 'https://img.pokemondb.net/sprites/home/normal/cresselia.png',           isShadow: true,  isDynamax: false, types: ['Psychic'] as const },
  { id: 'shadow-regirock',     name: 'Shadow Regirock',     tier: 5, cp: 39130, image: 'https://img.pokemondb.net/sprites/home/normal/regirock.png',            isShadow: true,  isDynamax: false, types: ['Rock'] as const },
  { id: 'shadow-regice',       name: 'Shadow Regice',       tier: 5, cp: 33085, image: 'https://img.pokemondb.net/sprites/home/normal/regice.png',              isShadow: true,  isDynamax: false, types: ['Ice'] as const },
  { id: 'shadow-registeel',    name: 'Shadow Registeel',    tier: 5, cp: 30596, image: 'https://img.pokemondb.net/sprites/home/normal/registeel.png',           isShadow: true,  isDynamax: false, types: ['Steel'] as const },
  { id: 'shadow-latias',       name: 'Shadow Latias',       tier: 5, cp: 43470, image: 'https://img.pokemondb.net/sprites/home/normal/latias.png',              isShadow: true,  isDynamax: false, types: ['Dragon', 'Psychic'] as const },
  { id: 'shadow-latios',       name: 'Shadow Latios',       tier: 5, cp: 45826, image: 'https://img.pokemondb.net/sprites/home/normal/latios.png',              isShadow: true,  isDynamax: false, types: ['Dragon', 'Psychic'] as const },
  { id: 'shadow-kyogre',       name: 'Shadow Kyogre',       tier: 5, cp: 56473, image: 'https://img.pokemondb.net/sprites/home/normal/kyogre.png',              isShadow: true,  isDynamax: false, types: ['Water'] as const },
  { id: 'shadow-groudon',      name: 'Shadow Groudon',      tier: 5, cp: 54411, image: 'https://img.pokemondb.net/sprites/home/normal/groudon.png',             isShadow: true,  isDynamax: false, types: ['Ground'] as const },
  { id: 'shadow-rayquaza',     name: 'Shadow Rayquaza',     tier: 5, cp: 49808, image: 'https://img.pokemondb.net/sprites/home/normal/rayquaza.png',            isShadow: true,  isDynamax: false, types: ['Dragon', 'Flying'] as const },
  // ── Mega / Primal Raids (Tier 4 / 6) ────────────────────────
  { id: 'mega-venusaur',       name: 'Mega Venusaur',       tier: 4, cp: 39701, image: 'https://img.pokemondb.net/sprites/home/normal/venusaur-mega.png',       isShadow: false, isDynamax: false, types: ['Grass', 'Poison'] as const },
  { id: 'mega-charizard-x',    name: 'Mega Charizard X',    tier: 4, cp: 52679, image: 'https://img.pokemondb.net/sprites/home/normal/charizard-mega-x.png',    isShadow: false, isDynamax: false, types: ['Fire', 'Dragon'] as const },
  { id: 'mega-charizard-y',    name: 'Mega Charizard Y',    tier: 4, cp: 57494, image: 'https://img.pokemondb.net/sprites/home/normal/charizard-mega-y.png',    isShadow: false, isDynamax: false, types: ['Fire', 'Flying'] as const },
  { id: 'mega-blastoise',      name: 'Mega Blastoise',      tier: 4, cp: 42710, image: 'https://img.pokemondb.net/sprites/home/normal/blastoise-mega.png',      isShadow: false, isDynamax: false, types: ['Water'] as const },
  { id: 'mega-beedrill',       name: 'Mega Beedrill',       tier: 4, cp: 29052, image: 'https://img.pokemondb.net/sprites/home/normal/beedrill-mega.png',       isShadow: false, isDynamax: false, types: ['Bug', 'Poison'] as const },
  { id: 'mega-pidgeot',        name: 'Mega Pidgeot',        tier: 4, cp: 40059, image: 'https://img.pokemondb.net/sprites/home/normal/pidgeot-mega.png',        isShadow: false, isDynamax: false, types: ['Normal', 'Flying'] as const },
  { id: 'mega-slowbro',        name: 'Mega Slowbro',        tier: 4, cp: 36890, image: 'https://img.pokemondb.net/sprites/home/normal/slowbro-mega.png',        isShadow: false, isDynamax: false, types: ['Water', 'Psychic'] as const },
  { id: 'mega-gengar',         name: 'Mega Gengar',         tier: 4, cp: 52583, image: 'https://img.pokemondb.net/sprites/home/normal/gengar-mega.png',         isShadow: false, isDynamax: false, types: ['Ghost', 'Poison'] as const },
  { id: 'mega-gyarados',       name: 'Mega Gyarados',       tier: 4, cp: 52679, image: 'https://img.pokemondb.net/sprites/home/normal/gyarados-mega.png',       isShadow: false, isDynamax: false, types: ['Water', 'Dark'] as const },
  { id: 'mega-aerodactyl',     name: 'Mega Aerodactyl',     tier: 4, cp: 47523, image: 'https://img.pokemondb.net/sprites/home/normal/aerodactyl-mega.png',     isShadow: false, isDynamax: false, types: ['Rock', 'Flying'] as const },
  { id: 'mega-ampharos',       name: 'Mega Ampharos',       tier: 4, cp: 42867, image: 'https://img.pokemondb.net/sprites/home/normal/ampharos-mega.png',       isShadow: false, isDynamax: false, types: ['Electric', 'Dragon'] as const },
  { id: 'mega-steelix',        name: 'Mega Steelix',        tier: 4, cp: 44883, image: 'https://img.pokemondb.net/sprites/home/normal/steelix-mega.png',        isShadow: false, isDynamax: false, types: ['Steel', 'Ground'] as const },
  { id: 'mega-scizor',         name: 'Mega Scizor',         tier: 4, cp: 43001, image: 'https://img.pokemondb.net/sprites/home/normal/scizor-mega.png',         isShadow: false, isDynamax: false, types: ['Bug', 'Steel'] as const },
  { id: 'mega-heracross',      name: 'Mega Heracross',      tier: 4, cp: 48068, image: 'https://img.pokemondb.net/sprites/home/normal/heracross-mega.png',      isShadow: false, isDynamax: false, types: ['Bug', 'Fighting'] as const },
  { id: 'mega-houndoom',       name: 'Mega Houndoom',       tier: 4, cp: 46613, image: 'https://img.pokemondb.net/sprites/home/normal/houndoom-mega.png',       isShadow: false, isDynamax: false, types: ['Dark', 'Fire'] as const },
  { id: 'mega-tyranitar',      name: 'Mega Tyranitar',      tier: 4, cp: 62044, image: 'https://img.pokemondb.net/sprites/home/normal/tyranitar-mega.png',      isShadow: false, isDynamax: false, types: ['Rock', 'Dark'] as const },
  { id: 'mega-sceptile',       name: 'Mega Sceptile',       tier: 4, cp: 43890, image: 'https://img.pokemondb.net/sprites/home/normal/sceptile-mega.png',       isShadow: false, isDynamax: false, types: ['Grass', 'Dragon'] as const },
  { id: 'mega-blaziken',       name: 'Mega Blaziken',       tier: 4, cp: 47815, image: 'https://img.pokemondb.net/sprites/home/normal/blaziken-mega.png',       isShadow: false, isDynamax: false, types: ['Fire', 'Fighting'] as const },
  { id: 'mega-swampert',       name: 'Mega Swampert',       tier: 4, cp: 51168, image: 'https://img.pokemondb.net/sprites/home/normal/swampert-mega.png',       isShadow: false, isDynamax: false, types: ['Water', 'Ground'] as const },
  { id: 'mega-gardevoir',      name: 'Mega Gardevoir',      tier: 4, cp: 52569, image: 'https://img.pokemondb.net/sprites/home/normal/gardevoir-mega.png',      isShadow: false, isDynamax: false, types: ['Psychic', 'Fairy'] as const },
  { id: 'mega-mawile',         name: 'Mega Mawile',         tier: 4, cp: 27293, image: 'https://img.pokemondb.net/sprites/home/normal/mawile-mega.png',         isShadow: false, isDynamax: false, types: ['Steel', 'Fairy'] as const },
  { id: 'mega-manectric',      name: 'Mega Manectric',      tier: 4, cp: 41180, image: 'https://img.pokemondb.net/sprites/home/normal/manectric-mega.png',      isShadow: false, isDynamax: false, types: ['Electric'] as const },
  { id: 'mega-altaria',        name: 'Mega Altaria',        tier: 4, cp: 35621, image: 'https://img.pokemondb.net/sprites/home/normal/altaria-mega.png',        isShadow: false, isDynamax: false, types: ['Dragon', 'Fairy'] as const },
  { id: 'mega-banette',        name: 'Mega Banette',        tier: 4, cp: 38622, image: 'https://img.pokemondb.net/sprites/home/normal/banette-mega.png',        isShadow: false, isDynamax: false, types: ['Ghost'] as const },
  { id: 'mega-absol',          name: 'Mega Absol',          tier: 4, cp: 49441, image: 'https://img.pokemondb.net/sprites/home/normal/absol-mega.png',          isShadow: false, isDynamax: false, types: ['Dark'] as const },
  { id: 'mega-alakazam',       name: 'Mega Alakazam',       tier: 4, cp: 49468, image: 'https://img.pokemondb.net/sprites/home/normal/alakazam-mega.png',       isShadow: false, isDynamax: false, types: ['Psychic'] as const },
  { id: 'mega-medicham',       name: 'Mega Medicham',       tier: 4, cp: 28005, image: 'https://img.pokemondb.net/sprites/home/normal/medicham-mega.png',       isShadow: false, isDynamax: false, types: ['Fighting', 'Psychic'] as const },
  { id: 'mega-camerupt',       name: 'Mega Camerupt',       tier: 4, cp: 31532, image: 'https://img.pokemondb.net/sprites/home/normal/camerupt-mega.png',       isShadow: false, isDynamax: false, types: ['Fire', 'Ground'] as const },
  { id: 'mega-glalie',         name: 'Mega Glalie',         tier: 4, cp: 27892, image: 'https://img.pokemondb.net/sprites/home/normal/glalie-mega.png',         isShadow: false, isDynamax: false, types: ['Ice'] as const },
  { id: 'mega-latias',         name: 'Mega Latias',         tier: 4, cp: 46445, image: 'https://img.pokemondb.net/sprites/home/normal/latias-mega.png',         isShadow: false, isDynamax: false, types: ['Dragon', 'Psychic'] as const },
  { id: 'mega-latios',         name: 'Mega Latios',         tier: 4, cp: 52263, image: 'https://img.pokemondb.net/sprites/home/normal/latios-mega.png',         isShadow: false, isDynamax: false, types: ['Dragon', 'Psychic'] as const },
  { id: 'mega-salamence',      name: 'Mega Salamence',      tier: 4, cp: 58044, image: 'https://img.pokemondb.net/sprites/home/normal/salamence-mega.png',      isShadow: false, isDynamax: false, types: ['Dragon', 'Flying'] as const },
  { id: 'mega-metagross',      name: 'Mega Metagross',      tier: 4, cp: 55144, image: 'https://img.pokemondb.net/sprites/home/normal/metagross-mega.png',      isShadow: false, isDynamax: false, types: ['Steel', 'Psychic'] as const },
  { id: 'mega-garchomp',       name: 'Mega Garchomp',       tier: 4, cp: 65819, image: 'https://img.pokemondb.net/sprites/home/normal/garchomp-mega.png',       isShadow: false, isDynamax: false, types: ['Dragon', 'Ground'] as const },
  { id: 'mega-lucario',        name: 'Mega Lucario',        tier: 4, cp: 47502, image: 'https://img.pokemondb.net/sprites/home/normal/lucario-mega.png',        isShadow: false, isDynamax: false, types: ['Fighting', 'Steel'] as const },
  { id: 'mega-abomasnow',      name: 'Mega Abomasnow',      tier: 4, cp: 35399, image: 'https://img.pokemondb.net/sprites/home/normal/abomasnow-mega.png',      isShadow: false, isDynamax: false, types: ['Grass', 'Ice'] as const },
  { id: 'mega-lopunny',        name: 'Mega Lopunny',        tier: 4, cp: 43649, image: 'https://img.pokemondb.net/sprites/home/normal/lopunny-mega.png',        isShadow: false, isDynamax: false, types: ['Normal', 'Fighting'] as const },
  { id: 'mega-gallade',        name: 'Mega Gallade',        tier: 4, cp: 49668, image: 'https://img.pokemondb.net/sprites/home/normal/gallade-mega.png',        isShadow: false, isDynamax: false, types: ['Psychic', 'Fighting'] as const },
  { id: 'mega-audino',         name: 'Mega Audino',         tier: 4, cp: 26866, image: 'https://img.pokemondb.net/sprites/home/normal/audino-mega.png',         isShadow: false, isDynamax: false, types: ['Normal', 'Fairy'] as const },
  { id: 'mega-rayquaza',       name: 'Mega Rayquaza',       tier: 4, cp: 69802, image: 'https://img.pokemondb.net/sprites/home/normal/rayquaza-mega.png',       isShadow: false, isDynamax: false, types: ['Dragon', 'Flying'] as const },
  { id: 'mega-diancie',        name: 'Mega Diancie',        tier: 4, cp: 49282, image: 'https://img.pokemondb.net/sprites/home/normal/diancie-mega.png',        isShadow: false, isDynamax: false, types: ['Rock', 'Fairy'] as const },
  { id: 'primal-kyogre',       name: 'Primal Kyogre',       tier: 4, cp: 82695, image: 'https://img.pokemondb.net/sprites/home/normal/kyogre.png',              isShadow: false, isDynamax: false, types: ['Water'] as const },
  { id: 'primal-groudon',      name: 'Primal Groudon',      tier: 4, cp: 83533, image: 'https://img.pokemondb.net/sprites/home/normal/groudon.png',             isShadow: false, isDynamax: false, types: ['Ground', 'Fire'] as const },
  // ── Tier 3 Raids ─────────────────────────────────────────────
  { id: 'machamp',             name: 'Machamp',             tier: 3, cp: 27011, image: 'https://img.pokemondb.net/sprites/home/normal/machamp.png',             isShadow: false, isDynamax: false, types: ['Fighting'] as const },
  { id: 'gengar',              name: 'Gengar',              tier: 3, cp: 26106, image: 'https://img.pokemondb.net/sprites/home/normal/gengar.png',              isShadow: false, isDynamax: false, types: ['Ghost', 'Poison'] as const },
  { id: 'alakazam',            name: 'Alakazam',            tier: 3, cp: 33210, image: 'https://img.pokemondb.net/sprites/home/normal/alakazam.png',            isShadow: false, isDynamax: false, types: ['Psychic'] as const },
  { id: 'arcanine',            name: 'Arcanine',            tier: 3, cp: 27227, image: 'https://img.pokemondb.net/sprites/home/normal/arcanine.png',            isShadow: false, isDynamax: false, types: ['Fire'] as const },
  { id: 'nidoqueen',           name: 'Nidoqueen',           tier: 3, cp: 22796, image: 'https://img.pokemondb.net/sprites/home/normal/nidoqueen.png',           isShadow: false, isDynamax: false, types: ['Poison', 'Ground'] as const },
  { id: 'starmie',             name: 'Starmie',             tier: 3, cp: 20445, image: 'https://img.pokemondb.net/sprites/home/normal/starmie.png',             isShadow: false, isDynamax: false, types: ['Water', 'Psychic'] as const },
  { id: 'cloyster',            name: 'Cloyster',            tier: 3, cp: 22728, image: 'https://img.pokemondb.net/sprites/home/normal/cloyster.png',            isShadow: false, isDynamax: false, types: ['Water', 'Ice'] as const },
  { id: 'skarmory',            name: 'Skarmory',            tier: 3, cp: 16571, image: 'https://img.pokemondb.net/sprites/home/normal/skarmory.png',            isShadow: false, isDynamax: false, types: ['Steel', 'Flying'] as const },
  { id: 'granbull',            name: 'Granbull',            tier: 3, cp: 24539, image: 'https://img.pokemondb.net/sprites/home/normal/granbull.png',            isShadow: false, isDynamax: false, types: ['Fairy'] as const },
  { id: 'piloswine',           name: 'Piloswine',           tier: 3, cp: 23805, image: 'https://img.pokemondb.net/sprites/home/normal/piloswine.png',           isShadow: false, isDynamax: false, types: ['Ice', 'Ground'] as const },
  { id: 'sudowoodo',           name: 'Sudowoodo',           tier: 3, cp: 14093, image: 'https://img.pokemondb.net/sprites/home/normal/sudowoodo.png',           isShadow: false, isDynamax: false, types: ['Rock'] as const },
  { id: 'shuckle',             name: 'Shuckle',             tier: 3, cp: 3579,  image: 'https://img.pokemondb.net/sprites/home/normal/shuckle.png',             isShadow: false, isDynamax: false, types: ['Bug', 'Rock'] as const },
  { id: 'absol',               name: 'Absol',               tier: 3, cp: 26853, image: 'https://img.pokemondb.net/sprites/home/normal/absol.png',               isShadow: false, isDynamax: false, types: ['Dark'] as const },
  { id: 'mawile',              name: 'Mawile',              tier: 3, cp: 10967, image: 'https://img.pokemondb.net/sprites/home/normal/mawile.png',              isShadow: false, isDynamax: false, types: ['Steel', 'Fairy'] as const },
  { id: 'druddigon',           name: 'Druddigon',           tier: 3, cp: 20508, image: 'https://img.pokemondb.net/sprites/home/normal/druddigon.png',           isShadow: false, isDynamax: false, types: ['Dragon'] as const },
  { id: 'umbreon',             name: 'Umbreon',             tier: 3, cp: 25486, image: 'https://img.pokemondb.net/sprites/home/normal/umbreon.png',             isShadow: false, isDynamax: false, types: ['Dark'] as const },
  { id: 'flareon',             name: 'Flareon',             tier: 3, cp: 28769, image: 'https://img.pokemondb.net/sprites/home/normal/flareon.png',             isShadow: false, isDynamax: false, types: ['Fire'] as const },
  { id: 'jolteon',             name: 'Jolteon',             tier: 3, cp: 31270, image: 'https://img.pokemondb.net/sprites/home/normal/jolteon.png',             isShadow: false, isDynamax: false, types: ['Electric'] as const },
  { id: 'vaporeon',            name: 'Vaporeon',            tier: 3, cp: 30995, image: 'https://img.pokemondb.net/sprites/home/normal/vaporeon.png',            isShadow: false, isDynamax: false, types: ['Water'] as const },
  { id: 'espeon',              name: 'Espeon',              tier: 3, cp: 35411, image: 'https://img.pokemondb.net/sprites/home/normal/espeon.png',              isShadow: false, isDynamax: false, types: ['Psychic'] as const },
  { id: 'leafeon',             name: 'Leafeon',             tier: 3, cp: 28693, image: 'https://img.pokemondb.net/sprites/home/normal/leafeon.png',             isShadow: false, isDynamax: false, types: ['Grass'] as const },
  { id: 'glaceon',             name: 'Glaceon',             tier: 3, cp: 29570, image: 'https://img.pokemondb.net/sprites/home/normal/glaceon.png',             isShadow: false, isDynamax: false, types: ['Ice'] as const },
  { id: 'ursaring',            name: 'Ursaring',            tier: 3, cp: 32301, image: 'https://img.pokemondb.net/sprites/home/normal/ursaring.png',            isShadow: false, isDynamax: false, types: ['Normal'] as const },
  { id: 'turtonator',          name: 'Turtonator',          tier: 3, cp: 22939, image: 'https://img.pokemondb.net/sprites/home/normal/turtonator.png',          isShadow: false, isDynamax: false, types: ['Fire', 'Dragon'] as const },
  { id: 'alolan-marowak',      name: 'Alolan Marowak',      tier: 3, cp: 15746, image: 'https://img.pokemondb.net/sprites/home/normal/marowak-alolan.png',      isShadow: false, isDynamax: false, types: ['Fire', 'Ghost'] as const },
  { id: 'gardevoir',           name: 'Gardevoir',           tier: 3, cp: 37080, image: 'https://img.pokemondb.net/sprites/home/normal/gardevoir.png',           isShadow: false, isDynamax: false, types: ['Psychic', 'Fairy'] as const },
  { id: 'donphan',             name: 'Donphan',             tier: 3, cp: 28763, image: 'https://img.pokemondb.net/sprites/home/normal/donphan.png',             isShadow: false, isDynamax: false, types: ['Ground'] as const },
  { id: 'pelipper',            name: 'Pelipper',            tier: 3, cp: 12994, image: 'https://img.pokemondb.net/sprites/home/normal/pelipper.png',            isShadow: false, isDynamax: false, types: ['Water', 'Flying'] as const },
  { id: 'claydol',             name: 'Claydol',             tier: 3, cp: 19796, image: 'https://img.pokemondb.net/sprites/home/normal/claydol.png',             isShadow: false, isDynamax: false, types: ['Ground', 'Psychic'] as const },
  { id: 'hitmonlee',           name: 'Hitmonlee',           tier: 3, cp: 22247, image: 'https://img.pokemondb.net/sprites/home/normal/hitmonlee.png',           isShadow: false, isDynamax: false, types: ['Fighting'] as const },
  { id: 'hitmonchan',          name: 'Hitmonchan',          tier: 3, cp: 21808, image: 'https://img.pokemondb.net/sprites/home/normal/hitmonchan.png',          isShadow: false, isDynamax: false, types: ['Fighting'] as const },
  { id: 'steelix',             name: 'Steelix',             tier: 3, cp: 23838, image: 'https://img.pokemondb.net/sprites/home/normal/steelix.png',             isShadow: false, isDynamax: false, types: ['Steel', 'Ground'] as const },
  { id: 'misdreavus',          name: 'Misdreavus',          tier: 3, cp: 10968, image: 'https://img.pokemondb.net/sprites/home/normal/misdreavus.png',          isShadow: false, isDynamax: false, types: ['Ghost'] as const },
  { id: 'scolipede',           name: 'Scolipede',           tier: 3, cp: 27193, image: 'https://img.pokemondb.net/sprites/home/normal/scolipede.png',           isShadow: false, isDynamax: false, types: ['Bug', 'Poison'] as const },
  { id: 'dewgong',             name: 'Dewgong',             tier: 3, cp: 16920, image: 'https://img.pokemondb.net/sprites/home/normal/dewgong.png',             isShadow: false, isDynamax: false, types: ['Water', 'Ice'] as const },
  // ── Shadow Tier 3 Raids ──────────────────────────────────────
  { id: 'shadow-machamp',      name: 'Shadow Machamp',      tier: 3, cp: 27011, image: 'https://img.pokemondb.net/sprites/home/normal/machamp.png',             isShadow: true,  isDynamax: false, types: ['Fighting'] as const },
  { id: 'shadow-gardevoir',    name: 'Shadow Gardevoir',    tier: 3, cp: 37080, image: 'https://img.pokemondb.net/sprites/home/normal/gardevoir.png',           isShadow: true,  isDynamax: false, types: ['Psychic', 'Fairy'] as const },
  { id: 'shadow-alakazam',     name: 'Shadow Alakazam',     tier: 3, cp: 33210, image: 'https://img.pokemondb.net/sprites/home/normal/alakazam.png',            isShadow: true,  isDynamax: false, types: ['Psychic'] as const },
  { id: 'shadow-arcanine',     name: 'Shadow Arcanine',     tier: 3, cp: 27227, image: 'https://img.pokemondb.net/sprites/home/normal/arcanine.png',            isShadow: true,  isDynamax: false, types: ['Fire'] as const },
  { id: 'shadow-scolipede',    name: 'Shadow Scolipede',    tier: 3, cp: 27193, image: 'https://img.pokemondb.net/sprites/home/normal/scolipede.png',           isShadow: true,  isDynamax: false, types: ['Bug', 'Poison'] as const },
  // ── Tier 1 Raids ─────────────────────────────────────────────
  { id: 'larvitar',            name: 'Larvitar',            tier: 1, cp: 5765,  image: 'https://img.pokemondb.net/sprites/home/normal/larvitar.png',            isShadow: false, isDynamax: false, types: ['Rock', 'Ground'] as const },
  { id: 'bagon',               name: 'Bagon',               tier: 1, cp: 6099,  image: 'https://img.pokemondb.net/sprites/home/normal/bagon.png',               isShadow: false, isDynamax: false, types: ['Dragon'] as const },
  { id: 'deino',               name: 'Deino',               tier: 1, cp: 5765,  image: 'https://img.pokemondb.net/sprites/home/normal/deino.png',               isShadow: false, isDynamax: false, types: ['Dark', 'Dragon'] as const },
  { id: 'gible',               name: 'Gible',               tier: 1, cp: 5765,  image: 'https://img.pokemondb.net/sprites/home/normal/gible.png',               isShadow: false, isDynamax: false, types: ['Dragon', 'Ground'] as const },
  { id: 'riolu',               name: 'Riolu',               tier: 1, cp: 6175,  image: 'https://img.pokemondb.net/sprites/home/normal/riolu.png',               isShadow: false, isDynamax: false, types: ['Fighting'] as const },
  { id: 'axew',                name: 'Axew',                tier: 1, cp: 4855,  image: 'https://img.pokemondb.net/sprites/home/normal/axew.png',                isShadow: false, isDynamax: false, types: ['Dragon'] as const },
  { id: 'espurr',              name: 'Espurr',              tier: 1, cp: 8608,  image: 'https://img.pokemondb.net/sprites/home/normal/espurr.png',              isShadow: false, isDynamax: false, types: ['Psychic'] as const },
  { id: 'shieldon',            name: 'Shieldon',            tier: 1, cp: 4813,  image: 'https://img.pokemondb.net/sprites/home/normal/shieldon.png',            isShadow: false, isDynamax: false, types: ['Rock', 'Steel'] as const },
  { id: 'sneasel',             name: 'Sneasel',             tier: 1, cp: 7903,  image: 'https://img.pokemondb.net/sprites/home/normal/sneasel.png',             isShadow: false, isDynamax: false, types: ['Dark', 'Ice'] as const },
  { id: 'darumaka',            name: 'Darumaka',            tier: 1, cp: 7979,  image: 'https://img.pokemondb.net/sprites/home/normal/darumaka.png',            isShadow: false, isDynamax: false, types: ['Fire'] as const },
  { id: 'scraggy',             name: 'Scraggy',             tier: 1, cp: 5765,  image: 'https://img.pokemondb.net/sprites/home/normal/scraggy.png',             isShadow: false, isDynamax: false, types: ['Dark', 'Fighting'] as const },
  { id: 'rockruff',            name: 'Rockruff',            tier: 1, cp: 4996,  image: 'https://img.pokemondb.net/sprites/home/normal/rockruff.png',            isShadow: false, isDynamax: false, types: ['Rock'] as const },
  { id: 'goomy',               name: 'Goomy',               tier: 1, cp: 2636,  image: 'https://img.pokemondb.net/sprites/home/normal/goomy.png',               isShadow: false, isDynamax: false, types: ['Dragon'] as const },
  { id: 'hisuian-voltorb',     name: 'H. Voltorb',          tier: 1, cp: 7459,  image: 'https://img.pokemondb.net/sprites/home/normal/voltorb-hisuian.png',     isShadow: false, isDynamax: false, types: ['Electric', 'Grass'] as const },
  { id: 'ralts',               name: 'Ralts',               tier: 1, cp: 4454,  image: 'https://img.pokemondb.net/sprites/home/normal/ralts.png',               isShadow: false, isDynamax: false, types: ['Psychic', 'Fairy'] as const },
  { id: 'jangmo-o',            name: 'Jangmo-o',            tier: 1, cp: 4998,  image: 'https://img.pokemondb.net/sprites/home/normal/jangmo-o.png',            isShadow: false, isDynamax: false, types: ['Dragon'] as const },
  { id: 'machop',              name: 'Machop',              tier: 1, cp: 5765,  image: 'https://img.pokemondb.net/sprites/home/normal/machop.png',              isShadow: false, isDynamax: false, types: ['Fighting'] as const },
  { id: 'doduo',               name: 'Doduo',               tier: 1, cp: 5765,  image: 'https://img.pokemondb.net/sprites/home/normal/doduo.png',               isShadow: false, isDynamax: false, types: ['Normal', 'Flying'] as const },
  { id: 'rapidash',            name: 'Rapidash',            tier: 1, cp: 17359, image: 'https://img.pokemondb.net/sprites/home/normal/rapidash.png',            isShadow: false, isDynamax: false, types: ['Fire'] as const },
  { id: 'zebstrika',           name: 'Zebstrika',           tier: 1, cp: 18948, image: 'https://img.pokemondb.net/sprites/home/normal/zebstrika.png',           isShadow: false, isDynamax: false, types: ['Electric'] as const },
  // ── Shadow Tier 1 Raids ──────────────────────────────────────
  { id: 'shadow-larvitar',     name: 'Shadow Larvitar',     tier: 1, cp: 5765,  image: 'https://img.pokemondb.net/sprites/home/normal/larvitar.png',            isShadow: true,  isDynamax: false, types: ['Rock', 'Ground'] as const },
  { id: 'shadow-sneasel',      name: 'Shadow Sneasel',      tier: 1, cp: 7903,  image: 'https://img.pokemondb.net/sprites/home/normal/sneasel.png',             isShadow: true,  isDynamax: false, types: ['Dark', 'Ice'] as const },
  { id: 'shadow-machop',       name: 'Shadow Machop',       tier: 1, cp: 5765,  image: 'https://img.pokemondb.net/sprites/home/normal/machop.png',              isShadow: true,  isDynamax: false, types: ['Fighting'] as const },
  { id: 'shadow-doduo',        name: 'Shadow Doduo',        tier: 1, cp: 5765,  image: 'https://img.pokemondb.net/sprites/home/normal/doduo.png',               isShadow: true,  isDynamax: false, types: ['Normal', 'Flying'] as const },
  { id: 'shadow-rockruff',     name: 'Shadow Rockruff',     tier: 1, cp: 4996,  image: 'https://img.pokemondb.net/sprites/home/normal/rockruff.png',            isShadow: true,  isDynamax: false, types: ['Rock'] as const },
  { id: 'shadow-rapidash',     name: 'Shadow Rapidash',     tier: 1, cp: 17359, image: 'https://img.pokemondb.net/sprites/home/normal/rapidash.png',            isShadow: true,  isDynamax: false, types: ['Fire'] as const },
  { id: 'shadow-zebstrika',    name: 'Shadow Zebstrika',    tier: 1, cp: 18948, image: 'https://img.pokemondb.net/sprites/home/normal/zebstrika.png',           isShadow: true,  isDynamax: false, types: ['Electric'] as const },
] as const;

/**
 * Raid Boss — full backend data model
 *
 * Required fields come from the master list (ALL_BOSSES).
 * Metadata fields are populated by the scraper and confidence engine.
 */
export interface RaidBoss {
  // ── Core identity ─────────────────────────────────────────────
  id: string;
  name: string;
  tier: number;         // 1, 3, 4 (mega), 5, 6 (dynamax/gigantamax)
  cp: number;           // Max CP at level 20 (raid catch CP)
  image: string;
  types?: string[];

  // ── Boss classification flags ──────────────────────────────────
  isShadow: boolean;
  isDynamax: boolean;

  /**
   * Raid type classification:
   *   standard  – regular 1/3/5-star
   *   mega      – Mega or Primal raid (tier 4)
   *   shadow    – Shadow legendary / featured shadow
   *   dynamax   – Max Battle (Dynamax / Gigantamax)
   *   event     – Limited-time event raid (e.g. GO Fest exclusive)
   *   special   – Elite raid, Legendary Hour, etc.
   */
  raidType?: 'standard' | 'mega' | 'shadow' | 'dynamax' | 'event' | 'special';

  // ── Active window ─────────────────────────────────────────────
  isActive: boolean;
  startTime?: number;   // UTC ms — when this boss rotation begins
  endTime?: number;     // UTC ms — when this boss rotation ends (auto-deactivate)

  // ── Regional availability ─────────────────────────────────────
  /**
   * ISO region codes where this boss appears (e.g. ["NA", "EU"]).
   * Empty array / undefined means GLOBAL (all regions).
   */
  regions?: string[];

  // ── Source cross-reference ─────────────────────────────────────
  /**
   * Names of data sources that have confirmed this boss is active.
   * e.g. ["ScrapedDuck", "PoGoAPI", "PokemonGoAPI"]
   */
  sources?: string[];

  /** Source URLs from which this boss data was retrieved */
  sourceUrls?: string[];

  /**
   * Confidence score 0–100.
   * Weighted by source reliability + number of confirming sources.
   * Bosses below 40 are held back (not published to users).
   *
   * Scoring weights:
   *   ScrapedDuck  = 60 pts (highest — curated community data)
   *   PoGoAPI      = 40 pts
   *   PokemonGoAPI = 40 pts
   *   Multi-source bonus: +10 per additional source beyond the first
   */
  confidenceScore?: number;

  /** UTC ms — when this boss entry was last confirmed by any source */
  lastVerifiedAt?: number;

  /**
   * UTC ms — when the sync service last ran a full scrape cycle.
   * Distinct from lastVerifiedAt (which is per-boss); this is global to the cycle.
   */
  lastSyncedAt?: number;

  // ── Admin overrides ────────────────────────────────────────────
  /**
   * Admin manual override:
   *   'approved' – force-active; scraper will not auto-deactivate
   *   'hidden'   – force-hidden; never shown to users
   *   null       – no override; scraper logic applies normally
   */
  adminOverride?: 'approved' | 'hidden' | null;

  /** Optional admin note explaining why an override was set */
  adminNote?: string;
}

// Schema for raid boss validation
export const raidBossSchema = z.object({
  id: z.string(),
  name: z.string(),
  tier: z.number(),
  cp: z.number(),
  image: z.string(),
  types: z.array(z.string()).optional(),
  isShadow: z.boolean(),
  isDynamax: z.boolean(),
  raidType: z.enum(['standard', 'mega', 'shadow', 'dynamax', 'event', 'special']).optional(),
  isActive: z.boolean(),
  startTime: z.number().optional(),
  endTime: z.number().optional(),
  regions: z.array(z.string()).optional(),
  sources: z.array(z.string()).optional(),
  sourceUrls: z.array(z.string()).optional(),
  confidenceScore: z.number().min(0).max(100).optional(),
  lastVerifiedAt: z.number().optional(),
  lastSyncedAt: z.number().optional(),
  // 'reset' is a UI-only alias for null — translated server-side before storage write
  adminOverride: z.enum(['approved', 'hidden', 'reset']).nullable().optional(),
  adminNote: z.string().optional(),
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
  plan: z.enum(['elite_monthly', 'elite_yearly', 'restored', 'remove_ads', 'none']).default('none'),
  price: z.number().default(0),
  // Store-specific fields for receipt verification
  storeType: z.enum(['apple', 'google', 'none']).default('none'),
  originalTransactionId: z.string().nullable().optional(),
  productId: z.string().nullable().optional(),
  // Server verification tracking
  lastVerifiedAt: z.number().nullable().optional(),
  verificationStatus: z.enum(['verified', 'pending', 'failed', 'none']).default('none'),
  // One-time purchases
  hasRemovedAds: z.boolean().optional(),
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
  invitesSent: z.boolean().default(false),
  groupId: z.string().optional(),       // private group this lobby belongs to
  raidTrainId: z.string().optional(),   // raid train chain identifier
  trainIndex: z.number().optional(),    // position within the train (1, 2, 3…)
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

// Queue system - structured fairness-based model
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
  originalJoinedAt: z.number(),
  priorityScore: z.number().default(0),
  connectionStatus: z.enum(['active', 'disconnected']).default('active'),
  lastHeartbeat: z.number(),
  reserved: z.boolean().default(false),
  reservedAt: z.number().nullable().default(null),
  leaveCount: z.number().default(0),
  noResponseCount: z.number().default(0),
  status: z.enum(['waiting', 'reserved', 'matched', 'expired', 'cancelled']).default('waiting'),
  matchedLobbyId: z.string().optional(),
});

export type QueueEntry = z.infer<typeof queueEntrySchema>;
export type InsertQueueEntry = Omit<QueueEntry,
  'id' | 'joinedAt' | 'originalJoinedAt' | 'priorityScore' |
  'connectionStatus' | 'lastHeartbeat' | 'reserved' | 'reservedAt' |
  'leaveCount' | 'noResponseCount' | 'status'
>;

export interface QueueStatus {
  bossId: string;
  bossName: string;
  position: number;
  totalInQueue: number;
  estimatedWaitSeconds: number;
  status: 'waiting' | 'reserved' | 'matched' | 'expired' | 'cancelled';
  matchedLobbyId?: string;
  reserved: boolean;
  reservationExpiresAt?: number;
  isAlmostUp: boolean;
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
  'event_announcement',
  'queue_promotion',
  'queue_almost_up',
]);

export type NotificationType = z.infer<typeof notificationTypeSchema>;

// ============================================================================
// ADVERTISEMENT MODEL
// ============================================================================

/**
 * Where an ad can appear in the app.
 * - banner       : sticky bottom banner in the Join Feed (AdMob banner unit)
 * - native_card  : card-style ad injected every N lobbies in the Join Feed
 * - rewarded     : user watches a full video to earn a queue-skip reward
 * - interstitial : full-screen ad shown between major navigation events
 */
export type AdPlacement = 'banner' | 'native_card' | 'rewarded' | 'interstitial';

/**
 * Single impression record — logged server-side for revenue reporting.
 * estimatedRevenueMicros: CPM × 1 impression, in micro-USD (÷1_000_000 = USD).
 */
export interface AdImpression {
  id: string;
  userId: string;
  placement: AdPlacement;
  adUnitId: string;
  /** True when the user actually saw the ad (viewable impression) */
  viewable: boolean;
  /** Estimated revenue in micro-USD from AdMob's paid impression callback */
  estimatedRevenueMicros: number;
  createdAt: number;
}

/**
 * Per-placement config stored server-side so the admin can toggle placements
 * and adjust frequency without an app update.
 */
export interface AdConfig {
  placement: AdPlacement;
  enabled: boolean;
  /** For native_card: inject every N lobbies (default 5) */
  frequency?: number;
  /** For rewarded: how many queue positions to skip on completion */
  rewardQueueSkip?: number;
}

export interface AdStats {
  totalImpressions: number;
  totalClicks: number;
  estimatedRevenueUsd: number;
  byPlacement: Record<AdPlacement, {
    impressions: number;
    clicks: number;
    estimatedRevenueUsd: number;
  }>;
  /** Last 7 days, newest first */
  dailyRevenue: Array<{ date: string; estimatedRevenueUsd: number; impressions: number }>;
}

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

// ============================================================================
// CATCH & IV TRACKER  (premium feature)
// ============================================================================

/**
 * A single catch attempt logged after a raid ends.
 * cp is the catch CP (used to estimate IVs — exact IVs require the game's appraisal).
 * isShiny tracks shiny encounters even if the player didn't catch.
 */
export interface CatchRecord {
  id: string;
  userId: string;
  bossId: string;
  bossName: string;
  lobbyId: string;
  caught: boolean;
  cp?: number;          // CP of the caught Pokémon (blank if not caught)
  isShiny: boolean;
  createdAt: number;
}

export interface CatchStats {
  totalRaids: number;
  totalCaught: number;
  totalShiny: number;
  catchRate: number;        // 0-1
  shinyRate: number;        // 0-1
  byBoss: Record<string, {
    raids: number;
    caught: number;
    shiny: number;
    bestCp: number;
  }>;
  recentCatches: CatchRecord[];
}

// ============================================================================
// PRIVATE GROUPS
// ============================================================================

/**
 * A private group that members can join via a short join code.
 * Lobbies marked with a groupId are only visible to group members.
 */
export interface RaidGroup {
  id: string;
  name: string;
  joinCode: string;       // 6-char uppercase alphanumeric
  ownerId: string;
  ownerName: string;
  memberIds: string[];
  createdAt: number;
  maxMembers: number;     // default 50
}

export interface RaidGroupMembership {
  group: RaidGroup;
  memberCount: number;
  isOwner: boolean;
}

// ============================================================================
// WEATHER (for weather-boosted filter)
// ============================================================================

/**
 * The 7 in-game weather conditions in Pokémon GO.
 * Maps to the OpenWeatherMap condition codes on the client.
 */
export type PgoWeather =
  | 'sunny'
  | 'rainy'
  | 'partly_cloudy'
  | 'cloudy'
  | 'windy'
  | 'snow'
  | 'fog'
  | 'unknown';

/**
 * Which Pokémon types are boosted by each weather condition.
 * A lobby boss with a matching type gets a ⚡ badge in the feed.
 */
export const WEATHER_BOOSTS: Record<PgoWeather, string[]> = {
  sunny:         ['Fire', 'Grass', 'Ground'],
  rainy:         ['Water', 'Electric', 'Bug'],
  partly_cloudy: ['Normal', 'Rock'],
  cloudy:        ['Fairy', 'Fighting', 'Poison'],
  windy:         ['Dragon', 'Flying', 'Psychic'],
  snow:          ['Ice', 'Steel'],
  fog:           ['Dark', 'Ghost'],
  unknown:       [],
};
