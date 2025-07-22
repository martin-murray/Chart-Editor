import { Card, CardContent } from "@/components/ui/card";
import { TrendingUpIcon, TrendingDownIcon, BarChart3Icon, DollarSignIcon } from "lucide-react";
import { type MarketSummary } from "@/types/stock";

interface SummaryCardsProps {
  summary?: MarketSummary;
  isLoading?: boolean;
}

export function SummaryCards({ summary, isLoading }: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No market data available
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Market Movers</p>
              <p className="text-2xl font-bold">{summary.totalMovers}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <BarChart3Icon className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">≥$2B market cap stocks</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Top Gainers</p>
              <p className="text-2xl font-bold text-gainer">{summary.totalGainers}</p>
            </div>
            <div className="p-3 bg-gainer/10 rounded-lg">
              <TrendingUpIcon className="w-6 h-6 text-gainer" />
            </div>
          </div>
          <p className="text-xs text-gainer mt-2">+{summary.avgGainerChange}% avg change</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Top Losers</p>
              <p className="text-2xl font-bold text-loser">{summary.totalLosers}</p>
            </div>
            <div className="p-3 bg-loser/10 rounded-lg">
              <TrendingDownIcon className="w-6 h-6 text-loser" />
            </div>
          </div>
          <p className="text-xs text-loser mt-2">{summary.avgLoserChange}% avg change</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Market Cap</p>
              <p className="text-2xl font-bold">{summary.totalMarketCap}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <DollarSignIcon className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Total tracked value</p>
        </CardContent>
      </Card>
    </div>
  );
}
