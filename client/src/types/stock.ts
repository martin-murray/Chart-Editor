export interface Stock {
  id: number;
  symbol: string;
  name: string;
  price: string;
  change: string;
  percentChange: string;
  marketCap: string;
  marketCapValue: string;
  volume: number;
  indices: string[];
  sector: string;
  lastUpdated: string;
}

export interface MarketSummary {
  id: number;
  totalMovers: number;
  totalGainers: number;
  totalLosers: number;
  totalMarketCap: string;
  avgGainerChange: string;
  avgLoserChange: string;
  avgVolume: string;
  volatility: string;
  sectorLeader: string;
  lastUpdated: string;
}

export interface SlackAlert {
  id: number;
  type: string;
  title: string;
  description: string;
  sentAt: string;
  status: string;
}

export interface StockFilter {
  changeThreshold: number;
  marketCap: "2B" | "5B" | "10B" | "50B";
  indexFilter: "all" | "sp500" | "sp400" | "sp600" | "nasdaq100" | "russell1000" | "russell2000" | "russell3000" | "tmi";
  sortBy: "percentChange" | "marketCapValue" | "volume";
  sortOrder: "asc" | "desc";
}
