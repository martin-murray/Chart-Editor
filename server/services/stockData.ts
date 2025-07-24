import { type InsertStock, type InsertMarketSummary } from "@shared/schema";

// Static data for demo purposes - removed external API dependencies

export class StockDataService {
  private mockStocks: InsertStock[] = [
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      price: "185.23",
      change: "2.45",
      percentChange: "1.34",
      marketCap: "$2.9T",
      marketCapValue: "2900000000000",
      volume: 45230000,
      indices: ["S&P 500", "NASDAQ 100", "Russell 1000"],
      sector: "Technology"
    },
    {
      symbol: "MSFT", 
      name: "Microsoft Corporation",
      price: "412.67",
      change: "-1.23",
      percentChange: "-0.30",
      marketCap: "$3.1T",
      marketCapValue: "3100000000000", 
      volume: 32100000,
      indices: ["S&P 500", "NASDAQ 100", "Russell 1000"],
      sector: "Technology"
    },
    {
      symbol: "GOOGL",
      name: "Alphabet Inc.",
      price: "145.78",
      change: "3.21",
      percentChange: "2.25",
      marketCap: "$1.8T",
      marketCapValue: "1800000000000",
      volume: 28450000,
      indices: ["S&P 500", "NASDAQ 100", "Russell 1000"],
      sector: "Technology"
    },
    {
      symbol: "AMZN",
      name: "Amazon.com Inc.",
      price: "178.34",
      change: "-2.11",
      percentChange: "-1.17",
      marketCap: "$1.9T",
      marketCapValue: "1900000000000",
      volume: 31200000,
      indices: ["S&P 500", "NASDAQ 100", "Russell 1000"],
      sector: "Consumer Discretionary"
    },
    {
      symbol: "TSLA",
      name: "Tesla Inc.",
      price: "267.42",
      change: "12.35",
      percentChange: "4.84",
      marketCap: "$850.5B",
      marketCapValue: "850500000000",
      volume: 89650000,
      indices: ["S&P 500", "Russell 1000"],
      sector: "Consumer Discretionary"
    }
  ];

  constructor() {
    // Using static mock data - no external API dependencies
  }

  async getLatestStockData(): Promise<InsertStock[]> {
    try {
      console.log("📊 Using static market data - no external API calls");
      
      // Simulate some variation in the data
      const stocks = this.mockStocks.map(stock => ({
        ...stock,
        price: (parseFloat(stock.price) + (Math.random() - 0.5) * 2).toFixed(2),
        change: ((Math.random() - 0.5) * 5).toFixed(2),
        percentChange: ((Math.random() - 0.5) * 5).toFixed(3)
      }));
      
      console.log(`✅ Successfully generated ${stocks.length} mock market movers`);
      return stocks;
    } catch (error) {
      console.error('Error generating mock stock data:', error);
      throw error;
    }
  }

  async getApiStatus(): Promise<{remainingRequests: number, resetTime?: string}> {
    return { 
      remainingRequests: 1000,
      resetTime: "No API limits - using static data"
    };
  }

  async getMarketStatus() {
    // Simple market status based on current time
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

    const formatMarketCap = (value: number): string => {
      if (value >= 1e12) {
        return `$${(value / 1e12).toFixed(2)}T`;
      } else if (value >= 1e9) {
        return `$${(value / 1e9).toFixed(1)}B`;
      } else if (value >= 1e6) {
        return `$${(value / 1e6).toFixed(1)}M`;
      }
      return `$${value.toFixed(0)}`;
    };

    return {
      totalMovers: stocks.length,
      totalGainers: gainers.length,
      totalLosers: losers.length,
      totalMarketCap: formatMarketCap(totalMarketCapValue),
      avgGainerChange,
      avgLoserChange,
      avgVolume: `${(totalVolume / 1000000).toFixed(1)}M`,
      volatility,
      sectorLeader,
    };
  }
}

export const stockDataService = new StockDataService();