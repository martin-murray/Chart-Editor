import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { stockDataService } from "./services/stockData";
import { slackService } from "./services/slack";
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

  app.get("/api/stocks/gainers", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const filter = stockFilterSchema.safeParse(req.query);
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
      const filter = stockFilterSchema.safeParse(req.query);
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

  // Slack integration routes
  app.post("/api/slack/test-alert", async (req, res) => {
    try {
      const gainers = await storage.getTopGainers(5);
      const losers = await storage.getTopLosers(5);
      
      const messageTs = await slackService.sendMarketMoversAlert(gainers, losers, "test");
      
      await storage.createSlackAlert({
        type: "test",
        title: "Test Alert Sent",
        description: `Top ${gainers.length} gainers and ${losers.length} losers posted to Slack`,
        status: "sent"
      });
      
      res.json({ 
        message: "Test alert sent successfully", 
        messageTs 
      });
    } catch (error) {
      console.error("Error sending test alert:", error);
      res.status(500).json({ message: "Failed to send test alert" });
    }
  });

  app.post("/api/slack/scheduled-alert", async (req, res) => {
    try {
      const { type } = req.body;
      
      if (!["morning", "afternoon"].includes(type)) {
        return res.status(400).json({ message: "Invalid alert type" });
      }
      
      const gainers = await storage.getTopGainers(10);
      const losers = await storage.getTopLosers(10);
      
      const messageTs = await slackService.sendMarketMoversAlert(gainers, losers, type);
      
      await storage.createSlackAlert({
        type,
        title: `${type === "morning" ? "Morning" : "Afternoon"} Alert Sent`,
        description: `Top 10 gainers and losers posted to #research-team`,
        status: "sent"
      });
      
      res.json({ 
        message: `${type} alert sent successfully`, 
        messageTs 
      });
    } catch (error) {
      console.error("Error sending scheduled alert:", error);
      res.status(500).json({ message: "Failed to send scheduled alert" });
    }
  });

  app.get("/api/slack/alerts", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const alerts = await storage.getSlackAlerts(limit);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching slack alerts:", error);
      res.status(500).json({ message: "Failed to fetch slack alerts" });
    }
  });

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

  const httpServer = createServer(app);
  return httpServer;
}
