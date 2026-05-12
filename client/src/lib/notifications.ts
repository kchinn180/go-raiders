import { Capacitor } from '@capacitor/core';
import { apiRequest, getApiUrl } from './queryClient';

type NotificationType = 'raid_invite' | 'raid_starting' | 'friend_request' | 'lobby_joined' | 'all_ready' | 'event_announcement';

interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}

let PushNotifications: any = null;
let pushInitialized = false;
let currentToken: string | null = null;
let listenersRegistered = false;
let currentUserId: string | null = null;

async function loadPushNotifications() {
  if (pushInitialized) return;
  pushInitialized = true;
  
  if (Capacitor.isNativePlatform()) {
    try {
      const module = await import('@capacitor/push-notifications');
      PushNotifications = module.PushNotifications;
    } catch (e) {
      console.log('Push notifications not available on this platform');
    }
  }
}

loadPushNotifications();

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }
  
  try {
    if (!PushNotifications) {
      await loadPushNotifications();
    }
    
    if (PushNotifications) {
      const result = await PushNotifications.requestPermissions();
      return result.receive === 'granted';
    }
    return false;
  } catch (e) {
    console.log('Failed to request notification permission', e);
    return false;
  }
}

let registrationListenerHandle: any = null;
let registrationErrorListenerHandle: any = null;

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (currentUserId === userId && currentToken) {
    return currentToken;
  }
  
  currentUserId = userId;
  
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications only available on native platforms');
    return null;
  }
  
  try {
    if (!PushNotifications) {
      await loadPushNotifications();
    }
    
    if (!PushNotifications) return null;
    
    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }
    
    if (registrationListenerHandle) {
      registrationListenerHandle.remove();
      registrationListenerHandle = null;
    }
    if (registrationErrorListenerHandle) {
      registrationErrorListenerHandle.remove();
      registrationErrorListenerHandle = null;
    }
    
    await PushNotifications.register();
    
    return new Promise((resolve) => {
      const handleRegistration = async (token: { value: string }) => {
        if (registrationListenerHandle) {
          registrationListenerHandle.remove();
          registrationListenerHandle = null;
        }
        if (registrationErrorListenerHandle) {
          registrationErrorListenerHandle.remove();
          registrationErrorListenerHandle = null;
        }
        
        if (currentToken === token.value) {
          resolve(token.value);
          return;
        }
        
        currentToken = token.value;
        const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';
        
        try {
          await apiRequest('POST', '/api/push/register', {
            userId,
            token: token.value,
            platform,
          });
          console.log('Push token registered:', token.value.substring(0, 20) + '...');
        } catch (e) {
          console.log('Failed to register push token with server', e);
        }
        
        resolve(token.value);
      };
      
      const handleError = (error: any) => {
        if (registrationListenerHandle) {
          registrationListenerHandle.remove();
          registrationListenerHandle = null;
        }
        if (registrationErrorListenerHandle) {
          registrationErrorListenerHandle.remove();
          registrationErrorListenerHandle = null;
        }
        console.log('Push registration error:', error);
        resolve(null);
      };
      
      registrationListenerHandle = PushNotifications.addListener('registration', handleRegistration);
      registrationErrorListenerHandle = PushNotifications.addListener('registrationError', handleError);
    });
  } catch (e) {
    console.log('Failed to register for push notifications', e);
    return null;
  }
}

export async function unregisterPushNotifications(): Promise<void> {
  if (!currentToken) return;
  
  try {
    await apiRequest('DELETE', '/api/push/unregister', { token: currentToken });
  } catch (e) {
    console.log('Failed to unregister push token', e);
  } finally {
    currentToken = null;
    currentUserId = null;
    
    if (registrationListenerHandle) {
      registrationListenerHandle.remove();
      registrationListenerHandle = null;
    }
    if (registrationErrorListenerHandle) {
      registrationErrorListenerHandle.remove();
      registrationErrorListenerHandle = null;
    }
  }
}

let cleanupListeners: (() => void) | null = null;

export function setupNotificationListeners(
  onNotification: (notification: NotificationPayload) => void
): () => void {
  if (listenersRegistered) {
    return cleanupListeners || (() => {});
  }
  
  if (!Capacitor.isNativePlatform() || !PushNotifications) {
    return () => {};
  }
  
  listenersRegistered = true;
  
  const receivedListener = PushNotifications.addListener(
    'pushNotificationReceived',
    (notification: any) => {
      const payload: NotificationPayload = {
        type: notification.data?.type || 'event_announcement',
        title: notification.title || 'GO Raiders',
        body: notification.body || '',
        data: notification.data,
      };
      onNotification(payload);
    }
  );
  
  const actionListener = PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (action: any) => {
      const notification = action.notification;
      const payload: NotificationPayload = {
        type: notification.data?.type || 'event_announcement',
        title: notification.title || 'GO Raiders',
        body: notification.body || '',
        data: notification.data,
      };
      onNotification(payload);
    }
  );
  
  cleanupListeners = () => {
    receivedListener.remove();
    actionListener.remove();
    listenersRegistered = false;
    cleanupListeners = null;
  };
  
  return cleanupListeners;
}

export function showLocalNotification(title: string, body: string, data?: Record<string, string>): void {
  if (!Capacitor.isNativePlatform() && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: data?.type || 'go-raiders',
      data,
    });
  }
}

export function getCurrentToken(): string | null {
  return currentToken;
}

// ── Web Push (browser Service Worker) ────────────────────────────────────────
// Registers a service worker and subscribes to Web Push so notifications appear
// even when the browser tab is closed.

let swRegistration: ServiceWorkerRegistration | null = null;

async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (swRegistration) return swRegistration;
  if (!('serviceWorker' in navigator)) return null;

  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return swRegistration;
  } catch (e) {
    console.log('[WebPush] Service worker registration failed:', e);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from(Array.from(rawData).map(c => c.charCodeAt(0)));
}

export async function registerWebPush(userId: string): Promise<void> {
  if (Capacitor.isNativePlatform()) return; // native uses APNs/FCM instead
  if (!('PushManager' in window)) {
    console.log('[WebPush] PushManager not supported in this browser');
    return;
  }

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();

  if (permission !== 'granted') {
    console.log('[WebPush] Notification permission not granted');
    return;
  }

  const sw = await getSwRegistration();
  if (!sw) return;

  try {
    // Get VAPID public key from server
    const keyRes = await fetch(getApiUrl('/api/push/vapid-key'));
    if (!keyRes.ok) return;
    const { publicKey } = await keyRes.json() as { publicKey: string };

    // Check for existing subscription or create new one
    let subscription = await sw.pushManager.getSubscription();
    if (!subscription) {
      subscription = await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    // Register subscription with server (store as "token" for platform=web)
    await apiRequest('POST', '/api/push/register', {
      userId,
      token: JSON.stringify(subscription),
      platform: 'web',
    });

    console.log('[WebPush] Subscribed and registered with server');
  } catch (e) {
    console.log('[WebPush] Failed to subscribe:', e);
  }
}
