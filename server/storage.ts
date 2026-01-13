import { randomUUID } from "crypto";
import type { User, InsertUser, Lobby, InsertLobby, Player } from "@shared/schema";
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

  constructor() {
    this.users = new Map();
    this.lobbies = new Map();
    
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
    const activeLobbies = Array.from(this.lobbies.values())
      .filter(lobby => now - lobby.createdAt < 600000)
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
}

export const storage = new MemStorage();
