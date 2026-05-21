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
  onLobbyClosed?: (reason: string) => void;
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
  onLobbyClosed,
  hapticEnabled = true,
}: UseLobbyWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Store all callbacks in refs so connect() never needs to be recreated
  // when parent re-renders pass new inline function references.
  // This prevents the WebSocket from reconnecting on every render.
  const onLobbyUpdateRef = useRef(onLobbyUpdate);
  const onPlayerReadyRef = useRef(onPlayerReady);
  const onInvitesSentRef = useRef(onInvitesSent);
  const onPlayerJoinedRef = useRef(onPlayerJoined);
  const onPlayerLeftRef = useRef(onPlayerLeft);
  const onLobbyClosedRef = useRef(onLobbyClosed);
  const hapticEnabledRef = useRef(hapticEnabled);

  // Keep refs in sync with latest props on every render (no re-connection needed)
  useEffect(() => { onLobbyUpdateRef.current = onLobbyUpdate; }, [onLobbyUpdate]);
  useEffect(() => { onPlayerReadyRef.current = onPlayerReady; }, [onPlayerReady]);
  useEffect(() => { onInvitesSentRef.current = onInvitesSent; }, [onInvitesSent]);
  useEffect(() => { onPlayerJoinedRef.current = onPlayerJoined; }, [onPlayerJoined]);
  useEffect(() => { onPlayerLeftRef.current = onPlayerLeft; }, [onPlayerLeft]);
  useEffect(() => { onLobbyClosedRef.current = onLobbyClosed; }, [onLobbyClosed]);
  useEffect(() => { hapticEnabledRef.current = hapticEnabled; }, [hapticEnabled]);

  // connect() only depends on lobbyId and userId — true connection identifiers.
  // Callback changes never cause a reconnect.
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
              onLobbyUpdateRef.current?.(message.data as Lobby);
              break;

            case "player_ready": {
              const { playerId, playerName, isReady } = message.data as {
                playerId: string;
                playerName: string;
                isReady: boolean;
              };
              if (playerId !== userId) {
                if (hapticEnabledRef.current && isReady) {
                  triggerNotification("success");
                }
                onPlayerReadyRef.current?.(playerId, playerName, isReady);
              }
              break;
            }

            case "invites_sent":
              if (hapticEnabledRef.current) {
                triggerNotification("success");
              }
              onInvitesSentRef.current?.();
              break;

            case "player_joined": {
              const { playerName } = message.data as { playerName: string };
              if (hapticEnabledRef.current) {
                triggerNotification("success");
              }
              onPlayerJoinedRef.current?.(playerName);
              break;
            }

            case "player_left": {
              const { playerName } = message.data as { playerName: string };
              onPlayerLeftRef.current?.(playerName);
              break;
            }

            case "lobby_closed": {
              const { reason } = message.data as { reason: string };
              onLobbyClosedRef.current?.(reason);
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
  }, [lobbyId, userId]); // ← only reconnect when the actual lobby/user changes

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
