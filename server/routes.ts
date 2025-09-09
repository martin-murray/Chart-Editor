import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { stockDataService } from "./services/stockData";
// Slack service removed - clean slate for new messaging integration
import { dataRefreshService } from "./services/dataRefresh";
import { marketDataService } from "./services/marketDataService";
import { stockFilterSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Stock data routes
  app.get("/api/stocks", async (req, res) => {
    try {
      const filter = stockFilterSchema.safeParse(req.query);
      const stocks = await storage.getStocks(filter.success ? filter.data : undefined);
      res.json(stocks);
    } catch (error) {
      console.error("Error fetching stocks:", error);
      res.status(500).json({ message: "Failed to fetch stocks" });
    }
  });

  // Ticker search endpoint powered by Finnhub
  app.get("/api/stocks/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length === 0) {
        return res.json([]);
      }

      console.log(`🔍 Live search for: "${query}"`);
      const results = await stockDataService.searchStocks(query.trim());
      
      // Return simplified format for frontend
      const searchResults = results.map(stock => ({
        symbol: stock.symbol,
        name: stock.name,
        price: stock.price,
        percentChange: stock.percentChange,
        marketCap: stock.marketCap
      }));

      res.json(searchResults);
    } catch (error) {
      console.error("Error searching stocks with Finnhub:", error);
      res.status(500).json({ message: "Failed to search stocks" });
    }
  });

  // Global stock search endpoint using Finnhub symbol lookup
  app.get("/api/stocks/global-search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length === 0) {
        return res.json([]);
      }

      console.log(`🌍 Global search for: "${query}"`);
      
      // Use Finnhub symbol lookup API for global search
      const finnhubApiKey = process.env.FINNHUB_API_KEY || "cg9jh3pr01qg418a9q9gcg9jh3pr01qg418a9qa0";
      
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
          case '1W':
            from = now - (7 * 24 * 60 * 60); // 1 week  
            resolution = '15'; // 15-minute intervals
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
          default:
            from = now - (24 * 60 * 60);
            resolution = '5';
        }
      }

      const chartData = await stockDataService.getStockChart(symbol, from, to, resolution);
      
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

  app.get("/api/stocks/gainers", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Transform query params for validation
      const queryParams = {
        ...req.query,
        changeThreshold: req.query.changeThreshold ? parseInt(req.query.changeThreshold as string) : undefined,
      };
      
      const filter = stockFilterSchema.safeParse(queryParams);
      const gainers = await storage.getTopGainers(limit, filter.success ? filter.data : undefined);
      res.json(gainers);
    } catch (error) {
      console.error("Error fetching gainers:", error);
      res.status(500).json({ message: "Failed to fetch top gainers" });
    }
  });

  app.get("/api/stocks/losers", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Transform query params for validation
      const queryParams = {
        ...req.query,
        changeThreshold: req.query.changeThreshold ? parseInt(req.query.changeThreshold as string) : undefined,
      };
      
      const filter = stockFilterSchema.safeParse(queryParams);
      const losers = await storage.getTopLosers(limit, filter.success ? filter.data : undefined);
      res.json(losers);
    } catch (error) {
      console.error("Error fetching losers:", error);
      res.status(500).json({ message: "Failed to fetch top losers" });
    }
  });

  app.post("/api/stocks/refresh", async (req, res) => {
    try {
      const stockData = await stockDataService.getLatestStockData();
      const updatedStocks = await storage.bulkUpsertStocks(stockData);
      
      // Update market summary
      const summary = await stockDataService.calculateMarketSummary(stockData);
      await storage.updateMarketSummary(summary);
      
      res.json({ 
        message: "Stock data refreshed successfully", 
        count: updatedStocks.length,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error refreshing stock data:", error);
      res.status(500).json({ message: "Failed to refresh stock data" });
    }
  });

  // Market summary route
  app.get("/api/market-summary", async (req, res) => {
    try {
      const summary = await storage.getMarketSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching market summary:", error);
      res.status(500).json({ message: "Failed to fetch market summary" });
    }
  });

  // Health check route for deployment debugging
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      port: process.env.PORT || "5000"
    });
  });

  // Market status endpoint
  app.get("/api/market-status", async (req, res) => {
    try {
      const marketStatus = await stockDataService.getMarketStatus();
      res.json(marketStatus);
    } catch (error) {
      console.error("Error fetching market status:", error);
      res.status(500).json({ message: "Failed to fetch market status" });
    }
  });

  // Messaging integration removed - clean slate for new integration

  // Export routes
  app.get("/api/export/csv", async (req, res) => {
    try {
      const filter = stockFilterSchema.safeParse(req.query);
      const stocks = await storage.getStocks(filter.success ? filter.data : undefined);
      
      // Generate CSV content
      const headers = ["Symbol", "Name", "Price", "Change", "Percent Change", "Market Cap", "Volume", "Indices", "Sector"];
      const csvContent = [
        headers.join(","),
        ...stocks.map(stock => [
          stock.symbol,
          `"${stock.name}"`,
          stock.price,
          stock.change,
          stock.percentChange,
          `"${stock.marketCap}"`,
          stock.volume,
          `"${stock.indices.join("; ")}"`,
          stock.sector
        ].join(","))
      ].join("\n");
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="market-movers-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      res.status(500).json({ message: "Failed to export CSV" });
    }
  });

  // Live market data refresh endpoints
  app.post("/api/refresh-live-data", async (req, res) => {
    try {
      const result = await dataRefreshService.manualRefresh();
      res.json(result);
    } catch (error) {
      console.error("Error refreshing live market data:", error);
      res.status(500).json({ message: "Failed to refresh live market data" });
    }
  });

  // Finnhub market movers refresh endpoint
  app.post("/api/refresh-market-movers", async (req, res) => {
    try {
      const result = await marketDataService.refreshMarketMovers();
      res.json(result);
    } catch (error) {
      console.error("Error refreshing market movers:", error);
      res.status(500).json({ message: "Failed to refresh market movers" });
    }
  });

  // Get refresh status
  app.get("/api/refresh-status", async (req, res) => {
    try {
      const status = await dataRefreshService.getRefreshStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting refresh status:", error);
      res.status(500).json({ message: "Failed to get refresh status" });
    }
  });

  // Start automatic data refresh
  console.log("🚀 Starting automatic market data refresh service...");
  // Auto refresh starts automatically in constructor

  const httpServer = createServer(app);
  return httpServer;
}
