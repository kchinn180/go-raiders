import type { PushToken, NotificationType } from "@shared/schema";

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPushNotification(
  tokens: PushToken[],
  payload: NotificationPayload
): Promise<{ success: number; failed: number }> {
  if (tokens.length === 0) {
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  for (const tokenInfo of tokens) {
    try {
      if (tokenInfo.platform === 'ios') {
        await sendAPNS(tokenInfo.token, payload);
        success++;
      } else if (tokenInfo.platform === 'android') {
        await sendFCM(tokenInfo.token, payload);
        success++;
      } else if (tokenInfo.platform === 'web') {
        await sendWebPush(tokenInfo.token, payload);
        success++;
      }
    } catch (e) {
      console.log(`Failed to send notification to ${tokenInfo.platform}:`, e);
      failed++;
    }
  }

  return { success, failed };
}

async function sendAPNS(token: string, payload: NotificationPayload): Promise<void> {
  console.log(`[APNS] Would send to ${token.substring(0, 20)}...: ${payload.title}`);
}

async function sendFCM(token: string, payload: NotificationPayload): Promise<void> {
  console.log(`[FCM] Would send to ${token.substring(0, 20)}...: ${payload.title}`);
}

async function sendWebPush(subscription: string, payload: NotificationPayload): Promise<void> {
  console.log(`[WebPush] Would send to subscription: ${payload.title}`);
}

export function createRaidInviteNotification(bossName: string, hostName: string, lobbyId: string): NotificationPayload {
  return {
    type: 'raid_invite',
    title: 'Raid Invite!',
    body: `${hostName} invited you to a ${bossName} raid`,
    data: { lobbyId, bossName, hostName },
  };
}

export function createRaidStartingNotification(bossName: string, lobbyId: string): NotificationPayload {
  return {
    type: 'raid_starting',
    title: 'Raid Starting Now!',
    body: `Your ${bossName} raid is starting - join the game!`,
    data: { lobbyId, bossName },
  };
}

export function createFriendRequestNotification(fromName: string, friendCode: string): NotificationPayload {
  return {
    type: 'friend_request',
    title: 'Friend Request',
    body: `${fromName} wants to add you as a friend`,
    data: { fromName, friendCode },
  };
}

export function createLobbyJoinedNotification(playerName: string, lobbyId: string): NotificationPayload {
  return {
    type: 'lobby_joined',
    title: 'Player Joined',
    body: `${playerName} joined your raid lobby`,
    data: { lobbyId, playerName },
  };
}

export function createAllReadyNotification(bossName: string, lobbyId: string): NotificationPayload {
  return {
    type: 'all_ready',
    title: 'Everyone Ready!',
    body: `All players are ready for the ${bossName} raid!`,
    data: { lobbyId, bossName },
  };
}

export function createEventNotification(title: string, body: string, eventId?: string): NotificationPayload {
  return {
    type: 'event_announcement',
    title,
    body,
    data: eventId ? { eventId } : undefined,
  };
}
