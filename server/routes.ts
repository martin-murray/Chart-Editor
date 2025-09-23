import type { Express } from "express";
import { createServer, type Server } from "http";
import { stockDataService } from "./services/stockData";
import multer from "multer";
import { sendFeedbackToSlack } from "./slack";
import { db } from "./db";
import { visitorAnalytics } from "@shared/schema";
import { desc, count, sql, gte, lte, and } from "drizzle-orm";
import { getExchangeInfoFromSuffix } from "./utils/suffixMappings";

export async function registerRoutes(app: Express): Promise<Server> {
  // Global stock search endpoint using Finnhub symbol lookup
  app.get("/api/stocks/global-search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length === 0) {
        return res.json([]);
      }

      console.log(`🌍 Global search for: "${query}"`);
      
      // Use Finnhub symbol lookup API for global search
      const finnhubApiKey = process.env.FINNHUB_API_KEY;
      
      if (!finnhubApiKey) {
        console.error("❌ FINNHUB_API_KEY not configured");
        return res.status(500).json({ message: "API configuration error" });
      }
      
      const searchUrl = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query.trim())}&token=${finnhubApiKey}`;
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform Finnhub response to our format with universal exchange info
      const globalResults = data.result?.slice(0, 10).map((item: any) => {
        const baseResult = {
          symbol: item.symbol,
          description: item.description,
          displaySymbol: item.displaySymbol,
          type: item.type || 'Unknown'
        };

        // Universal suffix detection for ANY ticker symbol
        const exchangeInfo = getExchangeInfoFromSuffix(item.symbol);
        if (exchangeInfo) {
          return {
            ...baseResult,
            exchange: exchangeInfo.exchange,
            currency: exchangeInfo.currency
          };
        }

        // Special case: Handle tickers without suffixes that we know are specific exchanges
        // For multi-listed stocks, prioritize main US listing when no suffix
        const specialCases: Record<string, { exchange: string; currency: string }> = {
          'FER': { exchange: 'NasdaqGS', currency: 'USD' }, // Ferrovial SE US listing priority
          // Add other multi-listed stocks here as needed
        };

        const specialCase = specialCases[item.symbol];
        if (specialCase) {
          return {
            ...baseResult,
            exchange: specialCase.exchange,
            currency: specialCase.currency
          };
        }

        return baseResult;
      }) || [];

      console.log(`🌍 Global search completed: ${globalResults.length} results for "${query}"`);
      res.json(globalResults);
    } catch (error) {
      console.error("Error in global stock search:", error);
      res.status(500).json({ message: "Failed to search global stocks" });
    }
  });

  // Stock chart data endpoint
  app.get("/api/stocks/:symbol/chart", async (req, res) => {
    try {
      const { symbol } = req.params;
      const { timeframe = '1D', from: customFrom, to: customTo } = req.query;

      console.log(`📊 Chart request for ${symbol}, timeframe: ${timeframe}, from: ${customFrom}, to: ${customTo}`);

      // Calculate time range based on timeframe or custom dates
      const now = Math.floor(Date.now() / 1000);
      let from: number;
      let to: number = now;
      let resolution: string;

      if (timeframe === 'Custom' && customFrom && customTo) {
        from = parseInt(customFrom as string);
        to = parseInt(customTo as string);
        // For custom ranges, use appropriate resolution based on date range
        const daysDiff = (to - from) / (24 * 60 * 60);
        if (daysDiff <= 1) {
          resolution = '5'; // 5-minute intervals for 1 day or less
        } else if (daysDiff <= 7) {
          resolution = '15'; // 15-minute intervals for up to 1 week
        } else if (daysDiff <= 90) {
          resolution = '60'; // 1-hour intervals for up to 3 months
        } else {
          resolution = 'D'; // Daily intervals for longer periods
        }
      } else {
        switch (timeframe) {
          case '1D':
            from = now - (24 * 60 * 60); // 1 day
            resolution = '5'; // 5-minute intervals
            break;
          case '5D':
            from = now - (5 * 24 * 60 * 60); // 5 days
            resolution = '15'; // 15-minute intervals
            break;
          case '2W':
            from = now - (14 * 24 * 60 * 60); // 2 weeks
            resolution = '60'; // 1-hour intervals
            break;
          case '1M':
            from = now - (30 * 24 * 60 * 60); // 1 month
            resolution = '60'; // 1-hour intervals
            break;
          case '3M':
            from = now - (90 * 24 * 60 * 60); // 3 months
            resolution = 'D'; // Daily intervals
            break;
          case '1Y':
            from = now - (365 * 24 * 60 * 60); // 1 year
            resolution = 'D'; // Daily intervals
            break;
          case '3Y':
            from = now - (3 * 365 * 24 * 60 * 60); // 3 years
            resolution = 'D'; // Daily intervals
            break;
          case '5Y':
            from = now - (5 * 365 * 24 * 60 * 60); // 5 years
            resolution = 'D'; // Daily intervals
            break;
          default:
            from = now - (24 * 60 * 60);
            resolution = '5';
        }
      }

      let chartData = await stockDataService.getStockChart(symbol, from, to, resolution);
      
      // For Single Trading Day requests, if intraday data isn't available, try daily data
      if (!chartData && timeframe === 'Custom' && customFrom && customTo) {
        const daysDiff = (to - from) / (24 * 60 * 60);
        if (daysDiff <= 1) {
          console.log(`💡 No intraday data for ${symbol} on single day, trying daily data...`);
          chartData = await stockDataService.getStockChart(symbol, from, to, 'D');
        }
      }
      
      if (!chartData) {
        return res.status(404).json({ error: "Chart data not available" });
      }

      // Transform the data for the frontend chart
      const formattedData = chartData.t?.map((timestamp: number, index: number) => ({
        timestamp: timestamp * 1000, // Convert to milliseconds
        time: new Date(timestamp * 1000).toISOString(),
        open: chartData.o[index],
        high: chartData.h[index],
        low: chartData.l[index],
        close: chartData.c[index],
        volume: chartData.v[index]
      })) || [];

      res.json({
        symbol,
        timeframe,
        data: formattedData
      });
    } catch (error) {
      console.error("Chart data error:", error);
      res.status(500).json({ error: "Failed to fetch chart data" });
    }
  });

  // Detailed stock info endpoint
  app.get("/api/stocks/:symbol/details", async (req, res) => {
    try {
      const { symbol } = req.params;
      const stockDetails = await stockDataService.getDetailedStockInfo(symbol);
      
      if (!stockDetails) {
        return res.status(404).json({ error: "Stock details not available" });
      }

      res.json(stockDetails);
    } catch (error) {
      console.error("Stock details error:", error);
      res.status(500).json({ error: "Failed to fetch stock details" });
    }
  });

  // Earnings calendar endpoint
  app.get("/api/stocks/:symbol/earnings", async (req, res) => {
    try {
      const { symbol } = req.params;
      console.log(`📈 Earnings request for: ${symbol}`);
      
      const earningsData = await stockDataService.getEarningsCalendar(symbol);
      
      res.json({
        symbol,
        earnings: earningsData
      });
    } catch (error) {
      console.error("Error fetching earnings calendar:", error);
      res.status(500).json({ message: "Failed to fetch earnings calendar" });
    }
  });

  // Configure multer for file uploads (in memory for email attachment)
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  });

  // Feedback form submission endpoint
  app.post("/api/feedback", upload.single('file'), async (req, res) => {
    try {
      const { name, email, message } = req.body;
      
      if (!name || !email || !message) {
        return res.status(400).json({ 
          message: "Name, email, and message are required" 
        });
      }

      // Prepare file attachment if exists
      let fileAttachment;
      if (req.file) {
        fileAttachment = {
          content: req.file.buffer,
          filename: req.file.originalname,
          mimetype: req.file.mimetype
        };
      }

      // Send feedback to Slack channel
      const slackSent = await sendFeedbackToSlack({
        name,
        email,
        message,
        file: fileAttachment
      }); // Uses SLACK_CHANNEL_ID from environment or defaults to 'general'

      if (slackSent) {
        console.log(`✅ Feedback sent to Slack from ${email}`);
        res.json({ success: true, message: "Feedback sent successfully" });
      } else {
        throw new Error("Failed to send feedback to Slack");
      }

    } catch (error) {
      console.error("Feedback submission error:", error);
      res.status(500).json({ 
        message: "Failed to submit feedback. Please try again." 
      });
    }
  });

  // Helper function to get date range based on filter
  const getDateRange = (dateFilter: string) => {
    const now = new Date();
    
    switch (dateFilter) {
      case 'today':
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
        return { start: startOfToday, end: endOfToday };
      
      case 'yesterday':
        const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const endOfYesterday = new Date(startOfYesterday.getTime() + 24 * 60 * 60 * 1000);
        return { start: startOfYesterday, end: endOfYesterday };
      
      case '7days':
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { start: sevenDaysAgo, end: now };
      
      case '30days':
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { start: thirtyDaysAgo, end: now };
      
      case '90days':
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        return { start: ninetyDaysAgo, end: now };
      
      default: // 'all'
        return null;
    }
  };

  // Visitor analytics endpoints
  app.get("/api/analytics/visitors", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
      const offset = parseInt(req.query.offset as string) || 0;
      const dateFilter = req.query.dateFilter as string || 'all';
      
      // Apply date filtering if specified
      const dateRange = getDateRange(dateFilter);
      
      const visitors = dateRange ? 
        await db
          .select()
          .from(visitorAnalytics)
          .where(
            and(
              gte(visitorAnalytics.visitedAt, dateRange.start),
              lte(visitorAnalytics.visitedAt, dateRange.end)
            )
          )
          .orderBy(desc(visitorAnalytics.visitedAt))
          .limit(limit)
          .offset(offset) :
        await db
          .select()
          .from(visitorAnalytics)
          .orderBy(desc(visitorAnalytics.visitedAt))
          .limit(limit)
          .offset(offset);
      res.json(visitors);
    } catch (error) {
      console.error("Error fetching visitor analytics:", error);
      res.status(500).json({ message: "Failed to fetch visitor analytics" });
    }
  });

  app.get("/api/analytics/summary", async (req, res) => {
    try {
      const dateFilter = req.query.dateFilter as string || 'all';
      const dateRange = getDateRange(dateFilter);

      // Build where condition for date filtering
      const dateCondition = dateRange ? 
        and(
          gte(visitorAnalytics.visitedAt, dateRange.start),
          lte(visitorAnalytics.visitedAt, dateRange.end)
        ) : undefined;

      // Total visitors
      const totalVisitors = dateCondition ? 
        await db.select({ count: count() }).from(visitorAnalytics).where(dateCondition) :
        await db.select({ count: count() }).from(visitorAnalytics);

      // Unique visitors by IP  
      const uniqueVisitors = dateCondition ?
        await db
          .select({ count: count() })
          .from(visitorAnalytics)
          .where(dateCondition)
          .groupBy(visitorAnalytics.ipAddress) :
        await db
          .select({ count: count() })
          .from(visitorAnalytics)
          .groupBy(visitorAnalytics.ipAddress);

      // Top countries
      const topCountries = dateCondition ?
        await db
          .select({
            country: visitorAnalytics.country,
            count: count()
          })
          .from(visitorAnalytics)
          .where(and(sql`${visitorAnalytics.country} IS NOT NULL`, dateCondition))
          .groupBy(visitorAnalytics.country)
          .orderBy(desc(count()))
          .limit(10) :
        await db
          .select({
            country: visitorAnalytics.country,
            count: count()
          })
          .from(visitorAnalytics)
          .where(sql`${visitorAnalytics.country} IS NOT NULL`)
          .groupBy(visitorAnalytics.country)
          .orderBy(desc(count()))
          .limit(10);

      // Top cities
      const topCities = dateCondition ?
        await db
          .select({
            city: visitorAnalytics.city,
            country: visitorAnalytics.country,
            count: count()
          })
          .from(visitorAnalytics)
          .where(and(sql`${visitorAnalytics.city} IS NOT NULL`, dateCondition))
          .groupBy(visitorAnalytics.city, visitorAnalytics.country)
          .orderBy(desc(count()))
          .limit(10) :
        await db
          .select({
            city: visitorAnalytics.city,
            country: visitorAnalytics.country,
            count: count()
          })
          .from(visitorAnalytics)
          .where(sql`${visitorAnalytics.city} IS NOT NULL`)
          .groupBy(visitorAnalytics.city, visitorAnalytics.country)
          .orderBy(desc(count()))
          .limit(10);

      // Recent visitors (last 24 hours or filtered period)
      let recentVisitorsQuery;
      if (dateFilter === 'all') {
        recentVisitorsQuery = db
          .select({ count: count() })
          .from(visitorAnalytics)
          .where(sql`${visitorAnalytics.visitedAt} > NOW() - INTERVAL '24 hours'`);
      } else {
        recentVisitorsQuery = db
          .select({ count: count() })
          .from(visitorAnalytics)
          .where(dateCondition);
      }
      const recentVisitors = await recentVisitorsQuery;

      res.json({
        totalVisitors: totalVisitors[0]?.count || 0,
        uniqueVisitors: uniqueVisitors.length || 0,
        recentVisitors: recentVisitors[0]?.count || 0,
        topCountries,
        topCities,
      });
    } catch (error) {
      console.error("Error fetching analytics summary:", error);
      res.status(500).json({ message: "Failed to fetch analytics summary" });
    }
  });

  app.get("/api/analytics/locations", async (req, res) => {
    try {
      const dateFilter = req.query.dateFilter as string || 'all';
      const dateRange = getDateRange(dateFilter);

      const locations = dateRange ? 
        await db
          .select({
            ipAddress: visitorAnalytics.ipAddress,
            country: visitorAnalytics.country,
            region: visitorAnalytics.region,
            city: visitorAnalytics.city,
            latitude: visitorAnalytics.latitude,
            longitude: visitorAnalytics.longitude,
            isp: visitorAnalytics.isp,
            visitedAt: visitorAnalytics.visitedAt,
          })
          .from(visitorAnalytics)
          .where(
            and(
              sql`${visitorAnalytics.latitude} IS NOT NULL AND ${visitorAnalytics.longitude} IS NOT NULL`,
              gte(visitorAnalytics.visitedAt, dateRange.start),
              lte(visitorAnalytics.visitedAt, dateRange.end)
            )
          )
          .orderBy(desc(visitorAnalytics.visitedAt))
          .limit(500) :
        await db
          .select({
            ipAddress: visitorAnalytics.ipAddress,
            country: visitorAnalytics.country,
            region: visitorAnalytics.region,
            city: visitorAnalytics.city,
            latitude: visitorAnalytics.latitude,
            longitude: visitorAnalytics.longitude,
            isp: visitorAnalytics.isp,
            visitedAt: visitorAnalytics.visitedAt,
          })
          .from(visitorAnalytics)
          .where(sql`${visitorAnalytics.latitude} IS NOT NULL AND ${visitorAnalytics.longitude} IS NOT NULL`)
          .orderBy(desc(visitorAnalytics.visitedAt))
          .limit(500);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching visitor locations:", error);
      res.status(500).json({ message: "Failed to fetch visitor locations" });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      service: "ChartMaker API",
      timestamp: new Date().toISOString() 
    });
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}