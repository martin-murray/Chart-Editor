interface YahooMoversQuote {
  symbol: string;
  shortName: string;
  longName?: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  marketCap: number;
  regularMarketVolume: number;
  currency: string;
  exchange: string;
}

interface YahooMoversResponse {
  finance: {
    result: Array<{
      quotes: YahooMoversQuote[];
    }>;
  };
}

export interface MarketMover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
}

export class YahooMoversService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://yahoo-finance-real-time1.p.rapidapi.com';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Yahoo Finance API key is required');
    }
    this.apiKey = apiKey;
  }

  async getMarketMovers(count: number = 50): Promise<MarketMover[]> {
    try {
      console.log(`📊 Fetching top ${count} market movers from Yahoo Finance...`);
      
      const response = await fetch(
        `${this.baseUrl}/market/get-movers?start=0&count=${count}&region=US&lang=en-US`,
        {
          headers: {
            'x-rapidapi-host': 'yahoo-finance-real-time1.p.rapidapi.com',
            'x-rapidapi-key': this.apiKey,
          },
        }
      );

      if (!response.ok) {
        console.error(`❌ Yahoo Finance Movers API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data: YahooMoversResponse = await response.json();
      
      if (!data.finance?.result?.[0]?.quotes) {
        console.warn(`⚠️ No movers data returned from Yahoo Finance`);
        return [];
      }

      const quotes = data.finance.result[0].quotes;
      
      // Filter for stocks with market cap >= $2B (per requirements)
      const filteredQuotes = quotes.filter(quote => 
        quote.marketCap >= 2000000000 && 
        quote.currency === 'USD' &&
        quote.regularMarketPrice > 0
      );

      const movers: MarketMover[] = filteredQuotes.map(quote => ({
        symbol: quote.symbol,
        name: quote.longName || quote.shortName || quote.symbol,
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange,
        changePercent: quote.regularMarketChangePercent,
        marketCap: quote.marketCap,
        volume: quote.regularMarketVolume || 0,
      }));

      console.log(`✅ Successfully fetched ${movers.length} market movers (filtered from ${quotes.length} total)`);
      return movers;
    } catch (error) {
      console.error('❌ Error fetching market movers:', error);
      return [];
    }
  }

  async getTopGainers(count: number = 20): Promise<MarketMover[]> {
    const movers = await this.getMarketMovers(100); // Get more data to ensure good selection
    return movers
      .filter(mover => mover.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, count);
  }

  async getTopLosers(count: number = 20): Promise<MarketMover[]> {
    const movers = await this.getMarketMovers(100); // Get more data to ensure good selection
    return movers
      .filter(mover => mover.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, count);
  }

  async getAllMovers(): Promise<{gainers: MarketMover[], losers: MarketMover[]}> {
    console.log('📊 Fetching comprehensive market movers data...');
    
    const movers = await this.getMarketMovers(100);
    
    const gainers = movers
      .filter(mover => mover.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent);
    
    const losers = movers
      .filter(mover => mover.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent);
    
    console.log(`📈 Found ${gainers.length} gainers and ${losers.length} losers`);
    
    return { gainers, losers };
  }

  async testConnection(): Promise<boolean> {
    try {
      const movers = await this.getMarketMovers(5);
      return movers.length > 0;
    } catch (error) {
      console.error('❌ Yahoo Finance Movers connection test failed:', error);
      return false;
    }
  }
}

// Environment variable for the API key
export const yahooMoversService = new YahooMoversService(
  process.env.YAHOO_FINANCE_API_KEY || '56469dec8amsh9d2b5845ec09d21p1462d1jsnf207588e2186'
);