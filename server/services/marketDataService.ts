import { FinnhubService } from './finnhubService.js';
import { AlphaVantageService } from './alphaVantageService.js';
import { PolygonService } from './polygonService.js';
import { storage } from '../storage.js';
import type { InsertStock, InsertMarketSummary } from '@shared/schema.js';

export class MarketDataService {
  private finnhub: FinnhubService;
  private alphaVantage: AlphaVantageService | null = null;
  private polygon: PolygonService | null = null;

  constructor() {
    this.finnhub = new FinnhubService();
    try {
      this.alphaVantage = new AlphaVantageService();
    } catch (error) {
      console.warn('⚠️ Alpha Vantage service not available:', error);
    }
    try {
      this.polygon = new PolygonService();
    } catch (error) {
      console.warn('⚠️ Polygon service not available:', error);
    }
  }

  /**
   * Refresh market movers data using Polygon (primary), Alpha Vantage, or Finnhub (fallback)
   */
  async refreshMarketMovers(): Promise<{ success: boolean; count: number; message: string }> {
    try {
      console.log('🔄 Starting comprehensive market movers refresh...');

      let gainers: InsertStock[] = [];
      let losers: InsertStock[] = [];
      let dataSource = '';

      // Try Polygon first (most comprehensive data like TradingView)
      if (this.polygon) {
        try {
          console.log('📊 Using Polygon for TradingView-level comprehensive market movers...');
          const polygonData = await this.polygon.getComprehensiveMarketMovers();
          gainers = polygonData.gainers;
          losers = polygonData.losers;
          dataSource = 'Polygon';
        } catch (error) {
          console.warn('⚠️ Polygon failed, falling back to Alpha Vantage:', error);
        }
      }

      // Fallback to Alpha Vantage if Polygon failed
      if (gainers.length === 0 && losers.length === 0 && this.alphaVantage) {
        try {
          console.log('📊 Using Alpha Vantage for market movers...');
          const alphaData = await this.alphaVantage.getTopGainersLosers();
          gainers = alphaData.gainers;
          losers = alphaData.losers;
          dataSource = 'Alpha Vantage';
        } catch (error) {
          console.warn('⚠️ Alpha Vantage failed, falling back to Finnhub:', error);
        }
      }

      // Final fallback to Finnhub if other sources failed
      if (gainers.length === 0 && losers.length === 0) {
        console.log('📊 Using Finnhub for limited market movers...');
        const finnhubData = await this.finnhub.getMarketMovers(25);
        gainers = finnhubData.gainers;
        losers = finnhubData.losers;
        dataSource = 'Finnhub';
      }
      
      if (gainers.length === 0 && losers.length === 0) {
        return {
          success: false,
          count: 0,
          message: 'No market movers data available from any source'
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

      console.log(`✅ Comprehensive market movers refresh complete: ${insertedCount} stocks updated from ${dataSource}`);
      
      return {
        success: true,
        count: insertedCount,
        message: `Successfully updated ${insertedCount} comprehensive market movers from ${dataSource}`
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