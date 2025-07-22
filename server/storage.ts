import { stocks, slackAlerts, marketSummary, type Stock, type InsertStock, type SlackAlert, type InsertSlackAlert, type MarketSummary, type InsertMarketSummary, type StockFilter } from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, gte, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // Stock operations
  getStocks(filter?: StockFilter): Promise<Stock[]>;
  getStock(id: number): Promise<Stock | undefined>;
  getStockBySymbol(symbol: string): Promise<Stock | undefined>;
  createStock(stock: InsertStock): Promise<Stock>;
  updateStock(id: number, stock: Partial<InsertStock>): Promise<Stock | undefined>;
  deleteStock(id: number): Promise<boolean>;
  bulkUpsertStocks(stocks: InsertStock[]): Promise<Stock[]>;
  
  // Gainers and losers
  getTopGainers(limit?: number, filter?: StockFilter): Promise<Stock[]>;
  getTopLosers(limit?: number, filter?: StockFilter): Promise<Stock[]>;
  
  // Slack alerts
  getSlackAlerts(limit?: number): Promise<SlackAlert[]>;
  createSlackAlert(alert: InsertSlackAlert): Promise<SlackAlert>;
  
  // Market summary
  getMarketSummary(): Promise<MarketSummary | undefined>;
  updateMarketSummary(summary: InsertMarketSummary): Promise<MarketSummary>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeData();
  }

  private async initializeData() {
    // Check if data already exists
    const existingStocks = await db.select().from(stocks).limit(1);
    if (existingStocks.length > 0) {
      return; // Data already initialized
    }

    // Generate realistic stock data for demonstration
    const stockData = [
      { symbol: "AAPL", name: "Apple Inc.", price: "180.25", change: "2.15", percentChange: "1.21", marketCap: "$2.8T", marketCapValue: "2800000000000", volume: 58492834, indices: ["S&P 500", "NASDAQ 100", "Russell 1000"], sector: "Technology" },
      { symbol: "MSFT", name: "Microsoft Corporation", price: "420.15", change: "-3.25", percentChange: "-0.77", marketCap: "$3.1T", marketCapValue: "3100000000000", volume: 32847291, indices: ["S&P 500", "NASDAQ 100", "Russell 1000"], sector: "Technology" },
      { symbol: "GOOGL", name: "Alphabet Inc.", price: "145.80", change: "4.60", percentChange: "3.26", marketCap: "$1.8T", marketCapValue: "1800000000000", volume: 28439281, indices: ["S&P 500", "NASDAQ 100", "Russell 1000"], sector: "Technology" },
      { symbol: "AMZN", name: "Amazon.com Inc.", price: "168.35", change: "-2.85", percentChange: "-1.66", marketCap: "$1.7T", marketCapValue: "1700000000000", volume: 45829374, indices: ["S&P 500", "NASDAQ 100", "Russell 1000"], sector: "Consumer Discretionary" },
      { symbol: "NVDA", name: "NVIDIA Corporation", price: "875.42", change: "18.75", percentChange: "2.19", marketCap: "$2.1T", marketCapValue: "2100000000000", volume: 52847291, indices: ["S&P 500", "NASDAQ 100", "Russell 1000"], sector: "Technology" },
      { symbol: "TSLA", name: "Tesla Inc.", price: "248.90", change: "-12.35", percentChange: "-4.73", marketCap: "$789.5B", marketCapValue: "789500000000", volume: 89247382, indices: ["S&P 500", "NASDAQ 100", "Russell 1000"], sector: "Consumer Discretionary" },
      { symbol: "META", name: "Meta Platforms Inc.", price: "495.20", change: "8.45", percentChange: "1.74", marketCap: "$1.3T", marketCapValue: "1300000000000", volume: 24837291, indices: ["S&P 500", "NASDAQ 100", "Russell 1000"], sector: "Technology" },
      { symbol: "JPM", name: "JPMorgan Chase & Co.", price: "215.75", change: "3.25", percentChange: "1.53", marketCap: "$632.4B", marketCapValue: "632400000000", volume: 18394827, indices: ["S&P 500", "Russell 1000"], sector: "Financial Services" },
      { symbol: "JNJ", name: "Johnson & Johnson", price: "158.90", change: "-1.85", percentChange: "-1.15", marketCap: "$417.8B", marketCapValue: "417800000000", volume: 12847291, indices: ["S&P 500", "Russell 1000"], sector: "Healthcare" },
      { symbol: "V", name: "Visa Inc.", price: "298.45", change: "4.85", percentChange: "1.65", marketCap: "$612.3B", marketCapValue: "612300000000", volume: 8392847, indices: ["S&P 500", "Russell 1000"], sector: "Financial Services" },
      { symbol: "PG", name: "Procter & Gamble Co.", price: "165.20", change: "0.75", percentChange: "0.46", marketCap: "$395.2B", marketCapValue: "395200000000", volume: 6847291, indices: ["S&P 500", "Russell 1000"], sector: "Consumer Staples" },
      { symbol: "HD", name: "Home Depot Inc.", price: "385.60", change: "-5.40", percentChange: "-1.38", marketCap: "$392.8B", marketCapValue: "392800000000", volume: 4829374, indices: ["S&P 500", "Russell 1000"], sector: "Consumer Discretionary" },
      { symbol: "ABBV", name: "AbbVie Inc.", price: "182.35", change: "2.95", percentChange: "1.64", marketCap: "$322.1B", marketCapValue: "322100000000", volume: 7394827, indices: ["S&P 500", "Russell 1000"], sector: "Healthcare" },
      { symbol: "XOM", name: "Exxon Mobil Corporation", price: "118.45", change: "-2.15", percentChange: "-1.78", marketCap: "$485.7B", marketCapValue: "485700000000", volume: 19847291, indices: ["S&P 500", "Russell 1000"], sector: "Energy" },
      { symbol: "KO", name: "Coca-Cola Company", price: "63.75", change: "0.85", percentChange: "1.35", marketCap: "$275.8B", marketCapValue: "275800000000", volume: 13829374, indices: ["S&P 500", "Russell 1000"], sector: "Consumer Staples" },
      { symbol: "PEP", name: "PepsiCo Inc.", price: "172.90", change: "-1.25", percentChange: "-0.72", marketCap: "$238.4B", marketCapValue: "238400000000", volume: 4827391, indices: ["S&P 500", "Russell 1000"], sector: "Consumer Staples" },
      { symbol: "BAC", name: "Bank of America Corp.", price: "43.85", change: "1.25", percentChange: "2.93", marketCap: "$342.8B", marketCapValue: "342800000000", volume: 52847291, indices: ["S&P 500", "Russell 1000"], sector: "Financial Services" },
      { symbol: "TMO", name: "Thermo Fisher Scientific", price: "525.40", change: "12.60", percentChange: "2.46", marketCap: "$204.7B", marketCapValue: "204700000000", volume: 1847291, indices: ["S&P 500", "Russell 1000"], sector: "Healthcare" },
      { symbol: "COST", name: "Costco Wholesale Corp.", price: "892.75", change: "-8.95", percentChange: "-0.99", marketCap: "$395.8B", marketCapValue: "395800000000", volume: 2394827, indices: ["S&P 500", "Russell 1000"], sector: "Consumer Staples" },
      { symbol: "WMT", name: "Walmart Inc.", price: "85.30", change: "1.45", percentChange: "1.73", marketCap: "$692.4B", marketCapValue: "692400000000", volume: 8294738, indices: ["S&P 500", "Russell 1000"], sector: "Consumer Staples" },
      { symbol: "DIS", name: "Walt Disney Company", price: "98.75", change: "-2.85", percentChange: "-2.81", marketCap: "$180.2B", marketCapValue: "180200000000", volume: 14827391, indices: ["S&P 500", "Russell 1000"], sector: "Communication Services" },
      { symbol: "NFLX", name: "Netflix Inc.", price: "685.20", change: "15.75", percentChange: "2.35", marketCap: "$295.8B", marketCapValue: "295800000000", volume: 8374829, indices: ["S&P 500", "NASDAQ 100", "Russell 1000"], sector: "Communication Services" },
      { symbol: "AMD", name: "Advanced Micro Devices", price: "142.85", change: "-7.25", percentChange: "-4.83", marketCap: "$230.5B", marketCapValue: "230500000000", volume: 47382947, indices: ["S&P 500", "NASDAQ 100", "Russell 1000"], sector: "Technology" },
      { symbol: "VZ", name: "Verizon Communications", price: "41.25", change: "0.65", percentChange: "1.60", marketCap: "$173.2B", marketCapValue: "173200000000", volume: 19847291, indices: ["S&P 500", "Russell 1000"], sector: "Communication Services" },
      { symbol: "ADBE", name: "Adobe Inc.", price: "485.30", change: "9.75", percentChange: "2.05", marketCap: "$218.4B", marketCapValue: "218400000000", volume: 3847291, indices: ["S&P 500", "NASDAQ 100", "Russell 1000"], sector: "Technology" },
      { symbol: "NKE", name: "Nike Inc.", price: "78.45", change: "-3.25", percentChange: "-3.98", marketCap: "$120.8B", marketCapValue: "120800000000", volume: 8294738, indices: ["S&P 500", "Russell 1000"], sector: "Consumer Discretionary" },
      { symbol: "NEE", name: "NextEra Energy Inc.", price: "75.90", change: "1.85", percentChange: "2.50", marketCap: "$152.4B", marketCapValue: "152400000000", volume: 6847291, indices: ["S&P 500", "Russell 1000"], sector: "Utilities" },
      { symbol: "BMY", name: "Bristol Myers Squibb", price: "52.75", change: "-1.45", percentChange: "-2.67", marketCap: "$108.3B", marketCapValue: "108300000000", volume: 12847291, indices: ["S&P 500", "Russell 1000"], sector: "Healthcare" },
      { symbol: "QCOM", name: "Qualcomm Inc.", price: "168.20", change: "4.25", percentChange: "2.59", marketCap: "$188.4B", marketCapValue: "188400000000", volume: 9384729, indices: ["S&P 500", "NASDAQ 100", "Russell 1000"], sector: "Technology" },
      { symbol: "HON", name: "Honeywell International", price: "225.40", change: "2.85", percentChange: "1.28", marketCap: "$148.7B", marketCapValue: "148700000000", volume: 3847291, indices: ["S&P 500", "Russell 1000"], sector: "Industrials" },
      { symbol: "LOW", name: "Lowe's Companies Inc.", price: "265.75", change: "-6.25", percentChange: "-2.30", marketCap: "$158.9B", marketCapValue: "158900000000", volume: 5847291, indices: ["S&P 500", "Russell 1000"], sector: "Consumer Discretionary" }
    ];

    // Insert stocks into database
    await db.insert(stocks).values(stockData as any);

    // Calculate market summary
    const gainers = stockData.filter(stock => parseFloat(stock.percentChange) > 0);
    const losers = stockData.filter(stock => parseFloat(stock.percentChange) < 0);
    
    const avgGainerChange = gainers.length > 0 
      ? (gainers.reduce((sum, stock) => sum + parseFloat(stock.percentChange), 0) / gainers.length).toFixed(3)
      : "0.000";
    
    const avgLoserChange = losers.length > 0
      ? (losers.reduce((sum, stock) => sum + parseFloat(stock.percentChange), 0) / losers.length).toFixed(3)
      : "0.000";

    const totalMarketCapValue = stockData.reduce((sum, stock) => sum + parseFloat(stock.marketCapValue), 0);
    const totalVolume = stockData.reduce((sum, stock) => sum + stock.volume, 0);

    const summaryData = {
      totalMovers: stockData.length,
      totalGainers: gainers.length,
      totalLosers: losers.length,
      totalMarketCap: `$${(totalMarketCapValue / 1e12).toFixed(1)}T`,
      avgGainerChange,
      avgLoserChange,
      avgVolume: `${(totalVolume / 1000000).toFixed(1)}M`,
      volatility: "Moderate",
      sectorLeader: "Technology",
    };

    await db.insert(marketSummary).values(summaryData);
  }

  private buildFilterQuery(filter?: StockFilter) {
    const conditions = [];
    
    if (filter) {
      // Change threshold filter
      if (filter.changeThreshold > 0) {
        conditions.push(sql`ABS(CAST(${stocks.percentChange} AS NUMERIC)) >= ${filter.changeThreshold}`);
      }

      // Market cap filter
      const marketCapThresholds = {
        "2B": "2000000000",
        "5B": "5000000000", 
        "10B": "10000000000",
        "50B": "50000000000",
      };
      const threshold = marketCapThresholds[filter.marketCap];
      if (threshold) {
        conditions.push(sql`CAST(${stocks.marketCapValue} AS NUMERIC) >= ${threshold}`);
      }

      // Index filter
      if (filter.indexFilter !== "all") {
        const indexMap = {
          "sp500": "S&P 500",
          "sp400": "S&P 400", 
          "sp600": "S&P 600",
          "nasdaq100": "NASDAQ 100",
          "russell1000": "Russell 1000",
          "russell2000": "Russell 2000", 
          "russell3000": "Russell 3000",
          "tmi": "TMI",
        };
        const targetIndex = indexMap[filter.indexFilter];
        if (targetIndex) {
          conditions.push(sql`${stocks.indices}::jsonb ? ${targetIndex}`);
        }
      }
    }
    
    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  private getSortOrder(filter?: StockFilter) {
    if (!filter) return desc(stocks.percentChange);
    
    const sortDirection = filter.sortOrder === "asc" ? asc : desc;
    
    switch (filter.sortBy) {
      case "marketCapValue":
        return sortDirection(sql`CAST(${stocks.marketCapValue} AS NUMERIC)`);
      case "volume":
        return sortDirection(stocks.volume);
      case "percentChange":
      default:
        return sortDirection(sql`CAST(${stocks.percentChange} AS NUMERIC)`);
    }
  }

  async getStocks(filter?: StockFilter): Promise<Stock[]> {
    const whereCondition = this.buildFilterQuery(filter);
    const orderBy = this.getSortOrder(filter);
    
    return await db
      .select()
      .from(stocks)
      .where(whereCondition)
      .orderBy(orderBy);
  }

  async getStock(id: number): Promise<Stock | undefined> {
    const [stock] = await db
      .select()
      .from(stocks)
      .where(eq(stocks.id, id));
    return stock || undefined;
  }

  async getStockBySymbol(symbol: string): Promise<Stock | undefined> {
    const [stock] = await db
      .select()
      .from(stocks)
      .where(eq(stocks.symbol, symbol));
    return stock || undefined;
  }

  async createStock(insertStock: InsertStock): Promise<Stock> {
    const [stock] = await db
      .insert(stocks)
      .values(insertStock)
      .returning();
    return stock;
  }

  async updateStock(id: number, updateStock: Partial<InsertStock>): Promise<Stock | undefined> {
    const [updated] = await db
      .update(stocks)
      .set({ ...updateStock, lastUpdated: new Date() } as any)
      .where(eq(stocks.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteStock(id: number): Promise<boolean> {
    const result = await db
      .delete(stocks)
      .where(eq(stocks.id, id));
    return (result.rowCount || 0) > 0;
  }

  async bulkUpsertStocks(stocksToUpsert: InsertStock[]): Promise<Stock[]> {
    const results: Stock[] = [];
    
    for (const stockData of stocksToUpsert) {
      const existing = await this.getStockBySymbol(stockData.symbol);
      
      if (existing) {
        const updated = await this.updateStock(existing.id, stockData);
        if (updated) results.push(updated);
      } else {
        const created = await this.createStock(stockData);
        results.push(created);
      }
    }
    
    return results;
  }

  async getTopGainers(limit = 10, filter?: StockFilter): Promise<Stock[]> {
    const baseConditions = [sql`CAST(${stocks.percentChange} AS NUMERIC) > 0`];
    const filterCondition = this.buildFilterQuery(filter);
    
    const whereCondition = filterCondition 
      ? and(...baseConditions, filterCondition)
      : and(...baseConditions);
    
    return await db
      .select()
      .from(stocks)
      .where(whereCondition)
      .orderBy(desc(sql`CAST(${stocks.percentChange} AS NUMERIC)`))
      .limit(limit);
  }

  async getTopLosers(limit = 10, filter?: StockFilter): Promise<Stock[]> {
    const baseConditions = [sql`CAST(${stocks.percentChange} AS NUMERIC) < 0`];
    const filterCondition = this.buildFilterQuery(filter);
    
    const whereCondition = filterCondition 
      ? and(...baseConditions, filterCondition)
      : and(...baseConditions);
    
    return await db
      .select()
      .from(stocks)
      .where(whereCondition)
      .orderBy(asc(sql`CAST(${stocks.percentChange} AS NUMERIC)`))
      .limit(limit);
  }

  async getSlackAlerts(limit = 10): Promise<SlackAlert[]> {
    return await db
      .select()
      .from(slackAlerts)
      .orderBy(desc(slackAlerts.sentAt))
      .limit(limit);
  }

  async createSlackAlert(insertAlert: InsertSlackAlert): Promise<SlackAlert> {
    const [alert] = await db
      .insert(slackAlerts)
      .values({ ...insertAlert, status: insertAlert.status || "sent" })
      .returning();
    return alert;
  }

  async getMarketSummary(): Promise<MarketSummary | undefined> {
    const [summary] = await db
      .select()
      .from(marketSummary)
      .orderBy(desc(marketSummary.lastUpdated))
      .limit(1);
    return summary || undefined;
  }

  async updateMarketSummary(summary: InsertMarketSummary): Promise<MarketSummary> {
    // First try to update existing summary
    const [updated] = await db
      .update(marketSummary)
      .set({ ...summary, lastUpdated: new Date() })
      .returning();
    
    if (updated) {
      return updated;
    }
    
    // If no existing summary, create new one
    const [created] = await db
      .insert(marketSummary)
      .values(summary)
      .returning();
    
    return created;
  }
}

export const storage = new DatabaseStorage();
