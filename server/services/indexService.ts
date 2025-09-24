// Global Index Service for comprehensive index data from Finnhub
// Handles both index constituents and real-time index price data

interface IndexInfo {
  symbol: string;
  name: string;
  description: string;
  country: string;
  region: string;
  type: 'Index';
  currency: string;
}

interface IndexQuote {
  current: number;
  change: number;
  percentChange: number;
  timestamp: number;
}

interface IndexConstituents {
  symbol: string;
  constituents: string[];
  count: number;
}

// Comprehensive global indices supported by Finnhub
export const GLOBAL_INDICES: Record<string, IndexInfo> = {
  // United States Major Indices
  '^GSPC': {
    symbol: '^GSPC',
    name: 'S&P 500',
    description: 'Standard & Poor\'s 500 Index',
    country: 'United States',
    region: 'North America',
    type: 'Index',
    currency: 'USD'
  },
  '^DJI': {
    symbol: '^DJI', 
    name: 'Dow Jones Industrial Average',
    description: 'Dow Jones Industrial Average',
    country: 'United States',
    region: 'North America',
    type: 'Index',
    currency: 'USD'
  },
  '^IXIC': {
    symbol: '^IXIC',
    name: 'NASDAQ Composite',
    description: 'NASDAQ Composite Index',
    country: 'United States',
    region: 'North America',
    type: 'Index',
    currency: 'USD'
  },
  '^RUT': {
    symbol: '^RUT',
    name: 'Russell 2000',
    description: 'Russell 2000 Small Cap Index',
    country: 'United States',
    region: 'North America',
    type: 'Index',
    currency: 'USD'
  },

  // European Indices
  '^FTSE': {
    symbol: '^FTSE',
    name: 'FTSE 100',
    description: 'Financial Times Stock Exchange 100 Index',
    country: 'United Kingdom',
    region: 'Europe',
    type: 'Index',
    currency: 'GBP'
  },
  '^GDAXI': {
    symbol: '^GDAXI',
    name: 'DAX',
    description: 'Deutscher Aktienindex',
    country: 'Germany',
    region: 'Europe',
    type: 'Index',
    currency: 'EUR'
  },
  '^FCHI': {
    symbol: '^FCHI',
    name: 'CAC 40',
    description: 'Cotation Assistée en Continu',
    country: 'France',
    region: 'Europe',
    type: 'Index',
    currency: 'EUR'
  },
  '^STOXX': {
    symbol: '^STOXX',
    name: 'Euro STOXX 50',
    description: 'Euro STOXX 50 Index',
    country: 'European Union',
    region: 'Europe',
    type: 'Index',
    currency: 'EUR'
  },
  '^AEX': {
    symbol: '^AEX',
    name: 'AEX',
    description: 'Amsterdam Exchange Index',
    country: 'Netherlands',
    region: 'Europe',
    type: 'Index',
    currency: 'EUR'
  },
  '^IBEX': {
    symbol: '^IBEX',
    name: 'IBEX 35',
    description: 'Índice Bursátil Español',
    country: 'Spain',
    region: 'Europe',
    type: 'Index',
    currency: 'EUR'
  },
  '^MIB': {
    symbol: '^MIB',
    name: 'FTSE MIB',
    description: 'Financial Times Stock Exchange Milano Italia Borsa',
    country: 'Italy',
    region: 'Europe',
    type: 'Index',
    currency: 'EUR'
  },
  '^SMI': {
    symbol: '^SMI',
    name: 'Swiss Market Index',
    description: 'Swiss Market Index',
    country: 'Switzerland',
    region: 'Europe',
    type: 'Index',
    currency: 'CHF'
  },

  // Asia Pacific Indices
  '^N225': {
    symbol: '^N225',
    name: 'Nikkei 225',
    description: 'Nikkei Stock Average',
    country: 'Japan',
    region: 'Asia Pacific',
    type: 'Index',
    currency: 'JPY'
  },
  '^HSI': {
    symbol: '^HSI',
    name: 'Hang Seng',
    description: 'Hang Seng Index',
    country: 'Hong Kong',
    region: 'Asia Pacific',
    type: 'Index',
    currency: 'HKD'
  },
  '^AORD': {
    symbol: '^AORD',
    name: 'All Ordinaries',
    description: 'All Ordinaries Index',
    country: 'Australia',
    region: 'Asia Pacific',
    type: 'Index',
    currency: 'AUD'
  },
  '^KOSPI': {
    symbol: '^KOSPI',
    name: 'KOSPI',
    description: 'Korea Composite Stock Price Index',
    country: 'South Korea',
    region: 'Asia Pacific',
    type: 'Index',
    currency: 'KRW'
  },

  // Other Global Indices
  '^GSPTSE': {
    symbol: '^GSPTSE',
    name: 'TSX Composite',
    description: 'S&P/TSX Composite Index',
    country: 'Canada',
    region: 'North America',
    type: 'Index',
    currency: 'CAD'
  },
  '^BVSP': {
    symbol: '^BVSP',
    name: 'BOVESPA',
    description: 'Índice Bovespa',
    country: 'Brazil',
    region: 'South America',
    type: 'Index',
    currency: 'BRL'
  },
  '^MXX': {
    symbol: '^MXX',
    name: 'IPC Mexico',
    description: 'Índice de Precios y Cotizaciones',
    country: 'Mexico',
    region: 'North America',
    type: 'Index',
    currency: 'MXN'
  }
};

export class IndexService {
  private finnhubApiKey: string;

  constructor() {
    this.finnhubApiKey = process.env.FINNHUB_API_KEY || '';
  }

  private async makeRequest(endpoint: string): Promise<any> {
    const url = `https://finnhub.io/api/v1${endpoint}&token=${this.finnhubApiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Get real-time index quote data
   */
  async getIndexQuote(symbol: string): Promise<IndexQuote | null> {
    try {
      const quote = await this.makeRequest(`/quote?symbol=${encodeURIComponent(symbol)}`);
      
      if (!quote || typeof quote.c !== 'number') {
        return null;
      }
      
      return {
        current: quote.c,
        change: quote.d || 0,
        percentChange: quote.dp || 0,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Error fetching index quote for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get index constituents (stocks in the index)
   */
  async getIndexConstituents(symbol: string): Promise<IndexConstituents | null> {
    try {
      const data = await this.makeRequest(`/index/constituents?symbol=${encodeURIComponent(symbol)}`);
      
      if (!data || !Array.isArray(data.constituents)) {
        return null;
      }
      
      return {
        symbol,
        constituents: data.constituents,
        count: data.constituents.length
      };
    } catch (error) {
      console.error(`Error fetching index constituents for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Search indices by name or symbol
   */
  searchIndices(query: string): IndexInfo[] {
    const searchTerm = query.toLowerCase();
    
    return Object.values(GLOBAL_INDICES).filter(index => 
      index.name.toLowerCase().includes(searchTerm) ||
      index.symbol.toLowerCase().includes(searchTerm) ||
      index.description.toLowerCase().includes(searchTerm) ||
      index.country.toLowerCase().includes(searchTerm)
    ).slice(0, 10); // Limit to 10 results
  }

  /**
   * Get all supported indices
   */
  getAllIndices(): IndexInfo[] {
    return Object.values(GLOBAL_INDICES);
  }

  /**
   * Get indices by region
   */
  getIndicesByRegion(region: string): IndexInfo[] {
    return Object.values(GLOBAL_INDICES).filter(index => 
      index.region.toLowerCase() === region.toLowerCase()
    );
  }

  /**
   * Get detailed index information with price and constituents
   */
  async getDetailedIndexInfo(symbol: string): Promise<any> {
    const indexInfo = GLOBAL_INDICES[symbol];
    
    if (!indexInfo) {
      return null;
    }

    try {
      const [quote, constituents] = await Promise.all([
        this.getIndexQuote(symbol),
        this.getIndexConstituents(symbol)
      ]);

      return {
        ...indexInfo,
        quote,
        constituents: constituents?.constituents || [],
        constituentCount: constituents?.count || 0,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error fetching detailed index info for ${symbol}:`, error);
      return null;
    }
  }
}

export const indexService = new IndexService();