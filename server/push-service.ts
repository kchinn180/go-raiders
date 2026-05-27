import webPush from "web-push";
import { storage } from "./storage";
import type { PushToken, NotificationType } from "@shared/schema";

// ── VAPID Web Push setup ───────────────────────────────────────────────────────
// Keys are read from env vars. If missing in dev, auto-generate (not persistent).
// For production set VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY + VAPID_CONTACT env vars.

let _vapidPublicKey = "";
let _vapidReady = false;

function ensureVapid() {
  if (_vapidReady) return;
  _vapidReady = true;

  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const contact = process.env.VAPID_CONTACT || "mailto:admin@goraiders.app";

  if (pub && priv) {
    _vapidPublicKey = pub;
    webPush.setVapidDetails(contact, pub, priv);
    console.log("[WebPush] VAPID configured from env vars.");
  } else {
    // Auto-generate for local dev. These change every restart — client
    // subscriptions will break, but that's fine for development.
    const keys = webPush.generateVAPIDKeys();
    _vapidPublicKey = keys.publicKey;
    webPush.setVapidDetails(contact, keys.publicKey, keys.privateKey);
    console.log("[WebPush] Auto-generated VAPID keys (dev only).");
    console.log("[WebPush] Set VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY for persistence.");
    console.log("[WebPush] Public key:", keys.publicKey);
  }
}

ensureVapid();

export function getVapidPublicKey(): string {
  ensureVapid();
  return _vapidPublicKey;
}

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
    } catch (e: any) {
      console.log(`Failed to send notification to ${tokenInfo.platform}:`, e);
      failed++;
      // Reap stale subscriptions. web-push throws WebPushError with
      // statusCode 410 (Gone) or 404 (NotFound) once a subscription is
      // permanently unreachable — keeping these tokens means we burn work
      // and inflate the failed counter on every queue cycle.
      const status = e?.statusCode;
      if (status === 410 || status === 404) {
        console.log(`[Push] Removing stale ${tokenInfo.platform} token (status=${status})`);
        await storage.removePushToken(tokenInfo.token).catch(() => {});
      }
    }
  }

  return { success, failed };
}

async function sendAPNS(token: string, payload: NotificationPayload): Promise<void> {
  // APNs HTTP/2 direct sending requires node-apn or http2 with a .p8 key.
  // Configure via env vars: APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID, APNS_PRIVATE_KEY_BASE64
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const bundleId = process.env.APNS_BUNDLE_ID;

  if (!keyId || !teamId || !bundleId) {
    console.log(`[APNS] Not configured (set APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID). Title: ${payload.title}`);
    return;
  }

  // Alternatively, route iOS through FCM if you use Firebase for iOS:
  // set APNS_VIA_FCM=true and rely on sendFCM for all platforms.
  if (process.env.APNS_VIA_FCM) {
    return sendFCM(token, payload);
  }

  console.log(`[APNS] Configured but http2/jwt signing not yet wired. Token: ${token.substring(0, 10)}...`);
}

async function sendFCM(token: string, payload: NotificationPayload): Promise<void> {
  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) {
    console.log(`[FCM] Not configured (set FCM_SERVER_KEY). Title: ${payload.title}`);
    return;
  }

  const body = {
    to: token,
    notification: {
      title: payload.title,
      body: payload.body,
      sound: "default",
      badge: "1",
    },
    data: payload.data || {},
    priority: "high",
  };

  const res = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `key=${serverKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FCM error ${res.status}: ${text}`);
  }

  const data = await res.json() as { success?: number; failure?: number };
  if ((data.failure ?? 0) > 0) {
    throw new Error(`FCM delivery failure: ${JSON.stringify(data)}`);
  }

  console.log(`[FCM] Sent to ${token.substring(0, 10)}...: ${payload.title}`);
}

async function sendWebPush(subscriptionJson: string, payload: NotificationPayload): Promise<void> {
  ensureVapid();

  let subscription: webPush.PushSubscription;
  try {
    subscription = JSON.parse(subscriptionJson) as webPush.PushSubscription;
  } catch {
    throw new Error("Invalid web push subscription JSON");
  }

  await webPush.sendNotification(
    subscription,
    JSON.stringify({
      title: payload.title,
      body: payload.body,
      data: payload.data,
    }),
    {
      TTL: 60 * 60, // 1 hour
      urgency: "normal",
    }
  );

  console.log(`[WebPush] Sent: ${payload.title}`);
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

/**
 * Sent when the user reaches the front of the queue and a lobby slot is reserved for them.
 * Fires even when the user has left the app — this is the primary "come back now" signal.
 */
export function createQueuePromotionNotification(bossName: string, lobbyId: string): NotificationPayload {
  return {
    type: 'queue_promotion',
    title: `🎯 It's your turn — ${bossName}!`,
    body: 'A raid slot just opened for you. Tap to join before it expires!',
    data: { bossName, lobbyId },
  };
}

/**
 * Sent when the user's queue position drops to 2 or less — a heads-up before their slot fires.
 * Helps players who left the app get back in time.
 */
export function createQueueAlmostUpNotification(bossName: string, position: number): NotificationPayload {
  return {
    type: 'queue_almost_up',
    title: `⏳ Almost your turn — ${bossName}`,
    body: `You're #${position} in line. Get ready to join the raid soon!`,
    data: { bossName, position: String(position) },
  };
}
