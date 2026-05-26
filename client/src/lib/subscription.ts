/**
 * Subscription Service - Client-side In-App Purchase Integration
 * 
 * SECURITY NOTE: 
 * - This service initiates purchases through Capacitor
 * - The receipt is sent to the backend for verification
 * - Premium status is ONLY granted by the backend after verification
 * - The frontend NEVER sets isPremium directly
 */

import { Capacitor } from '@capacitor/core';
import { getApiUrl } from './queryClient';

export interface SubscriptionProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  period: string;
  appleProductId: string;
  googleProductId: string;
  features: string[];
}

export interface PurchaseResult {
  success: boolean;
  isPremium: boolean;
  hasRemovedAds?: boolean;
  message?: string;
  error?: string;
}

// Product IDs for one-time purchases
export const REMOVE_ADS_PRODUCT: SubscriptionProduct = {
  id: 'remove_ads',
  name: 'Remove Ads',
  description: 'Permanently remove all ads — one-time purchase',
  price: 4.99,
  period: 'one_time',
  appleProductId: 'com.kyree.goraidcoordinator.removeads',
  googleProductId: 'remove_ads',
  features: [
    'Remove all banner ads',
    'Remove interstitial ads',
    'Permanent — no subscription needed',
  ],
};

/**
 * Get the platform-specific product ID
 */
function getProductId(product: SubscriptionProduct): string {
  if (Capacitor.getPlatform() === 'ios') {
    return product.appleProductId;
  } else if (Capacitor.getPlatform() === 'android') {
    return product.googleProductId;
  }
  // Web fallback for development
  return product.appleProductId;
}

/**
 * Get the store type for the current platform
 */
function getStoreType(): 'apple' | 'google' {
  if (Capacitor.getPlatform() === 'android') {
    return 'google';
  }
  return 'apple';
}

/**
 * Fetch available subscription products from the server
 */
export async function fetchProducts(): Promise<SubscriptionProduct[]> {
  try {
    const response = await fetch(getApiUrl('/api/subscription/products'));
    if (!response.ok) throw new Error('Failed to fetch products');
    const data = await response.json();
    return data.products;
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return [];
  }
}

/**
 * Initiate a purchase and verify with backend
 * 
 * In production with Capacitor:
 * 1. Opens App Store / Play Store purchase dialog
 * 2. User completes purchase
 * 3. Receipt is sent to backend for verification
 * 4. Backend grants premium access
 * 
 * In development (web):
 * Uses a simulated purchase flow
 */
export async function purchaseSubscription(
  userId: string,
  product: SubscriptionProduct
): Promise<PurchaseResult> {
  const productId = getProductId(product);
  const storeType = getStoreType();
  const isNative = Capacitor.isNativePlatform();

  console.log(`[SUBSCRIPTION] Starting purchase - Product: ${productId}, Store: ${storeType}, Native: ${isNative}`);

  try {
    let receipt: string;

    if (isNative && Capacitor.getPlatform() === 'ios') {
      // Production iOS: Use native StoreKit 2 plugin (IAPPlugin.swift)
      console.log('[SUBSCRIPTION] Initiating native StoreKit 2 purchase');

      const { IAP } = (Capacitor as any).Plugins;
      if (!IAP) {
        console.error('[SUBSCRIPTION] IAP plugin not available');
        return { success: false, isPremium: false, error: 'Purchase not available on this device.' };
      }

      const nativeResult = await IAP.purchaseProduct({ productId });

      if (!nativeResult.success) {
        if (nativeResult.cancelled) {
          return { success: false, isPremium: false, error: 'Purchase cancelled by user' };
        }
        if (nativeResult.pending) {
          return { success: false, isPremium: false, error: 'Purchase is pending approval.' };
        }
        return { success: false, isPremium: false, error: 'Purchase did not complete.' };
      }

      // JWS token from StoreKit 2 - verified server-side with Apple's public keys
      receipt = nativeResult.jwsRepresentation;

    } else if (isNative && Capacitor.getPlatform() === 'android') {
      // Android purchase - placeholder for Google Play Billing
      console.log('[SUBSCRIPTION] Android purchase not yet implemented');
      return { success: false, isPremium: false, error: 'Android purchases coming soon.' };

    } else {
      // Development web mode - simulate the purchase
      console.log('[SUBSCRIPTION] Web development mode - simulating purchase');

      const confirmed = window.confirm(
        `Purchase ${product.name} for $${product.price}/${product.period}?\n\n` +
        `Features:\n${product.features.join('\n')}\n\n` +
        `(Development simulation — real App Store dialog appears in the app.)`
      );

      if (!confirmed) {
        return { success: false, isPremium: false, error: 'Purchase cancelled by user' };
      }

      receipt = `dev_receipt_${Date.now()}_${productId}`;
    }

    // Send receipt / JWS token to backend for verification
    // CRITICAL: This is where premium access is actually granted
    const verifyResponse = await fetch(getApiUrl('/api/subscription/verify'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        storeType,
        receipt,
        productId,
      }),
    });

    const result = await verifyResponse.json();

    if (!verifyResponse.ok) {
      console.error('[SUBSCRIPTION] Verification failed:', result.error);
      return {
        success: false,
        isPremium: false,
        error: result.error || 'Verification failed'
      };
    }

    console.log('[SUBSCRIPTION] Purchase verified successfully');
    return {
      success: true,
      isPremium: result.isPremium,
      hasRemovedAds: result.hasRemovedAds,
      message: result.message
    };

  } catch (error) {
    console.error('[SUBSCRIPTION] Purchase error:', error);
    return {
      success: false,
      isPremium: false,
      error: 'Purchase failed. Please try again.'
    };
  }
}

/**
 * Restore previous purchases
 * Called when user reinstalls app or switches devices
 */
export async function restorePurchases(userId: string): Promise<PurchaseResult> {
  const storeType = getStoreType();
  const isNative = Capacitor.isNativePlatform();

  console.log(`[SUBSCRIPTION] Restoring purchases - Store: ${storeType}`);

  try {
    // On native iOS, restore via StoreKit 2 current entitlements
    if (isNative && Capacitor.getPlatform() === 'ios') {
      const { IAP } = (Capacitor as any).Plugins;
      if (IAP) {
        const nativeResult = await IAP.restorePurchases();
        if (nativeResult.success && nativeResult.transactions?.length > 0) {
          // Send the most recent JWS token to verify
          const latest = nativeResult.transactions[nativeResult.transactions.length - 1];
          const response = await fetch(getApiUrl('/api/subscription/restore'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, storeType, receipt: latest.jwsRepresentation }),
          });
          const result = await response.json();
          return {
            success: result.success,
            isPremium: result.isPremium,
            message: result.isPremium ? 'Purchases restored!' : 'No purchases to restore'
          };
        }
        return { success: true, isPremium: false, message: 'No purchases to restore' };
      }
    }

    // Web / Android fallback
    const receipt = `dev_restore_${Date.now()}`;

    const response = await fetch(getApiUrl('/api/subscription/restore'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        storeType,
        receipt,
      }),
    });

    const result = await response.json();

    return {
      success: result.success,
      isPremium: result.isPremium,
      message: result.isPremium ? 'Purchases restored!' : 'No purchases to restore'
    };

  } catch (error) {
    console.error('[SUBSCRIPTION] Restore error:', error);
    return {
      success: false,
      isPremium: false,
      error: 'Failed to restore purchases'
    };
  }
}

// ─── Native Price Loading ──────────────────────────────────────────────────────

export interface NativeProductPrice {
  productId: string;
  /** Locale-formatted price string, e.g. "$12.99" */
  price: string;
  /** Raw numeric price in the user's currency */
  priceAmount: number;
}

/**
 * Fetch real product prices from the native StoreKit 2 / Play Billing API.
 *
 * On native iOS, calls `IAP.getProducts({ productIds })` which returns
 * prices exactly as App Store Connect has them, including the user's local
 * currency. On web / Android, returns an empty map so callers fall back to
 * their hardcoded display prices.
 *
 * @param productIds  Apple product IDs (e.g. ["com.kyree.goraidcoordinator.elite.monthly"])
 * @returns Map of productId → NativeProductPrice (only includes successful lookups)
 */
export async function loadNativeProductPrices(
  productIds: string[]
): Promise<Map<string, NativeProductPrice>> {
  const result = new Map<string, NativeProductPrice>();

  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
    // Non-native: return empty map; caller uses hardcoded fallback prices
    return result;
  }

  try {
    const { IAP } = (Capacitor as any).Plugins;
    if (!IAP) {
      console.warn('[SUBSCRIPTION] IAP plugin unavailable — cannot load native prices');
      return result;
    }

    console.log(`[SUBSCRIPTION] Loading native prices for: ${productIds.join(', ')}`);
    const response = await IAP.getProducts({ productIds });
    const products: any[] = response?.products ?? response ?? [];

    if (!Array.isArray(products)) {
      console.warn('[SUBSCRIPTION] Unexpected getProducts response shape:', response);
      return result;
    }

    for (const p of products) {
      const id: string = p.productId || p.id || '';
      if (!id) continue;
      result.set(id, {
        productId: id,
        // Prefer localizedPrice (StoreKit-formatted), fall back to raw price string
        price: p.localizedPrice || p.displayPrice || (p.price != null ? `$${Number(p.price).toFixed(2)}` : ''),
        priceAmount: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
      });
    }

    console.log(`[SUBSCRIPTION] Loaded ${result.size} native price(s)`);
  } catch (e) {
    console.error('[SUBSCRIPTION] getProducts error:', e);
  }

  return result;
}

/**
 * Get current subscription status from server
 */
export async function getSubscriptionStatus(userId: string): Promise<{
  isPremium: boolean;
  hasRemovedAds: boolean;
  subscription: any;
  expiresAt: number | null;
}> {
  try {
    const response = await fetch(getApiUrl(`/api/subscription/status/${userId}`));
    if (!response.ok) throw new Error('Failed to get status');
    return response.json();
  } catch (error) {
    console.error('[SUBSCRIPTION] Status check error:', error);
    return {
      isPremium: false,
      hasRemovedAds: false,
      subscription: null,
      expiresAt: null
    };
  }
}
