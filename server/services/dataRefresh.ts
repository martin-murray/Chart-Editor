import { stockDataService } from './stockData';
import { storage } from '../storage';

/**
 * Data Refresh Service - Clean slate for new API integration
 * All external API dependencies have been removed
 */
export class DataRefreshService {
  private isRefreshing = false;
  private refreshInterval: NodeJS.Timeout | null = null;
  private readonly REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

  constructor() {
    console.log("🚀 Starting automatic market data refresh service...");
    this.startAutoRefresh();
  }

  private startAutoRefresh() {
    console.log("🕐 Starting automatic market data refresh...");
    
    // Initial refresh on startup
    this.refreshData();
    
    // Set up recurring refresh
    this.refreshInterval = setInterval(() => {
      this.refreshData();
    }, this.REFRESH_INTERVAL_MS);
    
    console.log("✅ Automatic refresh scheduled every 15 minutes");
  }

  async refreshData(): Promise<void> {
    if (this.isRefreshing) {
      console.log("⚠️ Refresh already in progress - skipping");
      return;
    }

    this.isRefreshing = true;
    console.log("🔄 Starting market data refresh...");
    
    try {
      const startTime = Date.now();
      
      // Check API status (returns 0 since no API configured)
      const apiStatus = await stockDataService.getApiStatus();
      console.log(`📊 API Status: ${apiStatus.resetTime}`);
      
      // Get latest stock data (returns empty array)
      console.log(`📊 No API configured - ready for new integration`);
      const liveData = await stockDataService.getLatestStockData();
      
      if (liveData.length === 0) {
        console.log("⚠️ No API configured - keeping existing data");
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
      console.log(`📈 Updated ${liveData.length} stocks with live data`);
      
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
      const summary = await stockDataService.calculateMarketSummary(allStocks);
      
      await storage.updateMarketSummary(summary);
      console.log("✅ Market summary updated");
      
    } catch (error) {
      console.error("❌ Error updating market summary:", error);
    }
  }

  async manualRefresh(): Promise<{ message: string; updatedStocks: number }> {
    if (this.isRefreshing) {
      throw new Error("Refresh already in progress");
    }

    await this.refreshData();
    
    const allStocks = await storage.getStocks();
    return {
      message: "Market data refreshed successfully",
      updatedStocks: allStocks.length
    };
  }

  getRefreshStatus() {
    return {
      isRefreshing: this.isRefreshing,
      autoRefreshActive: this.refreshInterval !== null,
      nextRefreshIn: this.REFRESH_INTERVAL_MS
    };
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log("🛑 Automatic refresh stopped");
    }
  }
}

export const dataRefreshService = new DataRefreshService();