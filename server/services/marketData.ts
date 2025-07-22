import { type InsertStock } from "@shared/schema";
import { yahooFinanceService, type YahooStockData } from "./yahooFinance";

export class MarketDataService {
  private requestCount = 0;
  private readonly dailyLimit = 500; // Yahoo Finance RapidAPI free tier limit
  
  constructor() {
    // Using Yahoo Finance service instead of Alpha Vantage
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private formatMarketCap(marketCapValue: number): string {
    if (marketCapValue >= 1e12) {
      return `$${(marketCapValue / 1e12).toFixed(1)}T`;
    } else if (marketCapValue >= 1e9) {
      return `$${(marketCapValue / 1e9).toFixed(1)}B`;
    } else if (marketCapValue >= 1e6) {
      return `$${(marketCapValue / 1e6).toFixed(1)}M`;
    }
    return `$${marketCapValue.toFixed(0)}`;
  }

  private getStockIndices(symbol: string): string[] {
    // Map of stock symbols to their indices
    const stockIndicesMap: Record<string, string[]> = {
      "AAPL": ["S&P 500", "NASDAQ 100", "Russell 1000"],
      "MSFT": ["S&P 500", "NASDAQ 100", "Russell 1000"],
      "GOOGL": ["S&P 500", "NASDAQ 100", "Russell 1000"],
      "AMZN": ["S&P 500", "NASDAQ 100", "Russell 1000"],
      "NVDA": ["S&P 500", "NASDAQ 100", "Russell 1000"],
      "TSLA": ["S&P 500", "NASDAQ 100", "Russell 1000"],
      "META": ["S&P 500", "NASDAQ 100", "Russell 1000"],
      "JPM": ["S&P 500", "Russell 1000"],
      "JNJ": ["S&P 500", "Russell 1000"],
      "V": ["S&P 500", "Russell 1000"],
      "PG": ["S&P 500", "Russell 1000"],
      "HD": ["S&P 500", "Russell 1000"],
      "ABBV": ["S&P 500", "Russell 1000"],
      "XOM": ["S&P 500", "Russell 1000"],
      "KO": ["S&P 500", "Russell 1000"],
      "PEP": ["S&P 500", "Russell 1000"],
      "BAC": ["S&P 500", "Russell 1000"],
      "TMO": ["S&P 500", "Russell 1000"],
      "COST": ["S&P 500", "Russell 1000"],
      "WMT": ["S&P 500", "Russell 1000"],
      "DIS": ["S&P 500", "Russell 1000"],
      "NFLX": ["S&P 500", "NASDAQ 100", "Russell 1000"],
      "AMD": ["S&P 500", "NASDAQ 100", "Russell 1000"],
      "VZ": ["S&P 500", "Russell 1000"],
      "ADBE": ["S&P 500", "NASDAQ 100", "Russell 1000"],
      "NKE": ["S&P 500", "Russell 1000"],
      "NEE": ["S&P 500", "Russell 1000"],
      "BMY": ["S&P 500", "Russell 1000"],
      "QCOM": ["S&P 500", "NASDAQ 100", "Russell 1000"],
      "HON": ["S&P 500", "Russell 1000"],
      "LOW": ["S&P 500", "Russell 1000"],
    };

    return stockIndicesMap[symbol] || ["Russell 1000"];
  }

  private getStockSector(symbol: string): string {
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

    return sectorMap[symbol] || "Technology";
  }

  private getCompanyName(symbol: string): string {
    const nameMap: Record<string, string> = {
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

    return nameMap[symbol] || symbol;
  }

  private parseYahooData(data: YahooStockData): InsertStock {
    const symbol = data.symbol;
    const price = data.price;
    const change = data.change;
    const changePercent = data.changePercent;
    const volume = data.volume;
    const marketCapValue = data.marketCap;
    
    return {
      symbol,
      name: data.name || this.getCompanyName(symbol),
      price: price.toFixed(2),
      change: change.toFixed(2),
      percentChange: changePercent.toFixed(2),
      marketCap: this.formatMarketCap(marketCapValue), // Yahoo Finance provides raw market cap value
      marketCapValue: marketCapValue.toString(),
      volume,
      indices: this.getStockIndices(symbol),
      sector: this.getStockSector(symbol),
    };
  }

  private getEstimatedShares(symbol: string): number {
    // Rough estimates of shares outstanding for market cap calculation
    const sharesMap: Record<string, number> = {
      "AAPL": 15500000000,    // ~15.5B shares
      "MSFT": 7400000000,     // ~7.4B shares
      "GOOGL": 12300000000,   // ~12.3B shares
      "AMZN": 10100000000,    // ~10.1B shares
      "NVDA": 2400000000,     // ~2.4B shares
      "TSLA": 3170000000,     // ~3.17B shares
      "META": 2620000000,     // ~2.62B shares
      "JPM": 2920000000,      // ~2.92B shares
      "JNJ": 2620000000,      // ~2.62B shares
      "V": 2050000000,        // ~2.05B shares
    };

    return sharesMap[symbol] || 1000000000; // Default 1B shares
  }

  async getQuote(symbol: string): Promise<InsertStock | null> {
    if (this.requestCount >= this.dailyLimit) {
      console.warn(`⚠️ Daily API limit reached (${this.dailyLimit} requests)`);
      return null;
    }

    try {
      const yahooData = await yahooFinanceService.getStockQuote(symbol);
      this.requestCount++;
      
      if (!yahooData) {
        return null;
      }

      const stock = this.parseYahooData(yahooData);
      console.log(`✅ Updated ${symbol}: $${stock.price} (${stock.percentChange.toString().startsWith("-") ? "" : "+"}${stock.percentChange}%)`);
      
      return stock;
    } catch (error) {
      console.error(`❌ Error fetching quote for ${symbol}:`, error);
      return null;
    }
  }

  async getMultipleQuotes(symbols: string[]): Promise<InsertStock[]> {
    console.log(`📊 Fetching live data for ${symbols.length} stocks...`);
    
    try {
      // Use Yahoo Finance service to get multiple stocks efficiently
      const yahooResults = await yahooFinanceService.getMultipleStocks(symbols);
      this.requestCount += symbols.length;
      
      const results: InsertStock[] = yahooResults.map(data => this.parseYahooData(data));
      
      console.log(`✅ Successfully fetched live data for ${results.length}/${symbols.length} stocks`);
      return results;
    } catch (error) {
      console.error("❌ Error fetching multiple quotes:", error);
      return [];
    }
  }

  getRemainingRequests(): number {
    return Math.max(0, this.dailyLimit - this.requestCount);
  }

  resetRequestCount(): void {
    this.requestCount = 0;
    console.log("🔄 API request count reset");
  }
}

export const marketDataService = new MarketDataService();