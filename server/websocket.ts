import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { Lobby } from "@shared/schema";
import { log } from "./index";

interface WSClient {
  ws: WebSocket;
  lobbyId?: string;
  userId?: string;
}

class LobbyWebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, WSClient> = new Map();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: "/ws" });

    this.wss.on("connection", (ws) => {
      log("WebSocket client connected", "ws");
      this.clients.set(ws, { ws });

      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (e) {
          log(`WebSocket parse error: ${e}`, "ws");
        }
      });

      ws.on("close", () => {
        log("WebSocket client disconnected", "ws");
        this.clients.delete(ws);
      });

      ws.on("error", (err) => {
        log(`WebSocket error: ${err.message}`, "ws");
        this.clients.delete(ws);
      });
    });

    log("WebSocket server initialized on /ws", "ws");
  }

  private handleMessage(ws: WebSocket, message: { type: string; lobbyId?: string; userId?: string }) {
    const client = this.clients.get(ws);
    if (!client) return;

    switch (message.type) {
      case "join_lobby":
        if (message.lobbyId) {
          client.lobbyId = message.lobbyId;
          client.userId = message.userId;
          log(`Client joined lobby: ${message.lobbyId}`, "ws");
        }
        break;

      case "leave_lobby":
        client.lobbyId = undefined;
        client.userId = undefined;
        log(`Client left lobby`, "ws");
        break;
    }
  }

  broadcastToLobby(lobbyId: string, eventType: string, data: unknown) {
    const message = JSON.stringify({ type: eventType, data });
    let count = 0;

    this.clients.forEach((client) => {
      if (client.lobbyId === lobbyId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
        count++;
      }
    });

    if (count > 0) {
      log(`Broadcast ${eventType} to ${count} clients in lobby ${lobbyId}`, "ws");
    }
  }

  broadcastLobbyUpdate(lobby: Lobby) {
    this.broadcastToLobby(lobby.id, "lobby_update", lobby);
  }

  broadcastPlayerReady(lobbyId: string, playerId: string, playerName: string, isReady: boolean) {
    this.broadcastToLobby(lobbyId, "player_ready", { playerId, playerName, isReady });
  }

  broadcastInvitesSent(lobbyId: string) {
    this.broadcastToLobby(lobbyId, "invites_sent", { lobbyId, timestamp: Date.now() });
  }

  broadcastPlayerJoined(lobby: Lobby, playerName: string) {
    this.broadcastToLobby(lobby.id, "player_joined", { lobby, playerName });
  }

  broadcastPlayerLeft(lobbyId: string, playerId: string, playerName: string) {
    this.broadcastToLobby(lobbyId, "player_left", { playerId, playerName });
  }
}

export const lobbyWSManager = new LobbyWebSocketManager();
