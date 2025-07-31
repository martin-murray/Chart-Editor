import { FinnhubService } from './finnhubService.js';
import { storage } from '../storage.js';
import type { InsertStock, InsertMarketSummary } from '@shared/schema.js';

export class MarketDataService {
  private finnhub: FinnhubService;

  constructor() {
    this.finnhub = new FinnhubService();
  }

  /**
   * Refresh market movers data from Finnhub API
   */
  async refreshMarketMovers(): Promise<{ success: boolean; count: number; message: string }> {
    try {
      console.log('🔄 Starting market movers refresh with Finnhub data...');

      // Get fresh market movers from Finnhub
      const { gainers, losers } = await this.finnhub.getMarketMovers(25);
      
      if (gainers.length === 0 && losers.length === 0) {
        return {
          success: false,
          count: 0,
          message: 'No market movers data available from Finnhub'
        };
      }

      // Combine all stocks
      const allStocks = [...gainers, ...losers];

      // Clear existing stocks and insert new ones
      await storage.clearAllStocks();
      
      // Insert new market movers data
      let insertedCount = 0;
      for (const stock of allStocks) {
        try {
          await storage.createStock(stock);
          insertedCount++;
        } catch (error) {
          console.error(`Error inserting stock ${stock.symbol}:`, error);
        }
      }

      // Update market summary
      await this.updateMarketSummary(allStocks);

      console.log(`✅ Market movers refresh complete: ${insertedCount} stocks updated`);
      
      return {
        success: true,
        count: insertedCount,
        message: `Successfully updated ${insertedCount} market movers from Finnhub`
      };

    } catch (error) {
      console.error('❌ Market movers refresh failed:', error);
      return {
        success: false,
        count: 0,
        message: `Market movers refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Update market summary based on current stock data
   */
  private async updateMarketSummary(stocks: InsertStock[]): Promise<void> {
    try {
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

      // Determine volatility based on average changes
      const avgAbsChange = stocks.reduce((sum, stock) => sum + Math.abs(parseFloat(stock.percentChange)), 0) / stocks.length;
      let volatility = "Low";
      if (avgAbsChange > 3) volatility = "High";
      else if (avgAbsChange > 1.5) volatility = "Moderate";

      // Find sector with most gainers
      const sectorCounts = stocks.reduce((acc, stock) => {
        acc[stock.sector] = (acc[stock.sector] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const sectorLeader = Object.entries(sectorCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || "Technology";

      const summaryData: InsertMarketSummary = {
        totalMovers: stocks.length,
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
      console.log('📊 Market summary updated with Finnhub data');

    } catch (error) {
      console.error('Error updating market summary:', error);
    }
  }

  /**
   * Get market movers refresh status
   */
  async getRefreshStatus(): Promise<{
    isRefreshing: boolean;
    autoRefreshActive: boolean;
    lastRefresh?: string;
  }> {
    // For now, return basic status - could be enhanced with database tracking
    return {
      isRefreshing: false,
      autoRefreshActive: true,
      lastRefresh: new Date().toISOString()
    };
  }
}

export const marketDataService = new MarketDataService();