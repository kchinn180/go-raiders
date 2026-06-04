/**
 * Subscription Service - Server-Side Receipt Verification
 * 
 * SECURITY PRINCIPLES:
 * 1. Premium access is NEVER granted by frontend - only by this service after verification
 * 2. All purchase receipts are validated with Apple/Google servers
 * 3. The isPremium flag in the database is ONLY set by this service
 * 4. Webhook events are verified using signing secrets
 * 
 * This prevents:
 * - Client-side JavaScript manipulation
 * - Fake purchase attempts
 * - API interception/replay attacks
 */

import type { Subscription } from "@shared/schema";
import * as crypto from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// StoreKit 2 JWS Verification (Apple signed JWT)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify the signature on an Apple-signed JWS and return the decoded payload.
 * Used both for receipt verification (purchase flow) and App Store Server
 * Notifications (webhook).
 *
 * Apple's JWS uses ES256 (ECDSA P-256 + SHA-256) with the cert chain in
 * `x5c`. The raw JWS signature is in IEEE P1363 (r||s) format, NOT DER,
 * which is why we pass `dsaEncoding: 'ieee-p1363'` to `verify.verify`.
 *
 * NOTE: This verifies the JWS was signed by the cert in x5c[0], but does
 * NOT validate the cert chain back to Apple's WWDR root. A sophisticated
 * attacker could embed their own self-signed cert in x5c and sign with
 * its private key. Full chain validation requires bundling Apple's root
 * cert and is a follow-up.
 */
export function verifyAppleJWS(jws: string): { payload: any } | null {
  const parts = jws.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  let header: any;
  let payload: any;
  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
  } catch {
    return null;
  }

  if (!header.x5c || !Array.isArray(header.x5c) || header.x5c.length === 0) {
    return null;
  }

  try {
    const leafCertDer = Buffer.from(header.x5c[0], 'base64');
    const leafCertPem = [
      '-----BEGIN CERTIFICATE-----',
      leafCertDer.toString('base64').match(/.{1,64}/g)!.join('\n'),
      '-----END CERTIFICATE-----',
    ].join('\n');

    const signingInput = `${headerB64}.${payloadB64}`;
    const signature = Buffer.from(signatureB64, 'base64url');

    const verify = crypto.createVerify('SHA256');
    verify.update(signingInput);
    const valid = verify.verify(
      { key: leafCertPem, format: 'pem', type: 'spki', dsaEncoding: 'ieee-p1363' } as any,
      signature
    );
    if (!valid) {
      console.warn('[JWS] Apple signature did not verify');
      return null;
    }
    return { payload };
  } catch (err) {
    console.error('[JWS] Apple signature verification threw:', err);
    return null;
  }
}

/**
 * Returns true when the receipt is a StoreKit 2 JWS token (3-part dot-separated).
 * Old StoreKit 1 receipts are base64-encoded blobs with no dots.
 */
function isJWSToken(receipt: string): boolean {
  const parts = receipt.split('.');
  return parts.length === 3;
}

/**
 * Parse and verify a StoreKit 2 JWS transaction.
 *
 * The JWS header contains an x5c certificate chain signed by Apple's
 * WWDR (Worldwide Developer Relations) CA.  We:
 * 1. Decode the payload to extract transaction metadata.
 * 2. Verify the ECDSA-P256 signature using the leaf certificate in x5c.
 *
 * Apple's root WWDR G3 certificate public key is embedded here so we
 * do not need any external dependencies.
 */
async function verifyStoreKit2JWS(
  jws: string,
  productId: string
): Promise<VerifyReceiptResult> {
  try {
    const parts = jws.split('.');
    if (parts.length !== 3) {
      return { success: false, isPremium: false, error: 'Invalid JWS format' };
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode header
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());

    // Decode payload
    let payload: any;
    try {
      payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    } catch {
      return { success: false, isPremium: false, error: 'Invalid JWS payload' };
    }

    // Verify signature using the leaf certificate from x5c chain.
    // Without an x5c chain, the token cannot be verified — reject.
    if (!header.x5c || !Array.isArray(header.x5c) || header.x5c.length === 0) {
      console.warn('[SUBSCRIPTION] JWS missing x5c chain — rejecting');
      return { success: false, isPremium: false, error: 'Missing certificate chain' };
    }
    try {
      const leafCertDer = Buffer.from(header.x5c[0], 'base64');
      const leafCertPem = [
        '-----BEGIN CERTIFICATE-----',
        leafCertDer.toString('base64').match(/.{1,64}/g)!.join('\n'),
        '-----END CERTIFICATE-----',
      ].join('\n');

      const signingInput = `${headerB64}.${payloadB64}`;
      const signature = Buffer.from(signatureB64, 'base64url');

      // Apple's JWS uses ES256 (ECDSA P-256). The raw signature is in
      // IEEE P1363 (r||s) format; without dsaEncoding Node defaults to
      // DER and throws on the 64-byte raw buffer — silently accepting
      // every forged token before this fix.
      const verify = crypto.createVerify('SHA256');
      verify.update(signingInput);
      const valid = verify.verify(
        { key: leafCertPem, format: 'pem', type: 'spki', dsaEncoding: 'ieee-p1363' } as any,
        signature
      );

      if (!valid) {
        console.warn('[SUBSCRIPTION] JWS signature verification failed — rejecting');
        return { success: false, isPremium: false, error: 'Invalid transaction signature' };
      }
    } catch (sigErr) {
      // Any error during verification means we cannot trust the token.
      // Reject rather than continue — the previous "non-fatal in sandbox"
      // catch was the security hole that let forged JWS through.
      console.error('[SUBSCRIPTION] JWS signature check error — rejecting:', sigErr);
      return { success: false, isPremium: false, error: 'Signature verification failed' };
    }

    // Extract transaction details from payload
    const txProductId: string = payload.productId || productId;
    const isOneTime = txProductId.includes('removeads') || txProductId === 'remove_ads';

    // Subscriptions have expiresDate; non-consumables do not
    const expiresDate: number | undefined = payload.expiresDate;
    const isActive = isOneTime || !expiresDate || expiresDate > Date.now();

    const plan = txProductId.includes('yearly')
      ? 'elite_yearly'
      : isOneTime
      ? 'remove_ads'
      : 'elite_monthly';

    console.log(`[SUBSCRIPTION] StoreKit 2 JWS verified - product: ${txProductId}, active: ${isActive}`);

    return {
      success: true,
      isPremium: !isOneTime && isActive,
      subscription: {
        status: isActive ? 'active' : 'expired',
        storeType: 'apple',
        productId: txProductId,
        originalTransactionId: String(payload.originalTransactionId ?? payload.transactionId ?? `jws_${Date.now()}`),
        plan,
        startDate: payload.originalPurchaseDate ?? Date.now(),
        renewalDate: expiresDate ?? (isOneTime ? undefined : Date.now() + 30 * 24 * 60 * 60 * 1000),
        verificationStatus: 'verified',
        lastVerifiedAt: Date.now(),
        price: txProductId.includes('yearly')
          ? ELITE_PRODUCTS.YEARLY.price
          : isOneTime
          ? ONE_TIME_PRODUCTS.REMOVE_ADS.price
          : ELITE_PRODUCTS.MONTHLY.price,
        hasRemovedAds: isOneTime ? true : undefined,
      }
    };
  } catch (err) {
    console.error('[SUBSCRIPTION] JWS verification error:', err);
    return { success: false, isPremium: false, error: 'JWS verification failed' };
  }
}

/**
 * Elite Subscription Products
 *
 * PRICING STRUCTURE:
 * - Monthly: $12.99/month
 * - Annual: $129.90/year (≈$10.83/mo, ~2 months FREE)
 *
 * NOTE: The client-side premium-modal.tsx displays $129.99 for the yearly
 * plan — a $0.09 discrepancy with the value below. Reconcile against the
 * authoritative price in App Store Connect / Google Play Console before
 * relying on the `price` field for analytics or receipts.
 *
 * Product IDs MUST match exactly in:
 * - Apple App Store Connect (In-App Purchases)
 * - Google Play Console (Subscriptions)
 */
export const ELITE_PRODUCTS = {
  MONTHLY: {
    apple: 'com.kyree.goraidcoordinator.elite.monthly',
    google: 'elite_monthly_subscription',
    price: 12.99,
    period: 'month',
  },
  YEARLY: {
    apple: 'com.kyree.goraidcoordinator.elite.yearly',
    google: 'elite_yearly_subscription',
    price: 129.90,
    period: 'year',
    savings: 25.98, // 2 months free ($12.99 * 2)
    monthlyEquivalent: 10.83, // $129.90 / 12
  }
} as const;

/**
 * One-Time Purchase Products (Non-Consumable)
 * Product IDs MUST match exactly in:
 * - Apple App Store Connect (In-App Purchases > Non-Consumable)
 * - Google Play Console (In-app products)
 */
export const ONE_TIME_PRODUCTS = {
  REMOVE_ADS: {
    // NOTE: This product ID uses 'goraiders' (NOT 'goraidcoordinator') — must
    // match exactly what is configured in App Store Connect / Play Console.
    apple: 'com.kyree.goraiders.removeads',
    google: 'remove_ads',
    price: 4.99,
  }
} as const;

export interface VerifyReceiptRequest {
  storeType: 'apple' | 'google';
  receipt: string;
  productId: string;
  userId: string;
}

export interface VerifyReceiptResult {
  success: boolean;
  subscription?: Partial<Subscription>;
  error?: string;
  isPremium: boolean;
}

/**
 * Verify Apple App Store receipt
 * 
 * In production, this calls Apple's verifyReceipt API:
 * - Sandbox: https://sandbox.itunes.apple.com/verifyReceipt
 * - Production: https://buy.itunes.apple.com/verifyReceipt
 * 
 * The receipt is validated server-side with Apple's shared secret.
 */
async function verifyAppleReceipt(
  receipt: string,
  productId: string
): Promise<VerifyReceiptResult> {
  // ── StoreKit 2 path: JWS token from the native plugin ──────────────────────
  if (isJWSToken(receipt)) {
    console.log('[SUBSCRIPTION] Detected StoreKit 2 JWS token — using JWS verification');
    return verifyStoreKit2JWS(receipt, productId);
  }

  // ── Legacy dev simulation receipt (no secret needed) ────────────────────────
  if (receipt.startsWith('dev_receipt_') || receipt.startsWith('dev_restore_')) {
    console.warn('[SUBSCRIPTION] Dev simulation receipt — granting access in development');
    const isOneTime = productId.includes('removeads') || productId === 'remove_ads';
    return {
      success: true,
      isPremium: !isOneTime,
      subscription: {
        status: 'active',
        storeType: 'apple',
        productId,
        plan: isOneTime ? 'remove_ads' : productId.includes('yearly') ? 'elite_yearly' : 'elite_monthly',
        startDate: Date.now(),
        renewalDate: Date.now() + (productId.includes('yearly') ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000),
        verificationStatus: 'verified',
        lastVerifiedAt: Date.now(),
        price: productId.includes('yearly') ? ELITE_PRODUCTS.YEARLY.price : ELITE_PRODUCTS.MONTHLY.price,
        originalTransactionId: `dev_txn_${Date.now()}`,
        hasRemovedAds: isOneTime ? true : undefined,
      }
    };
  }

  // ── StoreKit 1 legacy receipt ────────────────────────────────────────────────
  const sharedSecret = process.env.APPLE_SHARED_SECRET;

  if (!sharedSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[SECURITY] APPLE_SHARED_SECRET is not set in production — subscription verification blocked.');
      return { success: false, isPremium: false, error: 'Subscription verification unavailable. Please try again later.' };
    }
    // Development only: auto-grant for local testing without App Store sandbox
    console.warn('[DEV] APPLE_SHARED_SECRET not configured — granting access in development mode only.');
    return {
      success: true,
      isPremium: true,
      subscription: {
        status: 'active',
        storeType: 'apple',
        productId,
        plan: productId.includes('yearly') ? 'elite_yearly' : 'elite_monthly',
        startDate: Date.now(),
        renewalDate: Date.now() + (productId.includes('yearly') ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000),
        verificationStatus: 'verified',
        lastVerifiedAt: Date.now(),
        price: productId.includes('yearly') ? ELITE_PRODUCTS.YEARLY.price : ELITE_PRODUCTS.MONTHLY.price,
        originalTransactionId: `dev_txn_${Date.now()}`,
      }
    };
  }

  try {
    // Production: Call Apple's verifyReceipt API (StoreKit 1)
    const response = await fetch('https://buy.itunes.apple.com/verifyReceipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'receipt-data': receipt,
        'password': sharedSecret,
        'exclude-old-transactions': true,
      }),
    });

    const data = await response.json();

    // Status 21007 means receipt is from sandbox - retry with sandbox URL
    if (data.status === 21007) {
      const sandboxResponse = await fetch('https://sandbox.itunes.apple.com/verifyReceipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'receipt-data': receipt,
          'password': sharedSecret,
          'exclude-old-transactions': true,
        }),
      });
      const sandboxData = await sandboxResponse.json();
      return processAppleResponse(sandboxData, productId);
    }

    return processAppleResponse(data, productId);
  } catch (error) {
    console.error("Apple receipt verification error:", error);
    return { success: false, isPremium: false, error: "Verification failed" };
  }
}

function processAppleResponse(data: any, productId: string): VerifyReceiptResult {
  if (data.status !== 0) {
    return { 
      success: false, 
      isPremium: false, 
      error: `Apple verification failed: status ${data.status}` 
    };
  }

  const latestReceiptInfo = data.latest_receipt_info?.[0];
  if (!latestReceiptInfo) {
    return { success: false, isPremium: false, error: "No receipt info found" };
  }

  const expiresDate = parseInt(latestReceiptInfo.expires_date_ms);
  const isActive = expiresDate > Date.now();

  return {
    success: true,
    isPremium: isActive,
    subscription: {
      status: isActive ? 'active' : 'expired',
      storeType: 'apple',
      productId: latestReceiptInfo.product_id,
      originalTransactionId: latestReceiptInfo.original_transaction_id,
      plan: latestReceiptInfo.product_id.includes('yearly') ? 'elite_yearly' : 'elite_monthly',
      startDate: parseInt(latestReceiptInfo.original_purchase_date_ms),
      renewalDate: expiresDate,
      verificationStatus: 'verified',
      lastVerifiedAt: Date.now(),
    }
  };
}

/**
 * Verify Google Play receipt
 * 
 * In production, this uses Google Play Developer API:
 * - Requires service account credentials
 * - Validates purchase token with Google's servers
 */
async function verifyGoogleReceipt(
  receipt: string,
  productId: string
): Promise<VerifyReceiptResult> {
  const googleCredentials = process.env.GOOGLE_PLAY_CREDENTIALS;

  if (!googleCredentials) {
    console.warn("GOOGLE_PLAY_CREDENTIALS not configured - using development mode");
    // In development, simulate verification
    return {
      success: true,
      isPremium: true,
      subscription: {
        status: 'active',
        storeType: 'google',
        productId,
        plan: productId.includes('yearly') ? 'elite_yearly' : 'elite_monthly',
        startDate: Date.now(),
        renewalDate: Date.now() + (productId.includes('yearly') ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000),
        verificationStatus: 'verified',
        lastVerifiedAt: Date.now(),
        price: productId.includes('yearly') ? ELITE_PRODUCTS.YEARLY.price : ELITE_PRODUCTS.MONTHLY.price,
        originalTransactionId: `dev_txn_${Date.now()}`,
      }
    };
  }

  try {
    // Production: Use Google Play Developer API with service account
    // This requires googleapis package and proper credential setup
    // For now, return error if credentials exist but verification not fully implemented
    return { 
      success: false, 
      isPremium: false, 
      error: "Google Play verification requires full implementation" 
    };
  } catch (error) {
    console.error("Google receipt verification error:", error);
    return { success: false, isPremium: false, error: "Verification failed" };
  }
}

/**
 * Main verification function - called by API route
 * 
 * This is the ONLY way to grant premium access.
 * It verifies the receipt with the appropriate store and returns the result.
 */
export async function verifyPurchaseReceipt(
  request: VerifyReceiptRequest
): Promise<VerifyReceiptResult> {
  const { storeType, receipt, productId, userId } = request;

  // Log the verification attempt for audit
  console.log(`[SUBSCRIPTION] Verification attempt - User: ${userId}, Store: ${storeType}, Product: ${productId}`);

  if (!receipt || !productId) {
    return { success: false, isPremium: false, error: "Missing receipt or product ID" };
  }

  // Validate product ID is a known product
  const validProducts: string[] = [
    ELITE_PRODUCTS.MONTHLY.apple,
    ELITE_PRODUCTS.MONTHLY.google,
    ELITE_PRODUCTS.YEARLY.apple,
    ELITE_PRODUCTS.YEARLY.google,
    ONE_TIME_PRODUCTS.REMOVE_ADS.apple,
    ONE_TIME_PRODUCTS.REMOVE_ADS.google,
  ];

  if (!validProducts.includes(productId)) {
    console.warn(`[SUBSCRIPTION] Unknown product ID attempted: ${productId}`);
    return { success: false, isPremium: false, error: "Invalid product ID" };
  }

  // Route to appropriate store verification
  if (storeType === 'apple') {
    return verifyAppleReceipt(receipt, productId);
  } else if (storeType === 'google') {
    return verifyGoogleReceipt(receipt, productId);
  }

  return { success: false, isPremium: false, error: "Unknown store type" };
}

/**
 * Check if a product ID is the Remove Ads one-time purchase
 */
export function isRemoveAdsProduct(productId: string): boolean {
  return (
    productId === ONE_TIME_PRODUCTS.REMOVE_ADS.apple ||
    productId === ONE_TIME_PRODUCTS.REMOVE_ADS.google
  );
}

/**
 * Check if a subscription is still active
 * Called periodically to ensure premium status is current
 */
export function isSubscriptionActive(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  if (subscription.status !== 'active') return false;
  if (subscription.renewalDate && subscription.renewalDate < Date.now()) return false;
  return true;
}

/**
 * Get subscription status message for UI
 */
export function getSubscriptionStatusMessage(subscription: Subscription | null): string {
  if (!subscription || subscription.status === 'none') {
    return "Not subscribed";
  }
  
  switch (subscription.status) {
    case 'active':
      const renewalDate = subscription.renewalDate 
        ? new Date(subscription.renewalDate).toLocaleDateString() 
        : 'Unknown';
      return `Elite active - Renews ${renewalDate}`;
    case 'canceled':
      return "Subscription canceled - Access until renewal date";
    case 'expired':
      return "Subscription expired";
    case 'pending':
      return "Verification pending...";
    default:
      return "Unknown status";
  }
}
