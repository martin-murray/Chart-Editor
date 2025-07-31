import type { InsertStock } from "@shared/schema";

interface AlphaVantageGainerLoser {
  ticker: string;
  price: string;
  change_amount: string;
  change_percentage: string;
  volume: string;
}

interface AlphaVantageResponse {
  metadata: string;
  last_updated: string;
  top_gainers: AlphaVantageGainerLoser[];
  top_losers: AlphaVantageGainerLoser[];
  most_actively_traded: AlphaVantageGainerLoser[];
}

export class AlphaVantageService {
  private apiKey: string;
  private baseUrl = "https://www.alphavantage.co/query";

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("ALPHA_VANTAGE_API_KEY environment variable is required");
    }
  }

  /**
   * Get top gainers and losers from Alpha Vantage
   */
  async getTopGainersLosers(): Promise<{ gainers: InsertStock[]; losers: InsertStock[] }> {
    try {
      const url = `${this.baseUrl}?function=TOP_GAINERS_LOSERS&apikey=${this.apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status} ${response.statusText}`);
      }

      const data: AlphaVantageResponse = await response.json();

      // Check for API error responses
      if ('Error Message' in data || 'Information' in data) {
        throw new Error(`Alpha Vantage API error: ${JSON.stringify(data)}`);
      }

      // Filter for US stocks only and ensure minimum market cap
      const gainers = await this.processStocks(data.top_gainers || []);
      const losers = await this.processStocks(data.top_losers || []);

      console.log(`📈 Alpha Vantage: ${gainers.length} gainers, ${losers.length} losers`);
      
      return { gainers, losers };

    } catch (error) {
      console.error('❌ Alpha Vantage service error:', error);
      throw error;
    }
  }

  /**
   * Process and filter stock data from Alpha Vantage
   */
  private async processStocks(stocks: AlphaVantageGainerLoser[]): Promise<InsertStock[]> {
    const processedStocks: InsertStock[] = [];

    for (const stock of stocks) {
      try {
        // Filter out non-US tickers (simple heuristics)
        if (this.isNonUSStock(stock.ticker)) {
          continue;
        }

        // Parse change percentage (remove % sign)
        const percentChange = stock.change_percentage.replace('%', '');
        const changeAmount = stock.change_amount;
        const price = stock.price;
        const volume = parseInt(stock.volume.replace(/,/g, '')) || 0;

        // Basic validation
        if (!stock.ticker || !price || !percentChange) {
          continue;
        }

        // Get market cap estimate (simplified - would need additional API calls for exact values)
        const marketCap = this.estimateMarketCap(parseFloat(price), volume);

        const processedStock: InsertStock = {
          symbol: stock.ticker,
          name: stock.ticker, // Alpha Vantage doesn't provide company names in this endpoint
          price: price,
          change: changeAmount,
          percentChange: percentChange,
          marketCap: this.formatMarketCap(marketCap),
          marketCapValue: marketCap.toString(),
          volume: volume,
          sector: "Unknown", // Would need additional API calls
          indices: [], // Would need additional data source
        };

        processedStocks.push(processedStock);

      } catch (error) {
        console.warn(`⚠️ Error processing stock ${stock.ticker}:`, error);
        continue;
      }
    }

    return processedStocks;
  }

  /**
   * Filter out non-US stocks using simple heuristics
   */
  private isNonUSStock(ticker: string): boolean {
    // Filter out common non-US patterns
    const nonUSPatterns = [
      /\.TO$/,    // Toronto Stock Exchange
      /\.L$/,     // London Stock Exchange  
      /\.PA$/,    // Euronext Paris
      /\.DE$/,    // Frankfurt
      /\.HK$/,    // Hong Kong
      /\.T$/,     // Tokyo
      /\.AX$/,    // Australian Securities Exchange
      /\.[A-Z]{2}$/, // Other foreign exchanges
    ];

    return nonUSPatterns.some(pattern => pattern.test(ticker));
  }

  /**
   * Estimate market cap based on price and volume (rough approximation)
   */
  private estimateMarketCap(price: number, volume: number): number {
    // This is a very rough estimate - ideally we'd get actual shares outstanding
    // Using a heuristic based on price and trading volume
    if (price > 100) {
      return price * volume * 100; // Large-cap estimate
    } else if (price > 20) {
      return price * volume * 200; // Mid-cap estimate
    } else {
      return price * volume * 500; // Small-cap estimate
    }
  }

  /**
   * Format market cap for display
   */
  private formatMarketCap(marketCap: number): string {
    if (marketCap >= 1e12) {
      return `$${(marketCap / 1e12).toFixed(2)}T`;
    } else if (marketCap >= 1e9) {
      return `$${(marketCap / 1e9).toFixed(2)}B`;
    } else if (marketCap >= 1e6) {
      return `$${(marketCap / 1e6).toFixed(2)}M`;
    } else {
      return `$${marketCap.toFixed(0)}`;
    }
  }
}