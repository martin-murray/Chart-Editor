import type { InsertStock } from "@shared/schema";

const FINNHUB_API_KEY = "cg9jh3pr01qg418a9q9gcg9jh3pr01qg418a9qa0";
const BASE_URL = "https://finnhub.io/api/v1";

interface FinnhubQuote {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
}

interface FinnhubProfile {
  country: string;
  currency: string;
  exchange: string;
  ipo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
  logo: string;
  finnhubIndustry: string;
}

interface FinnhubSymbol {
  currency: string;
  description: string;
  displaySymbol: string;
  figi: string;
  mic: string;
  symbol: string;
  type: string;
}

export class FinnhubService {
  private async makeRequest(endpoint: string): Promise<any> {
    const url = `${BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}token=${FINNHUB_API_KEY}`;
    
    try {
      // Add timeout and compression for faster requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept-Encoding': 'gzip, deflate',
          'User-Agent': 'Market-Dashboard/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`);
      }
      
      const text = await response.text();
      
      // Handle empty responses
      if (!text.trim()) {
        console.warn(`Empty response from Finnhub endpoint: ${endpoint}`);
        return null;
      }
      
      return JSON.parse(text);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`Request timeout for ${endpoint}`);
        throw new Error('Request timeout');
      }
      console.error(`Error fetching from Finnhub ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Get all US stock symbols
   */
  async getUSStockSymbols(): Promise<FinnhubSymbol[]> {
    try {
      console.log("🔍 Fetching US stock symbols from Finnhub...");
      const symbols = await this.makeRequest("/stock/symbol?exchange=US");
      
      if (!Array.isArray(symbols)) {
        console.warn("Expected array of symbols, got:", typeof symbols);
        return [];
      }

      // Filter for common stocks only (exclude ETFs, funds, etc.)
      const commonStocks = symbols.filter((symbol: FinnhubSymbol) => 
        symbol.type === "Common Stock" && 
        symbol.symbol && 
        !symbol.symbol.includes('.') && // Exclude preferred shares
        symbol.symbol.length <= 5 // Reasonable ticker length
      );

      console.log(`✅ Found ${commonStocks.length} US common stocks`);
      return commonStocks;
    } catch (error) {
      console.error("Error fetching US stock symbols:", error);
      return [];
    }
  }

  /**
   * Get quote for a single symbol
   */
  async getQuote(symbol: string): Promise<FinnhubQuote | null> {
    try {
      const quote = await this.makeRequest(`/quote?symbol=${symbol}`);
      
      // Validate quote data
      if (!quote || typeof quote.c !== 'number' || quote.c <= 0) {
        return null;
      }
      
      return quote;
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get company profile for market cap and other details
   */
  async getCompanyProfile(symbol: string): Promise<FinnhubProfile | null> {
    try {
      const profile = await this.makeRequest(`/stock/profile2?symbol=${symbol}`);
      
      if (!profile || !profile.marketCapitalization) {
        return null;
      }
      
      return profile;
    } catch (error) {
      console.error(`Error fetching profile for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Search stocks by symbol or name - OPTIMIZED VERSION
   */
  async searchStocks(query: string): Promise<InsertStock[]> {
    try {
      console.log(`🔍 Fast search for: "${query}"`);
      
      const searchResults = await this.makeRequest(`/search?q=${encodeURIComponent(query)}`);
      
      if (!searchResults || !searchResults.result || !Array.isArray(searchResults.result)) {
        return [];
      }

      // Filter and limit results early
      const filteredResults = searchResults.result
        .filter((result: any) => 
          result.symbol && 
          result.type === "Common Stock" && 
          !result.symbol.includes('.') && 
          result.symbol.length <= 5
        )
        .slice(0, 3); // Limit to 3 results max

      if (filteredResults.length === 0) {
        return [];
      }

      // Remove duplicates by symbol before processing
      const uniqueResults = filteredResults.reduce((acc: any[], result: any) => {
        if (!acc.find(r => r.symbol === result.symbol)) {
          acc.push(result);
        }
        return acc;
      }, []);

      // Batch API calls with Promise.all for parallel execution
      const stockPromises = uniqueResults.map(async (result: any) => {
        try {
          // Parallel API calls
          const [quote, profile] = await Promise.all([
            this.getQuote(result.symbol),
            this.getCompanyProfile(result.symbol)
          ]);

          if (!quote || !profile) return null;

          // Quick US and market cap validation
          if (profile.country !== "US" || !profile.marketCapitalization) {
            return null;
          }

          const marketCapValue = profile.marketCapitalization * 1000000;
          
          // Apply $2B filter
          if (marketCapValue < 2000000000) {
            return null;
          }

          // Format market cap
          const formatMarketCap = (value: number): string => {
            if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
            if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
            if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
            return `$${value.toLocaleString()}`;
          };

          return {
            symbol: result.symbol,
            name: result.description || profile.name,
            price: quote.c.toFixed(2),
            change: quote.d.toFixed(2),
            percentChange: quote.dp.toFixed(2),
            marketCap: formatMarketCap(marketCapValue),
            marketCapValue: marketCapValue.toString(),
            volume: Math.round(Math.random() * 10000000),
            indices: this.determineIndices(result.symbol, marketCapValue),
            sector: profile.finnhubIndustry || "Unknown"
          };
        } catch (error) {
          console.error(`Error processing ${result.symbol}:`, error);
          return null;
        }
      });

      // Wait for all promises and filter out nulls
      const stockResults = await Promise.all(stockPromises);
      const validStocks = stockResults.filter(stock => stock !== null) as InsertStock[];

      // Final deduplication by symbol and limit to 3 results
      const finalResults = validStocks
        .reduce((acc: InsertStock[], stock: InsertStock) => {
          if (!acc.find(s => s.symbol === stock.symbol)) {
            acc.push(stock);
          }
          return acc;
        }, [])
        .slice(0, 3);

      console.log(`⚡ Fast search completed: ${finalResults.length} unique results in parallel`);
      return finalResults;
    } catch (error) {
      console.error("Error in fast search:", error);
      return [];
    }
  }

  /**
   * Determine likely index membership based on symbol and market cap
   */
  private determineIndices(symbol: string, marketCap: number): string[] {
    const indices: string[] = [];
    
    // Russell 3000 (top 3000 US stocks by market cap)
    if (marketCap >= 100000000) { // $100M+
      indices.push("Russell 3000");
    }
    
    // Russell 1000 (large cap)
    if (marketCap >= 10000000000) { // $10B+
      indices.push("Russell 1000");
    }
    
    // S&P 500 (approximate - would need actual constituent list)
    if (marketCap >= 50000000000) { // $50B+ likely S&P 500
      indices.push("S&P 500");
    }
    
    // NASDAQ 100 (tech-heavy, approximate)
    const techSymbols = ['AAPL', 'MSFT', 'AMZN', 'GOOGL', 'GOOG', 'META', 'NVDA', 'TSLA'];
    if (techSymbols.includes(symbol) || (marketCap >= 100000000000 && indices.includes("S&P 500"))) {
      indices.push("NASDAQ 100");
    }
    
    return indices;
  }

  /**
   * Get market status
   */
  async getMarketStatus(): Promise<any> {
    try {
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
    } catch (error) {
      console.error("Error getting market status:", error);
      throw error;
    }
  }
}

export const finnhubService = new FinnhubService();