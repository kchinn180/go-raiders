import { randomUUID } from "crypto";
import type { User, InsertUser, Lobby, InsertLobby, Player, Feedback, InsertFeedback, BannedUser } from "@shared/schema";
import type { Player as PlayerType } from "@shared/schema";
import { BOSSES, TEAMS } from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getLobbies(): Promise<Lobby[]>;
  getLobby(id: string): Promise<Lobby | undefined>;
  createLobby(lobby: InsertLobby): Promise<Lobby>;
  updateLobby(id: string, updates: Partial<Lobby>): Promise<Lobby | undefined>;
  deleteLobby(id: string): Promise<boolean>;
  
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
}

function generateMockLobbies(): Lobby[] {
  return Array.from({ length: 8 }).map((_, i) => ({
    id: `lobby-${Date.now()}-${i}`,
    bossId: BOSSES[i % BOSSES.length].id,
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

  constructor() {
    this.users = new Map();
    this.lobbies = new Map();
    this.feedback = new Map();
    this.feedbackIdCounter = 1;
    this.bannedUsers = new Map();
    this.bannedIdCounter = 1;
    
    const initialLobbies = generateMockLobbies();
    initialLobbies.forEach(lobby => {
      this.lobbies.set(lobby.id, lobby);
    });
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
}

export const storage = new MemStorage();
