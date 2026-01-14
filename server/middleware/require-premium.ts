/**
 * Premium Access Middleware
 * 
 * SECURITY: This middleware enforces server-side premium verification.
 * 
 * It MUST be applied to all premium-only API endpoints.
 * The frontend cannot bypass this check - attempting to access
 * premium features without verified subscription returns 403.
 * 
 * How it works:
 * 1. Extracts user ID from request (header, query, or body)
 * 2. Fetches user from database
 * 3. Checks isPremium flag (which is ONLY set by receipt verification)
 * 4. Returns 403 if not premium
 */

import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export interface PremiumRequest extends Request {
  premiumUser?: {
    id: string;
    isPremium: boolean;
  };
}

/**
 * Middleware to require premium access for an endpoint
 * 
 * Usage:
 * app.get('/api/premium-feature', requirePremium, (req, res) => { ... })
 */
export async function requirePremium(
  req: PremiumRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Extract user ID from various sources
    const userId = 
      req.headers['x-user-id'] as string ||
      req.query.userId as string ||
      req.body?.userId;

    if (!userId) {
      console.warn(`[PREMIUM_CHECK] No user ID provided - IP: ${req.ip}`);
      return res.status(401).json({
        error: "Authentication required",
        code: "AUTH_REQUIRED"
      });
    }

    // Fetch user from database - this is the SOURCE OF TRUTH
    const user = await storage.getUser(userId);

    if (!user) {
      console.warn(`[PREMIUM_CHECK] User not found: ${userId} - IP: ${req.ip}`);
      return res.status(401).json({
        error: "User not found",
        code: "USER_NOT_FOUND"
      });
    }

    // Check premium status from DATABASE (not from request!)
    if (!user.isPremium) {
      console.log(`[PREMIUM_CHECK] Non-premium access attempt: ${userId}`);
      return res.status(403).json({
        error: "Premium access required",
        code: "PREMIUM_REQUIRED",
        message: "This feature requires an Elite subscription. Upgrade to unlock!"
      });
    }

    // Check if subscription is still valid (not expired)
    const subscription = user.subscription as any;
    if (subscription?.renewalDate && subscription.renewalDate < Date.now()) {
      console.log(`[PREMIUM_CHECK] Expired subscription access attempt: ${userId}`);
      return res.status(403).json({
        error: "Subscription expired",
        code: "SUBSCRIPTION_EXPIRED",
        message: "Your Elite subscription has expired. Please renew to continue."
      });
    }

    // Attach premium info to request for downstream use
    req.premiumUser = {
      id: userId,
      isPremium: true
    };

    next();
  } catch (error) {
    console.error("[PREMIUM_CHECK] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      code: "SERVER_ERROR"
    });
  }
}

/**
 * Optional premium check - doesn't block, but attaches premium status
 * Useful for endpoints that work for everyone but have premium features
 */
export async function checkPremiumStatus(
  req: PremiumRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = 
      req.headers['x-user-id'] as string ||
      req.query.userId as string ||
      req.body?.userId;

    if (userId) {
      const user = await storage.getUser(userId);
      if (user) {
        req.premiumUser = {
          id: userId,
          isPremium: user.isPremium
        };
      }
    }

    next();
  } catch (error) {
    // Don't fail the request, just continue without premium info
    next();
  }
}
