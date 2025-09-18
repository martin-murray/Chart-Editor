import type { Express } from "express";
import { createServer, type Server } from "http";
import { stockDataService } from "./services/stockData";

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
      
      // Transform Finnhub response to our format
      const globalResults = data.result?.slice(0, 10).map((item: any) => ({
        symbol: item.symbol,
        description: item.description,
        displaySymbol: item.displaySymbol,
        type: item.type || 'Unknown'
      })) || [];

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