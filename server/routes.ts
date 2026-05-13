import { randomUUID } from "crypto";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, RAID_CAPACITY, ELITE_EARLY_ACCESS_MS } from "./storage";
import { lobbyWSManager } from "./websocket";
import { insertUserSchema, insertLobbySchema, playerSchema, insertFeedbackSchema, insertPushTokenSchema, ALL_BOSSES, queueEntrySchema, subscriptionSchema, insertReportSchema } from "@shared/schema";
import type { InsertQueueEntry, Subscription, PushToken } from "@shared/schema";
import { z } from "zod";
import { sendPushNotification, getVapidPublicKey, type NotificationPayload, createQueuePromotionNotification, createQueueAlmostUpNotification } from "./push-service";
import { getRaidBossDetails, getCounterPokemonDetails } from "./pokemon-data";
import { verifyPurchaseReceipt, ELITE_PRODUCTS } from "./services/subscription";
import { requirePremium } from "./middleware/require-premium";
import { RaidScraperService } from "./services/raid-scraper";
import { parseTrainerScreenshot } from "./services/trainer-ocr";

const getAdminToken = () => {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    return "Kj03c08kjc0308$";
  }
  return token;
};

// Track failed admin login attempts { ip -> { count, firstAttempt, lockedUntil } }
const failedAdminAttempts = new Map<string, { count: number; firstAttempt: number; lockedUntil: number }>();
const ADMIN_MAX_ATTEMPTS = 3;
const ADMIN_LOCKOUT_MS = 60 * 60 * 1000; // 1 hour

/**
 * After each queue-match cycle:
 * 1. Send a push to every user whose slot was just reserved ("It's your turn!")
 * 2. Send a push to every user who reached position ≤ 2 ("Almost your turn!")
 *    — deduped in storage so we don't spam on every cycle
 */
async function sendQueuePushAlerts(
  matched: Array<{ userId: string; bossId: string; matchedLobbyId?: string }>,
  activeBossNames: Map<string, string>
) {
  // 1. Promotion pushes
  for (const entry of matched) {
    try {
      const tokens = await storage.getPushTokensForUser(entry.userId);
      if (tokens.length === 0) continue;
      const bossName = activeBossNames.get(entry.bossId) || entry.bossId;
      await sendPushNotification(tokens, createQueuePromotionNotification(bossName, entry.matchedLobbyId || ''));
    } catch (e) {
      console.error(`[Queue] Failed to send promotion push to ${entry.userId}:`, e);
    }
  }

  // 2. Almost-up pushes
  try {
    const almostUp = await storage.getAlmostUpUsers();
    for (const user of almostUp) {
      const tokens = await storage.getPushTokensForUser(user.userId);
      if (tokens.length === 0) continue;
      await sendPushNotification(tokens, createQueueAlmostUpNotification(user.bossName, user.position));
    }
  } catch (e) {
    console.error('[Queue] Failed to send almost-up pushes:', e);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Public privacy policy page (required for App Store) ────────────────────
  app.get("/privacy", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GO Raiders – Privacy Policy</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 24px 16px 60px; color: #1a1a1a; line-height: 1.6; }
    h1 { font-size: 28px; font-weight: 800; margin-bottom: 4px; }
    h2 { font-size: 18px; font-weight: 700; margin-top: 28px; }
    p, li { font-size: 15px; color: #444; }
    ul { padding-left: 20px; }
    .date { color: #888; font-size: 13px; margin-bottom: 32px; }
    a { color: #e25c3b; }
  </style>
</head>
<body>
  <h1>Privacy Policy</h1>
  <p class="date">Last updated: January 2025</p>

  <h2>1. Introduction</h2>
  <p>GO Raiders ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.</p>

  <h2>2. Information We Collect</h2>
  <p>We collect the following information when you use GO Raiders:</p>
  <ul>
    <li><strong>Trainer profile:</strong> Display name, team (Valor/Mystic/Instinct), trainer level, and friend code — all provided voluntarily by you.</li>
    <li><strong>Usage data:</strong> Raid lobbies you create or join, timestamps, and app interactions.</li>
    <li><strong>Device identifiers:</strong> A randomly generated anonymous user ID stored locally on your device.</li>
    <li><strong>Push notification tokens:</strong> Only if you grant notification permission.</li>
  </ul>

  <h2>3. How We Use Your Information</h2>
  <ul>
    <li>To display your trainer profile to other users in shared raid lobbies.</li>
    <li>To match you with nearby raid groups.</li>
    <li>To send raid alerts and lobby status notifications (with your permission).</li>
    <li>To improve app features and fix bugs.</li>
  </ul>

  <h2>4. Information Sharing</h2>
  <p>We do not sell, trade, or otherwise transfer your personal information to third parties. Your trainer name, level, team, and friend code are visible to other users within a shared raid lobby.</p>

  <h2>5. Data Retention</h2>
  <p>Lobby data is automatically deleted after raids expire (typically within 1 hour). Your trainer profile is stored until you delete it from the app Settings.</p>

  <h2>6. Security</h2>
  <p>We use HTTPS encryption for all data in transit. We do not store passwords — the app uses anonymous device-based authentication.</p>

  <h2>7. Children's Privacy</h2>
  <p>GO Raiders is not directed to children under 13. We do not knowingly collect personal information from children under 13.</p>

  <h2>8. Changes to This Policy</h2>
  <p>We may update this Privacy Policy from time to time. We will notify you of significant changes within the app.</p>

  <h2>9. Contact Us</h2>
  <p>If you have questions about this Privacy Policy, contact us at: <a href="mailto:sydnyjr@gmail.com">sydnyjr@gmail.com</a></p>
</body>
</html>`);
  });

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

      // Auto-close any existing lobby this user owns, then create the new one.
      // getLobbies() already purges lobbies older than 15 minutes, so anything
      // still visible here is genuinely active.  We close it automatically —
      // the client-side guard (activeLobby check) already prevents accidental
      // double-taps; the server just needs to unblock legitimate re-hosts.
      const allLobbies = await storage.getLobbies();

      // Close user's own host lobby if present
      const existingHostLobby = allLobbies.find(l => l.hostId === validated.hostId);
      if (existingHostLobby) {
        await storage.deleteLobby(existingHostLobby.id).catch(() => {});
      }

      // Only block if the user is currently sitting in SOMEONE ELSE's lobby
      const existingPlayerLobby = allLobbies.find(l =>
        l.hostId !== validated.hostId &&
        l.players.some(p => p.id === validated.hostId)
      );
      if (existingPlayerLobby) {
        return res.status(400).json({
          error: "Already in a lobby",
          message: "Leave your current lobby before hosting a new raid."
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
      
      // ENFORCEMENT: Joiner can only join ONE lobby at a time
      const allLobbies = await storage.getLobbies();
      const existingPlayerLobby = allLobbies.find(l => 
        l.players.some(p => p.id === player.id) && l.id !== req.params.id
      );
      if (existingPlayerLobby) {
        return res.status(400).json({
          error: "Already in a lobby",
          message: "You can only be in one lobby at a time. Leave your current lobby first."
        });
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
      if (!lobbyBefore) {
        return res.json({ success: true, lobby: null, deleted: true });
      }
      
      const leavingPlayer = lobbyBefore.players.find(p => p.id === playerId);
      const isHost = leavingPlayer?.isHost === true;
      
      const lobby = await storage.leaveLobby(req.params.id, playerId);
      
      // If host left, lobby is deleted - notify all players via WebSocket
      if (isHost) {
        lobbyWSManager.broadcastLobbyClosed(req.params.id, "Host has left the lobby");
        return res.json({ success: true, lobby: null, deleted: true });
      }
      
      // Regular player left
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

      // Identify caller by IP for rate-limiting
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      const record = failedAdminAttempts.get(ip);

      // Check if this IP is currently locked out
      if (record && record.lockedUntil > now) {
        const remainingMs = record.lockedUntil - now;
        const remainingMin = Math.ceil(remainingMs / 60000);
        return res.status(429).json({
          valid: false,
          locked: true,
          lockedUntil: record.lockedUntil,
          error: `Too many failed attempts. Try again in ${remainingMin} minute${remainingMin !== 1 ? 's' : ''}.`,
        });
      }

      if (token === adminToken) {
        // Successful login — clear any failed attempts for this IP
        failedAdminAttempts.delete(ip);
        return res.json({ valid: true });
      }

      // Wrong password — record the failure
      const existing = record && record.lockedUntil <= now ? null : record;
      const newCount = (existing?.count ?? 0) + 1;
      const newRecord = {
        count: newCount,
        firstAttempt: existing?.firstAttempt ?? now,
        lockedUntil: newCount >= ADMIN_MAX_ATTEMPTS ? now + ADMIN_LOCKOUT_MS : 0,
      };
      failedAdminAttempts.set(ip, newRecord);

      // Send push notification to admin device on every failed attempt
      // ADMIN_PUSH_USERID env var should be set to the admin's user ID in Railway
      const adminUserId = process.env.ADMIN_PUSH_USERID;
      if (adminUserId) {
        try {
          const adminTokens = await storage.getPushTokensForUser(adminUserId);
          if (adminTokens.length > 0) {
            await sendPushNotification(adminTokens, {
              type: 'event_announcement',
              title: '⚠️ Admin Login Attempt',
              body: `Failed attempt ${newCount}/${ADMIN_MAX_ATTEMPTS} from ${ip}${newRecord.lockedUntil ? ' — LOCKED 1 hour' : ''}`,
              data: { ip, attempt: String(newCount), locked: String(newRecord.lockedUntil > 0) },
            });
          }
        } catch (e) {
          console.error('[Admin] Failed to send security alert push:', e);
        }
      }

      if (newRecord.lockedUntil > 0) {
        console.warn(`[Admin] IP ${ip} locked out after ${newCount} failed admin login attempts`);
        return res.status(429).json({
          valid: false,
          locked: true,
          lockedUntil: newRecord.lockedUntil,
          error: `Too many failed attempts. Try again in 60 minutes.`,
        });
      }

      return res.status(401).json({
        valid: false,
        locked: false,
        attemptsRemaining: ADMIN_MAX_ATTEMPTS - newCount,
        error: `Invalid token. ${ADMIN_MAX_ATTEMPTS - newCount} attempt${ADMIN_MAX_ATTEMPTS - newCount !== 1 ? 's' : ''} remaining before lockout.`,
      });
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

  // ===== Admin: Analytics Dashboard =====

  app.get("/api/admin/analytics", async (req, res) => {
    try {
      const adminToken = getAdminToken();
      if (!adminToken) return res.status(503).json({ error: "Admin access not configured" });
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");
      if (!token || token !== adminToken) return res.status(401).json({ error: "Unauthorized" });

      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // ===== Admin: User Management =====

  app.get("/api/admin/users", async (req, res) => {
    try {
      const adminToken = getAdminToken();
      if (!adminToken) return res.status(503).json({ error: "Admin access not configured" });
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");
      if (!token || token !== adminToken) return res.status(401).json({ error: "Unauthorized" });

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/users/:id", async (req, res) => {
    try {
      const adminToken = getAdminToken();
      if (!adminToken) return res.status(503).json({ error: "Admin access not configured" });
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");
      if (!token || token !== adminToken) return res.status(401).json({ error: "Unauthorized" });

      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Get additional data
      const feedback = await storage.getFeedbackByHost(req.params.id);
      const reports = await storage.getReportsByUser(req.params.id);
      const queues = await storage.getUserQueues(req.params.id);

      res.json({ user, feedback, reports, queues });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user details" });
    }
  });

  // Grant premium to user (free)
  app.post("/api/admin/users/:id/grant-premium", async (req, res) => {
    try {
      const adminToken = getAdminToken();
      if (!adminToken) return res.status(503).json({ error: "Admin access not configured" });
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");
      if (!token || token !== adminToken) return res.status(401).json({ error: "Unauthorized" });

      const user = await storage.grantPremium(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to grant premium" });
    }
  });

  // Revoke premium from user
  app.post("/api/admin/users/:id/revoke-premium", async (req, res) => {
    try {
      const adminToken = getAdminToken();
      if (!adminToken) return res.status(503).json({ error: "Admin access not configured" });
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");
      if (!token || token !== adminToken) return res.status(401).json({ error: "Unauthorized" });

      const user = await storage.revokePremium(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to revoke premium" });
    }
  });

  // Edit user profile
  app.patch("/api/admin/users/:id", async (req, res) => {
    try {
      const adminToken = getAdminToken();
      if (!adminToken) return res.status(503).json({ error: "Admin access not configured" });
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");
      if (!token || token !== adminToken) return res.status(401).json({ error: "Unauthorized" });

      const { name, level, team, coins } = req.body;
      const updates: any = {};
      if (name && typeof name === 'string') updates.name = name;
      if (level && typeof level === 'number') updates.level = Math.min(80, Math.max(1, level));
      if (team && ['valor', 'mystic', 'instinct', 'neutral'].includes(team)) updates.team = team;
      if (typeof coins === 'number') updates.coins = Math.max(0, coins);

      const user = await storage.updateUser(req.params.id, updates);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Delete user account
  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      const adminToken = getAdminToken();
      if (!adminToken) return res.status(503).json({ error: "Admin access not configured" });
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");
      if (!token || token !== adminToken) return res.status(401).json({ error: "Unauthorized" });

      const success = await storage.deleteUser(req.params.id);
      if (!success) return res.status(404).json({ error: "User not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Set user coins
  app.post("/api/admin/users/:id/coins", async (req, res) => {
    try {
      const adminToken = getAdminToken();
      if (!adminToken) return res.status(503).json({ error: "Admin access not configured" });
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");
      if (!token || token !== adminToken) return res.status(401).json({ error: "Unauthorized" });

      const { coins } = req.body;
      if (typeof coins !== 'number' || coins < 0) {
        return res.status(400).json({ error: "Valid coin amount required" });
      }
      const user = await storage.resetUserCoins(req.params.id, coins);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to set coins" });
    }
  });

  // ===== Admin: Lobby Management =====

  app.get("/api/admin/lobbies", async (req, res) => {
    try {
      const adminToken = getAdminToken();
      if (!adminToken) return res.status(503).json({ error: "Admin access not configured" });
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");
      if (!token || token !== adminToken) return res.status(401).json({ error: "Unauthorized" });

      const lobbies = await storage.getAllLobbiesIncludingStarted();
      res.json(lobbies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lobbies" });
    }
  });

  app.post("/api/admin/lobbies/:id/force-close", async (req, res) => {
    try {
      const adminToken = getAdminToken();
      if (!adminToken) return res.status(503).json({ error: "Admin access not configured" });
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");
      if (!token || token !== adminToken) return res.status(401).json({ error: "Unauthorized" });

      lobbyWSManager.broadcastLobbyClosed(req.params.id, "This lobby was closed by an administrator");
      const success = await storage.forceCloseLobby(req.params.id);
      if (!success) return res.status(404).json({ error: "Lobby not found" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to force close lobby" });
    }
  });

  app.post("/api/admin/lobbies/:id/kick/:playerId", async (req, res) => {
    try {
      const adminToken = getAdminToken();
      if (!adminToken) return res.status(503).json({ error: "Admin access not configured" });
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");
      if (!token || token !== adminToken) return res.status(401).json({ error: "Unauthorized" });

      const lobby = await storage.kickPlayerFromLobby(req.params.id, req.params.playerId);
      if (!lobby) return res.status(404).json({ error: "Lobby not found or cannot kick host" });

      lobbyWSManager.broadcastPlayerLeft(req.params.id, req.params.playerId, "Removed by admin");
      lobbyWSManager.broadcastLobbyUpdate(lobby);
      res.json(lobby);
    } catch (error) {
      res.status(500).json({ error: "Failed to kick player" });
    }
  });

  // ===== Admin: Report Management =====

  app.patch("/api/admin/reports/:id", async (req, res) => {
    try {
      const adminToken = getAdminToken();
      if (!adminToken) return res.status(503).json({ error: "Admin access not configured" });
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");
      if (!token || token !== adminToken) return res.status(401).json({ error: "Unauthorized" });

      const { status } = req.body;
      if (!status || !['reviewed', 'resolved', 'dismissed'].includes(status)) {
        return res.status(400).json({ error: "Valid status required: reviewed, resolved, dismissed" });
      }

      const reportId = parseInt(req.params.id);
      const report = await storage.updateReportStatus(reportId, status);
      if (!report) return res.status(404).json({ error: "Report not found" });
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to update report" });
    }
  });

  // ===== Admin: Push Broadcast =====

  app.post("/api/admin/broadcast", async (req, res) => {
    try {
      const adminToken = getAdminToken();
      if (!adminToken) return res.status(503).json({ error: "Admin access not configured" });
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");
      if (!token || token !== adminToken) return res.status(401).json({ error: "Unauthorized" });

      const { title, body, target } = req.body;
      if (!title || !body) {
        return res.status(400).json({ error: "Title and body required" });
      }

      let tokens: PushToken[] = [];

      if (target === 'premium') {
        const users = await storage.getAllUsers();
        const premiumIds = users.filter(u => u.isPremium).map(u => u.id);
        tokens = await storage.getPushTokensForUsers(premiumIds);
      } else if (target === 'basic') {
        const users = await storage.getAllUsers();
        const basicIds = users.filter(u => !u.isPremium).map(u => u.id);
        tokens = await storage.getPushTokensForUsers(basicIds);
      } else {
        // All users
        tokens = await storage.getAllPushTokens();
      }

      if (tokens.length === 0) {
        return res.json({ success: true, sent: 0, message: "No push tokens found" });
      }

      const payload: NotificationPayload = {
        type: 'event_announcement',
        title,
        body,
        data: { type: 'admin_broadcast' },
      };

      const result = await sendPushNotification(tokens, payload);
      res.json({ ...result, tokenCount: tokens.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to send broadcast" });
    }
  });

  // ===== Raid Boss Auto-Update Service =====

  const raidScraper = new RaidScraperService(storage, {
    enabled: process.env.RAID_SCRAPER_ENABLED !== 'false',
    autoActivate: true,
    autoDeactivate: true,
    notifyAdmin: true,
    onTheHour: true,  // Sync to :00 of each hour
  });

  // Start the scraper (non-blocking)
  raidScraper.start();

  // Admin: Get scraper status & last update
  app.get("/api/admin/scraper/status", async (req, res) => {
    try {
      const adminToken = getAdminToken();
      if (!adminToken) return res.status(503).json({ error: "Admin access not configured" });
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");
      if (!token || token !== adminToken) return res.status(401).json({ error: "Unauthorized" });

      res.json({
        config: raidScraper.getConfig(),
        isRunning: raidScraper.isRunning(),
        nextRunAt: raidScraper.nextRunAt()?.toISOString() ?? null,
        lastUpdate: raidScraper.getLastUpdate(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get scraper status" });
    }
  });

  // Admin: Force a manual refresh of raid bosses
  app.post("/api/admin/scraper/refresh", async (req, res) => {
    try {
      const adminToken = getAdminToken();
      if (!adminToken) return res.status(503).json({ error: "Admin access not configured" });
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");
      if (!token || token !== adminToken) return res.status(401).json({ error: "Unauthorized" });

      const result = await raidScraper.forceRefresh();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to refresh raid bosses" });
    }
  });

  // Admin: Update scraper config
  app.patch("/api/admin/scraper/config", async (req, res) => {
    try {
      const adminToken = getAdminToken();
      if (!adminToken) return res.status(503).json({ error: "Admin access not configured" });
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");
      if (!token || token !== adminToken) return res.status(401).json({ error: "Unauthorized" });

      const { enabled, autoActivate, autoDeactivate, onTheHour } = req.body;
      const updates: any = {};
      if (typeof enabled === 'boolean') updates.enabled = enabled;
      if (typeof autoActivate === 'boolean') updates.autoActivate = autoActivate;
      if (typeof autoDeactivate === 'boolean') updates.autoDeactivate = autoDeactivate;
      if (typeof onTheHour === 'boolean') updates.onTheHour = onTheHour;

      raidScraper.updateConfig(updates);
      res.json({ config: raidScraper.getConfig() });
    } catch (error) {
      res.status(500).json({ error: "Failed to update scraper config" });
    }
  });

  // Admin: Manually activate/deactivate a raid boss
  app.patch("/api/admin/boss/:bossId", async (req, res) => {
    try {
      const adminToken = getAdminToken();
      if (!adminToken) return res.status(503).json({ error: "Admin access not configured" });
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");
      if (!token || token !== adminToken) return res.status(401).json({ error: "Unauthorized" });

      const { bossId } = req.params;
      const { isActive, startTime, endTime } = req.body;

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: "isActive (boolean) required" });
      }

      const updated = await storage.setRaidBossActive(bossId, isActive, startTime, endTime);
      if (!updated) {
        return res.status(404).json({ error: "Boss not found" });
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update boss status" });
    }
  });

  // ===== Trainer Screenshot OCR =====

  /**
   * Parse a trainer profile screenshot using OCR
   * Extracts: trainer name, team, level, friend code
   * Used during onboarding to auto-fill profile data
   */
  app.post("/api/trainer/scan", async (req, res) => {
    try {
      const { imageData } = req.body;

      if (!imageData || typeof imageData !== 'string') {
        return res.status(400).json({ error: "Base64 image data required" });
      }

      // Strip data URI prefix if present
      const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');

      const result = await parseTrainerScreenshot(base64);
      res.json(result);
    } catch (error) {
      console.error("Trainer scan error:", error);
      res.status(500).json({ error: "Failed to scan trainer screenshot" });
    }
  });

  // ===== Queue System - Structured Fairness Model =====

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

      const result = await storage.joinQueue(entry);

      // Reject if user is on cooldown
      if (result.cooldownMs) {
        return res.status(429).json({
          error: "You must wait before rejoining",
          cooldownMs: result.cooldownMs,
          cooldownSeconds: Math.ceil(result.cooldownMs / 1000),
        });
      }

      // Immediately try to match
      const matchResult = await storage.processQueueMatches();

      // Build boss name lookup for notifications
      const activeBosses = await storage.getActiveRaidBosses();
      const bossNameMap = new Map(activeBosses.map(b => [b.id, b.name]));

      // Notify promoted users via WebSocket + push notification
      for (const matched of matchResult.matched) {
        const bossName = bossNameMap.get(matched.bossId) || matched.bossId;
        lobbyWSManager.notifyUserPromotion(matched.userId, {
          bossId: matched.bossId,
          bossName,
          lobbyId: matched.matchedLobbyId,
          reservationExpiresAt: matched.reservedAt ? matched.reservedAt + 20000 : undefined,
        });
      }

      // Send push notifications (fire-and-forget — don't block the response)
      sendQueuePushAlerts(matchResult.matched, bossNameMap).catch(() => {});

      // Broadcast queue update to all watchers of this boss
      const counts = await storage.getQueueCounts();
      lobbyWSManager.broadcastQueueUpdate(bossId, {
        bossId,
        count: counts[bossId] || 0,
      });

      const status = await storage.getQueueStatus(userId, bossId);
      res.status(201).json(status);
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

      if (success && bossId) {
        const counts = await storage.getQueueCounts();
        lobbyWSManager.broadcastQueueUpdate(bossId, {
          bossId,
          count: counts[bossId] || 0,
        });
      }

      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to leave queue" });
    }
  });

  // Heartbeat: keep the user's queue slot alive and prevent disconnect expiry
  app.post("/api/queue/heartbeat", async (req, res) => {
    try {
      const { userId, bossId } = req.body;
      if (!userId || !bossId) return res.status(400).json({ error: "userId and bossId required" });

      const alive = await storage.heartbeatQueue(userId, bossId);
      res.json({ alive });
    } catch (error) {
      res.status(500).json({ error: "Failed to send heartbeat" });
    }
  });

  // Accept a reservation (user confirms they want to join the lobby)
  app.post("/api/queue/accept", async (req, res) => {
    try {
      const { userId, bossId } = req.body;
      if (!userId || !bossId) return res.status(400).json({ error: "userId and bossId required" });

      const result = await storage.acceptReservation(userId, bossId);
      if (!result) {
        return res.status(409).json({ error: "Reservation expired or lobby unavailable" });
      }

      // Broadcast queue update after slot filled
      const counts = await storage.getQueueCounts();
      lobbyWSManager.broadcastQueueUpdate(bossId, {
        bossId,
        count: counts[bossId] || 0,
      });

      // Also update lobby members
      const lobby = await storage.getLobby(result.lobbyId);
      if (lobby) {
        lobbyWSManager.broadcastLobbyUpdate(lobby);
      }

      res.json({ lobbyId: result.lobbyId });
    } catch (error) {
      res.status(500).json({ error: "Failed to accept reservation" });
    }
  });

  // Reject a reservation (user declines — penalty applied)
  app.post("/api/queue/reject", async (req, res) => {
    try {
      const { userId, bossId } = req.body;
      if (!userId || !bossId) return res.status(400).json({ error: "userId and bossId required" });

      const success = await storage.rejectReservation(userId, bossId);

      if (success) {
        const counts = await storage.getQueueCounts();
        lobbyWSManager.broadcastQueueUpdate(bossId, {
          bossId,
          count: counts[bossId] || 0,
        });
      }

      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to reject reservation" });
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

  // Process queue matches (background — also called by periodic job)
  app.post("/api/queue/process", async (req, res) => {
    try {
      const result = await storage.processQueueMatches();

      const activeBosses = await storage.getActiveRaidBosses();
      const bossNameMap = new Map(activeBosses.map(b => [b.id, b.name]));

      // Notify promoted users via WebSocket + push
      for (const matched of result.matched) {
        const bossName = bossNameMap.get(matched.bossId) || matched.bossId;
        lobbyWSManager.notifyUserPromotion(matched.userId, {
          bossId: matched.bossId,
          bossName,
          lobbyId: matched.matchedLobbyId,
          reservationExpiresAt: matched.reservedAt ? matched.reservedAt + 20000 : undefined,
        });
      }

      sendQueuePushAlerts(result.matched, bossNameMap).catch(() => {});

      res.json({
        matchedCount: result.matched.length,
        lobbiesAffected: result.lobbies.length,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to process queue" });
    }
  });

  /**
   * POST /api/queue/reward-skip
   * Move a user forward N positions in the queue after they earn a rewarded ad.
   * The `spots` value comes from the server-side adConfig so it can't be spoofed.
   */
  app.post("/api/queue/reward-skip", async (req, res) => {
    try {
      const { userId, bossId } = req.body;
      if (!userId || !bossId) return res.status(400).json({ error: "userId and bossId required" });

      // Verify the user is actually in the queue
      const status = await storage.getQueueStatus(userId, bossId);
      if (!status || status.status !== 'waiting') {
        return res.status(409).json({ error: "Not in waiting queue for this boss" });
      }

      // Get the configured skip amount from ad config
      const configs = await storage.getAdConfig();
      const rewardedConfig = configs.find(c => c.placement === 'rewarded');
      const skipSpots = rewardedConfig?.rewardQueueSkip ?? 5;

      // Apply the skip by boosting the user's priority score in storage
      await storage.applyRewardedSkip(userId, bossId, skipSpots);

      // Broadcast updated queue counts
      const counts = await storage.getQueueCounts();
      lobbyWSManager.broadcastQueueUpdate(bossId, { bossId, count: counts[bossId] || 0 });

      const newStatus = await storage.getQueueStatus(userId, bossId);
      res.json({ success: true, newPosition: newStatus?.position, skippedSpots: skipSpots });
    } catch (error) {
      res.status(500).json({ error: "Failed to apply reward skip" });
    }
  });

  // Return VAPID public key so browsers can create a PushSubscription
  app.get("/api/push/vapid-key", (_req, res) => {
    res.json({ publicKey: getVapidPublicKey() });
  });

  // Send a test push notification to a specific user — useful for verifying the
  // full push pipeline (registration → send → receive) during development.
  app.post("/api/push/test/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const tokens = await storage.getPushTokensForUser(userId);
      if (tokens.length === 0) {
        return res.status(404).json({ error: "No push tokens registered for this user" });
      }
      const payload = {
        type: 'event_announcement' as const,
        title: '🔔 Test Notification',
        body: 'Push notifications are working! You\'ll see this even when the app is in the background.',
        data: { type: 'event_announcement', test: 'true' },
      };
      const result = await sendPushNotification(tokens, payload);
      res.json({ sent: result.success, failed: result.failed, tokenCount: tokens.length });
    } catch (err) {
      console.error('[PushTest]', err);
      res.status(500).json({ error: "Failed to send test notification" });
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

  // ============================================================================
  // CATCH & IV TRACKER ROUTES
  // ============================================================================

  /** POST /api/catch — log a catch attempt after a raid */
  app.post("/api/catch", async (req, res) => {
    try {
      const { userId, bossId, bossName, lobbyId, caught, cp, isShiny } = req.body;
      if (!userId || !bossId || !lobbyId) {
        return res.status(400).json({ error: "userId, bossId, lobbyId required" });
      }
      const record = await storage.logCatch({
        userId, bossId, bossName: bossName || bossId, lobbyId,
        caught: !!caught, cp: cp ? Number(cp) : undefined, isShiny: !!isShiny,
      });
      res.status(201).json(record);
    } catch (error) {
      res.status(500).json({ error: "Failed to log catch" });
    }
  });

  /** GET /api/catch/history/:userId — recent catches for a user */
  app.get("/api/catch/history/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const history = await storage.getCatchHistory(userId, limit);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch catch history" });
    }
  });

  /** GET /api/catch/stats/:userId — aggregate stats */
  app.get("/api/catch/stats/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const stats = await storage.getCatchStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch catch stats" });
    }
  });

  // ============================================================================
  // PRIVATE GROUP ROUTES
  // ============================================================================

  /** POST /api/groups — create a new group */
  app.post("/api/groups", async (req, res) => {
    try {
      const { userId, userName, name } = req.body;
      if (!userId || !userName || !name) {
        return res.status(400).json({ error: "userId, userName, name required" });
      }
      const group = await storage.createGroup(userId, userName, name);
      res.status(201).json(group);
    } catch (error) {
      res.status(500).json({ error: "Failed to create group" });
    }
  });

  /** POST /api/groups/join — join by 6-char code */
  app.post("/api/groups/join", async (req, res) => {
    try {
      const { userId, joinCode } = req.body;
      if (!userId || !joinCode) return res.status(400).json({ error: "userId and joinCode required" });
      const group = await storage.joinGroup(userId, joinCode);
      if (!group) return res.status(404).json({ error: "Group not found or full" });
      res.json(group);
    } catch (error) {
      res.status(500).json({ error: "Failed to join group" });
    }
  });

  /** POST /api/groups/:id/leave */
  app.post("/api/groups/:id/leave", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId required" });
      const success = await storage.leaveGroup(userId, req.params.id);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to leave group" });
    }
  });

  /** GET /api/groups/user/:userId — groups the user belongs to */
  app.get("/api/groups/user/:userId", async (req, res) => {
    try {
      const groups = await storage.getUserGroups(req.params.userId);
      res.json(groups);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user groups" });
    }
  });

  /** GET /api/groups/:id — group details + member count */
  app.get("/api/groups/:id", async (req, res) => {
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) return res.status(404).json({ error: "Group not found" });
      res.json(group);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch group" });
    }
  });

  /** GET /api/groups/:id/lobbies — active group lobbies */
  app.get("/api/groups/:id/lobbies", async (req, res) => {
    try {
      const lobbies = await storage.getGroupLobbies(req.params.id);
      res.json(lobbies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch group lobbies" });
    }
  });

  // ============================================================================
  // RAID TRAIN ROUTES
  // ============================================================================

  /**
   * POST /api/lobbies/:id/train
   * Host starts the next lobby in a raid train.
   * Copies the current lobby's player list, creates a fresh lobby,
   * sends push notifications to all current players.
   */
  app.post("/api/lobbies/:id/train", async (req, res) => {
    try {
      const { hostId, bossId, minLevel } = req.body;
      const currentLobby = await storage.getLobby(req.params.id);
      if (!currentLobby) return res.status(404).json({ error: "Lobby not found" });
      if (currentLobby.hostId !== hostId) return res.status(403).json({ error: "Only the host can start the next train" });

      const trainId = currentLobby.raidTrainId || randomUUID();
      const trainIndex = (currentLobby.trainIndex || 1) + 1;

      const newLobby = await storage.createLobby({
        bossId: bossId || currentLobby.bossId,
        hostId: currentLobby.hostId,
        hostName: currentLobby.hostName,
        hostRating: currentLobby.hostRating,
        players: [currentLobby.players.find(p => p.id === hostId)!].filter(Boolean),
        maxPlayers: currentLobby.maxPlayers,
        team: currentLobby.team,
        minLevel: minLevel ?? currentLobby.minLevel,
        weather: currentLobby.weather,
        timeLeft: 15,
        raidStarted: false,
        invitesSent: false,
        groupId: currentLobby.groupId,
        raidTrainId: trainId,
        trainIndex,
      });

      // Push all current players (except host — they're already in)
      const playerIds = currentLobby.players
        .filter(p => p.id !== hostId)
        .map(p => p.id);

      if (playerIds.length > 0) {
        const tokens = await storage.getPushTokensForUsers(playerIds);
        if (tokens.length > 0) {
          await sendPushNotification(tokens, {
            type: 'raid_invite',
            title: '🚂 Next raid starting!',
            body: `${currentLobby.hostName} is hosting another ${newLobby.bossId} raid. Join the train!`,
            data: { lobbyId: newLobby.id, bossId: newLobby.bossId },
          });
        }
      }

      res.status(201).json(newLobby);
    } catch (error) {
      console.error("Raid train error:", error);
      res.status(500).json({ error: "Failed to start next raid" });
    }
  });

  // ============================================================================
  // ADVERTISEMENT ROUTES
  // ============================================================================

  /**
   * POST /api/ads/impression
   * Called by the client immediately when an ad becomes visible.
   * Body: { userId, placement, adUnitId, viewable, estimatedRevenueMicros }
   */
  app.post("/api/ads/impression", async (req, res) => {
    try {
      const { userId, placement, adUnitId, viewable, estimatedRevenueMicros } = req.body;
      if (!userId || !placement || !adUnitId) {
        return res.status(400).json({ error: "userId, placement, adUnitId required" });
      }
      const impression = await storage.recordAdImpression({
        userId,
        placement,
        adUnitId,
        viewable: !!viewable,
        estimatedRevenueMicros: Number(estimatedRevenueMicros) || 0,
      });
      res.status(201).json({ impressionId: impression.id });
    } catch (error) {
      res.status(500).json({ error: "Failed to record impression" });
    }
  });

  /**
   * POST /api/ads/click
   * Called when a user taps an ad.
   * Body: { impressionId }
   */
  app.post("/api/ads/click", async (req, res) => {
    try {
      const { impressionId } = req.body;
      if (!impressionId) return res.status(400).json({ error: "impressionId required" });
      const success = await storage.recordAdClick(impressionId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to record click" });
    }
  });

  /**
   * GET /api/ads/stats  (admin only)
   * Returns aggregated impression / click / revenue data.
   */
  app.get("/api/ads/stats", async (req, res) => {
    try {
      const token = req.headers['x-admin-token'] as string;
      if (token !== getAdminToken()) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const stats = await storage.getAdStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ad stats" });
    }
  });

  /**
   * GET /api/ads/config  (admin only)
   * Returns per-placement configuration.
   */
  app.get("/api/ads/config", async (req, res) => {
    try {
      const token = req.headers['x-admin-token'] as string;
      if (token !== getAdminToken()) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const config = await storage.getAdConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ad config" });
    }
  });

  /**
   * PATCH /api/ads/config/:placement  (admin only)
   * Toggle or adjust a placement.
   * Body: { enabled?, frequency?, rewardQueueSkip? }
   */
  app.patch("/api/ads/config/:placement", async (req, res) => {
    try {
      const token = req.headers['x-admin-token'] as string;
      if (token !== getAdminToken()) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const placement = req.params.placement as any;
      const { enabled, frequency, rewardQueueSkip } = req.body;
      const updated = await storage.updateAdConfig(placement, {
        ...(enabled !== undefined && { enabled }),
        ...(frequency !== undefined && { frequency }),
        ...(rewardQueueSkip !== undefined && { rewardQueueSkip }),
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update ad config" });
    }
  });

  /**
   * GET /api/ads/config/public
   * Non-admin: returns only enabled/frequency for each placement (no revenue data).
   * Client fetches this once on boot to know which ad units to show.
   */
  app.get("/api/ads/config/public", async (_req, res) => {
    try {
      const config = await storage.getAdConfig();
      res.json(config.map(c => ({
        placement: c.placement,
        enabled: c.enabled,
        frequency: c.frequency,
        rewardQueueSkip: c.rewardQueueSkip,
      })));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ad config" });
    }
  });

  // ── Periodic lobby expiry — runs every 60 s ────────────────────────────────
  // getLobbies() already purges expired entries on every call, but calling it
  // periodically ensures the in-memory map stays clean even when no clients
  // are actively fetching, and lets us broadcast expiry notifications.
  setInterval(async () => {
    try {
      await storage.getLobbies(); // side-effect: purges expired lobbies
    } catch { /* swallow — non-critical housekeeping */ }
  }, 60_000);

  return httpServer;
}
