import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertLobbySchema, playerSchema, insertFeedbackSchema, insertPushTokenSchema, ALL_BOSSES, queueEntrySchema } from "@shared/schema";
import type { InsertQueueEntry } from "@shared/schema";
import { z } from "zod";
import { sendPushNotification, type NotificationPayload } from "./push-service";
import { getRaidBossDetails, getCounterPokemonDetails } from "./pokemon-data";

const getAdminToken = () => {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    console.warn("ADMIN_TOKEN not set in environment. Admin access disabled.");
    return null;
  }
  return token;
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Get currently active raid bosses (only these can be hosted)
  app.get("/api/bosses/active", async (req, res) => {
    try {
      const activeBosses = await storage.getActiveRaidBosses();
      res.json(activeBosses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active bosses" });
    }
  });

  // Get all raid bosses (for admin/display purposes)
  app.get("/api/bosses/all", async (req, res) => {
    try {
      const allBosses = await storage.getAllRaidBosses();
      res.json(allBosses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bosses" });
    }
  });

  /**
   * Get detailed information for a specific raid boss
   * Includes types, moves, stats, weaknesses, resistances, and recommended counters
   * 
   * @param bossId - The boss ID to look up
   * @query raidEndTime - Optional timestamp when the raid ends (for countdown timer)
   * @returns Complete raid boss details with calculated counters
   */
  app.get("/api/pokemon/:bossId/details", async (req, res) => {
    try {
      const { bossId } = req.params;
      const raidEndTime = req.query.raidEndTime ? parseInt(req.query.raidEndTime as string) : undefined;
      
      const details = getRaidBossDetails(bossId, raidEndTime);
      
      if (!details) {
        return res.status(404).json({ error: "Pokémon not found" });
      }
      
      res.json(details);
    } catch (error) {
      console.error("Error fetching Pokémon details:", error);
      res.status(500).json({ error: "Failed to fetch Pokémon details" });
    }
  });

  /**
   * Get detailed information for a counter Pokémon
   * Used when users click on a counter to see its full details
   * 
   * @param counterId - The counter Pokémon ID to look up
   * @returns Complete Pokémon details including types, moves, stats, weaknesses
   */
  app.get("/api/pokemon/counter/:counterId/details", async (req, res) => {
    try {
      const { counterId } = req.params;
      
      const details = getCounterPokemonDetails(counterId);
      
      if (!details) {
        return res.status(404).json({ error: "Counter Pokémon not found" });
      }
      
      res.json(details);
    } catch (error) {
      console.error("Error fetching counter Pokémon details:", error);
      res.status(500).json({ error: "Failed to fetch counter Pokémon details" });
    }
  });

  app.get("/api/lobbies", async (req, res) => {
    try {
      const lobbies = await storage.getLobbies();
      res.json(lobbies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lobbies" });
    }
  });

  app.get("/api/lobbies/:id", async (req, res) => {
    try {
      const lobby = await storage.getLobby(req.params.id);
      if (!lobby) {
        return res.status(404).json({ error: "Lobby not found" });
      }
      res.json(lobby);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lobby" });
    }
  });

  app.post("/api/lobbies", async (req, res) => {
    try {
      const validated = insertLobbySchema.parse(req.body);
      
      // Server-side validation: Check if the boss is currently active
      const isActive = await storage.isRaidBossActive(validated.bossId);
      if (!isActive) {
        return res.status(400).json({ 
          error: "Invalid raid boss", 
          message: "This Pokémon is not currently available for raids. Please select a boss from the active raid rotation." 
        });
      }
      
      const lobby = await storage.createLobby(validated);
      res.status(201).json(lobby);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid lobby data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create lobby" });
    }
  });

  app.post("/api/lobbies/:id/join", async (req, res) => {
    try {
      const player = playerSchema.parse(req.body);
      const lobby = await storage.joinLobby(req.params.id, player);
      if (!lobby) {
        return res.status(404).json({ error: "Lobby not found or full" });
      }
      res.json(lobby);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid player data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to join lobby" });
    }
  });

  app.post("/api/lobbies/:id/leave", async (req, res) => {
    try {
      const { playerId } = req.body;
      if (!playerId) {
        return res.status(400).json({ error: "Player ID required" });
      }
      const lobby = await storage.leaveLobby(req.params.id, playerId);
      res.json({ success: true, lobby });
    } catch (error) {
      res.status(500).json({ error: "Failed to leave lobby" });
    }
  });

  app.patch("/api/lobbies/:id/ready", async (req, res) => {
    try {
      const { playerId, isReady } = req.body;
      if (!playerId || typeof isReady !== "boolean") {
        return res.status(400).json({ error: "Player ID and ready status required" });
      }
      const lobby = await storage.updatePlayerReady(req.params.id, playerId, isReady);
      if (!lobby) {
        return res.status(404).json({ error: "Lobby not found" });
      }
      res.json(lobby);
    } catch (error) {
      res.status(500).json({ error: "Failed to update ready status" });
    }
  });

  app.patch("/api/lobbies/:id/sent-request", async (req, res) => {
    try {
      const { playerId } = req.body;
      if (!playerId) {
        return res.status(400).json({ error: "Player ID required" });
      }
      const lobby = await storage.markPlayerSentRequest(req.params.id, playerId);
      if (!lobby) {
        return res.status(404).json({ error: "Lobby not found" });
      }
      res.json(lobby);
    } catch (error) {
      res.status(500).json({ error: "Failed to mark sent request" });
    }
  });

  app.patch("/api/lobbies/:id/start-raid", async (req, res) => {
    try {
      const { hostId } = req.body;
      if (!hostId) {
        return res.status(400).json({ error: "Host ID required" });
      }
      const lobby = await storage.startRaid(req.params.id, hostId);
      if (!lobby) {
        return res.status(404).json({ error: "Lobby not found or not host" });
      }
      res.json(lobby);
    } catch (error) {
      res.status(500).json({ error: "Failed to start raid" });
    }
  });

  app.delete("/api/lobbies/:id", async (req, res) => {
    try {
      const success = await storage.deleteLobby(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Lobby not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete lobby" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const validated = insertUserSchema.parse(req.body);
      
      const isBanned = await storage.isBanned(validated.code);
      if (isBanned) {
        return res.status(403).json({ error: "This friend code has been banned" });
      }
      
      const user = await storage.createUser(validated);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid user data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.patch("/api/lobbies/:id/close", async (req, res) => {
    try {
      const { hostId } = req.body;
      if (!hostId) {
        return res.status(400).json({ error: "Host ID required" });
      }
      const lobby = await storage.closeLobby(req.params.id, hostId);
      if (!lobby) {
        return res.status(404).json({ error: "Lobby not found or not host" });
      }
      res.json(lobby);
    } catch (error) {
      res.status(500).json({ error: "Failed to close lobby" });
    }
  });

  app.post("/api/feedback", async (req, res) => {
    try {
      const validated = insertFeedbackSchema.parse(req.body);
      const feedback = await storage.createFeedback(validated);
      res.status(201).json(feedback);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid feedback data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  app.get("/api/admin/feedback", async (req, res) => {
    try {
      const adminToken = getAdminToken();
      if (!adminToken) {
        return res.status(503).json({ error: "Admin access not configured" });
      }
      
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");
      
      if (!token || token !== adminToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const feedback = await storage.getAllFeedback();
      res.json(feedback);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  app.post("/api/admin/verify", async (req, res) => {
    try {
      const adminToken = getAdminToken();
      if (!adminToken) {
        return res.status(503).json({ error: "Admin access not configured" });
      }
      
      const { token } = req.body;
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ valid: false, error: "Token required" });
      }
      
      if (token === adminToken) {
        res.json({ valid: true });
      } else {
        res.status(401).json({ valid: false, error: "Invalid token" });
      }
    } catch (error) {
      res.status(500).json({ error: "Verification failed" });
    }
  });

  app.post("/api/admin/ban", async (req, res) => {
    try {
      const adminToken = getAdminToken();
      if (!adminToken) {
        return res.status(503).json({ error: "Admin access not configured" });
      }
      
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");
      if (!token || token !== adminToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { friendCode, reason } = req.body;
      if (!friendCode || typeof friendCode !== 'string') {
        return res.status(400).json({ error: "Friend code required" });
      }
      
      const banned = await storage.banUser(friendCode, reason, "admin");
      res.status(201).json(banned);
    } catch (error) {
      res.status(500).json({ error: "Failed to ban user" });
    }
  });

  app.delete("/api/admin/ban/:friendCode", async (req, res) => {
    try {
      const adminToken = getAdminToken();
      if (!adminToken) {
        return res.status(503).json({ error: "Admin access not configured" });
      }
      
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");
      if (!token || token !== adminToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const success = await storage.unbanUser(req.params.friendCode);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Banned user not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to unban user" });
    }
  });

  app.get("/api/admin/banned", async (req, res) => {
    try {
      const adminToken = getAdminToken();
      if (!adminToken) {
        return res.status(503).json({ error: "Admin access not configured" });
      }
      
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");
      if (!token || token !== adminToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const banned = await storage.getBannedUsers();
      res.json(banned);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch banned users" });
    }
  });

  // ===== Queue System (PokeGenie-style) =====
  
  // Join the queue for a specific boss
  app.post("/api/queue/join", async (req, res) => {
    try {
      const { bossId, userId, userName, userLevel, userTeam, friendCode, isPremium } = req.body;
      
      if (!bossId || !userId || !userName || !userLevel || !userTeam || !friendCode) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Verify boss is active
      const isActive = await storage.isRaidBossActive(bossId);
      if (!isActive) {
        return res.status(400).json({ error: "This raid boss is not currently available" });
      }
      
      const entry: InsertQueueEntry = {
        bossId,
        userId,
        userName,
        userLevel,
        userTeam,
        friendCode,
        isPremium: isPremium || false,
      };
      
      const queueEntry = await storage.joinQueue(entry);
      const status = await storage.getQueueStatus(userId, bossId);
      
      // Trigger queue processing to see if there's an immediate match
      await storage.processQueueMatches();
      
      // Get updated status after processing
      const updatedStatus = await storage.getQueueStatus(userId, bossId);
      
      res.status(201).json(updatedStatus || status);
    } catch (error) {
      console.error("Error joining queue:", error);
      res.status(500).json({ error: "Failed to join queue" });
    }
  });

  // Leave the queue for a specific boss or all queues
  app.post("/api/queue/leave", async (req, res) => {
    try {
      const { userId, bossId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }
      
      const success = await storage.leaveQueue(userId, bossId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to leave queue" });
    }
  });

  // Get queue status for a specific boss
  app.get("/api/queue/status/:userId/:bossId", async (req, res) => {
    try {
      const { userId, bossId } = req.params;
      const status = await storage.getQueueStatus(userId, bossId);
      
      if (!status) {
        return res.status(404).json({ error: "Not in queue" });
      }
      
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to get queue status" });
    }
  });

  // Get all queues a user is in
  app.get("/api/queue/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const queues = await storage.getUserQueues(userId);
      res.json(queues);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user queues" });
    }
  });

  // Process queue matches (can be called periodically or on events)
  app.post("/api/queue/process", async (req, res) => {
    try {
      const result = await storage.processQueueMatches();
      res.json({
        matchedCount: result.matched.length,
        lobbiesAffected: result.lobbies.length,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to process queue" });
    }
  });

  app.post("/api/push/register", async (req, res) => {
    try {
      const validated = insertPushTokenSchema.parse(req.body);
      const token = await storage.registerPushToken(validated);
      res.status(201).json(token);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid token data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to register push token" });
    }
  });

  app.delete("/api/push/unregister", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: "Token required" });
      }
      const success = await storage.removePushToken(token);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to unregister push token" });
    }
  });

  app.post("/api/push/notify/lobby/:id", async (req, res) => {
    try {
      const lobbyId = req.params.id;
      const { type, senderId } = req.body;
      
      if (!senderId || typeof senderId !== 'string') {
        return res.status(400).json({ error: "Sender ID required" });
      }
      
      const lobby = await storage.getLobby(lobbyId);
      if (!lobby) {
        return res.status(404).json({ error: "Lobby not found" });
      }
      
      const isLobbyMember = lobby.players.some(p => p.id === senderId);
      if (!isLobbyMember) {
        return res.status(403).json({ error: "Not authorized to send notifications to this lobby" });
      }
      
      if (type === 'raid_starting' && lobby.hostId !== senderId) {
        return res.status(403).json({ error: "Only the host can send raid starting notifications" });
      }
      
      const boss = ALL_BOSSES.find(b => b.id === lobby.bossId);
      const bossName = boss?.name || 'Unknown';
      
      const playerIds = lobby.players
        .filter(p => p.id !== senderId)
        .map(p => p.id);
      
      if (playerIds.length === 0) {
        return res.json({ success: true, sent: 0 });
      }
      
      const tokens = await storage.getPushTokensForUsers(playerIds);
      
      let payload: NotificationPayload;
      
      if (type === 'raid_starting') {
        payload = {
          type: 'raid_starting',
          title: 'Raid Starting Now!',
          body: `Your ${bossName} raid is starting - join the game!`,
          data: { lobbyId, bossName },
        };
      } else if (type === 'all_ready') {
        payload = {
          type: 'all_ready',
          title: 'Everyone Ready!',
          body: `All players are ready for the ${bossName} raid!`,
          data: { lobbyId, bossName },
        };
      } else {
        return res.status(400).json({ error: "Invalid notification type" });
      }
      
      const result = await sendPushNotification(tokens, payload);
      res.json({ ...result });
    } catch (error) {
      res.status(500).json({ error: "Failed to send notifications" });
    }
  });

  app.post("/api/push/notify/host/:hostId", async (req, res) => {
    try {
      const { hostId } = req.params;
      const { type, playerName, lobbyId, senderId } = req.body;
      
      if (!senderId || typeof senderId !== 'string') {
        return res.status(400).json({ error: "Sender ID required" });
      }
      
      if (!lobbyId || typeof lobbyId !== 'string') {
        return res.status(400).json({ error: "Lobby ID required" });
      }
      
      const lobby = await storage.getLobby(lobbyId);
      if (!lobby) {
        return res.status(404).json({ error: "Lobby not found" });
      }
      
      if (lobby.hostId !== hostId) {
        return res.status(400).json({ error: "Invalid host ID for this lobby" });
      }
      
      const isLobbyMember = lobby.players.some(p => p.id === senderId);
      if (!isLobbyMember) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const tokens = await storage.getPushTokensForUser(hostId);
      
      if (tokens.length === 0) {
        return res.json({ success: true, sent: 0 });
      }
      
      let payload: NotificationPayload;
      
      if (type === 'lobby_joined') {
        payload = {
          type: 'lobby_joined',
          title: 'Player Joined',
          body: `${playerName} joined your raid lobby`,
          data: { lobbyId, playerName },
        };
      } else {
        return res.status(400).json({ error: "Invalid notification type" });
      }
      
      const result = await sendPushNotification(tokens, payload);
      res.json({ ...result });
    } catch (error) {
      res.status(500).json({ error: "Failed to send notifications" });
    }
  });

  return httpServer;
}
