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
  message?: string;
  error?: string;
}

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
    const response = await fetch('/api/subscription/products');
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

    if (isNative) {
      // Production: Use Capacitor in-app purchase plugin
      // This would integrate with @revenuecat/purchases or @ionic/in-app-purchase
      // For now, return instructions for implementing native purchases
      
      console.log('[SUBSCRIPTION] Native purchase flow would start here');
      
      // Simulate receipt for development
      // In production, this comes from the native purchase SDK
      receipt = `native_receipt_${Date.now()}_${productId}`;
      
    } else {
      // Development web mode - simulate the purchase
      console.log('[SUBSCRIPTION] Web development mode - simulating purchase');
      
      // Simulate user confirming purchase
      const confirmed = window.confirm(
        `Purchase ${product.name} for $${product.price}/${product.period}?\n\n` +
        `Features:\n${product.features.join('\n')}\n\n` +
        `(This is a development simulation. In the real app, the App Store/Play Store purchase dialog would appear.)`
      );
      
      if (!confirmed) {
        return {
          success: false,
          isPremium: false,
          error: 'Purchase cancelled by user'
        };
      }
      
      // Generate simulated receipt
      receipt = `dev_receipt_${Date.now()}_${productId}`;
    }

    // Send receipt to backend for verification
    // CRITICAL: This is where premium access is actually granted
    const verifyResponse = await fetch('/api/subscription/verify', {
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
    let receipt: string;

    if (isNative) {
      // Production: Get receipt from native store
      receipt = `restore_receipt_${Date.now()}`;
    } else {
      // Development: Simulate restore
      receipt = `dev_restore_${Date.now()}`;
    }

    const response = await fetch('/api/subscription/restore', {
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

/**
 * Get current subscription status from server
 */
export async function getSubscriptionStatus(userId: string): Promise<{
  isPremium: boolean;
  subscription: any;
  expiresAt: number | null;
}> {
  try {
    const response = await fetch(`/api/subscription/status/${userId}`);
    if (!response.ok) throw new Error('Failed to get status');
    return response.json();
  } catch (error) {
    console.error('[SUBSCRIPTION] Status check error:', error);
    return {
      isPremium: false,
      subscription: null,
      expiresAt: null
    };
  }
}
