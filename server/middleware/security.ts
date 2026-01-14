import { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";

export const securityMiddleware = helmet({
  contentSecurityPolicy: process.env.NODE_ENV === "production" ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://img.pokemondb.net", "blob:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
});

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null,
      process.env.REPLIT_DEPLOYMENT_DOMAIN ? `https://${process.env.REPLIT_DEPLOYMENT_DOMAIN}` : null,
      "https://goraiders.replit.app",
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.includes(origin) || origin?.includes('.replit.dev') || origin?.includes('.replit.app')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token"],
  exposedHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
  maxAge: 86400,
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  skip: (req) => {
    return req.path === "/health" || req.path === "/api/health";
  },
});

export const strictRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Rate limit exceeded for this action" },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many authentication attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  validate: { xForwardedForHeader: false },
});

export function escapeHtml(input: string): string {
  if (typeof input !== "string") return "";
  
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export function containsDangerousPatterns(input: string): boolean {
  if (typeof input !== "string") return false;
  
  const dangerousPatterns = [
    /javascript:/i,
    /on\w+\s*=/i,
    /vbscript:/i,
    /<script/i,
    /<\/script/i,
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(input));
}

export function validateUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function validateFriendCode(code: string): boolean {
  const codeRegex = /^[0-9]{4}\s?[0-9]{4}\s?[0-9]{4}$/;
  return codeRegex.test(code.replace(/\s/g, "").match(/.{4}/g)?.join(" ") || "");
}

export const inputValidator = (req: Request, res: Response, next: NextFunction) => {
  const checkForDangerousContent = (obj: any, path = ""): string | null => {
    if (typeof obj === "string" && containsDangerousPatterns(obj)) {
      return path || "value";
    }
    if (obj && typeof obj === "object") {
      for (const [key, value] of Object.entries(obj)) {
        const result = checkForDangerousContent(value, path ? `${path}.${key}` : key);
        if (result) return result;
      }
    }
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const result = checkForDangerousContent(obj[i], `${path}[${i}]`);
        if (result) return result;
      }
    }
    return null;
  };

  if (req.body) {
    const dangerousField = checkForDangerousContent(req.body);
    if (dangerousField) {
      return res.status(400).json({ 
        error: "Invalid input detected", 
        field: dangerousField 
      });
    }
  }
  
  next();
};

export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Allow embedding in Replit preview iframe - use SAMEORIGIN for production
  // X-Frame-Options is removed to allow Replit's webview to work properly
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  
  res.removeHeader("X-Powered-By");
  
  next();
};

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const clientIp = req.ip || req.socket.remoteAddress;
  const userAgent = req.get("user-agent") || "unknown";
  
  (req as any).clientInfo = {
    ip: clientIp,
    userAgent: userAgent.slice(0, 500),
    timestamp: new Date().toISOString(),
  };
  
  next();
};
