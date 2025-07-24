import type { InsertStock } from "@shared/schema";

interface AlpacaMoverData {
  symbol: string;
  percent_change: number;
  change: number;
  price: number;
}

interface AlpacaMoversResponse {
  gainers: AlpacaMoverData[];
  losers: AlpacaMoverData[];
}

export class AlpacaService {
  private apiKey: string;
  private baseUrl = "https://data.alpaca.markets";

  constructor() {
    this.apiKey = process.env.ALPACA_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("ALPACA_API_KEY environment variable is required");
    }
  }

  /**
   * Get market movers data using Alpaca Markets API
   */
  async getMarketMovers(): Promise<InsertStock[]> {
    try {
      console.log("📊 Fetching market movers from Alpaca Markets API...");
      
      const url = `${this.baseUrl}/v1beta1/screener/stocks/movers`;
      
      const response = await fetch(url, {
        headers: {
          'APCA-API-KEY-ID': this.apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Alpaca API error: ${response.status} ${response.statusText}`);
      }

      const data: AlpacaMoversResponse = await response.json();
      
      const gainers = data.gainers || [];
      const losers = data.losers || [];
      
      console.log(`📊 Alpaca API: ${gainers.length} gainers, ${losers.length} losers`);
      
      // Combine both gainers and losers
      const allMovers = [...gainers, ...losers];
      
      console.log(`📈 Processing ${allMovers.length} market movers from Alpaca API`);
      
      // Convert to our stock format
      const stocks: InsertStock[] = [];
      
      for (const mover of allMovers) {
        // Filter for significant movers with minimum price
        if (Math.abs(mover.percent_change) >= 1.0 && mover.price >= 10) {
          const marketCap = this.estimateMarketCap(mover.symbol, mover.price);
          const marketCapFormatted = this.formatMarketCap(marketCap);
          
          // Determine sector and indices
          const sector = this.determineSectorFromTicker(mover.symbol);
          const indices = this.determineIndices(mover.symbol, marketCap);
          
          stocks.push({
            symbol: mover.symbol,
            name: this.getCompanyName(mover.symbol),
            price: mover.price.toFixed(2),
            change: mover.change.toFixed(2),
            percentChange: mover.percent_change.toFixed(3),
            marketCap: marketCapFormatted,
            marketCapValue: marketCap.toFixed(2),
            volume: this.estimateVolume(mover.price, Math.abs(mover.percent_change)),
            indices: indices,
            sector: sector,
          });
        }
      }
      
      console.log(`✅ Successfully processed ${stocks.length} stocks from Alpaca Markets`);
      return stocks;
      
    } catch (error) {
      console.error("Error fetching data from Alpaca Markets:", error);
      throw error;
    }
  }

  /**
   * Estimate market cap based on ticker and price
   */
  private estimateMarketCap(ticker: string, price: number): number {
    // Known market caps for major stocks
    const knownMarketCaps: Record<string, number> = {
      "AAPL": 3200000000000, // ~$3.2T
      "MSFT": 2800000000000, // ~$2.8T
      "GOOGL": 2000000000000, // ~$2T
      "AMZN": 1500000000000, // ~$1.5T
      "NVDA": 1400000000000, // ~$1.4T
      "TSLA": 800000000000,  // ~$800B
      "META": 700000000000,  // ~$700B
      "JPM": 500000000000,   // ~$500B
      "JNJ": 450000000000,   // ~$450B
      "V": 400000000000,     // ~$400B
    };
    
    if (knownMarketCaps[ticker]) {
      return knownMarketCaps[ticker];
    }
    
    // Estimate based on price with realistic variation
    const baseMultiplier = Math.random() * 0.8 + 0.6; // Random factor between 0.6-1.4
    
    if (price > 500) return Math.floor(100000000000 * baseMultiplier); // $60B-$140B Large cap
    if (price > 100) return Math.floor(50000000000 * baseMultiplier);  // $30B-$70B Large cap
    if (price > 50) return Math.floor(20000000000 * baseMultiplier);   // $12B-$28B Mid cap
    if (price > 25) return Math.floor(10000000000 * baseMultiplier);   // $6B-$14B Small cap
    if (price > 10) return Math.floor(5000000000 * baseMultiplier);    // $3B-$7B Small cap
    return Math.floor(2000000000 * baseMultiplier); // $1.2B-$2.8B Minimum
  }

  /**
   * Estimate trading volume based on price and volatility
   */
  private estimateVolume(price: number, percentChange: number): number {
    // Higher volatility typically means higher volume
    const volatilityFactor = Math.max(1, percentChange / 2);
    const basePriceVolume = price > 100 ? 1000000 : price > 50 ? 2000000 : 5000000;
    return Math.floor(basePriceVolume * volatilityFactor * (0.5 + Math.random()));
  }

  /**
   * Get company name for ticker
   */
  private getCompanyName(ticker: string): string {
    const companyNames: Record<string, string> = {
      "AAPL": "Apple Inc.",
      "MSFT": "Microsoft Corporation",
      "GOOGL": "Alphabet Inc.",
      "AMZN": "Amazon.com Inc.",
      "NVDA": "NVIDIA Corporation",
      "TSLA": "Tesla Inc.",
      "META": "Meta Platforms Inc.",
      "JPM": "JPMorgan Chase & Co.",
      "JNJ": "Johnson & Johnson",
      "V": "Visa Inc.",
      "PG": "Procter & Gamble Co.",
      "HD": "Home Depot Inc.",
      "ABBV": "AbbVie Inc.",
      "XOM": "Exxon Mobil Corporation",
      "KO": "Coca-Cola Company",
      "PEP": "PepsiCo Inc.",
      "BAC": "Bank of America Corp.",
      "TMO": "Thermo Fisher Scientific",
      "COST": "Costco Wholesale Corp.",
      "WMT": "Walmart Inc.",
      "DIS": "Walt Disney Company",
      "NFLX": "Netflix Inc.",
      "AMD": "Advanced Micro Devices",
      "VZ": "Verizon Communications",
      "ADBE": "Adobe Inc.",
      "NKE": "Nike Inc.",
      "NEE": "NextEra Energy Inc.",
      "BMY": "Bristol Myers Squibb",
      "QCOM": "Qualcomm Inc.",
      "HON": "Honeywell International",
      "LOW": "Lowe's Companies Inc.",
    };
    
    return companyNames[ticker] || `${ticker} Inc.`;
  }

  /**
   * Determine sector from ticker
   */
  private determineSectorFromTicker(ticker: string): string {
    const sectorMap: Record<string, string> = {
      "AAPL": "Technology",
      "MSFT": "Technology", 
      "GOOGL": "Technology",
      "AMZN": "Consumer Discretionary",
      "NVDA": "Technology",
      "TSLA": "Consumer Discretionary",
      "META": "Technology",
      "JPM": "Financial Services",
      "JNJ": "Healthcare",
      "V": "Financial Services",
      "PG": "Consumer Staples",
      "HD": "Consumer Discretionary",
      "ABBV": "Healthcare",
      "XOM": "Energy",
      "KO": "Consumer Staples",
      "PEP": "Consumer Staples",
      "BAC": "Financial Services",
      "TMO": "Healthcare",
      "COST": "Consumer Staples",
      "WMT": "Consumer Staples",
      "DIS": "Communication Services",
      "NFLX": "Communication Services",
      "AMD": "Technology",
      "VZ": "Communication Services",
      "ADBE": "Technology",
      "NKE": "Consumer Discretionary",
      "NEE": "Utilities",
      "BMY": "Healthcare",
      "QCOM": "Technology",
      "HON": "Industrials",
      "LOW": "Consumer Discretionary",
    };
    
    return sectorMap[ticker] || "Technology"; // Default fallback
  }

  /**
   * Format market cap value to readable string
   */
  private formatMarketCap(marketCap: number): string {
    if (marketCap >= 1e12) {
      return `$${(marketCap / 1e12).toFixed(1)}T`;
    } else if (marketCap >= 1e9) {
      return `$${(marketCap / 1e9).toFixed(1)}B`;
    } else if (marketCap >= 1e6) {
      return `$${(marketCap / 1e6).toFixed(1)}M`;
    } else {
      return `$${marketCap.toFixed(0)}`;
    }
  }

  /**
   * Determine index membership based on ticker and market cap
   */
  private determineIndices(ticker: string, marketCap: number): string[] {
    const indices: string[] = [];
    
    // Russell indices based on market cap
    if (marketCap >= 1e9) {
      indices.push("Russell 1000");
    }
    if (marketCap >= 2e9) {
      indices.push("Russell 3000");
    }
    
    // S&P 500 (simplified - major large caps)
    if (marketCap >= 50e9) {
      indices.push("S&P 500");
    }
    
    // NASDAQ 100 (tech-focused large caps)
    if (marketCap >= 10e9 && this.isNasdaqListed(ticker)) {
      indices.push("NASDAQ 100");
    }
    
    return indices.length > 0 ? indices : ["Russell 1000"];
  }

  /**
   * Check if ticker is likely NASDAQ-listed
   */
  private isNasdaqListed(ticker: string): boolean {
    return ticker.length <= 4 || 
           ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NFLX', 'NVDA'].includes(ticker);
  }

  /**
   * Get API usage information
   */
  async getApiStatus(): Promise<{remainingRequests: number, resetTime?: string}> {
    // Alpaca has generous rate limits for market data
    return {
      remainingRequests: 1000, // Placeholder - actual limits depend on plan
      resetTime: "Daily reset at midnight UTC"
    };
  }

  /**
   * Get market status
   */
  async getMarketStatus(): Promise<{
    status: string;
    market: string;
    serverTime: string;
    exchanges: {
      name: string;
      status: string;
      nextOpenTime?: string;
      nextCloseTime?: string;
    }[];
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/calendar`, {
        headers: {
          'APCA-API-KEY-ID': this.apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Alpaca calendar API error: ${response.status}`);
      }

      // For now, use simple time-based market status
      const now = new Date();
      const hour = now.getHours();
      const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
      const isMarketHours = hour >= 9 && hour < 16; // 9:30 AM to 4:00 PM EST
      
      return {
        status: isWeekday && isMarketHours ? 'open' : 'closed',
        market: 'US',
        serverTime: now.toISOString(),
        exchanges: [{
          name: 'NYSE',
          status: isWeekday && isMarketHours ? 'open' : 'closed'
        }]
      };
    } catch (error) {
      console.error('Error fetching market status:', error);
      // Return fallback status based on time
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
  }
}

export const alpacaService = new AlpacaService();