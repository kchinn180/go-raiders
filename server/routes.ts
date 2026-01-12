import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertLobbySchema, playerSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

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

  return httpServer;
}
