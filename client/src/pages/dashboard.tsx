import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { FilterPanel } from "@/components/dashboard/filter-panel";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { GainersTable } from "@/components/dashboard/gainers-table";
import { LosersTable } from "@/components/dashboard/losers-table";
import { SlackPanel } from "@/components/dashboard/slack-panel";
import { ExportPanel } from "@/components/dashboard/export-panel";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type Stock, type MarketSummary, type StockFilter } from "@/types/stock";

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<StockFilter>({
    changeThreshold: 2,
    marketCap: "2B",
    indexFilter: "all",
    sortBy: "percentChange",
    sortOrder: "desc",
  });

  const handleFilterChange = (newFilter: StockFilter) => {
    setFilter(newFilter);
  };

  // Queries
  const { data: summary, isLoading: summaryLoading } = useQuery<MarketSummary>({
    queryKey: ["/api/market-summary"],
  });

  const { data: marketStatus } = useQuery<{
    status: string;
    market: string;
    serverTime: string;
    exchanges: { name: string; status: string; }[];
  }>({
    queryKey: ["/api/market-status"],
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: gainers = [], isLoading: gainersLoading } = useQuery<Stock[]>({
    queryKey: ["/api/stocks/gainers", filter],
    queryFn: ({ queryKey }) => {
      const [, currentFilter] = queryKey;
      const params = new URLSearchParams({
        limit: "10",
        ...Object.fromEntries(
          Object.entries(currentFilter as StockFilter).map(([key, value]) => [key, String(value)])
        ),
      });
      return fetch(`/api/stocks/gainers?${params}`).then(res => res.json());
    },
  });

  const { data: losers = [], isLoading: losersLoading } = useQuery<Stock[]>({
    queryKey: ["/api/stocks/losers", filter],
    queryFn: ({ queryKey }) => {
      const [, currentFilter] = queryKey;
      const params = new URLSearchParams({
        limit: "10",
        ...Object.fromEntries(
          Object.entries(currentFilter as StockFilter).map(([key, value]) => [key, String(value)])
        ),
      });
      return fetch(`/api/stocks/losers?${params}`).then(res => res.json());
    },
  });

  // Live market data refresh mutation
  const refreshMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/refresh-live-data"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/gainers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stocks/losers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/market-summary"] });
      toast({
        title: "Live Data Updated",
        description: `${data.updatedStocks || 0} stocks updated with live market data from Alpha Vantage`,
      });
    },
    onError: (error: Error) => {
      console.error("Live refresh error:", error);
      toast({
        title: "Refresh Failed",
        description: "Failed to fetch live data. Check API key and connection.",
        variant: "destructive",
      });
    },
  });

  // Get refresh status query
  const { data: refreshStatus } = useQuery<{
    isRefreshing: boolean;
    autoRefreshActive: boolean;
    remainingRequests: number;
    trackedSymbols: number;
  }>({
    queryKey: ["/api/refresh-status"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatLastUpdated = (dateString?: string) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York',
      timeZoneName: 'short'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-semibold">Market Movers Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {marketStatus && (
                  <span className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${marketStatus.status === 'open' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="font-medium">US Market: {marketStatus.status.toUpperCase()}</span>
                    <span className="text-xs opacity-75">
                      {marketStatus.exchanges?.length > 0 ? `(${marketStatus.exchanges[0].name})` : '(NYSE/NASDAQ)'}
                    </span>
                  </span>
                )}
                {refreshStatus && (
                  <span className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${refreshStatus.isRefreshing ? 'bg-yellow-500' : 'bg-cyan-500'}`} />
                    {refreshStatus.isRefreshing ? 'Live data refreshing...' : `${refreshStatus.remainingRequests} API calls remaining`}
                  </span>
                )}
              </div>
              <ThemeToggle />
              <Button
                onClick={() => refreshMutation.mutate()}
                disabled={refreshMutation.isPending}
                className="flex items-center gap-2"
              >
                <RefreshCwIcon className={`w-4 h-4 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
                {refreshMutation.isPending ? "Fetching Live Data..." : "Get Live Data"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Panel */}
        <div className="mb-8">
          <FilterPanel
            filter={filter}
            onFilterChange={handleFilterChange}
            lastUpdated={formatLastUpdated(summary?.lastUpdated)}
          />
        </div>

        {/* Summary Cards */}
        <div className="mb-8">
          <SummaryCards summary={summary} isLoading={summaryLoading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Data Tables */}
          <div className="lg:col-span-2 space-y-8">
            <GainersTable
              gainers={gainers}
              filter={filter}
              onFilterChange={handleFilterChange}
              isLoading={gainersLoading}
            />
            <LosersTable
              losers={losers}
              filter={filter}
              onFilterChange={handleFilterChange}
              isLoading={losersLoading}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <SlackPanel />
            <ExportPanel summary={summary} filter={filter} />
          </div>
        </div>
      </main>
    </div>
  );
}
