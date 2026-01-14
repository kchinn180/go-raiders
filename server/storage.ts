import { randomUUID } from "crypto";
import type { User, InsertUser, Lobby, InsertLobby, Player, Feedback, InsertFeedback, BannedUser, PushToken, InsertPushToken, RaidBoss, QueueEntry, InsertQueueEntry, QueueStatus, Subscription, Report, InsertReport } from "@shared/schema";
import type { Player as PlayerType } from "@shared/schema";
import { ALL_BOSSES, TEAMS } from "@shared/schema";

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
  isRaidBossActive(bossId: string): Promise<boolean>;
  setRaidBossActive(bossId: string, isActive: boolean, startTime?: number, endTime?: number): Promise<RaidBoss | undefined>;
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
  
  // Queue management (PokeGenie-style)
  joinQueue(entry: InsertQueueEntry): Promise<QueueEntry>;
  leaveQueue(userId: string, bossId?: string): Promise<boolean>;
  getQueueStatus(userId: string, bossId: string): Promise<QueueStatus | null>;
  getUserQueues(userId: string): Promise<QueueStatus[]>;
  getQueueForBoss(bossId: string): Promise<QueueEntry[]>;
  getQueueCounts(): Promise<Record<string, number>>;
  processQueueMatches(): Promise<{ matched: QueueEntry[]; lobbies: Lobby[] }>;
  
  // Report management
  createReport(report: InsertReport): Promise<Report>;
  getAllReports(): Promise<Report[]>;
  getReportsByUser(userId: string): Promise<Report[]>;
}

// Default active bosses (January 2026 Pokemon GO raid rotation)
const DEFAULT_ACTIVE_BOSS_IDS = [
  // 5-Star Legendary
  'genesect-burn', 'genesect-chill', 'thundurus-incarnate',
  // Shadow Raids
  'shadow-cresselia', 'shadow-scyther', 'shadow-aerodactyl',
  // Mega Raids
  'mega-blaziken', 'mega-sceptile',
  // Tier 3
  'onix', 'magmar', 'diggersby',
  // Tier 1
  'ponyta', 'krabby', 'sandygast', 'scorbunny',
  // Max Battles
  'drampa-max'
];

function generateMockLobbies(): Lobby[] {
  const activeBosses = ALL_BOSSES.filter(b => DEFAULT_ACTIVE_BOSS_IDS.includes(b.id));
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
    this.reports = new Map();
    this.reportsIdCounter = 1;
    
    // Initialize raid bosses from master list with active status
    ALL_BOSSES.forEach(boss => {
      const isActive = DEFAULT_ACTIVE_BOSS_IDS.includes(boss.id);
      this.raidBosses.set(boss.id, {
        ...boss,
        isActive,
        startTime: isActive ? Date.now() : undefined,
        endTime: isActive ? Date.now() + (7 * 24 * 60 * 60 * 1000) : undefined, // 1 week from now
      });
    });
    
    // No mock lobbies - queue is empty until hosts create real raids
    // This applies to both development and production environments
  }

  async getActiveRaidBosses(): Promise<RaidBoss[]> {
    const now = Date.now();
    return Array.from(this.raidBosses.values())
      .filter(boss => {
        if (!boss.isActive) return false;
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
      .sort((a, b) => b.tier - a.tier);
  }

  async getAllRaidBosses(): Promise<RaidBoss[]> {
    return Array.from(this.raidBosses.values())
      .sort((a, b) => b.tier - a.tier);
  }

  async isRaidBossActive(bossId: string): Promise<boolean> {
    const boss = this.raidBosses.get(bossId);
    if (!boss || !boss.isActive) return false;
    
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
    
    const updated: RaidBoss = {
      ...boss,
      isActive,
      startTime: startTime ?? (isActive ? Date.now() : undefined),
      endTime: endTime,
    };
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

  async getLobbies(): Promise<Lobby[]> {
    const now = Date.now();
    const LOBBY_LIFESPAN_MS = 15 * 60 * 1000;
    
    const entries = Array.from(this.lobbies.entries());
    for (const [id, lobby] of entries) {
      if (now - lobby.createdAt >= LOBBY_LIFESPAN_MS) {
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
    if (lobby.players.length >= lobby.maxPlayers) return undefined;
    if (lobby.players.some(p => p.id === player.id)) return lobby;

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

  // Queue management (PokeGenie-style)
  async joinQueue(entry: InsertQueueEntry): Promise<QueueEntry> {
    // Check if user is already in queue for this boss
    const existingKey = `${entry.userId}-${entry.bossId}`;
    const existing = this.queueEntries.get(existingKey);
    if (existing && existing.status === 'waiting') {
      return existing; // Already in queue
    }
    
    const queueEntry: QueueEntry = {
      id: randomUUID(),
      ...entry,
      joinedAt: Date.now(),
      status: 'waiting',
    };
    
    this.queueEntries.set(existingKey, queueEntry);
    return queueEntry;
  }

  async leaveQueue(userId: string, bossId?: string): Promise<boolean> {
    let removed = false;
    
    if (bossId) {
      // Leave specific boss queue
      const key = `${userId}-${bossId}`;
      if (this.queueEntries.has(key)) {
        const entry = this.queueEntries.get(key)!;
        entry.status = 'cancelled';
        this.queueEntries.set(key, entry);
        removed = true;
      }
    } else {
      // Leave all queues
      const entries = Array.from(this.queueEntries.entries());
      for (const [key, entry] of entries) {
        if (entry.userId === userId && entry.status === 'waiting') {
          entry.status = 'cancelled';
          this.queueEntries.set(key, entry);
          removed = true;
        }
      }
    }
    
    return removed;
  }

  async getQueueStatus(userId: string, bossId: string): Promise<QueueStatus | null> {
    const key = `${userId}-${bossId}`;
    const entry = this.queueEntries.get(key);
    
    if (!entry || entry.status === 'cancelled' || entry.status === 'expired') {
      return null;
    }
    
    // Get all waiting entries for this boss, sorted by join time (premium first)
    const bossQueue = Array.from(this.queueEntries.values())
      .filter(e => e.bossId === bossId && e.status === 'waiting')
      .sort((a, b) => {
        // Premium users get priority
        if (a.isPremium !== b.isPremium) {
          return a.isPremium ? -1 : 1;
        }
        return a.joinedAt - b.joinedAt;
      });
    
    const position = bossQueue.findIndex(e => e.userId === userId) + 1;
    const boss = ALL_BOSSES.find(b => b.id === bossId);
    
    // Estimate wait time based on position and typical raid time (3-5 min per raid)
    const avgWaitPerPerson = 45; // seconds
    const estimatedWaitSeconds = Math.max(0, (position - 1) * avgWaitPerPerson);
    
    return {
      bossId,
      bossName: boss?.name || bossId,
      position,
      totalInQueue: bossQueue.length,
      estimatedWaitSeconds,
      status: entry.status,
      matchedLobbyId: entry.matchedLobbyId,
    };
  }

  async getUserQueues(userId: string): Promise<QueueStatus[]> {
    const userEntries = Array.from(this.queueEntries.values())
      .filter(e => e.userId === userId && e.status === 'waiting');
    
    const statuses: QueueStatus[] = [];
    
    for (const entry of userEntries) {
      const status = await this.getQueueStatus(userId, entry.bossId);
      if (status) {
        statuses.push(status);
      }
    }
    
    return statuses;
  }

  async getQueueForBoss(bossId: string): Promise<QueueEntry[]> {
    return Array.from(this.queueEntries.values())
      .filter(e => e.bossId === bossId && e.status === 'waiting')
      .sort((a, b) => {
        if (a.isPremium !== b.isPremium) {
          return a.isPremium ? -1 : 1;
        }
        return a.joinedAt - b.joinedAt;
      });
  }

  async getQueueCounts(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    const waitingEntries = Array.from(this.queueEntries.values())
      .filter(e => e.status === 'waiting');
    
    for (const entry of waitingEntries) {
      counts[entry.bossId] = (counts[entry.bossId] || 0) + 1;
    }
    
    return counts;
  }

  async processQueueMatches(): Promise<{ matched: QueueEntry[]; lobbies: Lobby[] }> {
    const matchedEntries: QueueEntry[] = [];
    const affectedLobbies: Lobby[] = [];
    
    // Get all lobbies with space
    const lobbiesWithSpace = Array.from(this.lobbies.values())
      .filter(l => l.players.length < l.maxPlayers && !l.raidStarted);
    
    for (const lobby of lobbiesWithSpace) {
      // Get queue for this boss
      const queue = await this.getQueueForBoss(lobby.bossId);
      
      for (const entry of queue) {
        // Check if lobby still has space
        if (lobby.players.length >= lobby.maxPlayers) break;
        
        // Check minimum level requirement
        if (entry.userLevel < lobby.minLevel) continue;
        
        // Add player to lobby
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
        
        // Update queue entry
        entry.status = 'matched';
        entry.matchedLobbyId = lobby.id;
        this.queueEntries.set(`${entry.userId}-${entry.bossId}`, entry);
        
        matchedEntries.push(entry);
        
        if (!affectedLobbies.includes(lobby)) {
          affectedLobbies.push(lobby);
        }
      }
    }
    
    return { matched: matchedEntries, lobbies: affectedLobbies };
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
}

export const storage = new MemStorage();
