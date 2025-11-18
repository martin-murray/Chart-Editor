import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import { stockDataService } from "./services/stockData";
import { finnhubService } from "./services/finnhubService";
import multer from "multer";
import { sendFeedbackToSlack } from "./slack";
import { db } from "./db";
import { visitorAnalytics, loginAttempts, insertLoginAttemptSchema, aiCopilotChats, aiCopilotMessages, aiCopilotUploads, chartHistory, insertChartHistorySchema } from "@shared/schema";
import { desc, count, sql, gte, lte, and, eq } from "drizzle-orm";
import { getExchangeInfoFromSuffix, applySuffixOverride } from "./utils/suffixMappings";
import { indexService } from "./services/indexService";
import OpenAI from "openai";

// Simple in-memory session store for authentication
const authSessions = new Map<string, { createdAt: number }>();

// Middleware to check authentication
function requireAuth(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token || !authSessions.has(token)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Check if token is expired (24 hours)
  const session = authSessions.get(token);
  if (session && Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
    authSessions.delete(token);
    return res.status(401).json({ message: 'Session expired' });
  }
  
  next();
}

// Clean up expired sessions periodically
setInterval(() => {
  const now = Date.now();
  const expiryTime = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const [token, session] of Array.from(authSessions.entries())) {
    if (now - session.createdAt > expiryTime) {
      authSessions.delete(token);
    }
  }
}, 60 * 60 * 1000); // Run every hour

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
      const stockResults = data.result?.slice(0, 8).map((item: any) => {
        const baseResult = {
          symbol: item.symbol,
          description: item.description,
          displaySymbol: item.displaySymbol,
          type: item.type || 'Unknown'
        };

        // Apply centralized suffix override - this ALWAYS takes precedence
        let result = applySuffixOverride(item.symbol, baseResult);

        // Special case: Handle tickers without suffixes that we know are specific exchanges
        // For multi-listed stocks, prioritize main US listing when no suffix
        if (!result.exchange) {
          const specialCases: Record<string, { exchange: string; currency: string }> = {
            'FER': { exchange: 'NasdaqGS', currency: 'USD' }, // Ferrovial SE US listing priority
            // Add other multi-listed stocks here as needed
          };

          const specialCase = specialCases[item.symbol];
          if (specialCase) {
            result = {
              ...result,
              exchange: specialCase.exchange,
              currency: specialCase.currency
            };
          }
        }

        return result;
      }) || [];

      // Search global indices and include them in results
      const indexResults = indexService.searchIndices(query).slice(0, 2).map(index => ({
        symbol: index.symbol,
        description: index.description,
        displaySymbol: index.symbol,
        type: 'Index',
        exchange: index.country,
        currency: index.currency,
        country: index.country,
        region: index.region
      }));

      // Combine stock and index results, prioritizing stocks
      const globalResults = [...stockResults, ...indexResults];

      console.log(`🌍 Global search completed: ${globalResults.length} results for "${query}"`);
      res.json(globalResults);
    } catch (error) {
      console.error("Error in global stock search:", error);
      res.status(500).json({ message: "Failed to search global stocks" });
    }
  });

  // Regular ticker search endpoint (for dashboard ticker search component)
  app.get("/api/stocks/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length === 0) {
        return res.json([]);
      }

      console.log(`🔍 Ticker search for: "${query}"`);
      
      // Use the existing stockDataService for US market search
      const searchResults = await stockDataService.searchStocks(query);
      
      // Transform to include exchange and currency information for suffixed tickers
      const enhancedResults = searchResults.map((stock: any) => {
        const baseResult = {
          symbol: stock.symbol,
          name: stock.name,
          price: stock.price,
          percentChange: stock.percentChange,
          marketCap: stock.marketCap
        };

        // Apply centralized suffix override - this ALWAYS takes precedence
        let result = applySuffixOverride(stock.symbol, baseResult);

        // For US stocks without suffixes, add default US exchange info when available
        if (!result.exchange && !stock.symbol.includes('.')) {
          result = {
            ...result,
            exchange: 'NASDAQ/NYSE',
            currency: 'USD'
          };
        }

        return result;
      });
      
      console.log(`🔍 Ticker search completed: ${enhancedResults.length} results for "${query}"`);
      res.json(enhancedResults);
    } catch (error) {
      console.error("Error in ticker search:", error);
      res.status(500).json({ message: "Failed to search ticker stocks" });
    }
  });

  // Index search endpoint - dedicated index search
  app.get("/api/indices/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length === 0) {
        return res.json([]);
      }

      console.log(`📊 Index search for: "${query}"`);
      
      const indexResults = indexService.searchIndices(query).map(index => ({
        symbol: index.symbol,
        name: index.name,
        description: index.description,
        type: 'Index',
        country: index.country,
        region: index.region,
        currency: index.currency,
        exchange: index.country // For consistency with stock results
      }));
      
      console.log(`📊 Index search completed: ${indexResults.length} results for "${query}"`);
      res.json(indexResults);
    } catch (error) {
      console.error("Error in index search:", error);
      res.status(500).json({ message: "Failed to search indices" });
    }
  });

  // Index details endpoint - get detailed index information
  app.get("/api/indices/:symbol/details", async (req, res) => {
    try {
      const { symbol } = req.params;
      console.log(`📊 Index details request for: ${symbol}`);
      
      const indexDetails = await indexService.getDetailedIndexInfo(symbol);
      
      if (!indexDetails) {
        return res.status(404).json({ error: "Index not found or data not available" });
      }

      res.json(indexDetails);
    } catch (error) {
      console.error("Index details error:", error);
      res.status(500).json({ error: "Failed to fetch index details" });
    }
  });

  // Index quote endpoint - get real-time index price
  app.get("/api/indices/:symbol/quote", async (req, res) => {
    try {
      const { symbol } = req.params;
      const quote = await indexService.getIndexQuote(symbol);
      
      if (!quote) {
        return res.status(404).json({ error: "Index quote not available" });
      }

      res.json({
        symbol,
        quote,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Index quote error:", error);
      res.status(500).json({ error: "Failed to fetch index quote" });
    }
  });

  // Index constituents endpoint - get stocks in the index
  app.get("/api/indices/:symbol/constituents", async (req, res) => {
    try {
      const { symbol } = req.params;
      const constituents = await indexService.getIndexConstituents(symbol);
      
      if (!constituents) {
        return res.status(404).json({ error: "Index constituents not available" });
      }

      res.json(constituents);
    } catch (error) {
      console.error("Index constituents error:", error);
      res.status(500).json({ error: "Failed to fetch index constituents" });
    }
  });

  // Dividend data endpoint
  app.get("/api/stocks/:symbol/dividends", async (req, res) => {
    const symbol = req.params.symbol;
    const from = req.query.from ? parseInt(req.query.from as string) : undefined;
    const to = req.query.to ? parseInt(req.query.to as string) : undefined;

    try {
      console.log(`💰 Dividend request for ${symbol}, from: ${from}, to: ${to}`);
      const dividends = await finnhubService.getDividends(symbol, from, to);
      
      res.json({
        symbol,
        dividends,
        count: dividends.length
      });
    } catch (error) {
      console.error(`Error fetching dividends for ${symbol}:`, error);
      res.status(500).json({ 
        error: 'Failed to fetch dividend data', 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
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
        } else {
          resolution = 'D'; // Daily intervals for >7 days (Finnhub hourly candles limited to ~7-10 days)
          // Don't add buffer for custom date ranges - use exactly what user requested
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
            to = now + (24 * 60 * 60); // Add 1 day buffer to ensure we get today's data
            break;
          case '1Y':
            from = now - (365 * 24 * 60 * 60); // 1 year
            resolution = 'D'; // Daily intervals
            to = now + (24 * 60 * 60); // Add 1 day buffer to ensure we get today's data
            break;
          case '3Y':
            from = now - (3 * 365 * 24 * 60 * 60); // 3 years
            resolution = 'D'; // Daily intervals
            to = now + (24 * 60 * 60); // Add 1 day buffer to ensure we get today's data
            break;
          case '5Y':
            from = now - (5 * 365 * 24 * 60 * 60); // 5 years
            resolution = 'D'; // Daily intervals
            to = now + (24 * 60 * 60); // Add 1 day buffer to ensure we get today's data
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

      // Apply centralized suffix override - this ALWAYS takes precedence over external API data
      const enhancedDetails = applySuffixOverride(symbol, stockDetails);

      res.json(enhancedDetails);
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

  // Market holidays endpoint for exchanges
  app.get("/api/exchanges/:exchange/holidays", async (req, res) => {
    try {
      const { exchange } = req.params;
      console.log(`🏦 Market holidays request for: ${exchange}`);
      
      const holidayData = await stockDataService.getMarketHolidays(exchange);
      
      if (!holidayData) {
        return res.status(404).json({ error: "Holiday data not available for this exchange" });
      }
      
      res.json({
        exchange,
        holidays: holidayData.data || []
      });
    } catch (error) {
      console.error("Error fetching market holidays:", error);
      res.status(500).json({ message: "Failed to fetch market holidays" });
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

  // Login endpoint with attempt tracking
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Get IP address and user agent from request
      const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      // Validate credentials and determine failure reason (hardcoded for now)
      const validUsername = 'test@intropic.io';
      const validPassword = 'egg';
      
      let isValid = false;
      let failureReason: string | null = null;
      
      if (username !== validUsername) {
        failureReason = 'Invalid username';
      } else if (password !== validPassword) {
        failureReason = 'Invalid password';
      } else {
        isValid = true;
        failureReason = null;
      }
      
      // Fetch geolocation data for IP address with timeout
      let country = null;
      let region = null;
      let city = null;
      
      try {
        if (ipAddress && ipAddress !== 'unknown' && ipAddress !== '::1' && !ipAddress.startsWith('127.')) {
          // Set timeout to prevent hanging the login process
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
          
          try {
            const geoResponse = await fetch(`https://ipapi.co/${ipAddress}/json/`, {
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (geoResponse.ok) {
              const geoData = await geoResponse.json();
              country = geoData.country_name || null;
              region = geoData.region || null;
              city = geoData.city || null;
              console.log(`📍 Location for ${ipAddress}: ${city}, ${region}, ${country}`);
            } else {
              console.log(`📍 Geolocation API returned ${geoResponse.status} for ${ipAddress}`);
            }
          } catch (fetchError) {
            clearTimeout(timeoutId);
            throw fetchError;
          }
        } else {
          console.log(`📍 Skipping geolocation for local IP: ${ipAddress}`);
        }
      } catch (geoError) {
        if (geoError instanceof Error && geoError.name === 'AbortError') {
          console.error(`⏱️ Geolocation lookup timed out for ${ipAddress}`);
        } else {
          console.error("Geolocation lookup failed:", geoError);
        }
        // Continue without location data if geolocation fails - don't block login
      }
      
      // Record the login attempt
      await db.insert(loginAttempts).values({
        username,
        success: isValid,
        failureReason,
        ipAddress,
        userAgent,
        country,
        region,
        city,
      });
      
      console.log(`🔐 Login attempt: ${username} - ${isValid ? 'SUCCESS' : 'FAILED'} ${failureReason ? `(${failureReason})` : ''} from ${ipAddress}`);
      
      if (isValid) {
        // Generate session token
        const token = randomUUID();
        authSessions.set(token, { createdAt: Date.now() });
        
        res.json({ success: true, token });
      } else {
        res.status(401).json({ success: false, message: 'Invalid username or password' });
      }
    } catch (error) {
      console.error("Error processing login:", error);
      res.status(500).json({ success: false, message: "Login system error" });
    }
  });

  // Validate session endpoint
  app.get("/api/session", requireAuth, async (req, res) => {
    res.json({ valid: true });
  });

  // Get login attempt history (requires authentication)
  app.get("/api/login-attempts", requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      
      const attempts = await db
        .select()
        .from(loginAttempts)
        .orderBy(desc(loginAttempts.attemptedAt))
        .limit(limit);
      
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching login attempts:", error);
      res.status(500).json({ message: "Failed to fetch login attempts" });
    }
  });

  // Chart History Routes

  // Save chart with annotations to history
  app.post("/api/chart-history", requireAuth, async (req, res) => {
    try {
      const { symbol, annotations } = req.body;
      
      if (!symbol || !annotations || !Array.isArray(annotations) || annotations.length === 0) {
        return res.status(400).json({ message: "Symbol and annotations are required" });
      }
      
      const [history] = await db.insert(chartHistory).values({
        symbol,
        annotations
      }).returning();
      
      res.json(history);
    } catch (error) {
      console.error("Error saving chart history:", error);
      res.status(500).json({ message: "Failed to save chart history" });
    }
  });

  // Get recent chart history (limit 50, ordered by most recent)
  app.get("/api/chart-history", requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      
      const history = await db
        .select()
        .from(chartHistory)
        .orderBy(desc(chartHistory.savedAt))
        .limit(limit);
      
      res.json(history);
    } catch (error) {
      console.error("Error fetching chart history:", error);
      res.status(500).json({ message: "Failed to fetch chart history" });
    }
  });

  // AI Co-Pilot Routes

  // Initialize OpenAI client with Replit AI Integrations
  const openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  // Create or get chat session
  app.post("/api/ai-copilot/session", requireAuth, async (req, res) => {
    try {
      const sessionId = randomUUID();
      const [chat] = await db.insert(aiCopilotChats).values({ sessionId }).returning();
      res.json(chat);
    } catch (error) {
      console.error("Error creating AI chat session:", error);
      res.status(500).json({ message: "Failed to create chat session" });
    }
  });

  // Upload CSV
  app.post("/api/ai-copilot/upload", requireAuth, multer({ storage: multer.memoryStorage() }).single('file'), async (req, res) => {
    try {
      const chatId = parseInt(req.body.chatId);
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const csvData = file.buffer.toString('utf-8');
      
      // Parse CSV into array of objects
      const lines = csvData.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      const parsedData = lines.slice(1).map(line => {
        const values = line.split(',');
        const obj: any = {};
        headers.forEach((header, i) => {
          obj[header] = values[i]?.trim() || '';
        });
        return obj;
      });

      const [upload] = await db.insert(aiCopilotUploads).values({
        chatId,
        filename: file.originalname,
        csvData,
        parsedData,
      }).returning();

      res.json(upload);
    } catch (error) {
      console.error("Error uploading CSV:", error);
      res.status(500).json({ message: "Failed to upload CSV" });
    }
  });

  // Send message and get AI response
  app.post("/api/ai-copilot/chat", requireAuth, async (req, res) => {
    try {
      const { chatId, message } = req.body;

      // Save user message
      await db.insert(aiCopilotMessages).values({
        chatId,
        role: 'user',
        content: message,
      });

      // Get uploaded CSV data for context
      const uploads = await db.select().from(aiCopilotUploads).where(eq(aiCopilotUploads.chatId, chatId));
      
      // Detect if this is a price chart overlay request
      const isPriceChartOverlay = message.includes('Stock:') && message.includes('editing a price chart');
      
      let systemPrompt = '';
      
      if (isPriceChartOverlay) {
        // System prompt for price chart overlays
        systemPrompt = `You are an AI Copilot embedded inside a price chart editing tool. Your output must directly control the chart, not just describe it.

Your response must be a valid JSON object with this structure:
{
  "description": "Brief description of what you're adding (1-2 sentences)",
  "chartConfig": {
    "type": "timeseries",
    "title": "Overlay name (e.g., 'Conviction Score', 'Custom Indicator')",
    "data": [
      {"timestamp": "2025-06-06", "value": 2.55},
      {"timestamp": "2025-06-09", "value": 3.25},
      ...
    ],
    "style": {
      "color": "#FFFFFF",
      "strokeWidth": 2,
      "dashArray": "5 5"
    }
  }
}

CRITICAL RULES:
- Your ENTIRE response must be valid JSON
- NEVER describe or summarize the chart - return explicit data points
- If user provides data, return ALL data points exactly as given (do not summarize or skip)
- Timestamps can be in ISO format ("2025-06-06") or Unix milliseconds
- Values should be numbers (percentages like "2.55%" should be returned as 2.55)
- All numbers MUST have a leading digit (use 0.85, never .85)
- NO comments in JSON, NO trailing commas, use double quotes for all strings
- The data array should contain all data points the user provided or requested

Brand Colors (use in order):
White: #FFFFFF, Cyan: #5AF5FA, Yellow: #FAFF50, Purple: #AA99FF, Green: #50FFA5, Pink: #FF6B9D, Orange: #FFA500

When user asks to add an overlay or provides date/value data:
1. Parse ALL the data points
2. Return them in the exact format shown above
3. Do NOT summarize, skip, or describe - return the actual data`;
      } else {
        // System prompt for standalone chart creation
        systemPrompt = `You are an AI chart-making assistant that responds ONLY with valid JSON.

Your response must be a valid JSON object with this structure:
{
  "description": "Brief description of the chart (1-2 sentences)",
  "chartConfig": {
    "type": "bar" | "line" | "pie" | "area",
    "title": "Chart title",
    "data": [array of data objects],
    "xKey": "key for x-axis" (omit for pie charts),
    "yKeys": ["keys for y-axis values"] (omit for pie charts),
    "colors": ["#5AF5FA", "#FFA5FF", "#AA99FF", "#FAFF50", ...]
  }
}

CRITICAL JSON RULES:
- Your ENTIRE response must be valid JSON
- Generate actual data based on the request
- All numbers MUST have a leading digit (use 0.85, never .85)
- NO comments in JSON
- NO trailing commas
- Use double quotes for all strings
- For pie charts: omit xKey and yKeys, data should have name and value properties

Brand Colors (use in order):
Primary: #5AF5FA (cyan), #FFA5FF (pink), #AA99FF (purple), #FAFF50 (yellow)
Secondary: #0CB800 (green), #5294FF (violet), #FFA200 (tangerine), #9AFF75 (pea), #FF9999 (rose)

Generate the chart data directly. Do not explain what you would do, just provide the JSON response.`;
      }

      if (uploads.length > 0) {
        const latestUpload = uploads[uploads.length - 1];
        systemPrompt += `\n\nThe user has uploaded a CSV file: ${latestUpload.filename}\nAll data from the CSV:\n${JSON.stringify(latestUpload.parsedData, null, 2)}`;
      }

      // Get chat history
      const history = await db.select().from(aiCopilotMessages)
        .where(eq(aiCopilotMessages.chatId, chatId))
        .orderBy(aiCopilotMessages.createdAt)
        .limit(20);

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...history.slice(0, -1).map(m => ({ 
          role: m.role as 'user' | 'assistant', 
          content: m.content 
        })),
        { role: 'user' as const, content: message }
      ];

      // Call OpenAI with JSON mode and increased token limit
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        response_format: { type: 'json_object' },
        max_tokens: 4096,
      });

      const assistantMessage = completion.choices[0].message.content || '';

      // Parse the JSON response
      let chartConfig = null;
      let description = '';
      
      try {
        const parsedResponse = JSON.parse(assistantMessage);
        
        if (parsedResponse.chartConfig) {
          chartConfig = parsedResponse.chartConfig;
          description = parsedResponse.description || '';
          
          // Validate required fields
          if (!chartConfig.type || !chartConfig.title || !chartConfig.data || !Array.isArray(chartConfig.data)) {
            console.error("Invalid chart config - missing required fields");
            chartConfig = null;
          }
        }
      } catch (e) {
        console.error("Failed to parse AI response as JSON:", e);
        console.error("Raw response:", assistantMessage.substring(0, 500));
        
        // Fallback: try to extract JSON from code blocks (for backward compatibility)
        const jsonMatch = assistantMessage.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          try {
            let jsonString = jsonMatch[1];
            // Fix common JSON formatting issues
            jsonString = jsonString.replace(/([:\[\s,])(-?)\.(\d+)/g, '$1$20.$3');
            jsonString = jsonString.replace(/,(\s*[\]}])/g, '$1');
            chartConfig = JSON.parse(jsonString);
          } catch (fallbackError) {
            console.error("Fallback JSON parsing also failed:", fallbackError);
          }
        }
      }

      // Save assistant message with formatted content
      const displayContent = description || 
        (chartConfig ? `I've created a ${chartConfig.type} chart: "${chartConfig.title}"` : 
         'I was unable to generate a valid chart. Please try rephrasing your request.');
      
      const [savedMessage] = await db.insert(aiCopilotMessages).values({
        chatId,
        role: 'assistant',
        content: displayContent,
        chartConfig,
      }).returning();

      res.json(savedMessage);
    } catch (error) {
      console.error("Error in AI chat:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  // Get chat history
  app.get("/api/ai-copilot/messages/:chatId", requireAuth, async (req, res) => {
    try {
      const chatId = parseInt(req.params.chatId);
      const messages = await db.select().from(aiCopilotMessages)
        .where(eq(aiCopilotMessages.chatId, chatId))
        .orderBy(aiCopilotMessages.createdAt);
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
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