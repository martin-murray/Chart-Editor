import type { InsertStock, InsertMarketSummary } from "@shared/schema";
import { finnhubService } from "./finnhubService";
import { alphaVantageService } from "./alphaVantageService";

/**
 * Stock Data Service - Powered by Finnhub Premium API
 */
export class StockDataService {
  
  /**
   * Search stocks using Finnhub API
   */
  async searchStocks(query: string): Promise<InsertStock[]> {
    try {
      return await finnhubService.searchStocks(query);
    } catch (error) {
      console.error("Error searching stocks:", error);
      return [];
    }
  }

  /**
   * Get latest stock data - placeholder for future market movers endpoint
   */
  async getLatestStockData(): Promise<InsertStock[]> {
    console.log("📊 Finnhub configured - market movers endpoint to be implemented");
    return [];
  }

  /**
   * Get stock chart data using Finnhub API with Alpha Vantage fallback
   */
  async getStockChart(symbol: string, from: number, to: number, resolution: string): Promise<any> {
    try {
      console.log(`📈 Chart request - Symbol: ${symbol}, Resolution: ${resolution}`);
      
      // Try Finnhub first
      const finnhubData = await finnhubService.getStockCandles(symbol, from, to, resolution);
      
      console.log(`📈 Finnhub response - Has data: ${!!finnhubData}, Status: ${finnhubData?.s}, Points: ${finnhubData?.t?.length || 0}`);
      
      // If Finnhub returns data, use it
      if (finnhubData && finnhubData.s === 'ok' && finnhubData.t && finnhubData.t.length > 0) {
        console.log(`✅ Using Finnhub data for ${symbol}: ${finnhubData.t.length} points`);
        return finnhubData;
      }
      
      // If Finnhub has no data and resolution is daily, try Alpha Vantage
      // Alpha Vantage only provides daily data, not intraday
      if (resolution === 'D') {
        console.log(`⚠️  Finnhub has no data for ${symbol}, trying Alpha Vantage fallback...`);
        const alphaVantageData = await alphaVantageService.getStockCandles(symbol, from, to);
        
        if (alphaVantageData && alphaVantageData.s === 'ok' && alphaVantageData.t && alphaVantageData.t.length > 0) {
          console.log(`✅ Alpha Vantage fallback successful for ${symbol}: ${alphaVantageData.t.length} points`);
          return alphaVantageData;
        } else {
          console.log(`❌ Alpha Vantage also has no data for ${symbol}`);
        }
      } else {
        console.log(`⏭️  Skipping Alpha Vantage fallback - resolution is ${resolution}, not daily (D)`);
      }
      
      // No data from either source
      return finnhubData;
    } catch (error) {
      console.error("Error getting stock chart:", error);
      return null;
    }
  }

  /**
   * Get detailed stock information including pre/after market and stats
   */
  async getDetailedStockInfo(symbol: string): Promise<any> {
    try {
      return await finnhubService.getDetailedQuote(symbol);
    } catch (error) {
      console.error("Error getting detailed stock info:", error);
      return null;
    }
  }

  /**
   * Get earnings calendar data for a specific symbol
   */
  async getEarningsCalendar(symbol: string): Promise<any> {
    try {
      return await finnhubService.getEarningsCalendar(symbol);
    } catch (error) {
      console.error("Error getting earnings calendar:", error);
      return [];
    }
  }

  /**
   * Get market holidays for a specific exchange
   */
  async getMarketHolidays(exchange: string): Promise<any> {
    try {
      return await finnhubService.getMarketHolidays(exchange);
    } catch (error) {
      console.error("Error getting market holidays:", error);
      return null;
    }
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
   * Get market status from Finnhub
   */
  async getMarketStatus() {
    try {
      return await finnhubService.getMarketStatus();
    } catch (error) {
      console.error("Error getting market status:", error);
      // Fallback to basic calculation
      const now = new Date();
      const hour = now.getHours();
      const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
      const isMarketHours = hour >= 9 && hour < 16;
      
      return {
        status: isWeekday && isMarketHours ? 'open' : 'closed',
        market: 'US',
        serverTime: now.toISOString(),
        exchanges: [{
          name: 'US Market',
          status: isWeekday && isMarketHours ? 'open' : 'closed'
        }]
      };
    }
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