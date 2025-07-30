import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { FilterPanel } from "@/components/dashboard/filter-panel";

import { GainersTable } from "@/components/dashboard/gainers-table";
import { LosersTable } from "@/components/dashboard/losers-table";
import { SlackPanel } from "@/components/dashboard/slack-panel";
import { ExportPanel } from "@/components/dashboard/export-panel";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type Stock, type MarketSummary, type StockFilter } from "@/types/stock";

function MarketOpenCountdown() {
  const [timeToOpen, setTimeToOpen] = useState<string>("");

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const today = new Date(now);
      
      // Set to 9:30 AM ET
      today.setHours(9, 30, 0, 0);
      
      // If it's past 9:30 AM today, set to 9:30 AM tomorrow (but skip weekends)
      if (now > today) {
        today.setDate(today.getDate() + 1);
      }
      
      // Skip weekends - if it's Saturday (6) or Sunday (0), move to Monday
      while (today.getDay() === 0 || today.getDay() === 6) {
        today.setDate(today.getDate() + 1);
      }
      
      const diff = today.getTime() - now.getTime();
      
      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 24) {
          const days = Math.floor(hours / 24);
          const remainingHours = hours % 24;
          setTimeToOpen(`${days}d ${remainingHours}h ${minutes}m to open`);
        } else {
          setTimeToOpen(`${hours}h ${minutes}m to open`);
        }
      } else {
        setTimeToOpen("");
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  if (!timeToOpen) return null;

  return (
    <span className="text-xs opacity-75">
      {timeToOpen}
    </span>
  );
}

function Dashboard() {
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
              <h1 className="text-2xl font-semibold">US Market Movers</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {marketStatus && (
                  <span className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${marketStatus.status === 'open' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="font-medium">US Market: {marketStatus.status.toUpperCase()}</span>
                    {marketStatus.status === 'closed' && (
                      <MarketOpenCountdown />
                    )}
                  </span>
                )}
                {refreshStatus?.isRefreshing && (
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    Live data refreshing...
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

export default Dashboard;
