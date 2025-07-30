import type { InsertStock, InsertMarketSummary } from "@shared/schema";

/**
 * Mock Stock Data Service - Clean slate for new API integration
 * All external API dependencies have been removed
 */
export class StockDataService {
  
  /**
   * Get latest stock data - currently returns empty array
   * Ready for new API integration
   */
  async getLatestStockData(): Promise<InsertStock[]> {
    console.log("📊 No API configured - ready for new integration");
    return [];
  }

  /**
   * Get API status - placeholder for new API
   */
  async getApiStatus(): Promise<{remainingRequests: number, resetTime?: string}> {
    return {
      remainingRequests: 0,
      resetTime: "No API configured"
    };
  }

  /**
   * Get market status - basic time-based calculation
   */
  async getMarketStatus() {
    const now = new Date();
    const hour = now.getHours();
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
    const isMarketHours = hour >= 9 && hour < 16;
    
    return {
      status: isWeekday && isMarketHours ? 'open' : 'closed',
      market: 'US',
      serverTime: now.toISOString(),
      exchanges: [{
        name: 'NYSE',
        status: isWeekday && isMarketHours ? 'open' : 'closed'
      }]
    };
  }

  /**
   * Calculate market summary from stock data
   */
  async calculateMarketSummary(stocks: InsertStock[]): Promise<InsertMarketSummary> {
    const gainers = stocks.filter(stock => parseFloat(stock.percentChange) > 0);
    const losers = stocks.filter(stock => parseFloat(stock.percentChange) < 0);
    
    const avgGainerChange = gainers.length > 0 
      ? (gainers.reduce((sum, stock) => sum + parseFloat(stock.percentChange), 0) / gainers.length).toFixed(3)
      : "0.000";
    
    const avgLoserChange = losers.length > 0
      ? (losers.reduce((sum, stock) => sum + parseFloat(stock.percentChange), 0) / losers.length).toFixed(3)
      : "0.000";

    return {
      totalMovers: stocks.length,
      totalGainers: gainers.length,
      totalLosers: losers.length,
      avgGainerChange,
      avgLoserChange,
      totalMarketCap: "0",
      avgVolume: "0",
      volatility: "low",
      sectorLeader: "Technology",
      // lastUpdated automatically set by database
    };
  }
}

export const stockDataService = new StockDataService();