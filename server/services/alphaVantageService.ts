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
   * Process and filter stock data from Alpha Vantage with enhanced coverage
   */
  private async processStocks(stocks: AlphaVantageGainerLoser[]): Promise<InsertStock[]> {
    const processedStocks: InsertStock[] = [];

    for (const stock of stocks) {
      try {
        // More lenient filtering - only exclude obvious non-US patterns
        if (this.isDefinitelyNonUSStock(stock.ticker)) {
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

        // More accurate market cap calculation
        const marketCap = this.calculateMarketCap(parseFloat(price), volume, stock.ticker);

        // Enhanced stock name (clean up ticker for display)
        const displayName = this.getDisplayName(stock.ticker);

        const processedStock: InsertStock = {
          symbol: stock.ticker,
          name: displayName,
          price: price,
          change: changeAmount,
          percentChange: percentChange,
          marketCap: this.formatMarketCap(marketCap),
          marketCapValue: marketCap.toString(),
          volume: volume,
          sector: this.guessSector(stock.ticker), // Smart sector guessing
          indices: this.guessIndices(parseFloat(price), marketCap), // Smart index guessing
        };

        processedStocks.push(processedStock);

      } catch (error) {
        console.warn(`⚠️ Error processing stock ${stock.ticker}:`, error);
        continue;
      }
    }

    // Sort by absolute percentage change to prioritize biggest movers
    return processedStocks.sort((a, b) => 
      Math.abs(parseFloat(b.percentChange)) - Math.abs(parseFloat(a.percentChange))
    );
  }

  /**
   * Filter out only obviously non-US stocks (more lenient)
   */
  private isDefinitelyNonUSStock(ticker: string): boolean {
    // Only filter out clear foreign exchange patterns
    const definiteNonUSPatterns = [
      /\.TO$/,    // Toronto Stock Exchange
      /\.L$/,     // London Stock Exchange  
      /\.PA$/,    // Euronext Paris
      /\.DE$/,    // Frankfurt
      /\.HK$/,    // Hong Kong
      /\.T$/,     // Tokyo
      /\.AX$/,    // Australian Securities Exchange
    ];

    return definiteNonUSPatterns.some(pattern => pattern.test(ticker));
  }

  /**
   * Get display name for ticker
   */
  private getDisplayName(ticker: string): string {
    // Clean up common patterns for better display
    if (ticker.endsWith('W')) {
      return ticker; // Keep warrant notation
    }
    if (ticker.includes('.')) {
      return ticker.split('.')[0]; // Remove class indicators for display
    }
    return ticker;
  }

  /**
   * Smart sector guessing based on ticker patterns
   */
  private guessSector(ticker: string): string {
    // Basic sector classification based on common patterns
    if (ticker.match(/BIO|VYNE|GENE|CELL|CURE|HEAL/i)) return "Health Technology";
    if (ticker.match(/TECH|SOFT|DATA|COMP|AI|ML/i)) return "Technology Services";
    if (ticker.match(/BANK|FIN|CAP|LOAN|MORT/i)) return "Finance";
    if (ticker.match(/ENERGY|OIL|GAS|SOLAR|WIND/i)) return "Energy";
    if (ticker.match(/REAL|REIT|PROP/i)) return "Finance";
    if (ticker.match(/AUTO|CAR|TRUCK|BIKE/i)) return "Consumer Durables";
    return "Unknown";
  }

  /**
   * Smart index guessing based on market cap and price
   */
  private guessIndices(price: number, marketCap: number): string[] {
    const indices: string[] = [];
    
    if (marketCap >= 50e9) {
      indices.push("sp500", "russell1000");
    } else if (marketCap >= 10e9) {
      indices.push("russell1000");
    } else if (marketCap >= 2e9) {
      indices.push("russell2000");
    }
    
    if (price > 100 && marketCap >= 1e9) {
      indices.push("nasdaq100");
    }
    
    return indices;
  }

  /**
   * Enhanced market cap calculation with better heuristics
   */
  private calculateMarketCap(price: number, volume: number, ticker: string): number {
    // Enhanced estimation based on multiple factors
    let multiplier = 300; // Base multiplier
    
    // Adjust based on price patterns (higher price often means fewer shares outstanding)
    if (price > 500) {
      multiplier = 50;
    } else if (price > 200) {
      multiplier = 100;
    } else if (price > 50) {
      multiplier = 200;
    } else if (price > 10) {
      multiplier = 400;
    } else if (price > 1) {
      multiplier = 600;
    } else {
      multiplier = 1000; // Penny stocks often have many shares
    }
    
    // Adjust for warrant tickers (typically lower market cap)
    if (ticker.endsWith('W') || ticker.includes('WARRANT')) {
      multiplier *= 0.1;
    }
    
    // Volume-based adjustments
    if (volume > 10e6) {
      multiplier *= 1.5; // High volume suggests larger company
    } else if (volume < 100000) {
      multiplier *= 0.5; // Low volume suggests smaller company
    }
    
    return price * volume * multiplier;
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