interface YahooQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  marketCap: number;
  regularMarketVolume: number;
  shortName: string;
  longName?: string;
}

interface YahooApiResponse {
  optionChain: {
    result: Array<{
      quote: YahooQuote;
    }>;
  };
}

export interface YahooStockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
}

export class YahooFinanceService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://yahoo-finance-real-time1.p.rapidapi.com';
  private readonly rateLimitDelay = 200; // 200ms between requests to avoid rate limits

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Yahoo Finance API key is required');
    }
    this.apiKey = apiKey;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getStockQuote(symbol: string): Promise<YahooStockData | null> {
    try {
      console.log(`📊 Fetching Yahoo Finance data for ${symbol}...`);
      
      const response = await fetch(
        `${this.baseUrl}/stock/get-options?symbol=${symbol}&lang=en-US&region=US`,
        {
          headers: {
            'x-rapidapi-host': 'yahoo-finance-real-time1.p.rapidapi.com',
            'x-rapidapi-key': this.apiKey,
          },
        }
      );

      if (!response.ok) {
        console.error(`❌ Yahoo Finance API error for ${symbol}: ${response.status} ${response.statusText}`);
        return null;
      }

      const data: YahooApiResponse = await response.json();
      
      if (!data.optionChain?.result?.[0]?.quote) {
        console.warn(`⚠️ No quote data returned for ${symbol}`);
        return null;
      }

      const quote = data.optionChain.result[0].quote;
      
      return {
        symbol: quote.symbol,
        name: quote.longName || quote.shortName || quote.symbol,
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange,
        changePercent: quote.regularMarketChangePercent,
        marketCap: quote.marketCap,
        volume: quote.regularMarketVolume,
      };
    } catch (error) {
      console.error(`❌ Error fetching ${symbol} from Yahoo Finance:`, error);
      return null;
    }
  }

  async getMultipleStocks(symbols: string[]): Promise<YahooStockData[]> {
    console.log(`📊 Fetching Yahoo Finance data for ${symbols.length} stocks...`);
    const results: YahooStockData[] = [];
    
    // Process stocks one by one with delay to respect rate limits
    for (const symbol of symbols) {
      const stockData = await this.getStockQuote(symbol);
      if (stockData) {
        results.push(stockData);
      }
      
      // Add delay between requests if not the last one
      if (symbol !== symbols[symbols.length - 1]) {
        await this.delay(this.rateLimitDelay);
      }
    }
    
    console.log(`✅ Successfully fetched Yahoo Finance data for ${results.length}/${symbols.length} stocks`);
    return results;
  }

  async testConnection(): Promise<boolean> {
    try {
      const testStock = await this.getStockQuote('AAPL');
      return testStock !== null;
    } catch (error) {
      console.error('❌ Yahoo Finance connection test failed:', error);
      return false;
    }
  }
}

// Environment variable for the API key
export const yahooFinanceService = new YahooFinanceService(
  process.env.YAHOO_FINANCE_API_KEY || '56469dec8amsh9d2b5845ec09d21p1462d1jsnf207588e2186'
);