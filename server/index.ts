import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db";
import { visitorAnalytics } from "@shared/schema";
import { count, eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session tracking storage
const activeSessions = new Map<string, { sessionId: string; startTime: number }>();

// IP tracking middleware
app.use(async (req, res, next) => {
  try {
    // Skip API routes and static assets to avoid excessive tracking
    if (req.path.startsWith('/api') || req.path.startsWith('/assets') || req.path.includes('.')) {
      return next();
    }

    // Get real IP address (considering proxies/load balancers)
    const getClientIP = (req: Request): string => {
      return (
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        (req.headers['x-real-ip'] as string) ||
        (req.headers['x-client-ip'] as string) ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        '127.0.0.1'
      );
    };

    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const path = req.path;

    // Skip localhost/development IPs
    if (ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress.startsWith('192.168.')) {
      return next();
    }

    // Check for existing sessions
    let sessionInfo = activeSessions.get(ipAddress);
    const now = Date.now();

    // If no active session or session is older than 30 minutes, create new session
    if (!sessionInfo || (now - sessionInfo.startTime) > 30 * 60 * 1000) {
      const sessionId = randomUUID();
      sessionInfo = { sessionId, startTime: now };
      activeSessions.set(ipAddress, sessionInfo);

      // Get return visit count for this IP
      const returnVisitCount = await db
        .select({ count: count() })
        .from(visitorAnalytics)
        .where(eq(visitorAnalytics.ipAddress, ipAddress));

      const returnVisits = (returnVisitCount[0]?.count || 0) + 1;

      // Fetch geolocation data from IP-API (free, no API key required)
      let geoData: any = {};
      try {
        const geoResponse = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,country,regionName,city,lat,lon,timezone,isp,org`);
        if (geoResponse.ok) {
          const data = await geoResponse.json();
          if (data.status === 'success') {
            geoData = {
              country: data.country,
              region: data.regionName,
              city: data.city,
              latitude: data.lat?.toString(),
              longitude: data.lon?.toString(),
              timezone: data.timezone,
              isp: data.isp,
              org: data.org,
            };
          }
        }
      } catch (error) {
        console.log(`Geolocation lookup failed for ${ipAddress}:`, error);
      }

      // Store new visitor session in database
      try {
        await db.insert(visitorAnalytics).values({
          ipAddress,
          userAgent,
          path,
          sessionId: sessionInfo.sessionId,
          returnVisits,
          ...geoData,
        });
      } catch (error) {
        console.log(`Failed to store visitor analytics for ${ipAddress}:`, error);
      }
    }
  } catch (error) {
    console.log('IP tracking middleware error:', error);
  }

  next();
});

// Clean up old sessions periodically (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  const thirtyMinutesAgo = now - 30 * 60 * 1000;
  
  for (const [ip, session] of Array.from(activeSessions.entries())) {
    if (session.startTime < thirtyMinutesAgo) {
      activeSessions.delete(ip);
    }
  }
}, 10 * 60 * 1000);

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

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
