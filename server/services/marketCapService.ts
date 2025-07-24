import { db } from '../db';
import { stocks } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface CompanyOverview {
  Symbol: string;
  MarketCapitalization: string;
  Name: string;
  Exchange: string;
  Country: string;
  Sector: string;
  Industry: string;
}

export class MarketCapService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://www.alphavantage.co/query';
  private cache = new Map<string, { marketCap: number; timestamp: number }>();
  private readonly cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY!;
    if (!this.apiKey) {
      throw new Error("ALPHA_VANTAGE_API_KEY environment variable must be set");
    }
  }

  /**
   * Get real market cap from Alpha Vantage OVERVIEW function
   */
  async getRealMarketCap(symbol: string): Promise<number | null> {
    // Check cache first
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.marketCap;
    }

    try {
      const url = `${this.baseUrl}?function=OVERVIEW&symbol=${symbol}&apikey=${this.apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`Failed to fetch overview for ${symbol}: ${response.status}`);
        return null;
      }

      const data: CompanyOverview = await response.json();
      
      // Check for API errors
      if ('Error Message' in data || 'Note' in data || !data.MarketCapitalization) {
        console.warn(`No market cap data for ${symbol}:`, data);
        return null;
      }

      // Ensure it's a US company
      if (data.Country !== 'USA' && data.Exchange !== 'NASDAQ' && data.Exchange !== 'NYSE') {
        console.log(`${symbol} is not a US company (${data.Country}, ${data.Exchange})`);
        return null;
      }

      const marketCap = parseInt(data.MarketCapitalization);
      if (isNaN(marketCap) || marketCap <= 0) {
        console.warn(`Invalid market cap for ${symbol}: ${data.MarketCapitalization}`);
        return null;
      }

      // Cache the result
      this.cache.set(symbol, { marketCap, timestamp: Date.now() });
      
      console.log(`✅ ${symbol}: Real market cap $${(marketCap / 1e9).toFixed(1)}B`);
      return marketCap;

    } catch (error) {
      console.error(`Error fetching market cap for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Validate and filter stocks by real market cap
   */
  async validateStockMarketCap(symbol: string, minMarketCap: number = 2e9): Promise<boolean> {
    const marketCap = await this.getRealMarketCap(symbol);
    
    if (marketCap === null) {
      console.log(`❌ ${symbol}: Could not verify market cap - excluding`);
      return false;
    }

    const meetsRequirement = marketCap >= minMarketCap;
    if (!meetsRequirement) {
      console.log(`❌ ${symbol}: Market cap $${(marketCap / 1e9).toFixed(1)}B < $${(minMarketCap / 1e9).toFixed(1)}B requirement`);
    }

    return meetsRequirement;
  }

  /**
   * Get company overview including real market cap and company details
   */
  async getCompanyOverview(symbol: string): Promise<{
    marketCap: number;
    name: string;
    sector: string;
    exchange: string;
  } | null> {
    try {
      const url = `${this.baseUrl}?function=OVERVIEW&symbol=${symbol}&apikey=${this.apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) return null;

      const data: CompanyOverview = await response.json();
      
      if ('Error Message' in data || 'Note' in data || !data.MarketCapitalization) {
        return null;
      }

      // Ensure it's a US company
      if (data.Country !== 'USA' && data.Exchange !== 'NASDAQ' && data.Exchange !== 'NYSE') {
        return null;
      }

      const marketCap = parseInt(data.MarketCapitalization);
      if (isNaN(marketCap) || marketCap <= 0) return null;

      return {
        marketCap,
        name: data.Name || `${symbol} Inc.`,
        sector: data.Sector || 'Technology',
        exchange: data.Exchange || 'NASDAQ'
      };

    } catch (error) {
      console.error(`Error fetching overview for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Clear cache for testing
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const marketCapService = new MarketCapService();