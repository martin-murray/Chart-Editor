import type { InsertStock } from "@shared/schema";

interface PolygonSnapshot {
  ticker: string;
  value: number;
  updated: number;
  min?: {
    t: number;
    n: number;
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
    vw: number;
  };
  prevDay?: {
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
    vw: number;
  };
  day?: {
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
    vw: number;
  };
}

interface PolygonResponse {
  status: string;
  request_id: string;
  results: PolygonSnapshot[];
  count: number;
}

interface PolygonTickerDetails {
  ticker: string;
  name: string;
  market: string;
  locale: string;
  primary_exchange: string;
  type: string;
  active: boolean;
  currency_name: string;
  cik?: string;
  composite_figi?: string;
  share_class_figi?: string;
  market_cap?: number;
  phone_number?: string;
  address?: {
    address1?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  };
  description?: string;
  sic_code?: string;
  sic_description?: string;
  ticker_root?: string;
  homepage_url?: string;
  total_employees?: number;
  list_date?: string;
  branding?: {
    logo_url?: string;
    icon_url?: string;
  };
  share_class_shares_outstanding?: number;
  weighted_shares_outstanding?: number;
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
   * Get comprehensive market movers from Polygon API
   */
  async getComprehensiveMarketMovers(): Promise<{ gainers: InsertStock[]; losers: InsertStock[] }> {
    try {
      console.log('📊 Fetching comprehensive market movers from Polygon...');

      // Get both gainers and losers in parallel
      const [gainersResponse, losersResponse] = await Promise.all([
        this.getMarketMovers('gainers'),
        this.getMarketMovers('losers')
      ]);

      // Process and enrich the data
      const [gainers, losers] = await Promise.all([
        this.processSnapshots(gainersResponse, 'gainers'),
        this.processSnapshots(losersResponse, 'losers')
      ]);

      console.log(`📈 Polygon: ${gainers.length} gainers, ${losers.length} losers`);
      
      return { gainers, losers };

    } catch (error) {
      console.error('❌ Polygon service error:', error);
      throw error;
    }
  }

  /**
   * Get market movers (gainers or losers) from Polygon API
   */
  private async getMarketMovers(direction: 'gainers' | 'losers'): Promise<PolygonSnapshot[]> {
    const url = `${this.baseUrl}/v2/snapshot/locale/us/markets/stocks/${direction}`;
    
    const response = await fetch(`${url}?apikey=${this.apiKey}&include_otc=false`);
    
    if (!response.ok) {
      throw new Error(`Polygon API error: ${response.status} ${response.statusText}`);
    }

    const data: PolygonResponse = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Polygon API returned status: ${data.status}`);
    }

    return data.results || [];
  }

  /**
   * Process snapshots and convert to our stock format
   */
  private async processSnapshots(snapshots: PolygonSnapshot[], type: 'gainers' | 'losers'): Promise<InsertStock[]> {
    const stocks: InsertStock[] = [];

    for (const snapshot of snapshots) {
      try {
        // Filter out non-US tickers and penny stocks
        if (this.isNonUSStock(snapshot.ticker) || !snapshot.prevDay?.c || snapshot.prevDay.c < 1) {
          continue;
        }

        // Calculate percent change
        const currentPrice = snapshot.value;
        const previousClose = snapshot.prevDay.c;
        const change = currentPrice - previousClose;
        const percentChange = ((change / previousClose) * 100);

        // Only include stocks with significant moves
        const absPercentChange = Math.abs(percentChange);
        if (absPercentChange < 1) {
          continue;
        }

        // Get volume data
        const volume = snapshot.day?.v || snapshot.min?.v || 0;

        // Estimate market cap (would need additional API calls for exact values)
        const estimatedMarketCap = this.estimateMarketCap(currentPrice, volume);

        const stock: InsertStock = {
          symbol: snapshot.ticker,
          name: snapshot.ticker, // We'll enhance this with company names later
          price: currentPrice.toFixed(2),
          change: change.toFixed(2),
          percentChange: percentChange.toFixed(3),
          marketCap: this.formatMarketCap(estimatedMarketCap),
          marketCapValue: estimatedMarketCap.toString(),
          volume: volume,
          sector: "Unknown", // Would need additional API calls
          indices: [], // Would need additional data source
        };

        stocks.push(stock);

      } catch (error) {
        console.warn(`⚠️ Error processing stock ${snapshot.ticker}:`, error);
        continue;
      }
    }

    // Sort by absolute percent change and return top stocks
    const sortedStocks = stocks.sort((a, b) => 
      Math.abs(parseFloat(b.percentChange)) - Math.abs(parseFloat(a.percentChange))
    );

    return sortedStocks.slice(0, 50); // Return top 50 movers
  }

  /**
   * Enhanced method to get company details for better names and data
   */
  async getTickerDetails(ticker: string): Promise<PolygonTickerDetails | null> {
    try {
      const url = `${this.baseUrl}/v3/reference/tickers/${ticker}`;
      const response = await fetch(`${url}?apikey=${this.apiKey}`);
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.results || null;

    } catch (error) {
      console.warn(`⚠️ Error getting ticker details for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Filter out non-US stocks using enhanced heuristics
   */
  private isNonUSStock(ticker: string): boolean {
    // Filter out common non-US patterns and OTC/Pink Sheets
    const nonUSPatterns = [
      /\.TO$/,    // Toronto
      /\.L$/,     // London
      /\.PA$/,    // Paris
      /\.DE$/,    // Frankfurt
      /\.HK$/,    // Hong Kong
      /\.T$/,     // Tokyo
      /\.AX$/,    // Australia
      /\.[A-Z]{2}$/,  // Other foreign exchanges
      /[A-Z]{5,}$/,   // Long OTC tickers
      /[A-Z]{4}[F]$/,  // Foreign ordinaries
    ];

    // Also filter out OTC/Pink Sheet patterns
    if (ticker.length > 4 && !ticker.includes('.')) {
      return true; // Likely OTC
    }

    return nonUSPatterns.some(pattern => pattern.test(ticker));
  }

  /**
   * Enhanced market cap estimation
   */
  private estimateMarketCap(price: number, volume: number): number {
    // More sophisticated estimation based on price and volume patterns
    if (price > 200) {
      return price * volume * 150; // Large-cap estimate
    } else if (price > 50) {
      return price * volume * 300; // Mid-cap estimate
    } else if (price > 10) {
      return price * volume * 500; // Small-cap estimate
    } else {
      return price * volume * 1000; // Micro-cap estimate
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

  /**
   * Get all active US stocks for comprehensive screening
   */
  async getAllActiveUSStocks(limit: number = 1000): Promise<PolygonTickerDetails[]> {
    try {
      const url = `${this.baseUrl}/v3/reference/tickers`;
      const params = new URLSearchParams({
        market: 'stocks',
        type: 'CS', // Common Stock
        active: 'true',
        limit: limit.toString(),
        apikey: this.apiKey
      });

      const response = await fetch(`${url}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Polygon API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.results || [];

    } catch (error) {
      console.error('❌ Error getting all active US stocks:', error);
      throw error;
    }
  }
}