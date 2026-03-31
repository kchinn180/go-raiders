import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { lobbyWSManager } from "./websocket";
import {
  securityMiddleware,
  corsMiddleware,
  apiRateLimiter,
  inputValidator,
  securityHeaders,
  requestLogger,
} from "./middleware/security";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.set("trust proxy", 1);

app.use(securityMiddleware);
app.use(corsMiddleware);
app.use(securityHeaders);
app.use(requestLogger);

app.use("/api", apiRateLimiter);

app.use(
  express.json({
    limit: "10kb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "10kb" }));

app.use(inputValidator);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  lobbyWSManager.initialize(httpServer);
  await registerRoutes(httpServer, app);
  
  // Queue background jobs — run after routes are registered so storage is ready
  const { storage } = await import("./storage");
  
  // Every 10s: check heartbeats and remove truly disconnected users
  setInterval(async () => {
    try {
      const { removed } = await storage.processQueueHeartbeats();
      if (removed.length > 0) {
        log(`Queue heartbeat: removed ${removed.length} disconnected user(s)`, "queue");
      }
    } catch (e) {
      log(`Queue heartbeat error: ${e}`, "queue");
    }
  }, 10_000);
  
  // Every 5s: expire unanswered reservations and apply no-response penalty
  setInterval(async () => {
    try {
      const { expired } = await storage.processReservationExpiry();
      if (expired.length > 0) {
        log(`Reservation expiry: ${expired.length} expired`, "queue");
        // After expiry, try to promote the next eligible user
        await storage.processQueueMatches();
      }
    } catch (e) {
      log(`Reservation expiry error: ${e}`, "queue");
    }
  }, 5_000);
  
  // Every 15s: try to match waiting users to available lobby slots
  setInterval(async () => {
    try {
      const result = await storage.processQueueMatches();
      if (result.matched.length > 0) {
        log(`Queue match: ${result.matched.length} user(s) reserved`, "queue");
        // Notify each promoted user via WebSocket
        const activeBosses = await storage.getActiveRaidBosses();
        for (const matched of result.matched) {
          const boss = activeBosses.find(b => b.id === matched.bossId);
          lobbyWSManager.notifyUserPromotion(matched.userId, {
            bossId: matched.bossId,
            bossName: boss?.name || matched.bossId,
            lobbyId: matched.matchedLobbyId,
            reservationExpiresAt: matched.reservedAt ? matched.reservedAt + 20000 : undefined,
          });
        }
      }
    } catch (e) {
      log(`Queue match error: ${e}`, "queue");
    }
  }, 15_000);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
