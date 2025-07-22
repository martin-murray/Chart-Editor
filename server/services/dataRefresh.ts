import { storage } from "../storage";
import { stockDataService } from "./stockData";
import { type InsertMarketSummary } from "@shared/schema";

export class DataRefreshService {
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  
  // No longer needed - using Yahoo Finance movers API for real market movers

  startAutomaticRefresh() {
    console.log("🕐 Starting automatic market data refresh...");
    
    // Refresh every 15 minutes during market hours
    this.refreshTimer = setInterval(() => {
      this.refreshMarketData();
    }, 15 * 60 * 1000); // 15 minutes
    
    // Initial refresh
    setTimeout(() => this.refreshMarketData(), 2000);
    
    console.log("✅ Automatic refresh scheduled every 15 minutes");
  }

  stopAutomaticRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      console.log("🛑 Automatic refresh stopped");
    }
  }

  async refreshMarketData(): Promise<void> {
    if (this.isRefreshing) {
      console.log("⏳ Market data refresh already in progress...");
      return;
    }

    this.isRefreshing = true;
    console.log("🔄 Starting market data refresh...");
    
    try {
      const startTime = Date.now();
      
      // Check if we have remaining API requests
      const apiStatus = await stockDataService.getApiStatus();
      console.log(`📊 Remaining API requests today: ${apiStatus.remainingRequests}`);
      
      if (apiStatus.remainingRequests <= 0) {
        console.warn("⚠️ API request limit reached - skipping refresh");
        return;
      }

      // Fetch market movers data exclusively from Polygon.io
      console.log(`📊 Fetching real-time market movers from Polygon.io premium API...`);
      
      const liveData = await stockDataService.getLatestStockData();
      
      if (liveData.length === 0) {
        console.warn("⚠️ No live data received - keeping existing data");
        return;
      }

      // Update stocks in database
      console.log("💾 Updating stock data in database...");
      await storage.bulkUpsertStocks(liveData);
      
      // Recalculate market summary
      await this.updateMarketSummary();
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      console.log(`✅ Market data refresh completed in ${duration.toFixed(1)}s`);
      console.log(`📈 Updated ${liveData.length} stocks with live data from Polygon.io`);
      
    } catch (error) {
      console.error("❌ Error during market data refresh:", error);
    } finally {
      this.isRefreshing = false;
    }
  }

  private async updateMarketSummary(): Promise<void> {
    try {
      console.log("📊 Calculating new market summary...");
      
      const allStocks = await storage.getStocks();
      
      const gainers = allStocks.filter(stock => parseFloat(stock.percentChange) > 0);
      const losers = allStocks.filter(stock => parseFloat(stock.percentChange) < 0);
      
      const avgGainerChange = gainers.length > 0 
        ? (gainers.reduce((sum, stock) => sum + parseFloat(stock.percentChange), 0) / gainers.length).toFixed(3)
        : "0.000";
      
      const avgLoserChange = losers.length > 0
        ? (losers.reduce((sum, stock) => sum + parseFloat(stock.percentChange), 0) / losers.length).toFixed(3)
        : "0.000";

      const totalMarketCapValue = allStocks.reduce((sum, stock) => sum + parseFloat(stock.marketCapValue), 0);
      const totalVolume = allStocks.reduce((sum, stock) => sum + stock.volume, 0);
      
      // Determine volatility based on average absolute change
      const avgAbsChange = allStocks.length > 0
        ? allStocks.reduce((sum, stock) => sum + Math.abs(parseFloat(stock.percentChange)), 0) / allStocks.length
        : 0;
      
      let volatility = "Low";
      if (avgAbsChange > 3) volatility = "High";
      else if (avgAbsChange > 1.5) volatility = "Moderate";
      
      // Find sector with most gainers
      const sectorCounts: Record<string, { gains: number, total: number }> = {};
      allStocks.forEach(stock => {
        if (!sectorCounts[stock.sector]) {
          sectorCounts[stock.sector] = { gains: 0, total: 0 };
        }
        sectorCounts[stock.sector].total++;
        if (parseFloat(stock.percentChange) > 0) {
          sectorCounts[stock.sector].gains++;
        }
      });
      
      const sectorLeader = Object.entries(sectorCounts)
        .sort(([,a], [,b]) => (b.gains / b.total) - (a.gains / a.total))[0]?.[0] || "Technology";

      const summaryData: InsertMarketSummary = {
        totalMovers: allStocks.length,
        totalGainers: gainers.length,
        totalLosers: losers.length,
        totalMarketCap: `$${(totalMarketCapValue / 1e12).toFixed(1)}T`,
        avgGainerChange,
        avgLoserChange,
        avgVolume: `${(totalVolume / 1000000).toFixed(1)}M`,
        volatility,
        sectorLeader,
      };

      await storage.updateMarketSummary(summaryData);
      console.log("✅ Market summary updated");
      
    } catch (error) {
      console.error("❌ Error updating market summary:", error);
    }
  }

  async manualRefresh(): Promise<{ success: boolean; message: string; updatedCount: number }> {
    if (this.isRefreshing) {
      return {
        success: false,
        message: "Refresh already in progress",
        updatedCount: 0
      };
    }

    try {
      await this.refreshMarketData();
      const stocks = await storage.getStocks();
      
      return {
        success: true,
        message: "Market data refreshed successfully",
        updatedCount: stocks.length
      };
    } catch (error) {
      console.error("❌ Manual refresh failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
        updatedCount: 0
      };
    }
  }

  async getRefreshStatus() {
    const stocks = await storage.getStocks();
    const apiStatus = await stockDataService.getApiStatus();
    return {
      isRefreshing: this.isRefreshing,
      autoRefreshActive: this.refreshTimer !== null,
      remainingRequests: apiStatus.remainingRequests,
      totalStocks: stocks.length
    };
  }
}

export const dataRefreshService = new DataRefreshService();