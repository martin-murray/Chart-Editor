import { marketDataService } from './marketDataService.js';
import type { InsertStock, InsertMarketSummary } from '@shared/schema.js';

/**
 * Data Refresh Service - Using Alpha Vantage Premium for comprehensive market movers
 */
export class DataRefreshService {
  private isRefreshing = false;
  private refreshInterval: NodeJS.Timeout | null = null;
  private readonly REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

  constructor() {
    console.log("🚀 Starting Alpha Vantage automatic market data refresh service...");
    this.startAutoRefresh();
  }

  private startAutoRefresh() {
    console.log("🕐 Starting automatic Alpha Vantage market data refresh...");
    
    // Initial refresh on startup
    this.refreshData();
    
    // Set up recurring refresh
    this.refreshInterval = setInterval(() => {
      this.refreshData();
    }, this.REFRESH_INTERVAL_MS);
    
    console.log("✅ Automatic Alpha Vantage refresh scheduled every 15 minutes");
  }

  async refreshData(): Promise<void> {
    if (this.isRefreshing) {
      console.log("⚠️ Alpha Vantage refresh already in progress - skipping");
      return;
    }

    this.isRefreshing = true;
    console.log("🔄 Starting automatic Alpha Vantage market data refresh...");
    
    try {
      const startTime = Date.now();
      
      // Use the market data service with Alpha Vantage Premium
      const result = await marketDataService.refreshMarketMovers();
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      if (result.success) {
        console.log(`✅ Alpha Vantage automatic refresh completed in ${duration.toFixed(1)}s`);
        console.log(`📈 Updated ${result.count} stocks with Alpha Vantage Premium data`);
      } else {
        console.log(`⚠️ Alpha Vantage automatic refresh failed: ${result.message}`);
      }
      
    } catch (error) {
      console.error("❌ Error during Alpha Vantage automatic refresh:", error);
    } finally {
      this.isRefreshing = false;
    }
  }

  async manualRefresh(): Promise<{ message: string; updatedStocks: number }> {
    if (this.isRefreshing) {
      throw new Error("Alpha Vantage refresh already in progress");
    }

    console.log("🔄 Starting manual Alpha Vantage refresh...");
    const result = await marketDataService.refreshMarketMovers();
    
    return {
      message: result.message,
      updatedStocks: result.count
    };
  }

  getRefreshStatus() {
    return {
      isRefreshing: this.isRefreshing,
      autoRefreshActive: this.refreshInterval !== null,
      nextRefreshIn: this.REFRESH_INTERVAL_MS,
      dataSource: "Alpha Vantage Premium"
    };
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log("🛑 Alpha Vantage automatic refresh stopped");
    }
  }
}

export const dataRefreshService = new DataRefreshService();