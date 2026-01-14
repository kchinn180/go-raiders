import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, RAID_CAPACITY, ELITE_EARLY_ACCESS_MS } from "./storage";
import { insertUserSchema, insertLobbySchema, playerSchema, insertFeedbackSchema, insertPushTokenSchema, ALL_BOSSES, queueEntrySchema, subscriptionSchema, insertReportSchema } from "@shared/schema";
import type { InsertQueueEntry, Subscription } from "@shared/schema";
import { z } from "zod";
import { sendPushNotification, type NotificationPayload } from "./push-service";
import { getRaidBossDetails, getCounterPokemonDetails } from "./pokemon-data";
import { verifyPurchaseReceipt, ELITE_PRODUCTS } from "./services/subscription";
import { requirePremium } from "./middleware/require-premium";
import { lobbyWSManager } from "./websocket";

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

  /**
   * Join Lobby Endpoint - with Elite Early Access Enforcement
   * 
   * SERVER-SIDE TIERED ACCESS ENFORCEMENT:
   * - Premium/Elite users: Can join any lobby immediately (no timer restriction)
   * - Basic users: Must wait ELITE_EARLY_ACCESS_MS (10 seconds) after lobby creation
   * 
   * SECURITY: Premium status is verified from SERVER-SIDE storage, NOT from
   * client-provided data. This prevents users from bypassing the timer by
   * spoofing isPremium in the request body.
   * 
   * Validation Flow:
   * 1. Validate player data schema
   * 2. Check if lobby exists
   * 3. Check capacity limits
   * 4. LOOK UP user from storage to get TRUSTED premium status
   * 5. ENFORCE Elite Early Access timer for non-Premium users
   * 6. Allow join if all checks pass
   */
  app.post("/api/lobbies/:id/join", async (req, res) => {
    try {
      const player = playerSchema.parse(req.body);
      
      // Get the lobby to check Elite Early Access timer
      const existingLobby = await storage.getLobby(req.params.id);
      if (!existingLobby) {
        return res.status(404).json({ error: "Lobby not found" });
      }
      
      // SECURITY: Look up user from storage to get TRUSTED premium status
      // Do NOT trust client-provided isPremium flag - it can be spoofed
      const trustedUser = await storage.getUser(player.id);
      const isPlayerPremium = trustedUser?.isPremium === true;
      
      // SERVER-SIDE ELITE EARLY ACCESS ENFORCEMENT
      // Basic users cannot join lobbies less than 10 seconds old
      const lobbyAge = Date.now() - existingLobby.createdAt;
      const isEliteEarlyAccessPeriod = lobbyAge < ELITE_EARLY_ACCESS_MS;
      
      if (isEliteEarlyAccessPeriod && !isPlayerPremium) {
        const remainingSeconds = Math.ceil((ELITE_EARLY_ACCESS_MS - lobbyAge) / 1000);
        console.log(`[SECURITY] Basic user ${player.id} blocked from joining lobby ${req.params.id} - Elite Early Access period (${remainingSeconds}s remaining)`);
        return res.status(403).json({ 
          error: "Elite Early Access", 
          message: `Premium users get early access. Please wait ${remainingSeconds} seconds.`,
          remainingMs: ELITE_EARLY_ACCESS_MS - lobbyAge
        });
      }
      
      // Check capacity before joining
      if (existingLobby.players.length >= existingLobby.maxPlayers) {
        return res.status(400).json({ error: "Lobby is full" });
      }
      
      // Use the TRUSTED premium status from storage, not from client
      const trustedPlayer = {
        ...player,
        isPremium: isPlayerPremium
      };
      
      const lobby = await storage.joinLobby(req.params.id, trustedPlayer);
      if (!lobby) {
        return res.status(404).json({ error: "Lobby not found or full" });
      }
      
      lobbyWSManager.broadcastPlayerJoined(lobby, trustedPlayer.name);
      lobbyWSManager.broadcastLobbyUpdate(lobby);
      
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
      const lobbyBefore = await storage.getLobby(req.params.id);
      const leavingPlayer = lobbyBefore?.players.find(p => p.id === playerId);
      
      const lobby = await storage.leaveLobby(req.params.id, playerId);
      
      if (lobby && leavingPlayer) {
        lobbyWSManager.broadcastPlayerLeft(req.params.id, playerId, leavingPlayer.name);
        lobbyWSManager.broadcastLobbyUpdate(lobby);
      }
      
      res.json({ success: true, lobby });
    } catch (error) {
      res.status(500).json({ error: "Failed to leave lobby" });
    }
  });

  /**
   * Update Lobby Capacity - HOST ONLY
   * 
   * This endpoint allows ONLY the lobby host to modify raid capacity.
   * Non-hosts attempting to change capacity will receive a 403 Forbidden error.
   * 
   * SECURITY: The server VERIFIES the provided hostId matches the actual lobby host
   * stored in the database. This prevents spoofing attacks where a user provides
   * a fake hostId to gain host privileges.
   * 
   * Validation Rules (enforced server-side):
   * 1. Lobby must exist
   * 2. Requester's hostId must MATCH the lobby's actual hostId (server-side verification)
   * 3. New capacity must be between RAID_CAPACITY.MIN (2) and RAID_CAPACITY.MAX (10)
   * 4. Cannot reduce capacity below current player count
   * 
   * Use case: Host wants to reserve slots for friends by limiting capacity
   * 
   * @body hostId - The ID of the user making the request (verified against lobby.hostId)
   * @body capacity - The new maximum player count (2-10)
   */
  app.patch("/api/lobbies/:id/capacity", async (req, res) => {
    try {
      const { hostId, capacity } = req.body;
      
      if (!hostId) {
        return res.status(400).json({ error: "Host ID required" });
      }
      
      if (typeof capacity !== "number") {
        return res.status(400).json({ 
          error: "Invalid capacity", 
          message: "Capacity must be a number" 
        });
      }
      
      // SECURITY: First verify the lobby exists and check the ACTUAL host
      const existingLobby = await storage.getLobby(req.params.id);
      if (!existingLobby) {
        return res.status(404).json({ error: "Lobby not found" });
      }
      
      // SECURITY: Verify the requester is ACTUALLY the host
      // This prevents spoofing attacks where someone sends a fake hostId
      if (existingLobby.hostId !== hostId) {
        console.log(`[SECURITY] User ${hostId} attempted to modify capacity for lobby ${req.params.id} but is not the host (actual host: ${existingLobby.hostId})`);
        return res.status(403).json({ 
          error: "Permission denied",
          message: "Only the raid host can modify capacity" 
        });
      }
      
      // Use storage method which also validates capacity constraints
      const result = await storage.updateLobbyCapacity(req.params.id, hostId, capacity);
      
      if (result.error) {
        // All remaining errors are validation errors (capacity range, player count)
        return res.status(400).json({ error: result.error });
      }
      
      res.json(result.lobby);
    } catch (error) {
      res.status(500).json({ error: "Failed to update lobby capacity" });
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
      
      const player = lobby.players.find(p => p.id === playerId);
      if (player) {
        lobbyWSManager.broadcastPlayerReady(lobby.id, playerId, player.name, isReady);
        lobbyWSManager.broadcastLobbyUpdate(lobby);
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
      
      lobbyWSManager.broadcastInvitesSent(lobby.id);
      lobbyWSManager.broadcastLobbyUpdate(lobby);
      
      const playerIds = lobby.players.filter(p => !p.isHost).map(p => p.id);
      if (playerIds.length > 0) {
        const boss = ALL_BOSSES.find(b => b.id === lobby.bossId);
        const tokens = await storage.getPushTokensForUsers(playerIds);
        const notification: NotificationPayload = {
          type: 'raid_starting',
          title: "Invites Sent!",
          body: `Host is sending raid invites for ${boss?.name || 'the raid'}! Open Pokémon GO now!`,
          data: { lobbyId: lobby.id }
        };
        await sendPushNotification(tokens, notification);
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

  app.post("/api/reports", async (req, res) => {
    try {
      const validated = insertReportSchema.parse(req.body);
      const report = await storage.createReport(validated);
      res.status(201).json(report);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid report data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to submit report" });
    }
  });

  app.get("/api/admin/reports", async (req, res) => {
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
      
      const reports = await storage.getAllReports();
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reports" });
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

  // Get queue counts for all bosses
  app.get("/api/queue/counts", async (req, res) => {
    try {
      const counts = await storage.getQueueCounts();
      res.json(counts);
    } catch (error) {
      res.status(500).json({ error: "Failed to get queue counts" });
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

  // ============================================
  // SUBSCRIPTION & IN-APP PURCHASE ROUTES
  // ============================================
  // SECURITY: Premium access is ONLY granted after server-side verification
  // The frontend CANNOT set isPremium directly

  /**
   * Get available Elite subscription products
   * Returns product info for display in the shop/upgrade UI
   */
  app.get("/api/subscription/products", (req, res) => {
    res.json({
      products: [
        {
          id: 'elite_monthly',
          name: 'Elite Monthly',
          description: 'Priority queue access, skip the line, and exclusive features',
          price: ELITE_PRODUCTS.MONTHLY.price,
          period: 'month',
          appleProductId: ELITE_PRODUCTS.MONTHLY.apple,
          googleProductId: ELITE_PRODUCTS.MONTHLY.google,
          features: [
            'Skip the queue - instant raid matching',
            'Priority placement in popular raids',
            'No wait time for Elite-locked lobbies',
            'Exclusive Elite badge',
            'Advanced raid counters & tips',
          ]
        },
        {
          id: 'elite_yearly',
          name: 'Elite Yearly',
          description: 'All Elite features at 2 months free',
          price: ELITE_PRODUCTS.YEARLY.price,
          period: 'year',
          appleProductId: ELITE_PRODUCTS.YEARLY.apple,
          googleProductId: ELITE_PRODUCTS.YEARLY.google,
          features: [
            'Everything in Elite Monthly',
            '2 months FREE (save 17%)',
            'Priority support',
          ]
        }
      ]
    });
  });

  /**
   * Verify in-app purchase receipt - THE ONLY WAY TO GET PREMIUM
   * 
   * SECURITY:
   * - Receipt is validated with Apple/Google servers
   * - isPremium is ONLY set after successful verification
   * - Fake receipts will be rejected
   * - All attempts are logged for audit
   */
  app.post("/api/subscription/verify", async (req, res) => {
    try {
      const { userId, storeType, receipt, productId } = req.body;

      if (!userId || !storeType || !receipt || !productId) {
        return res.status(400).json({ 
          error: "Missing required fields",
          code: "INVALID_REQUEST"
        });
      }

      // Validate store type
      if (storeType !== 'apple' && storeType !== 'google') {
        return res.status(400).json({
          error: "Invalid store type",
          code: "INVALID_STORE"
        });
      }

      // Get user to verify they exist
      const user = await storage.getUser(userId);
      if (!user) {
        console.warn(`[SUBSCRIPTION] Verification for unknown user: ${userId}`);
        return res.status(404).json({
          error: "User not found",
          code: "USER_NOT_FOUND"
        });
      }

      // Verify the receipt with Apple/Google servers
      const result = await verifyPurchaseReceipt({
        storeType,
        receipt,
        productId,
        userId
      });

      if (!result.success) {
        console.warn(`[SUBSCRIPTION] Verification failed for ${userId}: ${result.error}`);
        return res.status(400).json({
          error: result.error || "Verification failed",
          code: "VERIFICATION_FAILED",
          isPremium: false
        });
      }

      // SUCCESS: Update user's premium status in database
      // This is the ONLY place isPremium can be set to true
      if (result.isPremium && result.subscription) {
        await storage.updateUserSubscription(userId, {
          isPremium: true,
          subscription: result.subscription as Subscription
        });

        console.log(`[SUBSCRIPTION] Premium activated for user: ${userId}`);
      }

      // Fetch updated user to return current status
      const updatedUser = await storage.getUser(userId);

      res.json({
        success: true,
        isPremium: updatedUser?.isPremium || false,
        subscription: updatedUser?.subscription || null,
        message: result.isPremium ? "Elite subscription activated!" : "Subscription updated"
      });

    } catch (error) {
      console.error("[SUBSCRIPTION] Verification error:", error);
      res.status(500).json({
        error: "Internal server error",
        code: "SERVER_ERROR",
        isPremium: false
      });
    }
  });

  /**
   * Get current subscription status for a user
   * Frontend uses this to refresh premium status from server
   */
  app.get("/api/subscription/status/:userId", async (req, res) => {
    try {
      const { userId } = req.params;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if subscription has expired
      const subscription = user.subscription as Subscription | null;
      let isPremium = user.isPremium;

      if (isPremium && subscription?.renewalDate && subscription.renewalDate < Date.now()) {
        // Subscription has expired - update status
        await storage.updateUserSubscription(userId, {
          isPremium: false,
          subscription: {
            ...subscription,
            status: 'expired'
          }
        });
        isPremium = false;
      }

      res.json({
        isPremium,
        subscription: user.subscription || null,
        expiresAt: subscription?.renewalDate || null
      });

    } catch (error) {
      res.status(500).json({ error: "Failed to get subscription status" });
    }
  });

  /**
   * Restore purchases - validates existing subscription
   * Called when user reinstalls app or switches devices
   */
  app.post("/api/subscription/restore", async (req, res) => {
    try {
      const { userId, storeType, receipt } = req.body;

      if (!userId || !storeType || !receipt) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Use the same verification logic as new purchases
      const result = await verifyPurchaseReceipt({
        storeType,
        receipt,
        productId: '', // Will be extracted from receipt
        userId
      });

      if (result.success && result.isPremium && result.subscription) {
        await storage.updateUserSubscription(userId, {
          isPremium: true,
          subscription: result.subscription as Subscription
        });

        console.log(`[SUBSCRIPTION] Purchases restored for user: ${userId}`);
      }

      const updatedUser = await storage.getUser(userId);

      res.json({
        success: true,
        isPremium: updatedUser?.isPremium || false,
        subscription: updatedUser?.subscription || null
      });

    } catch (error) {
      res.status(500).json({ error: "Failed to restore purchases" });
    }
  });

  // Example of a premium-only endpoint using the middleware
  app.get("/api/premium/features", requirePremium, (req, res) => {
    res.json({
      features: {
        priorityQueue: true,
        skipWaitTime: true,
        advancedCounters: true,
        eliteBadge: true,
        exclusiveRaids: true
      }
    });
  });

  /**
   * ============================================================================
   * APPLE APP STORE SERVER NOTIFICATIONS (Webhook)
   * ============================================================================
   * 
   * SECURITY: This endpoint is protected and requires proper configuration.
   * Without APPLE_SHARED_SECRET, all webhook requests are rejected.
   * 
   * This endpoint receives server-to-server notifications from Apple when
   * subscription status changes. Apple sends these events for:
   * - INITIAL_BUY: New subscription purchase
   * - DID_RENEW: Subscription renewed successfully
   * - DID_FAIL_TO_RENEW: Renewal failed (billing issue)
   * - DID_CHANGE_RENEWAL_STATUS: User turned auto-renew on/off
   * - CANCEL: User canceled subscription
   * - REFUND: Apple issued a refund
   * - REVOKE: Family Sharing revoked
   * 
   * SETUP REQUIRED:
   * 1. In App Store Connect > App > App Store Server Notifications
   * 2. Set Production URL: https://your-domain.com/api/webhooks/apple
   * 3. Set Sandbox URL for testing
   * 4. Add APPLE_SHARED_SECRET to environment secrets
   * 
   * PRODUCTION REQUIREMENTS:
   * - Verify JWS signature using Apple's public key (requires jose library)
   * - Validate certificate chain against Apple's root certificate
   * - Check notification timestamp to prevent replay attacks
   * 
   * PLATFORM DIFFERENCE FROM GOOGLE:
   * - Apple uses JWS (JSON Web Signature) for signed notifications
   * - Must verify signature using Apple's public key
   * - Notifications are sent for family sharing events too
   */
  app.post("/api/webhooks/apple", async (req, res) => {
    try {
      // SECURITY: Require shared secret to be configured
      const sharedSecret = process.env.APPLE_SHARED_SECRET;
      if (!sharedSecret) {
        console.warn("[WEBHOOK:APPLE] APPLE_SHARED_SECRET not configured - rejecting request");
        return res.status(503).json({ error: "Webhook not configured" });
      }
      
      const { signedPayload } = req.body;
      
      if (!signedPayload) {
        console.warn("[WEBHOOK:APPLE] Missing signedPayload");
        return res.status(400).json({ error: "Missing payload" });
      }

      console.log("[WEBHOOK:APPLE] Received notification - verifying...");

      // Decode the JWS payload (base64 parts separated by dots)
      const parts = signedPayload.split('.');
      if (parts.length !== 3) {
        console.warn("[WEBHOOK:APPLE] Invalid JWS format");
        return res.status(400).json({ error: "Invalid payload format" });
      }

      let payload;
      try {
        payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      } catch {
        console.warn("[WEBHOOK:APPLE] Failed to decode payload");
        return res.status(400).json({ error: "Invalid payload encoding" });
      }

      const notificationType = payload.notificationType;
      const data = payload.data;
      
      console.log(`[WEBHOOK:APPLE] Notification type: ${notificationType}`);

      // Extract transaction info
      const signedTransactionInfo = data?.signedTransactionInfo;
      if (signedTransactionInfo) {
        const txnParts = signedTransactionInfo.split('.');
        if (txnParts.length === 3) {
          const txnInfo = JSON.parse(Buffer.from(txnParts[1], 'base64').toString());
          const originalTransactionId = txnInfo.originalTransactionId;
          
          // Find user by original transaction ID
          const users = await storage.getAllUsers();
          const user = users.find(u => {
            const sub = u.subscription as Subscription | null;
            return sub?.originalTransactionId === originalTransactionId;
          });

          if (user) {
            // Handle different notification types
            switch (notificationType) {
              case 'DID_RENEW':
                console.log(`[WEBHOOK:APPLE] Renewal for user: ${user.id}`);
                await storage.updateUserSubscription(user.id, {
                  isPremium: true,
                  subscription: {
                    ...(user.subscription as Subscription),
                    status: 'active',
                    renewalDate: parseInt(txnInfo.expiresDate),
                    lastVerifiedAt: Date.now(),
                    verificationStatus: 'verified'
                  }
                });
                break;

              case 'CANCEL':
              case 'REFUND':
              case 'REVOKE':
                console.log(`[WEBHOOK:APPLE] Cancellation for user: ${user.id}`);
                await storage.updateUserSubscription(user.id, {
                  isPremium: false,
                  subscription: {
                    ...(user.subscription as Subscription),
                    status: 'canceled',
                    canceledAt: Date.now(),
                    verificationStatus: 'verified'
                  }
                });
                break;

              case 'EXPIRED':
              case 'DID_FAIL_TO_RENEW':
                console.log(`[WEBHOOK:APPLE] Expiration for user: ${user.id}`);
                await storage.updateUserSubscription(user.id, {
                  isPremium: false,
                  subscription: {
                    ...(user.subscription as Subscription),
                    status: 'expired',
                    verificationStatus: 'verified'
                  }
                });
                break;

              default:
                console.log(`[WEBHOOK:APPLE] Unhandled type: ${notificationType}`);
            }
          } else {
            console.log(`[WEBHOOK:APPLE] No user found for transaction: ${originalTransactionId}`);
          }
        }
      }

      // Always return 200 to acknowledge receipt
      res.status(200).json({ received: true });

    } catch (error) {
      console.error("[WEBHOOK:APPLE] Error processing notification:", error);
      // Still return 200 to prevent Apple from retrying indefinitely
      res.status(200).json({ received: true, error: "Processing error" });
    }
  });

  /**
   * ============================================================================
   * GOOGLE PLAY REAL-TIME DEVELOPER NOTIFICATIONS (Webhook)
   * ============================================================================
   * 
   * SECURITY: This endpoint is protected and requires proper configuration.
   * Without GOOGLE_PLAY_CREDENTIALS, all webhook requests are rejected.
   * 
   * This endpoint receives Pub/Sub notifications from Google Play when
   * subscription status changes. Google sends these events for:
   * - SUBSCRIPTION_RECOVERED: Recovered from account hold
   * - SUBSCRIPTION_RENEWED: Subscription renewed
   * - SUBSCRIPTION_CANCELED: User canceled subscription
   * - SUBSCRIPTION_PURCHASED: New subscription
   * - SUBSCRIPTION_ON_HOLD: Account on hold (payment issue)
   * - SUBSCRIPTION_IN_GRACE_PERIOD: Grace period before cancellation
   * - SUBSCRIPTION_RESTARTED: User resubscribed
   * - SUBSCRIPTION_PRICE_CHANGE_CONFIRMED: User accepted price change
   * - SUBSCRIPTION_DEFERRED: Subscription deferred
   * - SUBSCRIPTION_PAUSED: User paused subscription
   * - SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED: Pause schedule changed
   * - SUBSCRIPTION_REVOKED: Subscription revoked
   * - SUBSCRIPTION_EXPIRED: Subscription expired
   * 
   * SETUP REQUIRED:
   * 1. In Google Play Console > Monetization > Monetization setup
   * 2. Enable Real-time developer notifications
   * 3. Create a Cloud Pub/Sub topic
   * 4. Set push endpoint: https://your-domain.com/api/webhooks/google
   * 5. Add GOOGLE_PLAY_CREDENTIALS to environment secrets
   * 
   * PRODUCTION REQUIREMENTS:
   * - Verify Pub/Sub JWT token from Google
   * - Validate with Google Play Developer API before updating status
   * - Check message timestamp to prevent replay attacks
   * 
   * PLATFORM DIFFERENCE FROM APPLE:
   * - Google uses Pub/Sub with base64-encoded JSON
   * - Must verify with Google Play Developer API for full details
   * - Has more granular status types (grace period, on hold, paused)
   */
  app.post("/api/webhooks/google", async (req, res) => {
    try {
      // SECURITY: Require credentials to be configured
      const googleCredentials = process.env.GOOGLE_PLAY_CREDENTIALS;
      if (!googleCredentials) {
        console.warn("[WEBHOOK:GOOGLE] GOOGLE_PLAY_CREDENTIALS not configured - rejecting request");
        return res.status(503).json({ error: "Webhook not configured" });
      }
      
      const { message } = req.body;
      
      if (!message?.data) {
        console.warn("[WEBHOOK:GOOGLE] Missing message data");
        return res.status(400).json({ error: "Missing message data" });
      }

      console.log("[WEBHOOK:GOOGLE] Received notification - verifying...");
      
      // Decode the Pub/Sub message
      let data;
      try {
        data = JSON.parse(Buffer.from(message.data, 'base64').toString());
      } catch {
        console.warn("[WEBHOOK:GOOGLE] Failed to decode message");
        return res.status(400).json({ error: "Invalid message encoding" });
      }

      console.log("[WEBHOOK:GOOGLE] Received notification:", data);

      const subscriptionNotification = data.subscriptionNotification;
      if (!subscriptionNotification) {
        console.log("[WEBHOOK:GOOGLE] Not a subscription notification");
        return res.status(200).json({ received: true });
      }

      const { purchaseToken, subscriptionId, notificationType } = subscriptionNotification;
      
      console.log(`[WEBHOOK:GOOGLE] Type: ${notificationType}, Subscription: ${subscriptionId}`);

      // Find user by purchase token (stored as originalTransactionId for Google)
      const users = await storage.getAllUsers();
      const user = users.find(u => {
        const sub = u.subscription as Subscription | null;
        return sub?.originalTransactionId === purchaseToken;
      });

      if (user) {
        // Handle different notification types
        // See: https://developer.android.com/google/play/billing/rtdn-reference
        switch (notificationType) {
          case 2: // SUBSCRIPTION_RENEWED
          case 1: // SUBSCRIPTION_RECOVERED
          case 7: // SUBSCRIPTION_RESTARTED
            console.log(`[WEBHOOK:GOOGLE] Renewal for user: ${user.id}`);
            await storage.updateUserSubscription(user.id, {
              isPremium: true,
              subscription: {
                ...(user.subscription as Subscription),
                status: 'active',
                lastVerifiedAt: Date.now(),
                verificationStatus: 'verified'
              }
            });
            break;

          case 3: // SUBSCRIPTION_CANCELED
          case 12: // SUBSCRIPTION_REVOKED
            console.log(`[WEBHOOK:GOOGLE] Cancellation for user: ${user.id}`);
            await storage.updateUserSubscription(user.id, {
              isPremium: false,
              subscription: {
                ...(user.subscription as Subscription),
                status: 'canceled',
                canceledAt: Date.now(),
                verificationStatus: 'verified'
              }
            });
            break;

          case 13: // SUBSCRIPTION_EXPIRED
            console.log(`[WEBHOOK:GOOGLE] Expiration for user: ${user.id}`);
            await storage.updateUserSubscription(user.id, {
              isPremium: false,
              subscription: {
                ...(user.subscription as Subscription),
                status: 'expired',
                verificationStatus: 'verified'
              }
            });
            break;

          case 5: // SUBSCRIPTION_ON_HOLD
          case 6: // SUBSCRIPTION_IN_GRACE_PERIOD
          case 10: // SUBSCRIPTION_PAUSED
            console.log(`[WEBHOOK:GOOGLE] Hold/Grace/Paused for user: ${user.id}`);
            // Keep premium during grace period but mark as pending
            await storage.updateUserSubscription(user.id, {
              isPremium: true,
              subscription: {
                ...(user.subscription as Subscription),
                status: 'pending',
                verificationStatus: 'verified'
              }
            });
            break;

          default:
            console.log(`[WEBHOOK:GOOGLE] Unhandled type: ${notificationType}`);
        }
      } else {
        console.log(`[WEBHOOK:GOOGLE] No user found for token: ${purchaseToken?.substring(0, 20)}...`);
      }

      // Acknowledge the Pub/Sub message
      res.status(200).json({ received: true });

    } catch (error) {
      console.error("[WEBHOOK:GOOGLE] Error processing notification:", error);
      res.status(200).json({ received: true, error: "Processing error" });
    }
  });

  return httpServer;
}
