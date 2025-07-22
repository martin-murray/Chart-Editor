import { type InsertStock, type InsertMarketSummary } from "@shared/schema";

interface YahooFinanceQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  marketCap: number;
  regularMarketVolume: number;
  longName: string;
}

interface YahooFinanceResponse {
  quoteResponse: {
    result: YahooFinanceQuote[];
    error?: string;
  };
}

const MAJOR_STOCKS = [
  // S&P 500 major stocks
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "BRK-B", "UNH", "JNJ",
  "V", "PG", "JPM", "HD", "MA", "CVX", "ABBV", "PFE", "KO", "PEP",
  "BAC", "TMO", "COST", "AVGO", "XOM", "WMT", "DIS", "ABT", "CRM", "NFLX",
  "AMD", "ACN", "LIN", "VZ", "ADBE", "CMCSA", "NKE", "DHR", "NEE", "TXN",
  "BMY", "QCOM", "PM", "RTX", "UPS", "HON", "LOW", "ORCL", "SPGI", "COP",
  
  // Additional large-cap stocks
  "INTC", "IBM", "GE", "CAT", "MMM", "BA", "GS", "AXP", "MCD", "WBA",
  "PYPL", "UBER", "SHOP", "ZM", "ROKU", "TWTR", "SNAP", "SQ", "PINS", "DOCU"
];

const STOCK_INDICES: Record<string, string[]> = {
  "S&P 500": ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "BRK-B", "UNH", "JNJ", "V", "PG", "JPM", "HD", "MA", "CVX", "ABBV", "PFE", "KO", "PEP", "BAC", "TMO", "COST", "AVGO", "XOM", "WMT", "DIS", "ABT", "CRM", "NFLX", "AMD", "ACN", "LIN", "VZ", "ADBE", "CMCSA", "NKE", "DHR", "NEE", "TXN", "BMY", "QCOM", "PM", "RTX", "UPS", "HON", "LOW", "ORCL", "SPGI", "COP"],
  "NASDAQ 100": ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "NFLX", "AMD", "ADBE", "QCOM", "ORCL", "PYPL", "UBER", "SHOP", "ZM", "ROKU", "SNAP", "SQ", "PINS", "DOCU"],
  "Russell 1000": MAJOR_STOCKS,
  "Russell 2000": ["INTC", "IBM", "GE", "CAT", "MMM", "BA", "GS", "AXP", "MCD", "WBA"],
  "Russell 3000": MAJOR_STOCKS,
  "S&P 400": ["INTC", "IBM", "PYPL", "UBER", "SHOP"],
  "S&P 600": ["GE", "CAT", "MMM"],
  "TMI": ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA"]
};

const STOCK_SECTORS: Record<string, string> = {
  "AAPL": "Technology", "MSFT": "Technology", "GOOGL": "Technology", "AMZN": "Consumer Discretionary",
  "NVDA": "Technology", "TSLA": "Consumer Discretionary", "META": "Technology", "BRK-B": "Financial Services",
  "UNH": "Healthcare", "JNJ": "Healthcare", "V": "Financial Services", "PG": "Consumer Staples",
  "JPM": "Financial Services", "HD": "Consumer Discretionary", "MA": "Financial Services", "CVX": "Energy",
  "ABBV": "Healthcare", "PFE": "Healthcare", "KO": "Consumer Staples", "PEP": "Consumer Staples",
  "BAC": "Financial Services", "TMO": "Healthcare", "COST": "Consumer Staples", "AVGO": "Technology",
  "XOM": "Energy", "WMT": "Consumer Staples", "DIS": "Communication Services", "ABT": "Healthcare",
  "CRM": "Technology", "NFLX": "Communication Services", "AMD": "Technology", "ACN": "Technology",
  "LIN": "Materials", "VZ": "Communication Services", "ADBE": "Technology", "CMCSA": "Communication Services",
  "NKE": "Consumer Discretionary", "DHR": "Healthcare", "NEE": "Utilities", "TXN": "Technology",
  "BMY": "Healthcare", "QCOM": "Technology", "PM": "Consumer Staples", "RTX": "Industrials",
  "UPS": "Industrials", "HON": "Industrials", "LOW": "Consumer Discretionary", "ORCL": "Technology",
  "SPGI": "Financial Services", "COP": "Energy", "INTC": "Technology", "IBM": "Technology",
  "GE": "Industrials", "CAT": "Industrials", "MMM": "Industrials", "BA": "Industrials",
  "GS": "Financial Services", "AXP": "Financial Services", "MCD": "Consumer Discretionary", "WBA": "Consumer Staples",
  "PYPL": "Financial Services", "UBER": "Technology", "SHOP": "Technology", "ZM": "Technology",
  "ROKU": "Technology", "SNAP": "Technology", "SQ": "Financial Services", "PINS": "Technology", "DOCU": "Technology"
};

export class StockDataService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.YAHOO_FINANCE_API_KEY || process.env.FINANCIAL_API_KEY || "";
  }

  private getIndicesForStock(symbol: string): string[] {
    const indices: string[] = [];
    for (const [indexName, stocks] of Object.entries(STOCK_INDICES)) {
      if (stocks.includes(symbol)) {
        indices.push(indexName);
      }
    }
    return indices.length > 0 ? indices : ["Other"];
  }

  private formatMarketCap(value: number): string {
    if (value >= 1e12) {
      return `$${(value / 1e12).toFixed(2)}T`;
    } else if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(1)}B`;
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(1)}M`;
    }
    return `$${value.toFixed(0)}`;
  }

  private async fetchYahooFinanceData(): Promise<YahooFinanceQuote[]> {
    if (!this.apiKey) {
      throw new Error("Yahoo Finance API key not provided");
    }

    const symbols = MAJOR_STOCKS.join(",");
    const url = `https://yfapi.net/v6/finance/quote?region=US&lang=en&symbols=${symbols}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.statusText}`);
      }

      const data: YahooFinanceResponse = await response.json();
      
      if (data.quoteResponse.error) {
        throw new Error(`Yahoo Finance API error: ${data.quoteResponse.error}`);
      }

      return data.quoteResponse.result || [];
    } catch (error) {
      console.error('Error fetching Yahoo Finance data:', error);
      throw error;
    }
  }

  async getLatestStockData(): Promise<InsertStock[]> {
    try {
      const quotes = await this.fetchYahooFinanceData();
      
      return quotes
        .filter(quote => quote.marketCap >= 2000000000) // Only stocks with ≥$2B market cap
        .map(quote => ({
          symbol: quote.symbol,
          name: quote.longName || quote.symbol,
          price: quote.regularMarketPrice.toFixed(2),
          change: quote.regularMarketChange.toFixed(2),
          percentChange: quote.regularMarketChangePercent.toFixed(3),
          marketCap: this.formatMarketCap(quote.marketCap),
          marketCapValue: quote.marketCap.toFixed(2),
          volume: quote.regularMarketVolume,
          indices: this.getIndicesForStock(quote.symbol),
          sector: STOCK_SECTORS[quote.symbol] || "Other",
        }));
    } catch (error) {
      console.error('Error getting latest stock data:', error);
      throw error;
    }
  }

  async calculateMarketSummary(stocks: InsertStock[]): Promise<InsertMarketSummary> {
    const gainers = stocks.filter(stock => parseFloat(stock.percentChange) > 0);
    const losers = stocks.filter(stock => parseFloat(stock.percentChange) < 0);
    
    const avgGainerChange = gainers.length > 0 
      ? (gainers.reduce((sum, stock) => sum + parseFloat(stock.percentChange), 0) / gainers.length).toFixed(3)
      : "0.000";
    
    const avgLoserChange = losers.length > 0
      ? (losers.reduce((sum, stock) => sum + parseFloat(stock.percentChange), 0) / losers.length).toFixed(3)
      : "0.000";

    const totalMarketCapValue = stocks.reduce((sum, stock) => sum + parseFloat(stock.marketCapValue), 0);
    const totalVolume = stocks.reduce((sum, stock) => sum + stock.volume, 0);

    // Calculate volatility based on average absolute change
    const avgAbsChange = stocks.reduce((sum, stock) => sum + Math.abs(parseFloat(stock.percentChange)), 0) / stocks.length;
    let volatility = "Low";
    if (avgAbsChange > 3) volatility = "High";
    else if (avgAbsChange > 1.5) volatility = "Moderate";

    // Find sector with most gainers
    const sectorCounts = stocks.reduce((acc, stock) => {
      if (parseFloat(stock.percentChange) > 0) {
        acc[stock.sector] = (acc[stock.sector] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const sectorLeader = Object.keys(sectorCounts).reduce((a, b) => 
      (sectorCounts[a] || 0) > (sectorCounts[b] || 0) ? a : b, "Technology"
    );

    return {
      totalMovers: stocks.length,
      totalGainers: gainers.length,
      totalLosers: losers.length,
      totalMarketCap: this.formatMarketCap(totalMarketCapValue),
      avgGainerChange,
      avgLoserChange,
      avgVolume: `${(totalVolume / 1000000).toFixed(1)}M`,
      volatility,
      sectorLeader,
    };
  }
}

export const stockDataService = new StockDataService();
