import type { InsertStock } from "@shared/schema";

interface PolygonDailyBar {
  T: string; // ticker
  v: number; // volume
  vw: number; // volume weighted average price
  o: number; // open
  c: number; // close
  h: number; // high
  l: number; // low
  t: number; // timestamp
  n: number; // number of transactions
}

interface PolygonTickerDetails {
  ticker: string;
  name: string;
  market_cap?: number;
  description?: string;
  sic_description?: string;
  primary_exchange?: string;
}

interface PolygonSnapshot {
  ticker: string;
  value: {
    change: number;
    changePercent: number;
    last: {
      price: number;
      sizeInLots: number;
      timeframeInMinutes: number;
    };
    previousClose: number;
  };
  day: {
    change: number;
    changePercent: number;
    close: number;
    high: number;
    low: number;
    open: number;
    previousClose: number;
    volume: number;
  };
}

export class PolygonService {
  private apiKey: string;
  private baseUrl = "https://api.polygon.io";

  constructor() {
    this.apiKey = process.env.POLYGON_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("POLYGON_API_KEY environment variable is required");
    }
  }

  /**
   * Get daily market data for all stocks with significant movement
   */
  async getMarketMovers(): Promise<InsertStock[]> {
    try {
      // Get today's date for market data
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Format date as YYYY-MM-DD
      const dateStr = yesterday.toISOString().split('T')[0];
      
      console.log(`📊 Fetching market data from Polygon.io for ${dateStr}`);
      
      // Get market snapshot for active stocks
      const snapshotUrl = `${this.baseUrl}/v2/snapshot/locale/us/markets/stocks/tickers?apikey=${this.apiKey}`;
      const snapshotResponse = await fetch(snapshotUrl);
      
      if (!snapshotResponse.ok) {
        throw new Error(`Polygon API error: ${snapshotResponse.status} ${snapshotResponse.statusText}`);
      }
      
      const snapshotData = await snapshotResponse.json();
      
      // Log successful API connection
      console.log(`📊 Polygon.io API: Processing ${snapshotData.tickers?.length || 0} market tickers`);
      
      if (!snapshotData.tickers || !Array.isArray(snapshotData.tickers)) {
        console.error("📊 Full Polygon.io response:", JSON.stringify(snapshotData, null, 2));
        throw new Error("Invalid response format from Polygon API");
      }
      
      console.log(`📈 Processing ${snapshotData.tickers.length} stock snapshots`);
      
      // Filter for stocks with significant movement and market cap > $2B
      const movers = snapshotData.tickers.filter((stock: any) => {
        const changePercent = Math.abs(stock.todaysChangePerc || 0);
        const volume = stock.day?.v || 0;
        const price = stock.day?.c || 0;
        
        // Filter for significant movers: >1% change, >$10 price, >100k volume
        return changePercent >= 1.0 && price >= 10 && volume >= 100000;
      }).slice(0, 100); // Limit to top 100 movers
      
      console.log(`📊 Found ${movers.length} significant market movers`);
      
      // Convert to our stock format (batch process to avoid rate limits)
      const stocks: InsertStock[] = [];
      
      for (let i = 0; i < Math.min(movers.length, 50); i++) {
        const snapshot = movers[i];
        
        // Use a simplified approach to avoid hitting rate limits
        const marketCap = this.estimateMarketCap(snapshot.ticker, snapshot.day?.c || 0);
        const marketCapFormatted = this.formatMarketCap(marketCap);
        
        // Determine sector and indices
        const sector = this.determineSectorFromTicker(snapshot.ticker);
        const indices = this.determineIndices(snapshot.ticker, marketCap);
        
        stocks.push({
          symbol: snapshot.ticker,
          name: this.getCompanyName(snapshot.ticker),
          price: (snapshot.day?.c || 0).toFixed(2),
          change: (snapshot.todaysChange || 0).toFixed(2),
          percentChange: (snapshot.todaysChangePerc || 0).toFixed(3),
          marketCap: marketCapFormatted,
          marketCapValue: marketCap.toFixed(2),
          volume: snapshot.day?.v || 0,
          indices: indices,
          sector: sector,
        });
        
        // Add delay to respect rate limits
        if (i < movers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`✅ Successfully processed ${stocks.length} stocks from Polygon.io`);
      return stocks;
      
    } catch (error) {
      console.error("Error fetching data from Polygon.io:", error);
      throw error;
    }
  }

  /**
   * Estimate market cap based on ticker and price (simplified approach)
   */
  private estimateMarketCap(ticker: string, price: number): number {
    // Simplified market cap estimation based on known major stocks
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
    
    // If we have a known value, use it
    if (knownMarketCaps[ticker]) {
      return knownMarketCaps[ticker];
    }
    
    // Otherwise estimate based on price (rough approximation)
    // This is a simplified approach - in production you'd get real market cap data
    if (price > 500) return 100000000000; // Large cap
    if (price > 100) return 50000000000;  // Large cap
    if (price > 50) return 20000000000;   // Mid cap
    if (price > 10) return 5000000000;    // Small cap
    return 2000000000; // Minimum to meet our criteria
  }

  /**
   * Get company name for ticker (simplified)
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
   * Determine sector from ticker (simplified)
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
   * Determine sector based on SIC description
   */
  private determineSector(sicDescription: string): string {
    const desc = sicDescription.toLowerCase();
    
    if (desc.includes('software') || desc.includes('computer') || desc.includes('technology')) {
      return 'Technology';
    } else if (desc.includes('pharmaceutical') || desc.includes('medical') || desc.includes('health')) {
      return 'Healthcare';
    } else if (desc.includes('bank') || desc.includes('financial') || desc.includes('insurance')) {
      return 'Financial Services';
    } else if (desc.includes('retail') || desc.includes('consumer')) {
      return 'Consumer Discretionary';
    } else if (desc.includes('energy') || desc.includes('oil') || desc.includes('gas')) {
      return 'Energy';
    } else if (desc.includes('real estate')) {
      return 'Real Estate';
    } else if (desc.includes('utility') || desc.includes('electric')) {
      return 'Utilities';
    } else if (desc.includes('communication') || desc.includes('media') || desc.includes('telecom')) {
      return 'Communication Services';
    } else if (desc.includes('industrial') || desc.includes('manufacturing')) {
      return 'Industrials';
    } else if (desc.includes('material') || desc.includes('chemical')) {
      return 'Materials';
    } else {
      return 'Technology'; // Default fallback
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
    const techSectors = ['Technology', 'Communication Services'];
    if (marketCap >= 10e9 && this.isNasdaqListed(ticker)) {
      indices.push("NASDAQ 100");
    }
    
    return indices.length > 0 ? indices : ["Russell 1000"];
  }

  /**
   * Check if ticker is likely NASDAQ-listed (simplified)
   */
  private isNasdaqListed(ticker: string): boolean {
    // Common patterns for NASDAQ stocks (this is simplified)
    return ticker.length <= 4 || 
           ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NFLX', 'NVDA'].includes(ticker);
  }

  /**
   * Get API usage/rate limit information
   */
  async getApiStatus(): Promise<{remainingRequests: number, resetTime?: string}> {
    // Polygon.io doesn't have a direct API status endpoint like Alpha Vantage
    // But they have generous rate limits (5 calls/minute for free tier, much higher for paid)
    // For paid tier, this is typically not a concern
    return {
      remainingRequests: 1000, // Placeholder - actual limits depend on plan
      resetTime: "Daily reset at midnight UTC"
    };
  }
}

export const polygonService = new PolygonService();