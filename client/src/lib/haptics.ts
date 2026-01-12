import { Capacitor } from '@capacitor/core';

type ImpactStyle = 'light' | 'medium' | 'heavy';
type NotificationType = 'success' | 'warning' | 'error';

let Haptics: any = null;
let hapticsLoaded = false;
let vibrateSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

async function loadHaptics() {
  if (hapticsLoaded) return;
  hapticsLoaded = true;
  
  if (Capacitor.isNativePlatform() && !Haptics) {
    try {
      const module = await import('@capacitor/haptics');
      Haptics = module.Haptics;
    } catch (e) {
      // Haptics not available on this platform
    }
  }
}

loadHaptics();

export async function triggerImpact(style: ImpactStyle = 'medium') {
  if (!Capacitor.isNativePlatform()) {
    if (vibrateSupported) {
      try {
        const duration = style === 'light' ? 10 : style === 'medium' ? 20 : 30;
        navigator.vibrate(duration);
      } catch {
        // Vibrate not supported in this context
      }
    }
    return;
  }
  
  try {
    if (Haptics) {
      const styleMap = {
        light: 'Light',
        medium: 'Medium',
        heavy: 'Heavy'
      };
      await Haptics.impact({ style: styleMap[style] });
    }
  } catch (e) {
    console.log('Haptic impact failed');
  }
}

export async function triggerNotification(type: NotificationType = 'success') {
  if (!Capacitor.isNativePlatform()) {
    if (vibrateSupported) {
      try {
        const patterns: Record<NotificationType, number[]> = {
          success: [10, 50, 10],
          warning: [20, 30, 20],
          error: [30, 50, 30, 50, 30]
        };
        navigator.vibrate(patterns[type]);
      } catch {
        // Vibrate not supported in this context
      }
    }
    return;
  }
  
  try {
    if (Haptics) {
      const typeMap = {
        success: 'Success',
        warning: 'Warning',
        error: 'Error'
      };
      await Haptics.notification({ type: typeMap[type] });
    }
  } catch (e) {
    console.log('Haptic notification failed');
  }
}

export async function triggerSelection() {
  if (!Capacitor.isNativePlatform()) {
    if (vibrateSupported) {
      try {
        navigator.vibrate(5);
      } catch {
        // Vibrate not supported in this context
      }
    }
    return;
  }
  
  try {
    if (Haptics) {
      await Haptics.selectionStart();
      await Haptics.selectionEnd();
    }
  } catch (e) {
    console.log('Haptic selection failed');
  }
}
