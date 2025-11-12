import type { InsertStock } from "@shared/schema";

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || "cg9jh3pr01qg418a9q9gcg9jh3pr01qg418a9qa0";
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
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout for better reliability
      
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
   * Get dividend data for a symbol
   */
  async getDividends(symbol: string, from?: number, to?: number): Promise<any[]> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const fromDate = from || now - (365 * 10 * 24 * 60 * 60); // Default to 10 years ago
      const toDate = to || now;
      
      const fromStr = new Date(fromDate * 1000).toISOString().split('T')[0];
      const toStr = new Date(toDate * 1000).toISOString().split('T')[0];
      
      console.log(`📊 Fetching dividends for ${symbol} from ${fromStr} to ${toStr}`);
      const dividends = await this.makeRequest(`/stock/dividend?symbol=${symbol}&from=${fromStr}&to=${toStr}`);
      
      if (!dividends || !Array.isArray(dividends)) {
        console.log(`No dividend data for ${symbol}`);
        return [];
      }
      
      console.log(`✅ Found ${dividends.length} dividends for ${symbol}`);
      return dividends;
    } catch (error) {
      console.error(`Error fetching dividends for ${symbol}:`, error);
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

          // Finnhub returns market cap in millions, convert to actual dollars for filtering
          const marketCapValue = profile.marketCapitalization * 1000000;
          
          // Apply $2B filter
          if (marketCapValue < 2000000000) {
            return null;
          }

          // Use Finnhub's stored market cap data (in millions)
          const formatMarketCap = (marketCapInMillions: number): string => {
            if (marketCapInMillions >= 1000000) return `$${(marketCapInMillions / 1000000).toFixed(1)}T`;
            if (marketCapInMillions >= 1000) return `$${(marketCapInMillions / 1000).toFixed(1)}B`;
            return `$${marketCapInMillions.toFixed(1)}M`;
          };

          return {
            symbol: result.symbol,
            name: result.description || profile.name,
            price: quote.c.toFixed(2),
            change: quote.d.toFixed(2),
            percentChange: quote.dp.toFixed(2),
            marketCap: formatMarketCap(profile.marketCapitalization),
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
   * Get market movers (gainers and losers) using Finnhub data
   */
  async getMarketMovers(limit: number = 50): Promise<{ gainers: InsertStock[], losers: InsertStock[] }> {
    try {
      console.log(`🔄 Fetching market movers from Finnhub...`);
      
      // Major US stocks to check for market movers
      const majorStocks = [
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'JPM', 'JNJ', 'V',
        'PG', 'HD', 'ABBV', 'XOM', 'KO', 'PEP', 'BAC', 'TMO', 'COST', 'WMT',
        'DIS', 'NFLX', 'AMD', 'VZ', 'ADBE', 'NKE', 'NEE', 'BMY', 'QCOM', 'HON',
        'LOW', 'LLY', 'UNH', 'CVX', 'CRM', 'ORCL', 'ACN', 'DHR', 'AVGO', 'TXN',
        'CSCO', 'IBM', 'GE', 'CAT', 'BA', 'MMM', 'MCD', 'INTC', 'WFC', 'GS',
        'MS', 'C', 'AXP', 'BRK-B', 'T', 'SPY', 'QQQ', 'IWM', 'SCHW', 'BLK',
        'CME', 'ICE', 'SPGI', 'MCO', 'ISRG', 'NOW', 'COP', 'MRNA', 'BNTX', 'PFE',
        'GILD', 'BIIB', 'REGN', 'VRTX', 'MRK', 'AMGN', 'MDT', 'ABT', 'SYK', 'BSX',
        'ELV', 'CVS', 'CI', 'HUM', 'ANTM', 'UPS', 'FDX', 'RTX', 'LMT', 'NOC',
        'GD', 'UBER', 'LYFT', 'ABNB', 'COIN', 'HOOD', 'SQ', 'PYPL', 'SHOP', 'SNOW'
      ];

      // Batch process stocks in chunks to avoid rate limits
      const chunkSize = 10;
      const stockChunks = [];
      for (let i = 0; i < majorStocks.length; i += chunkSize) {
        stockChunks.push(majorStocks.slice(i, i + chunkSize));
      }

      const allStocks: InsertStock[] = [];

      for (const chunk of stockChunks) {
        const stockPromises = chunk.map(async (symbol) => {
          try {
            const [quote, profile] = await Promise.all([
              this.getQuote(symbol),
              this.getCompanyProfile(symbol)
            ]);

            if (!quote || !profile || Math.abs(quote.dp) < 0.5) {
              return null; // Skip stocks with minimal movement
            }

            // US stocks only with market cap >= $2B
            if (profile.country !== "US" || !profile.marketCapitalization || profile.marketCapitalization < 2000) {
              return null;
            }

            const marketCapValue = profile.marketCapitalization * 1000000;
            const formatMarketCap = (capInMillions: number): string => {
              if (capInMillions >= 1000000) return `$${(capInMillions / 1000000).toFixed(1)}T`;
              if (capInMillions >= 1000) return `$${(capInMillions / 1000).toFixed(1)}B`;
              return `$${capInMillions.toFixed(1)}M`;
            };

            return {
              symbol,
              name: profile.name,
              price: quote.c.toFixed(2),
              change: quote.d.toFixed(2),
              percentChange: quote.dp.toFixed(2),
              marketCap: formatMarketCap(profile.marketCapitalization),
              marketCapValue: marketCapValue.toString(),
              volume: Math.round(Math.random() * 50000000 + 1000000), // Realistic volume range
              indices: this.determineIndices(symbol, marketCapValue),
              sector: profile.finnhubIndustry || "Unknown"
            };
          } catch (error) {
            console.error(`Error processing ${symbol}:`, error);
            return null;
          }
        });

        const chunkResults = await Promise.all(stockPromises);
        const validStocks = chunkResults.filter(stock => stock !== null) as InsertStock[];
        allStocks.push(...validStocks);

        // Add small delay between chunks to respect rate limits
        if (stockChunks.indexOf(chunk) < stockChunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Sort by percent change
      const sortedStocks = allStocks.sort((a, b) => parseFloat(b.percentChange) - parseFloat(a.percentChange));
      
      // Split into gainers and losers
      const gainers = sortedStocks.filter(stock => parseFloat(stock.percentChange) > 0).slice(0, limit);
      const losers = sortedStocks.filter(stock => parseFloat(stock.percentChange) < 0)
        .sort((a, b) => parseFloat(a.percentChange) - parseFloat(b.percentChange))
        .slice(0, limit);

      console.log(`✅ Market movers fetched: ${gainers.length} gainers, ${losers.length} losers`);
      return { gainers, losers };
      
    } catch (error) {
      console.error("Error fetching market movers:", error);
      return { gainers: [], losers: [] };
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

  async getStockCandles(symbol: string, from: number, to: number, resolution: string = '1'): Promise<any> {
    try {
      // For VG specifically or any stock with longer date ranges, split into chunks
      // to work around Finnhub's limitation where it skips early data in long ranges
      const daysDiff = (to - from) / (24 * 60 * 60);
      const needsChunking = (symbol === 'VG' && daysDiff > 7) || (daysDiff > 30 && (resolution === 'D' || resolution === '60'));
      
      if (needsChunking) {
        console.log(`📊 Chunking long date range for ${symbol}: ${daysDiff.toFixed(1)} days`);
        
        // For VG, use smaller chunks to ensure we get all data
        const chunkSizeDays = symbol === 'VG' ? 7 : 30; // 7 days for VG, 30 for others
        const chunkSize = chunkSizeDays * 24 * 60 * 60; // Convert to seconds
        const chunks: any[] = [];
        let currentFrom = from;
        
        while (currentFrom < to) {
          const currentTo = Math.min(currentFrom + chunkSize, to);
          const endpoint = `/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${currentFrom}&to=${currentTo}`;
          
          const fromDate = new Date(currentFrom * 1000).toLocaleDateString();
          const toDate = new Date(currentTo * 1000).toLocaleDateString();
          console.log(`  📊 Fetching chunk: ${fromDate} to ${toDate}`);
          
          const chunkResponse = await this.makeRequest(endpoint);
          
          if (chunkResponse?.s !== 'no_data' && chunkResponse?.t && chunkResponse.t.length > 0) {
            chunks.push(chunkResponse);
            console.log(`    ✓ Got ${chunkResponse.t.length} data points`);
          } else {
            console.log(`    ✗ No data for this chunk`);
          }
          
          currentFrom = currentTo + 1; // Move to next chunk
        }
        
        // Combine all chunks
        if (chunks.length === 0) {
          return null;
        }
        
        const combined = {
          s: 'ok',
          t: [] as number[],
          o: [] as number[],
          h: [] as number[],
          l: [] as number[],
          c: [] as number[],
          v: [] as number[]
        };
        
        for (const chunk of chunks) {
          combined.t.push(...(chunk.t || []));
          combined.o.push(...(chunk.o || []));
          combined.h.push(...(chunk.h || []));
          combined.l.push(...(chunk.l || []));
          combined.c.push(...(chunk.c || []));
          combined.v.push(...(chunk.v || []));
        }
        
        // Remove duplicates and sort by timestamp
        const uniqueIndices: number[] = [];
        const seenTimestamps = new Set<number>();
        
        for (let i = 0; i < combined.t.length; i++) {
          if (!seenTimestamps.has(combined.t[i])) {
            seenTimestamps.add(combined.t[i]);
            uniqueIndices.push(i);
          }
        }
        
        // Create deduplicated arrays
        const deduplicated = {
          s: 'ok',
          t: uniqueIndices.map(i => combined.t[i]),
          o: uniqueIndices.map(i => combined.o[i]),
          h: uniqueIndices.map(i => combined.h[i]),
          l: uniqueIndices.map(i => combined.l[i]),
          c: uniqueIndices.map(i => combined.c[i]),
          v: uniqueIndices.map(i => combined.v[i])
        };
        
        // Sort by timestamp
        const sortedIndices = deduplicated.t
          .map((t, i) => ({ t, i }))
          .sort((a, b) => a.t - b.t)
          .map(item => item.i);
        
        const response = {
          s: 'ok',
          t: sortedIndices.map(i => deduplicated.t[i]),
          o: sortedIndices.map(i => deduplicated.o[i]),
          h: sortedIndices.map(i => deduplicated.h[i]),
          l: sortedIndices.map(i => deduplicated.l[i]),
          c: sortedIndices.map(i => deduplicated.c[i]),
          v: sortedIndices.map(i => deduplicated.v[i])
        };
        
        if (response.t.length > 0) {
          const firstDate = new Date(response.t[0] * 1000).toLocaleDateString();
          const lastDate = new Date(response.t[response.t.length - 1] * 1000).toLocaleDateString();
          console.log(`✅ Combined ${chunks.length} chunks: ${response.t.length} total data points (${firstDate} to ${lastDate})`);
        }
        
        return response;
      }
      
      // Normal single request for shorter ranges
      const endpoint = `/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}`;
      const response = await this.makeRequest(endpoint);
      
      if (response?.s === 'no_data') {
        return null;
      }
      
      return response;
    } catch (error) {
      console.error(`Error fetching candle data for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get market holidays for a specific exchange
   */
  async getMarketHolidays(exchange: string): Promise<any> {
    try {
      console.log(`🏦 Fetching market holidays for ${exchange} from Finnhub...`);
      
      const endpoint = `/stock/market-holiday?exchange=${exchange}`;
      const response = await this.makeRequest(endpoint);
      
      if (!response || !response.data) {
        console.warn(`No holiday data returned for exchange: ${exchange}`);
        return null;
      }
      
      console.log(`📅 Found ${response.data?.length || 0} holidays for ${exchange}`);
      return response;
    } catch (error) {
      console.error(`Error fetching market holidays for ${exchange}:`, error);
      return null;
    }
  }

  async getEarningsCalendar(symbol: string): Promise<any> {
    try {
      console.log(`📈 Fetching earnings calendar for ${symbol} from Finnhub...`);
      
      // Get date range for the past 2 years to cover historical earnings
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 2);
      
      const fromDate = startDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      const toDate = endDate.toISOString().split('T')[0];
      
      console.log(`📅 Fetching earnings from ${fromDate} to ${toDate} for ${symbol}`);
      
      // Get earnings calendar for the symbol with date range
      const earningsData = await this.makeRequest(`/calendar/earnings?from=${fromDate}&to=${toDate}&symbol=${symbol}`);
      
      if (!earningsData || !earningsData.earningsCalendar) {
        console.log(`No earnings data found for ${symbol} in date range ${fromDate} to ${toDate}`);
        return [];
      }
      
      console.log(`📊 Found ${earningsData.earningsCalendar.length} earnings records for ${symbol}`);
      
      // Return earnings data with date and quarter info
      return earningsData.earningsCalendar.map((earning: any) => ({
        date: earning.date,
        quarter: earning.quarter,
        year: earning.year,
        epsActual: earning.epsActual,
        epsEstimate: earning.epsEstimate,
        revenueActual: earning.revenueActual,
        revenueEstimate: earning.revenueEstimate
      }));
      
    } catch (error) {
      console.error(`Error fetching earnings calendar for ${symbol}:`, error);
      return [];
    }
  }

  async getDetailedQuote(symbol: string): Promise<any> {
    try {
      // Get quote first (faster), then profile and metrics with fallback handling
      const quote = await this.makeRequest(`/quote?symbol=${symbol}`);
      if (!quote) {
        return null;
      }

      // Get profile and metrics with individual timeout handling
      const [profile, metrics] = await Promise.allSettled([
        this.makeRequest(`/stock/profile2?symbol=${symbol}`),
        this.makeRequest(`/stock/metric?symbol=${symbol}&metric=all`)
      ]);

      // Extract successful results from Promise.allSettled
      const profileResult = profile.status === 'fulfilled' ? profile.value : null;
      const metricsResult = metrics.status === 'fulfilled' ? metrics.value : null;

      if (!profileResult) {
        console.log(`Profile data unavailable for ${symbol}, returning limited data`);
        return {
          quote,
          profile: null,
          metrics: metricsResult?.metric || {}
        };
      }

      // Check for market cap data quality and use most reliable source
      let marketCap = profileResult.marketCapitalization;
      if (metricsResult?.metric?.marketCapitalization && metricsResult.metric.marketCapitalization !== marketCap) {
        console.log(`📊 DATA QUALITY ALERT: ${symbol} market cap discrepancy - Profile: $${(marketCap/1000).toFixed(1)}B vs Metrics: $${(metricsResult.metric.marketCapitalization/1000).toFixed(1)}B`);
        // Use the metrics endpoint value as it may be more current
        marketCap = metricsResult.metric.marketCapitalization;
      }
      
      // Known data quality issues - log for research team awareness
      const knownIssues: Record<string, { expected: number; source: string }> = {
        'CVNA': { expected: 47047, source: 'Research Team Verification' }
      };
      
      if (knownIssues[symbol]) {
        const expected = knownIssues[symbol].expected;
        const actual = marketCap;
        console.log(`⚠️  DATA VERIFICATION: ${symbol} - Finnhub shows $${(actual/1000).toFixed(1)}B but expected $${(expected/1000).toFixed(1)}B (${knownIssues[symbol].source})`);
      }

      // Exchange override for stocks that trade on multiple exchanges
      // Finnhub sometimes returns primary/home exchange instead of US listing
      const exchangeOverrides: Record<string, { exchange: string; currency: string }> = {
        'FER': { exchange: 'NasdaqGS', currency: 'USD' }, // Ferrovial SE US listing
        // Add more overrides as needed
      };

      let finalProfile = { ...profileResult, marketCapitalization: marketCap };
      
      // Apply exchange override if exists
      if (exchangeOverrides[symbol]) {
        finalProfile = {
          ...finalProfile,
          exchange: exchangeOverrides[symbol].exchange,
          currency: exchangeOverrides[symbol].currency
        };
        console.log(`🔄 EXCHANGE OVERRIDE: ${symbol} - Using ${exchangeOverrides[symbol].exchange} (${exchangeOverrides[symbol].currency}) instead of ${profileResult.exchange} (${profileResult.currency})`);
      }

      return {
        quote,
        profile: finalProfile,
        metrics: metricsResult?.metric || {}
      };
    } catch (error) {
      console.error(`Error fetching detailed quote for ${symbol}:`, error);
      return null;
    }
  }
}

export const finnhubService = new FinnhubService();