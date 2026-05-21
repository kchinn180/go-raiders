import { randomUUID } from "crypto";
import type { User, InsertUser, Lobby, InsertLobby, Player, Feedback, InsertFeedback, BannedUser, PushToken, InsertPushToken, RaidBoss, QueueEntry, InsertQueueEntry, QueueStatus, Subscription, Report, InsertReport, AdImpression, AdConfig, AdStats, AdPlacement, CatchRecord, CatchStats, RaidGroup } from "@shared/schema";
import type { Player as PlayerType } from "@shared/schema";
import { TEAMS } from "@shared/schema";

/**
 * Raid Capacity Constants
 * Host can invite up to 5 remote players, so max is 6 (host + 5 invites)
 */
export const RAID_CAPACITY = {
  MIN: 2,  // Minimum players for a raid lobby
  MAX: 6,  // Maximum players allowed (host + 5 remote invites)
  DEFAULT: 6, // Default capacity when hosting
} as const;

/**
 * Elite Early Access Configuration
 * Basic users must wait this duration before joining new lobbies
 */
export const ELITE_EARLY_ACCESS_MS = 10000; // 10 seconds

export interface IStorage {
  // Raid boss management
  getActiveRaidBosses(): Promise<RaidBoss[]>;
  getAllRaidBosses(): Promise<RaidBoss[]>;
  getRaidBossById(bossId: string): Promise<RaidBoss | undefined>;
  isRaidBossActive(bossId: string): Promise<boolean>;
  setRaidBossActive(bossId: string, isActive: boolean, startTime?: number, endTime?: number): Promise<RaidBoss | undefined>;
  addRaidBoss(boss: RaidBoss): Promise<RaidBoss>;
  updateRaidBoss(bossId: string, updates: Partial<RaidBoss>): Promise<RaidBoss | undefined>;
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Subscription management - SECURITY: Only these methods can modify premium status
  updateUserSubscription(userId: string, updates: { isPremium: boolean; subscription: Subscription }): Promise<User | undefined>;
  
  getLobbies(): Promise<Lobby[]>;
  getLobby(id: string): Promise<Lobby | undefined>;
  createLobby(lobby: InsertLobby): Promise<Lobby>;
  updateLobby(id: string, updates: Partial<Lobby>): Promise<Lobby | undefined>;
  deleteLobby(id: string): Promise<boolean>;
  
  /**
   * Update lobby capacity - HOST ONLY
   * 
   * Only the lobby host can modify the player capacity.
   * Capacity must be between RAID_CAPACITY.MIN and RAID_CAPACITY.MAX.
   * Cannot set capacity below current player count.
   * 
   * @returns Updated lobby or error object with reason
   */
  updateLobbyCapacity(lobbyId: string, hostId: string, newCapacity: number): Promise<{ lobby?: Lobby; error?: string }>;
  
  joinLobby(lobbyId: string, player: Player): Promise<Lobby | undefined>;
  leaveLobby(lobbyId: string, playerId: string): Promise<Lobby | undefined>;
  updatePlayerReady(lobbyId: string, playerId: string, isReady: boolean): Promise<Lobby | undefined>;
  markPlayerSentRequest(lobbyId: string, playerId: string): Promise<Lobby | undefined>;
  startRaid(lobbyId: string, hostId: string): Promise<Lobby | undefined>;
  closeLobby(lobbyId: string, hostId: string): Promise<Lobby | undefined>;
  
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  getAllFeedback(): Promise<Feedback[]>;
  getFeedbackByHost(hostId: string): Promise<Feedback[]>;
  
  banUser(friendCode: string, reason: string | undefined, bannedBy: string): Promise<BannedUser>;
  unbanUser(friendCode: string): Promise<boolean>;
  isBanned(friendCode: string): Promise<boolean>;
  getBannedUsers(): Promise<BannedUser[]>;
  deleteUserByFriendCode(friendCode: string): Promise<boolean>;
  
  registerPushToken(data: InsertPushToken): Promise<PushToken>;
  removePushToken(token: string): Promise<boolean>;
  getPushTokensForUser(userId: string): Promise<PushToken[]>;
  getPushTokensForUsers(userIds: string[]): Promise<PushToken[]>;
  
  // Queue management - structured fairness-based system
  joinQueue(entry: InsertQueueEntry): Promise<{ entry: QueueEntry; cooldownMs?: number }>;
  leaveQueue(userId: string, bossId?: string): Promise<boolean>;
  heartbeatQueue(userId: string, bossId: string): Promise<boolean>;
  acceptReservation(userId: string, bossId: string): Promise<{ lobbyId: string } | null>;
  rejectReservation(userId: string, bossId: string): Promise<boolean>;
  getQueueStatus(userId: string, bossId: string): Promise<QueueStatus | null>;
  getUserQueues(userId: string): Promise<QueueStatus[]>;
  getQueueForBoss(bossId: string): Promise<QueueEntry[]>;
  getQueueCounts(): Promise<Record<string, number>>;
  processQueueMatches(): Promise<{ matched: QueueEntry[]; lobbies: Lobby[] }>;
  processQueueHeartbeats(): Promise<{ removed: string[] }>;
  processReservationExpiry(): Promise<{ expired: string[] }>;
  getAlmostUpUsers(): Promise<Array<{ userId: string; bossId: string; bossName: string; position: number }>>;
  
  // Report management
  createReport(report: InsertReport): Promise<Report>;
  getAllReports(): Promise<Report[]>;
  getReportsByUser(userId: string): Promise<Report[]>;
  updateReportStatus(reportId: number, status: string): Promise<Report | undefined>;

  // Admin: User management
  updateUser(userId: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(userId: string): Promise<boolean>;
  grantPremium(userId: string): Promise<User | undefined>;
  revokePremium(userId: string): Promise<User | undefined>;
  resetUserCoins(userId: string, coins: number): Promise<User | undefined>;

  // Admin: Lobby management
  getAllLobbiesIncludingStarted(): Promise<Lobby[]>;
  forceCloseLobby(lobbyId: string): Promise<boolean>;
  kickPlayerFromLobby(lobbyId: string, playerId: string): Promise<Lobby | undefined>;

  // Admin: Analytics
  getAnalytics(): Promise<AppAnalytics>;

  // Admin: Broadcast
  getAllPushTokens(): Promise<PushToken[]>;

  // Catch & IV Tracker
  logCatch(record: Omit<CatchRecord, 'id' | 'createdAt'>): Promise<CatchRecord>;
  getCatchHistory(userId: string, limit?: number): Promise<CatchRecord[]>;
  getCatchStats(userId: string): Promise<CatchStats>;

  // Private Groups
  createGroup(ownerId: string, ownerName: string, name: string): Promise<RaidGroup>;
  joinGroup(userId: string, joinCode: string): Promise<RaidGroup | null>;
  leaveGroup(userId: string, groupId: string): Promise<boolean>;
  getGroup(groupId: string): Promise<RaidGroup | null>;
  getGroupByCode(joinCode: string): Promise<RaidGroup | null>;
  getUserGroups(userId: string): Promise<RaidGroup[]>;
  getGroupLobbies(groupId: string): Promise<Lobby[]>;

  // Advertisements
  recordAdImpression(data: Omit<AdImpression, 'id' | 'createdAt'>): Promise<AdImpression>;
  recordAdClick(impressionId: string): Promise<boolean>;
  getAdStats(): Promise<AdStats>;
  getAdConfig(): Promise<AdConfig[]>;
  updateAdConfig(placement: AdPlacement, patch: Partial<Omit<AdConfig, 'placement'>>): Promise<AdConfig>;
  applyRewardedSkip(userId: string, bossId: string, skipSpots: number): Promise<boolean>;
}

export interface AppAnalytics {
  totalUsers: number;
  premiumUsers: number;
  activeLobbies: number;
  startedRaids: number;
  totalFeedback: number;
  averageHostRating: number;
  totalReports: number;
  pendingReports: number;
  totalBanned: number;
  queuedUsers: number;
  activeBosses: number;
  serverUptime: number;
}

function generateMockLobbies(): Lobby[] {
  // No demo lobbies — queue is empty on startup
  const activeBosses: any[] = [];
  return Array.from({ length: 8 }).map((_, i) => ({
    id: `lobby-${Date.now()}-${i}`,
    bossId: activeBosses[i % activeBosses.length].id,
    hostId: `host-${i}`,
    hostName: `Trainer_${Math.floor(Math.random() * 9999)}`,
    hostRating: (3.5 + Math.random() * 1.5).toFixed(1),
    players: Array.from({ length: Math.floor(Math.random() * 3) + 1 }).map(
      (_, j) => ({
        id: `p-${i}-${j}`,
        name: j === 0 ? `Trainer_${Math.floor(Math.random() * 9999)}` : `Raider${j}`,
        level: 30 + Math.floor(Math.random() * 20),
        team: (["valor", "mystic", "instinct"] as const)[j % 3],
        isReady: Math.random() > 0.5,
        isHost: j === 0,
        friendCode: `${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
      })
    ),
    maxPlayers: 6,
    team: TEAMS[i % 4].id as "valor" | "mystic" | "instinct" | "neutral",
    minLevel: i % 3 === 0 ? 40 : 1,
    weather: Math.random() > 0.6,
    createdAt: Date.now() - Math.random() * 300000,
    timeLeft: Math.floor(Math.random() * 40) + 5,
    raidStarted: false,
    invitesSent: false,
  }));
}

/**
 * Per-user persistent abuse tracking — survives queue leave/rejoin cycles.
 * Stored separately from QueueEntry so penalties carry across sessions.
 */
interface UserAbuseRecord {
  leaveCount: number;
  noResponseCount: number;
  originalJoinedAt: Record<string, number>; // bossId -> first join timestamp
  rejoinCooldownUntil: Record<string, number>; // bossId -> cooldown end timestamp
}

const RESERVATION_TIMEOUT_MS = 20_000;       // 20 seconds to accept promotion
const DISCONNECT_FREE_MS = 30 * 60_000;      // 30 min — waiting users keep their place
const DISCONNECT_PREMIUM_MS = 4 * 60 * 60_000; // 4 hr for premium users
const REJOIN_COOLDOWN_MS = 60_000;       // 60s cooldown after rapid leave
const RAPID_LEAVE_THRESHOLD_MS = 30_000; // Leaving within 30s of joining is "rapid"

// Priority score constants (lower = higher priority)
const PREMIUM_BOOST = -10;
const LEAVE_PENALTY = 5;
const NO_RESPONSE_PENALTY = 10;

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private lobbies: Map<string, Lobby>;
  private feedback: Map<number, Feedback>;
  private feedbackIdCounter: number;
  private bannedUsers: Map<string, BannedUser>;
  private bannedIdCounter: number;
  private pushTokens: Map<string, PushToken>;
  private pushTokenIdCounter: number;
  private raidBosses: Map<string, RaidBoss>;
  private queueEntries: Map<string, QueueEntry>;
  private userAbuseRecords: Map<string, UserAbuseRecord>;
  private almostUpNotified: Map<string, number>; // `${userId}-${bossId}` → last notified timestamp
  // Catch tracker
  private catchRecords: CatchRecord[];
  // Private groups
  private raidGroups: Map<string, RaidGroup>;
  private groupIdCounter: number;
  // Advertisements
  private adImpressions: AdImpression[];
  private adClicks: Set<string>;          // impression IDs that were clicked
  private adConfigs: Map<AdPlacement, AdConfig>;
  private reports: Map<number, Report>;
  private reportsIdCounter: number;

  constructor() {
    this.users = new Map();
    this.lobbies = new Map();
    this.feedback = new Map();
    this.feedbackIdCounter = 1;
    this.bannedUsers = new Map();
    this.bannedIdCounter = 1;
    this.pushTokens = new Map();
    this.pushTokenIdCounter = 1;
    this.raidBosses = new Map();
    this.queueEntries = new Map();
    this.userAbuseRecords = new Map();
    this.almostUpNotified = new Map();
    // Catch tracker
    this.catchRecords = [];
    // Private groups
    this.raidGroups = new Map();
    this.groupIdCounter = 1;
    // Advertisements
    this.adImpressions = [];
    this.adClicks = new Set();
    this.adConfigs = new Map([
      ['banner',       { placement: 'banner',       enabled: true,  frequency: undefined, rewardQueueSkip: undefined }],
      ['native_card',  { placement: 'native_card',  enabled: true,  frequency: 5,         rewardQueueSkip: undefined }],
      ['rewarded',     { placement: 'rewarded',     enabled: true,  frequency: undefined, rewardQueueSkip: 5         }],
      ['interstitial', { placement: 'interstitial', enabled: false, frequency: undefined, rewardQueueSkip: undefined }],
    ]);
    this.reports = new Map();
    this.reportsIdCounter = 1;
    // raidBosses map starts empty — populated entirely by raid-fetcher.ts (live scrape).
    // No hardcoded boss data. No static seeding.
  }

  async getActiveRaidBosses(): Promise<RaidBoss[]> {
    const now = Date.now();
    return Array.from(this.raidBosses.values())
      .filter(boss => {
        // Admin-hidden bosses are never shown
        if (boss.adminOverride === 'hidden') return false;

        // Admin-approved bosses always shown (bypass confidence check + time window)
        if (boss.adminOverride === 'approved') return true;

        if (!boss.isActive) return false;

        // Confidence gate: bosses below 40 are held back
        if (boss.confidenceScore !== undefined && boss.confidenceScore < 40) return false;

        // Check time windows if set
        if (boss.endTime && now > boss.endTime) {
          // Auto-expire bosses past their end time
          boss.isActive = false;
          this.raidBosses.set(boss.id, boss);
          return false;
        }
        if (boss.startTime && now < boss.startTime) return false;

        return true;
      })
      .sort((a, b) => {
        // Sort: admin-approved first, then by tier desc, then by confidence desc
        if (a.adminOverride === 'approved' && b.adminOverride !== 'approved') return -1;
        if (b.adminOverride === 'approved' && a.adminOverride !== 'approved') return 1;
        if (b.tier !== a.tier) return b.tier - a.tier;
        return (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0);
      });
  }

  async getAllRaidBosses(): Promise<RaidBoss[]> {
    return Array.from(this.raidBosses.values())
      .sort((a, b) => b.tier - a.tier);
  }

  async getRaidBossById(bossId: string): Promise<RaidBoss | undefined> {
    return this.raidBosses.get(bossId);
  }

  async isRaidBossActive(bossId: string): Promise<boolean> {
    const boss = this.raidBosses.get(bossId);
    if (!boss) return false;

    // Admin overrides
    if (boss.adminOverride === 'hidden') return false;
    if (boss.adminOverride === 'approved') return true;

    if (!boss.isActive) return false;

    // Confidence gate
    if (boss.confidenceScore !== undefined && boss.confidenceScore < 40) return false;

    const now = Date.now();

    // Check if boss has expired - update stored state if so
    if (boss.endTime && now > boss.endTime) {
      boss.isActive = false;
      this.raidBosses.set(bossId, boss);
      return false;
    }

    // Check if boss hasn't started yet - not available until startTime
    if (boss.startTime && now < boss.startTime) {
      return false;
    }

    return true;
  }

  async setRaidBossActive(bossId: string, isActive: boolean, startTime?: number, endTime?: number): Promise<RaidBoss | undefined> {
    const boss = this.raidBosses.get(bossId);
    if (!boss) return undefined;

    // Admin-approved bosses cannot be deactivated by the scraper
    if (!isActive && boss.adminOverride === 'approved') {
      return boss;
    }

    const updated: RaidBoss = {
      ...boss,
      isActive,
      startTime: startTime ?? (isActive ? Date.now() : boss.startTime),
      endTime: endTime ?? boss.endTime,
    };
    this.raidBosses.set(bossId, updated);
    return updated;
  }

  async addRaidBoss(boss: RaidBoss): Promise<RaidBoss> {
    const existing = this.raidBosses.get(boss.id);
    if (existing) {
      // Admin-approved bosses: only update metadata, never deactivate
      if (existing.adminOverride === 'approved') {
        const merged: RaidBoss = {
          ...existing,
          // Update scraped metadata but keep approval
          confidenceScore: boss.confidenceScore ?? existing.confidenceScore,
          lastVerifiedAt: boss.lastVerifiedAt ?? existing.lastVerifiedAt,
          sources: boss.sources ?? existing.sources,
          sourceUrls: boss.sourceUrls ?? existing.sourceUrls,
          raidType: boss.raidType ?? existing.raidType,
          regions: boss.regions ?? existing.regions,
          startTime: boss.startTime ?? existing.startTime,
          endTime: boss.endTime ?? existing.endTime,
        };
        this.raidBosses.set(boss.id, merged);
        return merged;
      }
      // Merge: incoming scraper data wins for active/time/confidence fields
      const merged: RaidBoss = {
        ...existing,
        isActive: boss.isActive,
        startTime: boss.startTime ?? existing.startTime,
        endTime: boss.endTime ?? existing.endTime,
        confidenceScore: boss.confidenceScore ?? existing.confidenceScore,
        lastVerifiedAt: boss.lastVerifiedAt ?? existing.lastVerifiedAt,
        sources: boss.sources ?? existing.sources,
        sourceUrls: boss.sourceUrls ?? existing.sourceUrls,
        raidType: boss.raidType ?? existing.raidType,
        regions: boss.regions ?? existing.regions,
        // Preserve admin state
        adminOverride: existing.adminOverride,
        adminNote: existing.adminNote,
      };
      this.raidBosses.set(boss.id, merged);
      return merged;
    }
    // New boss — store as-is
    this.raidBosses.set(boss.id, boss);
    return boss;
  }

  async updateRaidBoss(bossId: string, updates: Partial<RaidBoss>): Promise<RaidBoss | undefined> {
    const boss = this.raidBosses.get(bossId);
    if (!boss) return undefined;
    const updated: RaidBoss = { ...boss, ...updates };
    this.raidBosses.set(bossId, updated);
    return updated;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.name === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  /**
   * Update user subscription - SECURITY: Only method to modify premium status
   * 
   * This is called ONLY after server-side receipt verification.
   * The frontend CANNOT call this directly.
   */
  async updateUserSubscription(
    userId: string, 
    updates: { isPremium: boolean; subscription: Subscription }
  ): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;

    const updatedUser: User = {
      ...user,
      isPremium: updates.isPremium,
      subscription: updates.subscription as any,
    };
    
    this.users.set(userId, updatedUser);
    console.log(`[STORAGE] Updated subscription for user ${userId}: isPremium=${updates.isPremium}`);
    return updatedUser;
  }

  /** Maximum age a lobby stays open before being automatically purged. */
  static readonly LOBBY_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes — hard limit

  async getLobbies(): Promise<Lobby[]> {
    const now = Date.now();
    const entries = Array.from(this.lobbies.entries());
    for (const [id, lobby] of entries) {
      if (now - lobby.createdAt >= MemStorage.LOBBY_MAX_AGE_MS) {
        this.lobbies.delete(id);
      }
    }

    const activeLobbies = Array.from(this.lobbies.values())
      .filter(lobby => !lobby.raidStarted)
      .sort((a, b) => b.createdAt - a.createdAt);
    return activeLobbies;
  }

  async getLobby(id: string): Promise<Lobby | undefined> {
    return this.lobbies.get(id);
  }


  async createLobby(insertLobby: InsertLobby): Promise<Lobby> {
    const id = randomUUID();
    const lobby: Lobby = {
      ...insertLobby,
      id,
      createdAt: Date.now(),
    };
    this.lobbies.set(id, lobby);
    return lobby;
  }

  async updateLobby(id: string, updates: Partial<Lobby>): Promise<Lobby | undefined> {
    const lobby = this.lobbies.get(id);
    if (!lobby) return undefined;

    const updatedLobby = { ...lobby, ...updates, id };
    this.lobbies.set(id, updatedLobby);
    return updatedLobby;
  }

  async deleteLobby(id: string): Promise<boolean> {
    return this.lobbies.delete(id);
  }

  /**
   * Update Lobby Capacity - HOST ONLY PERMISSION
   * 
   * This method enforces that ONLY the raid host can modify lobby capacity.
   * Non-hosts attempting to change capacity will receive an error.
   * 
   * Validation Rules:
   * 1. Lobby must exist
   * 2. Requester must be the host (hostId match)
   * 3. New capacity must be within RAID_CAPACITY.MIN (2) and RAID_CAPACITY.MAX (10)
   * 4. Cannot reduce capacity below current player count (to avoid kicking players)
   * 
   * @param lobbyId - The lobby to update
   * @param hostId - The ID of the user making the request (must match lobby.hostId)
   * @param newCapacity - The new maximum player count (2-10)
   * @returns Object with lobby on success, or error message on failure
   */
  async updateLobbyCapacity(lobbyId: string, hostId: string, newCapacity: number): Promise<{ lobby?: Lobby; error?: string }> {
    const lobby = this.lobbies.get(lobbyId);
    
    // Validation 1: Lobby must exist
    if (!lobby) {
      return { error: "Lobby not found" };
    }
    
    // Validation 2: HOST-ONLY - Only the lobby host can modify capacity
    if (lobby.hostId !== hostId) {
      console.log(`[SECURITY] Non-host ${hostId} attempted to modify capacity for lobby ${lobbyId} (host: ${lobby.hostId})`);
      return { error: "Only the host can modify raid capacity" };
    }
    
    // Validation 3: Capacity within valid range
    if (newCapacity < RAID_CAPACITY.MIN || newCapacity > RAID_CAPACITY.MAX) {
      return { error: `Capacity must be between ${RAID_CAPACITY.MIN} and ${RAID_CAPACITY.MAX} players` };
    }
    
    // Validation 4: Cannot reduce below current player count
    if (newCapacity < lobby.players.length) {
      return { error: `Cannot reduce capacity below current player count (${lobby.players.length})` };
    }
    
    // Update the lobby capacity
    const updatedLobby = { ...lobby, maxPlayers: newCapacity };
    this.lobbies.set(lobbyId, updatedLobby);
    
    console.log(`[LOBBY] Host ${hostId} updated capacity for lobby ${lobbyId}: ${lobby.maxPlayers} -> ${newCapacity}`);
    return { lobby: updatedLobby };
  }

  async joinLobby(lobbyId: string, player: Player): Promise<Lobby | undefined> {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return undefined;
    if (lobby.raidStarted) return undefined;
    if (lobby.players.length >= lobby.maxPlayers) return undefined;
    if (lobby.players.some(p => p.id === player.id)) return lobby;

    // Server-side 10-minute expiry: reject new joins on stale lobbies and purge
    if (Date.now() - lobby.createdAt >= MemStorage.LOBBY_MAX_AGE_MS) {
      this.lobbies.delete(lobbyId);
      return undefined;
    }

    const updatedLobby = {
      ...lobby,
      players: [...lobby.players, player],
    };
    this.lobbies.set(lobbyId, updatedLobby);
    return updatedLobby;
  }

  async leaveLobby(lobbyId: string, playerId: string): Promise<Lobby | undefined> {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return undefined;

    const isHost = lobby.players.find(p => p.id === playerId)?.isHost;
    
    if (isHost) {
      this.lobbies.delete(lobbyId);
      return undefined;
    }

    const updatedLobby = {
      ...lobby,
      players: lobby.players.filter(p => p.id !== playerId),
    };
    this.lobbies.set(lobbyId, updatedLobby);
    return updatedLobby;
  }

  async updatePlayerReady(lobbyId: string, playerId: string, isReady: boolean): Promise<Lobby | undefined> {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return undefined;

    const updatedLobby = {
      ...lobby,
      players: lobby.players.map(p =>
        p.id === playerId ? { ...p, isReady } : p
      ),
    };
    this.lobbies.set(lobbyId, updatedLobby);
    return updatedLobby;
  }

  async markPlayerSentRequest(lobbyId: string, playerId: string): Promise<Lobby | undefined> {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return undefined;

    const updatedLobby = {
      ...lobby,
      players: lobby.players.map(p =>
        p.id === playerId ? { ...p, hasSentRequest: true } : p
      ),
    };
    this.lobbies.set(lobbyId, updatedLobby);
    return updatedLobby;
  }

  async startRaid(lobbyId: string, hostId: string): Promise<Lobby | undefined> {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return undefined;
    if (lobby.hostId !== hostId) return undefined;

    const updatedLobby = {
      ...lobby,
      raidStarted: true,
      invitesSent: true,
    };
    this.lobbies.set(lobbyId, updatedLobby);
    return updatedLobby;
  }

  async closeLobby(lobbyId: string, hostId: string): Promise<Lobby | undefined> {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return undefined;
    if (lobby.hostId !== hostId) return undefined;

    const updatedLobby = {
      ...lobby,
      raidStarted: true,
      invitesSent: true,
    };
    this.lobbies.set(lobbyId, updatedLobby);
    return updatedLobby;
  }

  async createFeedback(insertFeedback: InsertFeedback): Promise<Feedback> {
    const id = this.feedbackIdCounter++;
    const feedback: Feedback = {
      ...insertFeedback,
      id,
      createdAt: Date.now(),
    };
    this.feedback.set(id, feedback);
    return feedback;
  }

  async getAllFeedback(): Promise<Feedback[]> {
    return Array.from(this.feedback.values())
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  async getFeedbackByHost(hostId: string): Promise<Feedback[]> {
    return Array.from(this.feedback.values())
      .filter(f => f.hostId === hostId)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  async banUser(friendCode: string, reason: string | undefined, bannedBy: string): Promise<BannedUser> {
    const normalizedCode = friendCode.replace(/\s/g, "");
    const banned: BannedUser = {
      id: this.bannedIdCounter++,
      friendCode: normalizedCode,
      reason,
      bannedBy,
      bannedAt: Date.now(),
    };
    this.bannedUsers.set(normalizedCode, banned);
    await this.deleteUserByFriendCode(friendCode);
    return banned;
  }

  async unbanUser(friendCode: string): Promise<boolean> {
    const normalizedCode = friendCode.replace(/\s/g, "");
    return this.bannedUsers.delete(normalizedCode);
  }

  async isBanned(friendCode: string): Promise<boolean> {
    const normalizedCode = friendCode.replace(/\s/g, "");
    return this.bannedUsers.has(normalizedCode);
  }

  async getBannedUsers(): Promise<BannedUser[]> {
    return Array.from(this.bannedUsers.values())
      .sort((a, b) => (b.bannedAt || 0) - (a.bannedAt || 0));
  }

  async deleteUserByFriendCode(friendCode: string): Promise<boolean> {
    const normalizedCode = friendCode.replace(/\s/g, "");
    let deleted = false;
    const userEntries = Array.from(this.users.entries());
    for (const [id, user] of userEntries) {
      if (user.code.replace(/\s/g, "") === normalizedCode) {
        this.users.delete(id);
        deleted = true;
        const lobbyEntries = Array.from(this.lobbies.entries());
        for (const [lobbyId, lobby] of lobbyEntries) {
          const updatedPlayers = lobby.players.filter((p: Player) => p.id !== id);
          if (updatedPlayers.length !== lobby.players.length) {
            if (lobby.hostId === id) {
              this.lobbies.delete(lobbyId);
            } else {
              this.lobbies.set(lobbyId, { ...lobby, players: updatedPlayers });
            }
          }
        }
        break;
      }
    }
    return deleted;
  }

  async registerPushToken(data: InsertPushToken): Promise<PushToken> {
    const existing = Array.from(this.pushTokens.values()).find(t => t.token === data.token);
    if (existing) {
      const updated: PushToken = { ...existing, userId: data.userId, lastUsed: Date.now() };
      this.pushTokens.set(data.token, updated);
      return updated;
    }
    
    const id = this.pushTokenIdCounter++;
    const pushToken: PushToken = {
      ...data,
      id,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };
    this.pushTokens.set(data.token, pushToken);
    return pushToken;
  }

  async removePushToken(token: string): Promise<boolean> {
    return this.pushTokens.delete(token);
  }

  async getPushTokensForUser(userId: string): Promise<PushToken[]> {
    return Array.from(this.pushTokens.values()).filter(t => t.userId === userId);
  }

  async getPushTokensForUsers(userIds: string[]): Promise<PushToken[]> {
    const userIdSet = new Set(userIds);
    return Array.from(this.pushTokens.values()).filter(t => userIdSet.has(t.userId));
  }

  // =============================================
  // Queue management - structured fairness system
  // =============================================

  private getAbuseRecord(userId: string): UserAbuseRecord {
    if (!this.userAbuseRecords.has(userId)) {
      this.userAbuseRecords.set(userId, {
        leaveCount: 0,
        noResponseCount: 0,
        originalJoinedAt: {},
        rejoinCooldownUntil: {},
      });
    }
    return this.userAbuseRecords.get(userId)!;
  }

  private calculatePriorityScore(userId: string, isPremium: boolean): number {
    const abuse = this.getAbuseRecord(userId);
    let score = 0;
    if (isPremium) score += PREMIUM_BOOST;
    score += abuse.leaveCount * LEAVE_PENALTY;
    score += abuse.noResponseCount * NO_RESPONSE_PENALTY;
    return score;
  }

  private sortQueue(entries: QueueEntry[]): QueueEntry[] {
    return [...entries].sort((a, b) => {
      if (a.priorityScore !== b.priorityScore) return a.priorityScore - b.priorityScore;
      return a.originalJoinedAt - b.originalJoinedAt;
    });
  }

  async joinQueue(entry: InsertQueueEntry): Promise<{ entry: QueueEntry; cooldownMs?: number }> {
    const now = Date.now();
    const key = `${entry.userId}-${entry.bossId}`;
    const abuse = this.getAbuseRecord(entry.userId);

    // Check rejoin cooldown (anti-abuse: rapid leave+rejoin prevention)
    const cooldownUntil = abuse.rejoinCooldownUntil[entry.bossId] || 0;
    if (now < cooldownUntil) {
      const cooldownMs = cooldownUntil - now;
      // Return existing entry or a placeholder — caller checks cooldownMs
      const existing = this.queueEntries.get(key);
      if (existing) return { entry: existing, cooldownMs };
      // Build a stub for the response
      const stub: QueueEntry = {
        id: 'cooldown',
        ...entry,
        joinedAt: now,
        originalJoinedAt: abuse.originalJoinedAt[entry.bossId] || now,
        priorityScore: this.calculatePriorityScore(entry.userId, entry.isPremium),
        connectionStatus: 'active',
        lastHeartbeat: now,
        reserved: false,
        reservedAt: null,
        leaveCount: abuse.leaveCount,
        noResponseCount: abuse.noResponseCount,
        status: 'cancelled',
      };
      return { entry: stub, cooldownMs };
    }

    // Already in queue and still active → return existing (no duplicate)
    const existing = this.queueEntries.get(key);
    if (existing && (existing.status === 'waiting' || existing.status === 'reserved')) {
      // Refresh heartbeat on re-open
      existing.lastHeartbeat = now;
      existing.connectionStatus = 'active';
      this.queueEntries.set(key, existing);
      return { entry: existing };
    }

    // Rejoin protection: keep original join timestamp for fair positioning
    const originalJoinedAt = abuse.originalJoinedAt[entry.bossId] || now;
    if (!abuse.originalJoinedAt[entry.bossId]) {
      abuse.originalJoinedAt[entry.bossId] = now;
    }

    const queueEntry: QueueEntry = {
      id: randomUUID(),
      ...entry,
      joinedAt: now,
      originalJoinedAt,
      priorityScore: this.calculatePriorityScore(entry.userId, entry.isPremium),
      connectionStatus: 'active',
      lastHeartbeat: now,
      reserved: false,
      reservedAt: null,
      leaveCount: abuse.leaveCount,
      noResponseCount: abuse.noResponseCount,
      status: 'waiting',
    };

    this.queueEntries.set(key, queueEntry);
    return { entry: queueEntry };
  }

  async leaveQueue(userId: string, bossId?: string): Promise<boolean> {
    const now = Date.now();
    let removed = false;

    const processLeave = (key: string, entry: QueueEntry) => {
      const abuse = this.getAbuseRecord(entry.userId);
      const timeInQueue = now - entry.joinedAt;

      // Apply leave penalty for rapid leaves
      if (timeInQueue < RAPID_LEAVE_THRESHOLD_MS) {
        abuse.leaveCount++;
        abuse.rejoinCooldownUntil[entry.bossId] = now + REJOIN_COOLDOWN_MS;
      }

      // Clear original join timestamp on voluntary leave (they're fully resetting)
      delete abuse.originalJoinedAt[entry.bossId];

      entry.status = 'cancelled';
      this.queueEntries.set(key, entry);
    };

    if (bossId) {
      const key = `${userId}-${bossId}`;
      const entry = this.queueEntries.get(key);
      if (entry && (entry.status === 'waiting' || entry.status === 'reserved')) {
        processLeave(key, entry);
        removed = true;
      }
    } else {
      for (const [key, entry] of Array.from(this.queueEntries.entries())) {
        if (entry.userId === userId && (entry.status === 'waiting' || entry.status === 'reserved')) {
          processLeave(key, entry);
          removed = true;
        }
      }
    }

    return removed;
  }

  async heartbeatQueue(userId: string, bossId: string): Promise<boolean> {
    const key = `${userId}-${bossId}`;
    const entry = this.queueEntries.get(key);
    if (!entry || (entry.status !== 'waiting' && entry.status !== 'reserved')) return false;

    entry.lastHeartbeat = Date.now();
    entry.connectionStatus = 'active';
    this.queueEntries.set(key, entry);
    return true;
  }

  async acceptReservation(userId: string, bossId: string): Promise<{ lobbyId: string } | null> {
    const key = `${userId}-${bossId}`;
    const entry = this.queueEntries.get(key);
    if (!entry || entry.status !== 'reserved' || !entry.matchedLobbyId) return null;

    // Check reservation hasn't expired
    const now = Date.now();
    if (entry.reservedAt && now - entry.reservedAt > RESERVATION_TIMEOUT_MS) {
      entry.status = 'expired';
      this.queueEntries.set(key, entry);
      return null;
    }

    const lobby = this.lobbies.get(entry.matchedLobbyId);
    if (!lobby || lobby.raidStarted || lobby.players.length >= lobby.maxPlayers) {
      // Lobby gone or full — put user back in queue
      entry.status = 'waiting';
      entry.reserved = false;
      entry.reservedAt = null;
      entry.matchedLobbyId = undefined;
      this.queueEntries.set(key, entry);
      return null;
    }

    // Commit: add player to lobby and remove from queue
    const player: Player = {
      id: entry.userId,
      name: entry.userName,
      level: entry.userLevel,
      team: entry.userTeam,
      isReady: false,
      isHost: false,
      friendCode: entry.friendCode,
      isPremium: entry.isPremium,
    };

    lobby.players.push(player);
    this.lobbies.set(lobby.id, lobby);

    entry.status = 'matched';
    this.queueEntries.set(key, entry);

    return { lobbyId: lobby.id };
  }

  async rejectReservation(userId: string, bossId: string): Promise<boolean> {
    const key = `${userId}-${bossId}`;
    const entry = this.queueEntries.get(key);
    if (!entry || entry.status !== 'reserved') return false;

    const abuse = this.getAbuseRecord(userId);
    abuse.noResponseCount++;

    entry.status = 'cancelled';
    entry.reserved = false;
    entry.reservedAt = null;
    entry.matchedLobbyId = undefined;
    this.queueEntries.set(key, entry);
    return true;
  }

  async getQueueStatus(userId: string, bossId: string): Promise<QueueStatus | null> {
    const key = `${userId}-${bossId}`;
    const entry = this.queueEntries.get(key);

    if (!entry || entry.status === 'cancelled' || entry.status === 'expired') {
      return null;
    }

    const bossQueue = this.sortQueue(
      Array.from(this.queueEntries.values()).filter(
        e => e.bossId === bossId && (e.status === 'waiting' || e.status === 'reserved')
      )
    );

    const position = bossQueue.findIndex(e => e.userId === userId) + 1;
    const avgWaitPerPerson = 45; // seconds
    const estimatedWaitSeconds = Math.max(0, (position - 1) * avgWaitPerPerson);

    return {
      bossId,
      bossName: bossId, // resolved to display name by the route layer via fetchCurrentRaidBosses()
      position,
      totalInQueue: bossQueue.length,
      estimatedWaitSeconds,
      status: entry.status,
      matchedLobbyId: entry.matchedLobbyId,
      reserved: entry.reserved,
      reservationExpiresAt: entry.reserved && entry.reservedAt
        ? entry.reservedAt + RESERVATION_TIMEOUT_MS
        : undefined,
      isAlmostUp: position <= 2 && position > 0,
    };
  }

  async getUserQueues(userId: string): Promise<QueueStatus[]> {
    const userEntries = Array.from(this.queueEntries.values())
      .filter(e => e.userId === userId && (e.status === 'waiting' || e.status === 'reserved'));

    const statuses: QueueStatus[] = [];
    for (const entry of userEntries) {
      const status = await this.getQueueStatus(userId, entry.bossId);
      if (status) statuses.push(status);
    }
    return statuses;
  }

  async getQueueForBoss(bossId: string): Promise<QueueEntry[]> {
    return this.sortQueue(
      Array.from(this.queueEntries.values()).filter(
        e => e.bossId === bossId && (e.status === 'waiting' || e.status === 'reserved')
      )
    );
  }

  async getQueueCounts(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const entry of Array.from(this.queueEntries.values())) {
      if (entry.status === 'waiting' || entry.status === 'reserved') {
        counts[entry.bossId] = (counts[entry.bossId] || 0) + 1;
      }
    }
    return counts;
  }

  /**
   * Process queue matches using the reservation system.
   * When a lobby slot opens, reserve the top eligible user instead of
   * directly joining them — they must accept within RESERVATION_TIMEOUT_MS.
   */
  async processQueueMatches(): Promise<{ matched: QueueEntry[]; lobbies: Lobby[] }> {
    const matchedEntries: QueueEntry[] = [];
    const affectedLobbies: Lobby[] = [];
    const now = Date.now();

    const lobbiesWithSpace = Array.from(this.lobbies.values())
      .filter(l => !l.raidStarted && l.players.length < l.maxPlayers);

    for (const lobby of lobbiesWithSpace) {
      const queue = await this.getQueueForBoss(lobby.bossId);

      for (const entry of queue) {
        if (lobby.players.length >= lobby.maxPlayers) break;

        // Skip already reserved entries
        if (entry.reserved) continue;

        // Skip disconnected users past their tolerance
        if (entry.connectionStatus === 'disconnected') {
          const tolerance = entry.isPremium ? DISCONNECT_PREMIUM_MS : DISCONNECT_FREE_MS;
          if (now - entry.lastHeartbeat > tolerance) continue;
        }

        // Skip if level doesn't meet minimum requirement
        if (entry.userLevel < lobby.minLevel) continue;

        // Reserve this user — they must accept
        entry.reserved = true;
        entry.reservedAt = now;
        entry.status = 'reserved';
        entry.matchedLobbyId = lobby.id;
        this.queueEntries.set(`${entry.userId}-${entry.bossId}`, entry);

        matchedEntries.push(entry);
        if (!affectedLobbies.includes(lobby)) affectedLobbies.push(lobby);
      }
    }

    return { matched: matchedEntries, lobbies: affectedLobbies };
  }

  /**
   * Background job: Remove disconnected users who exceeded their tolerance window.
   */
  async processQueueHeartbeats(): Promise<{ removed: string[] }> {
    const now = Date.now();
    const removed: string[] = [];

    for (const [key, entry] of Array.from(this.queueEntries.entries())) {
      if (entry.status !== 'waiting' && entry.status !== 'reserved') continue;

      const timeSinceHeartbeat = now - entry.lastHeartbeat;

      // Mark as disconnected if no heartbeat for 10s (UI state only)
      if (timeSinceHeartbeat > 10_000 && entry.connectionStatus === 'active') {
        entry.connectionStatus = 'disconnected';
        this.queueEntries.set(key, entry);
      }

      // ── Waiting users: NEVER expire due to heartbeat loss ──
      // Their place in line is saved regardless of app state.
      // They will only be removed if they explicitly leave, or if they
      // fail to respond when reserved (20s window).
      if (entry.status === 'waiting') continue;

      // ── Reserved users: expire if they miss the 20s response window ──
      // (handled by processReservationExpiry, but also guard here with
      // a generous tolerance so we don't double-expire)
      if (entry.status === 'reserved') {
        const tolerance = entry.isPremium ? DISCONNECT_PREMIUM_MS : DISCONNECT_FREE_MS;
        if (entry.connectionStatus === 'disconnected' && timeSinceHeartbeat > tolerance) {
          entry.status = 'expired';
          this.queueEntries.set(key, entry);
          removed.push(entry.userId);
        }
      }
    }

    return { removed };
  }

  /**
   * Return users whose queue position just reached ≤ 2 and haven't received
   * an "almost up" push notification in the last 5 minutes.
   * Marks them so they don't get spammed on the next cycle.
   */
  async getAlmostUpUsers(): Promise<Array<{ userId: string; bossId: string; bossName: string; position: number }>> {
    const now = Date.now();
    const ALMOST_UP_COOLDOWN_MS = 5 * 60_000; // don't re-notify within 5 min
    const result: Array<{ userId: string; bossId: string; bossName: string; position: number }> = [];

    // Group waiting entries by boss and sort by priority
    const byBoss = new Map<string, QueueEntry[]>();
    for (const entry of Array.from(this.queueEntries.values())) {
      if (entry.status !== 'waiting') continue;
      const list = byBoss.get(entry.bossId) || [];
      list.push(entry);
      byBoss.set(entry.bossId, list);
    }

    for (const [bossId, entries] of Array.from(byBoss.entries())) {
      const sorted = this.sortQueue(entries);
      sorted.forEach((entry, idx) => {
        const position = idx + 1;
        if (position > 2) return;
        const notifKey = `${entry.userId}-${bossId}`;
        const lastNotified = this.almostUpNotified.get(notifKey) || 0;
        if (now - lastNotified < ALMOST_UP_COOLDOWN_MS) return;
        this.almostUpNotified.set(notifKey, now);
        result.push({
          userId: entry.userId,
          bossId,
          bossName: bossId,
          position,
        });
      });
    }

    return result;
  }

  /**
   * Background job: Expire reservations where user didn't respond within timeout.
   * Apply no-response penalty and try to find the next eligible user.
   */
  async processReservationExpiry(): Promise<{ expired: string[] }> {
    const now = Date.now();
    const expired: string[] = [];

    for (const [key, entry] of Array.from(this.queueEntries.entries())) {
      if (entry.status !== 'reserved' || !entry.reservedAt) continue;

      const age = now - entry.reservedAt;
      if (age <= RESERVATION_TIMEOUT_MS) continue;

      // Reservation timed out — penalize and cancel
      const abuse = this.getAbuseRecord(entry.userId);
      abuse.noResponseCount++;

      entry.status = 'cancelled';
      entry.reserved = false;
      entry.reservedAt = null;
      entry.matchedLobbyId = undefined;
      this.queueEntries.set(key, entry);

      expired.push(entry.userId);
    }

    return { expired };
  }

  async createReport(insertReport: InsertReport): Promise<Report> {
    const id = this.reportsIdCounter++;
    const report: Report = {
      ...insertReport,
      id,
      status: 'pending',
      createdAt: Date.now(),
    };
    this.reports.set(id, report);
    return report;
  }

  async getAllReports(): Promise<Report[]> {
    return Array.from(this.reports.values())
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  async getReportsByUser(userId: string): Promise<Report[]> {
    return Array.from(this.reports.values())
      .filter(r => r.reportedUserId === userId)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  async updateReportStatus(reportId: number, status: string): Promise<Report | undefined> {
    const report = this.reports.get(reportId);
    if (!report) return undefined;
    const updated: Report = { ...report, status: status as any };
    this.reports.set(reportId, updated);
    return updated;
  }

  // =============================================
  // Admin: User management
  // =============================================

  async updateUser(userId: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    const updated: User = { ...user, ...updates, id: userId };
    this.users.set(userId, updated);
    return updated;
  }

  async deleteUser(userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;

    // Remove from all lobbies
    for (const [lobbyId, lobby] of Array.from(this.lobbies.entries())) {
      if (lobby.hostId === userId) {
        this.lobbies.delete(lobbyId);
      } else if (lobby.players.some((p: { id: string }) => p.id === userId)) {
        this.lobbies.set(lobbyId, {
          ...lobby,
          players: lobby.players.filter((p: { id: string }) => p.id !== userId),
        });
      }
    }

    // Remove push tokens
    for (const [token, pt] of Array.from(this.pushTokens.entries())) {
      if (pt.userId === userId) this.pushTokens.delete(token);
    }

    // Remove queue entries
    for (const [key, entry] of Array.from(this.queueEntries.entries())) {
      if (entry.userId === userId) this.queueEntries.delete(key);
    }

    this.users.delete(userId);
    return true;
  }

  async grantPremium(userId: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    const updated: User = {
      ...user,
      isPremium: true,
      subscription: {
        status: 'active',
        startDate: Date.now(),
        renewalDate: null,
        canceledAt: null,
        plan: 'elite_monthly',
        price: 0,
        storeType: 'none',
        verificationStatus: 'verified',
        lastVerifiedAt: Date.now(),
      } as any,
    };
    this.users.set(userId, updated);
    console.log(`[ADMIN] Granted premium to user ${userId} (${user.name})`);
    return updated;
  }

  async revokePremium(userId: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    const updated: User = {
      ...user,
      isPremium: false,
      subscription: {
        status: 'none',
        startDate: null,
        renewalDate: null,
        canceledAt: Date.now(),
        plan: 'none',
        price: 0,
        storeType: 'none',
        verificationStatus: 'none',
      } as any,
    };
    this.users.set(userId, updated);
    console.log(`[ADMIN] Revoked premium from user ${userId} (${user.name})`);
    return updated;
  }

  async resetUserCoins(userId: string, coins: number): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    const updated: User = { ...user, coins };
    this.users.set(userId, updated);
    return updated;
  }

  // =============================================
  // Admin: Lobby management
  // =============================================

  async getAllLobbiesIncludingStarted(): Promise<Lobby[]> {
    return Array.from(this.lobbies.values())
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async forceCloseLobby(lobbyId: string): Promise<boolean> {
    const deleted = this.lobbies.delete(lobbyId);
    if (deleted) {
      console.log(`[ADMIN] Force-closed lobby ${lobbyId}`);
    }
    return deleted;
  }

  async kickPlayerFromLobby(lobbyId: string, playerId: string): Promise<Lobby | undefined> {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return undefined;

    // Cannot kick the host
    if (lobby.hostId === playerId) return undefined;

    const updated: Lobby = {
      ...lobby,
      players: lobby.players.filter(p => p.id !== playerId),
    };
    this.lobbies.set(lobbyId, updated);
    console.log(`[ADMIN] Kicked player ${playerId} from lobby ${lobbyId}`);
    return updated;
  }

  // =============================================
  // Admin: Analytics
  // =============================================

  async getAnalytics(): Promise<AppAnalytics> {
    const allUsers = Array.from(this.users.values());
    const allLobbies = Array.from(this.lobbies.values());
    const allFeedback = Array.from(this.feedback.values());
    const allReports = Array.from(this.reports.values());
    const allQueues = Array.from(this.queueEntries.values());
    // Use getActiveRaidBosses() to get the accurate count — respects confidence gate,
    // admin overrides, and auto-expiry of time-windowed bosses.
    const activeBosses = await this.getActiveRaidBosses();

    const avgRating = allFeedback.length > 0
      ? allFeedback.reduce((sum, f) => sum + f.hostRating, 0) / allFeedback.length
      : 0;

    return {
      totalUsers: allUsers.length,
      premiumUsers: allUsers.filter(u => u.isPremium).length,
      activeLobbies: allLobbies.filter(l => !l.raidStarted).length,
      startedRaids: allLobbies.filter(l => l.raidStarted).length,
      totalFeedback: allFeedback.length,
      averageHostRating: Math.round(avgRating * 10) / 10,
      totalReports: allReports.length,
      pendingReports: allReports.filter(r => r.status === 'pending').length,
      totalBanned: this.bannedUsers.size,
      queuedUsers: allQueues.filter(q => q.status === 'waiting').length,
      activeBosses: activeBosses.length,
      serverUptime: process.uptime(),
    };
  }

  // =============================================
  // Admin: Push tokens
  // =============================================

  async getAllPushTokens(): Promise<PushToken[]> {
    return Array.from(this.pushTokens.values());
  }

  // ============================================================================
  // CATCH & IV TRACKER
  // ============================================================================

  async logCatch(record: Omit<CatchRecord, 'id' | 'createdAt'>): Promise<CatchRecord> {
    const entry: CatchRecord = { ...record, id: randomUUID(), createdAt: Date.now() };
    this.catchRecords.push(entry);
    if (this.catchRecords.length > 100_000) this.catchRecords = this.catchRecords.slice(-100_000);
    return entry;
  }

  async getCatchHistory(userId: string, limit = 50): Promise<CatchRecord[]> {
    return this.catchRecords
      .filter(r => r.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  async getCatchStats(userId: string): Promise<CatchStats> {
    const records = this.catchRecords.filter(r => r.userId === userId);
    const caught = records.filter(r => r.caught);
    const shiny = records.filter(r => r.isShiny);

    const byBoss: CatchStats['byBoss'] = {};
    for (const r of records) {
      if (!byBoss[r.bossId]) byBoss[r.bossId] = { raids: 0, caught: 0, shiny: 0, bestCp: 0 };
      byBoss[r.bossId].raids++;
      if (r.caught) { byBoss[r.bossId].caught++; byBoss[r.bossId].bestCp = Math.max(byBoss[r.bossId].bestCp, r.cp ?? 0); }
      if (r.isShiny) byBoss[r.bossId].shiny++;
    }

    return {
      totalRaids: records.length,
      totalCaught: caught.length,
      totalShiny: shiny.length,
      catchRate: records.length ? caught.length / records.length : 0,
      shinyRate: records.length ? shiny.length / records.length : 0,
      byBoss,
      recentCatches: records.sort((a, b) => b.createdAt - a.createdAt).slice(0, 20),
    };
  }

  // ============================================================================
  // PRIVATE GROUPS
  // ============================================================================

  private generateJoinCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/I/1
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    // Ensure uniqueness
    for (const g of Array.from(this.raidGroups.values())) {
      if (g.joinCode === code) return this.generateJoinCode();
    }
    return code;
  }

  async createGroup(ownerId: string, ownerName: string, name: string): Promise<RaidGroup> {
    const group: RaidGroup = {
      id: randomUUID(),
      name: name.trim().slice(0, 40),
      joinCode: this.generateJoinCode(),
      ownerId,
      ownerName,
      memberIds: [ownerId],
      createdAt: Date.now(),
      maxMembers: 50,
    };
    this.raidGroups.set(group.id, group);
    return group;
  }

  async joinGroup(userId: string, joinCode: string): Promise<RaidGroup | null> {
    const group = Array.from(this.raidGroups.values()).find(
      g => g.joinCode === joinCode.toUpperCase().trim()
    );
    if (!group) return null;
    if (group.memberIds.length >= group.maxMembers) return null;
    if (!group.memberIds.includes(userId)) {
      group.memberIds.push(userId);
      this.raidGroups.set(group.id, group);
    }
    return group;
  }

  async leaveGroup(userId: string, groupId: string): Promise<boolean> {
    const group = this.raidGroups.get(groupId);
    if (!group) return false;
    if (group.ownerId === userId) {
      // Owner leaving dissolves the group
      this.raidGroups.delete(groupId);
      return true;
    }
    group.memberIds = group.memberIds.filter(id => id !== userId);
    this.raidGroups.set(groupId, group);
    return true;
  }

  async getGroup(groupId: string): Promise<RaidGroup | null> {
    return this.raidGroups.get(groupId) ?? null;
  }

  async getGroupByCode(joinCode: string): Promise<RaidGroup | null> {
    return Array.from(this.raidGroups.values()).find(
      g => g.joinCode === joinCode.toUpperCase().trim()
    ) ?? null;
  }

  async getUserGroups(userId: string): Promise<RaidGroup[]> {
    return Array.from(this.raidGroups.values()).filter(g => g.memberIds.includes(userId));
  }

  async getGroupLobbies(groupId: string): Promise<Lobby[]> {
    return Array.from(this.lobbies.values()).filter(
      l => l.groupId === groupId && !l.raidStarted
    );
  }

  // ============================================================================
  // ADVERTISEMENT TRACKING
  // ============================================================================

  async recordAdImpression(
    data: Omit<AdImpression, 'id' | 'createdAt'>
  ): Promise<AdImpression> {
    const impression: AdImpression = {
      ...data,
      id: randomUUID(),
      createdAt: Date.now(),
    };
    this.adImpressions.push(impression);
    // Keep rolling 30-day window in memory (max 50k impressions)
    if (this.adImpressions.length > 50_000) {
      this.adImpressions = this.adImpressions.slice(-50_000);
    }
    return impression;
  }

  async recordAdClick(impressionId: string): Promise<boolean> {
    const exists = this.adImpressions.some(i => i.id === impressionId);
    if (!exists) return false;
    this.adClicks.add(impressionId);
    return true;
  }

  async getAdStats(): Promise<AdStats> {
    const placements: AdPlacement[] = ['banner', 'native_card', 'rewarded', 'interstitial'];
    const byPlacement = {} as AdStats['byPlacement'];

    for (const p of placements) {
      const pImpressions = this.adImpressions.filter(i => i.placement === p);
      const pClicks = pImpressions.filter(i => this.adClicks.has(i.id));
      byPlacement[p] = {
        impressions: pImpressions.length,
        clicks: pClicks.length,
        estimatedRevenueUsd: pImpressions.reduce((s, i) => s + i.estimatedRevenueMicros, 0) / 1_000_000,
      };
    }

    // Daily revenue — last 7 days
    const dailyMap = new Map<string, { impressions: number; micros: number }>();
    const now = Date.now();
    for (let d = 0; d < 7; d++) {
      const date = new Date(now - d * 86_400_000).toISOString().slice(0, 10);
      dailyMap.set(date, { impressions: 0, micros: 0 });
    }
    for (const imp of this.adImpressions) {
      const date = new Date(imp.createdAt).toISOString().slice(0, 10);
      if (dailyMap.has(date)) {
        const entry = dailyMap.get(date)!;
        entry.impressions++;
        entry.micros += imp.estimatedRevenueMicros;
      }
    }
    const dailyRevenue = Array.from(dailyMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, v]) => ({
        date,
        impressions: v.impressions,
        estimatedRevenueUsd: v.micros / 1_000_000,
      }));

    return {
      totalImpressions: this.adImpressions.length,
      totalClicks: this.adClicks.size,
      estimatedRevenueUsd: this.adImpressions.reduce((s, i) => s + i.estimatedRevenueMicros, 0) / 1_000_000,
      byPlacement,
      dailyRevenue,
    };
  }

  async getAdConfig(): Promise<AdConfig[]> {
    return Array.from(this.adConfigs.values());
  }

  async updateAdConfig(
    placement: AdPlacement,
    patch: Partial<Omit<AdConfig, 'placement'>>
  ): Promise<AdConfig> {
    const existing = this.adConfigs.get(placement) ?? { placement, enabled: true };
    const updated: AdConfig = { ...existing, ...patch };
    this.adConfigs.set(placement, updated);
    return updated;
  }

  /**
   * Move the user forward in the queue by reducing their priorityScore.
   * A lower score means higher priority (front of queue sooner).
   * We reduce by skipSpots * avg-score-delta so the jump is meaningful.
   */
  async applyRewardedSkip(userId: string, bossId: string, skipSpots: number): Promise<boolean> {
    const key = `${userId}-${bossId}`;
    const entry = this.queueEntries.get(key);
    if (!entry || entry.status !== 'waiting') return false;
    // Each spot costs ~1 priority unit. Pull forward by skipSpots.
    entry.priorityScore = Math.max(entry.priorityScore - skipSpots, -skipSpots);
    // Also nudge originalJoinedAt forward so tie-breaking favours them
    entry.originalJoinedAt = Math.max(0, entry.originalJoinedAt - skipSpots * 45_000);
    this.queueEntries.set(key, entry);
    return true;
  }
}

export const storage = new MemStorage();
