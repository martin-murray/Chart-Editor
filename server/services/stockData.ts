import { type InsertStock, type InsertMarketSummary } from "@shared/schema";
import { polygonService } from "./polygonService";

// Polygon.io provides all stock data dynamically, no need for static lists

export class StockDataService {
  constructor() {
    // No API key needed here as Polygon service handles it
  }

  async getLatestStockData(): Promise<InsertStock[]> {
    try {
      console.log("🔄 Switching to Polygon.io for premium market data...");
      const stocks = await polygonService.getMarketMovers();
      console.log(`✅ Successfully fetched ${stocks.length} market movers from Polygon.io`);
      return stocks;
    } catch (error) {
      console.error('Error getting latest stock data from Polygon.io:', error);
      throw error;
    }
  }

  async getApiStatus(): Promise<{remainingRequests: number, resetTime?: string}> {
    try {
      return await polygonService.getApiStatus();
    } catch (error) {
      console.error('Error getting API status:', error);
      return { remainingRequests: 0, resetTime: "Unknown" };
    }
  }

  async getMarketStatus() {
    try {
      return await polygonService.getMarketStatus();
    } catch (error) {
      console.error('Error getting market status:', error);
      throw error;
    }
  }

  async calculateMarketSummary(stocks: InsertStock[]): Promise<InsertMarketSummary> {
    const gainers = stocks.filter(stock => parseFloat(stock.percentChange) > 0);
    const losers = stocks.filter(stock => parseFloat(stock.percentChange) < 0);
    
    const avgGainerChange = gainers.length > 0 
      ? (gainers.reduce((sum, stock) => sum + parseFloat(stock.percentChange), 0) / gainers.length).toFixed(3)
      : "0.000";
    
    const avgLoserChange = losers.length > 0
      ? (losers.reduce((sum, stock) => sum + parseFloat(stock.percentChange), 0) / losers.length).toFixed(3)
      : "0.000";

    const totalMarketCapValue = stocks.reduce((sum, stock) => sum + parseFloat(stock.marketCapValue), 0);
    const totalVolume = stocks.reduce((sum, stock) => sum + stock.volume, 0);

    // Calculate volatility based on average absolute change
    const avgAbsChange = stocks.reduce((sum, stock) => sum + Math.abs(parseFloat(stock.percentChange)), 0) / stocks.length;
    let volatility = "Low";
    if (avgAbsChange > 3) volatility = "High";
    else if (avgAbsChange > 1.5) volatility = "Moderate";

    // Find sector with most gainers
    const sectorCounts = stocks.reduce((acc, stock) => {
      if (parseFloat(stock.percentChange) > 0) {
        acc[stock.sector] = (acc[stock.sector] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const sectorLeader = Object.keys(sectorCounts).reduce((a, b) => 
      (sectorCounts[a] || 0) > (sectorCounts[b] || 0) ? a : b, "Technology"
    );

    const formatMarketCap = (value: number): string => {
      if (value >= 1e12) {
        return `$${(value / 1e12).toFixed(2)}T`;
      } else if (value >= 1e9) {
        return `$${(value / 1e9).toFixed(1)}B`;
      } else if (value >= 1e6) {
        return `$${(value / 1e6).toFixed(1)}M`;
      }
      return `$${value.toFixed(0)}`;
    };

    return {
      totalMovers: stocks.length,
      totalGainers: gainers.length,
      totalLosers: losers.length,
      totalMarketCap: formatMarketCap(totalMarketCapValue),
      avgGainerChange,
      avgLoserChange,
      avgVolume: `${(totalVolume / 1000000).toFixed(1)}M`,
      volatility,
      sectorLeader,
    };
  }
}

export const stockDataService = new StockDataService();