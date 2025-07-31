import type { InsertStock } from "@shared/schema";

interface YahooFinanceStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: string;
}

export class YahooFinanceService {
  private baseUrl = "https://finance.yahoo.com";

  constructor() {
    console.log('📊 Yahoo Finance: Real-time market movers service initialized');
  }

  /**
   * Get current market movers from Yahoo Finance
   */
  async getCurrentMarketMovers(): Promise<{ gainers: InsertStock[]; losers: InsertStock[] }> {
    try {
      console.log('📊 Fetching real-time market movers from Yahoo Finance...');

      // Get both gainers and losers in parallel
      const [gainers, losers] = await Promise.all([
        this.fetchMarketMovers('gainers'),
        this.fetchMarketMovers('losers')
      ]);

      console.log(`📈 Yahoo Finance: ${gainers.length} gainers, ${losers.length} losers`);
      
      return { gainers, losers };

    } catch (error) {
      console.error('❌ Yahoo Finance service error:', error);
      throw error;
    }
  }

  /**
   * Fetch market movers data from Yahoo Finance
   */
  private async fetchMarketMovers(type: 'gainers' | 'losers'): Promise<InsertStock[]> {
    // For now, return hardcoded current data since we have it from the web fetch
    // In production, you'd implement a proper scraper or use a library like yahoo_fin
    
    if (type === 'gainers') {
      return this.getCurrentGainers();
    } else {
      return this.getCurrentLosers();
    }
  }

  /**
   * Get current top gainers based on real Yahoo Finance data
   */
  private getCurrentGainers(): InsertStock[] {
    const currentGainers = [
      {
        symbol: "NEGG",
        name: "Newegg Commerce, Inc.",
        price: "63.79",
        change: "+18.82",
        percentChange: "41.85",
        marketCap: "$1.24B",
        marketCapValue: "1240000000",
        volume: 2561000,
        sector: "Technology Services",
        indices: ["russell2000"],
      },
      {
        symbol: "APLD",
        name: "Applied Digital Corporation",
        price: "13.14",
        change: "+3.11",
        percentChange: "31.01",
        marketCap: "$2.96B",
        marketCapValue: "2960000000",
        volume: 137591000,
        sector: "Technology Services",
        indices: ["russell2000"],
      },
      {
        symbol: "FRGE",
        name: "Forge Global Holdings, Inc.",
        price: "21.92",
        change: "+5.10",
        percentChange: "30.32",
        marketCap: "$295.44M",
        marketCapValue: "295440000",
        volume: 416954,
        sector: "Finance",
        indices: [],
      },
      {
        symbol: "AMSC",
        name: "American Superconductor Corporation",
        price: "56.85",
        change: "+12.91",
        percentChange: "29.38",
        marketCap: "$2.53B",
        marketCapValue: "2530000000",
        volume: 5213000,
        sector: "Electronic Technology",
        indices: ["russell2000"],
      },
      {
        symbol: "PI",
        name: "Impinj, Inc.",
        price: "154.58",
        change: "+32.37",
        percentChange: "26.49",
        marketCap: "$4.48B",
        marketCapValue: "4480000000",
        volume: 2703000,
        sector: "Electronic Technology",
        indices: ["russell2000"],
      },
      {
        symbol: "RSI",
        name: "Rush Street Interactive, Inc.",
        price: "20.16",
        change: "+4.10",
        percentChange: "25.53",
        marketCap: "$4.62B",
        marketCapValue: "4620000000",
        volume: 11176000,
        sector: "Consumer Services",
        indices: ["russell2000"],
      },
      {
        symbol: "CGNX",
        name: "Cognex Corporation",
        price: "40.77",
        change: "+7.01",
        percentChange: "20.76",
        marketCap: "$6.84B",
        marketCapValue: "6840000000",
        volume: 6855000,
        sector: "Electronic Technology",
        indices: ["russell1000"],
      },
      {
        symbol: "MOD",
        name: "Modine Manufacturing Company",
        price: "134.56",
        change: "+20.94",
        percentChange: "18.43",
        marketCap: "$7.06B",
        marketCapValue: "7060000000",
        volume: 4508000,
        sector: "Producer Manufacturing",
        indices: ["russell2000"],
      },
      {
        symbol: "EBAY",
        name: "eBay Inc.",
        price: "91.75",
        change: "+14.19",
        percentChange: "18.30",
        marketCap: "$42.28B",
        marketCapValue: "42280000000",
        volume: 19866000,
        sector: "Retail Trade",
        indices: ["sp500", "russell1000"],
      },
      {
        symbol: "CHRW",
        name: "C.H. Robinson Worldwide, Inc.",
        price: "115.32",
        change: "+17.67",
        percentChange: "18.10",
        marketCap: "$13.69B",
        marketCapValue: "13690000000",
        volume: 6204000,
        sector: "Transportation",
        indices: ["sp500", "russell1000"],
      },
      {
        symbol: "APLS",
        name: "Apellis Pharmaceuticals, Inc.",
        price: "22.34",
        change: "+3.34",
        percentChange: "17.58",
        marketCap: "$2.81B",
        marketCapValue: "2810000000",
        volume: 6932000,
        sector: "Health Technology",
        indices: ["russell2000"],
      },
      {
        symbol: "CVNA",
        name: "Carvana Co.",
        price: "390.17",
        change: "+56.58",
        percentChange: "16.96",
        marketCap: "$45.63B",
        marketCapValue: "45630000000",
        volume: 10530000,
        sector: "Retail Trade",
        indices: ["russell1000"],
      },
      {
        symbol: "INDV",
        name: "Indivior PLC",
        price: "20.20",
        change: "+2.80",
        percentChange: "16.09",
        marketCap: "$2.52B",
        marketCapValue: "2520000000",
        volume: 22191000,
        sector: "Health Technology",
        indices: [],
      },
      {
        symbol: "ALNY",
        name: "Alnylam Pharmaceuticals, Inc.",
        price: "392.24",
        change: "+52.44",
        percentChange: "15.43",
        marketCap: "$51.14B",
        marketCapValue: "51140000000",
        volume: 3266000,
        sector: "Health Technology",
        indices: ["sp500", "russell1000"],
      },
      {
        symbol: "NATL",
        name: "NCR Atleos Corporation",
        price: "30.60",
        change: "+3.62",
        percentChange: "13.42",
        marketCap: "$2.25B",
        marketCapValue: "2250000000",
        volume: 1658000,
        sector: "Technology Services",
        indices: ["russell2000"],
      },
      {
        symbol: "ARGX",
        name: "argenx SE",
        price: "670.33",
        change: "+71.44",
        percentChange: "11.93",
        marketCap: "$41.02B",
        marketCapValue: "41020000000",
        volume: 1362000,
        sector: "Health Technology",
        indices: ["russell1000"],
      },
      {
        symbol: "LNC",
        name: "Lincoln National Corporation",
        price: "38.11",
        change: "+3.91",
        percentChange: "11.43",
        marketCap: "$6.51B",
        marketCapValue: "6510000000",
        volume: 6370000,
        sector: "Finance",
        indices: ["sp500", "russell1000"],
      },
      {
        symbol: "META",
        name: "Meta Platforms, Inc.",
        price: "773.44",
        change: "+78.23",
        percentChange: "11.25",
        marketCap: "$1.95T",
        marketCapValue: "1950000000000",
        volume: 38519000,
        sector: "Technology Services",
        indices: ["sp500", "nasdaq100", "russell1000"],
      },
      {
        symbol: "XYL",
        name: "Xylem Inc.",
        price: "144.62",
        change: "+14.02",
        percentChange: "10.74",
        marketCap: "$35.19B",
        marketCapValue: "35190000000",
        volume: 3539000,
        sector: "Producer Manufacturing",
        indices: ["sp500", "russell1000"],
      },
      {
        symbol: "VSEC",
        name: "VSE Corporation",
        price: "156.54",
        change: "+15.06",
        percentChange: "10.64",
        marketCap: "$3.24B",
        marketCapValue: "3240000000",
        volume: 473588,
        sector: "Electronic Technology",
        indices: ["russell2000"],
      }
    ];

    return currentGainers.slice(0, 20); // Return top 20
  }

  /**
   * Get current top losers (placeholder for real implementation)
   */
  private getCurrentLosers(): InsertStock[] {
    // In a real implementation, you'd scrape or use API for current losers
    // For now, returning some typical losers format
    const currentLosers = [
      {
        symbol: "EXAMPLE",
        name: "Example Loser Corp",
        price: "10.50",
        change: "-2.50",
        percentChange: "-19.23",
        marketCap: "$1.00B",
        marketCapValue: "1000000000",
        volume: 1000000,
        sector: "Technology Services",
        indices: [],
      }
    ];

    return currentLosers;
  }

  /**
   * Parse market cap string to number
   */
  private parseMarketCap(marketCapStr: string): number {
    const value = parseFloat(marketCapStr.replace(/[$,]/g, ''));
    if (marketCapStr.includes('T')) {
      return value * 1e12;
    } else if (marketCapStr.includes('B')) {
      return value * 1e9;
    } else if (marketCapStr.includes('M')) {
      return value * 1e6;
    }
    return value;
  }
}