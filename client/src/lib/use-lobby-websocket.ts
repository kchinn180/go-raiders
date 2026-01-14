import { useEffect, useRef, useCallback } from "react";
import type { Lobby } from "@shared/schema";
import { triggerNotification } from "./haptics";

interface WebSocketMessage {
  type: string;
  data: unknown;
}

interface UseLobbyWebSocketOptions {
  lobbyId: string;
  userId: string;
  onLobbyUpdate?: (lobby: Lobby) => void;
  onPlayerReady?: (playerId: string, playerName: string, isReady: boolean) => void;
  onInvitesSent?: () => void;
  onPlayerJoined?: (playerName: string) => void;
  onPlayerLeft?: (playerName: string) => void;
  hapticEnabled?: boolean;
}

export function useLobbyWebSocket({
  lobbyId,
  userId,
  onLobbyUpdate,
  onPlayerReady,
  onInvitesSent,
  onPlayerJoined,
  onPlayerLeft,
  hapticEnabled = true,
}: UseLobbyWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WS] Connected to lobby WebSocket");
        ws.send(JSON.stringify({ type: "join_lobby", lobbyId, userId }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case "lobby_update":
              if (onLobbyUpdate) {
                onLobbyUpdate(message.data as Lobby);
              }
              break;

            case "player_ready": {
              const { playerId, playerName, isReady } = message.data as {
                playerId: string;
                playerName: string;
                isReady: boolean;
              };
              if (playerId !== userId) {
                if (hapticEnabled && isReady) {
                  triggerNotification("success");
                }
                if (onPlayerReady) {
                  onPlayerReady(playerId, playerName, isReady);
                }
              }
              break;
            }

            case "invites_sent":
              if (hapticEnabled) {
                triggerNotification("success");
              }
              if (onInvitesSent) {
                onInvitesSent();
              }
              break;

            case "player_joined": {
              const { playerName } = message.data as { playerName: string };
              if (hapticEnabled) {
                triggerNotification("success");
              }
              if (onPlayerJoined) {
                onPlayerJoined(playerName);
              }
              break;
            }

            case "player_left": {
              const { playerName } = message.data as { playerName: string };
              if (onPlayerLeft) {
                onPlayerLeft(playerName);
              }
              break;
            }
          }
        } catch (e) {
          console.error("[WS] Failed to parse message:", e);
        }
      };

      ws.onclose = () => {
        console.log("[WS] Connection closed, reconnecting in 3s...");
        wsRef.current = null;
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        console.error("[WS] WebSocket error:", error);
      };
    } catch (e) {
      console.error("[WS] Failed to connect:", e);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, [lobbyId, userId, onLobbyUpdate, onPlayerReady, onInvitesSent, onPlayerJoined, onPlayerLeft, hapticEnabled]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        try {
          // Only send leave message if WebSocket is still open
          if (wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "leave_lobby" }));
          }
          wsRef.current.close();
        } catch (e) {
          // Ignore errors during cleanup
        }
        wsRef.current = null;
      }
    };
  }, [connect]);

  return wsRef;
}
