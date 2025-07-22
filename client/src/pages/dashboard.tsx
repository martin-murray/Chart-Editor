import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon } from "lucide-react";
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

  // Queries
  const { data: summary, isLoading: summaryLoading } = useQuery<MarketSummary>({
    queryKey: ["/api/market-summary"],
  });

  const { data: gainers = [], isLoading: gainersLoading } = useQuery<Stock[]>({
    queryKey: ["/api/stocks/gainers", filter],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: "10",
        ...Object.fromEntries(
          Object.entries(filter).map(([key, value]) => [key, String(value)])
        ),
      });
      return fetch(`/api/stocks/gainers?${params}`).then(res => res.json());
    },
  });

  const { data: losers = [], isLoading: losersLoading } = useQuery<Stock[]>({
    queryKey: ["/api/stocks/losers", filter],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: "10",
        ...Object.fromEntries(
          Object.entries(filter).map(([key, value]) => [key, String(value)])
        ),
      });
      return fetch(`/api/stocks/losers?${params}`).then(res => res.json());
    },
  });

  // Refresh data mutation
  const refreshMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/stocks/refresh"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api"] });
      toast({
        title: "Data Refreshed",
        description: "Stock data has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Refresh Failed",
        description: error.message,
        variant: "destructive",
      });
    },
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
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      {/* Header */}
      <header className="bg-background border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-semibold">Market Movers Dashboard</h1>
              <p className="text-sm text-muted-foreground">Research Team - Real-time Stock Tracking</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Last updated: <span className="font-medium">{formatLastUpdated(summary?.lastUpdated)}</span>
              </div>
              <Button
                onClick={() => refreshMutation.mutate()}
                disabled={refreshMutation.isPending}
                className="flex items-center gap-2"
              >
                <RefreshCwIcon className={`w-4 h-4 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
                {refreshMutation.isPending ? "Refreshing..." : "Refresh Data"}
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
            onFilterChange={setFilter}
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
              onFilterChange={setFilter}
              isLoading={gainersLoading}
            />
            <LosersTable
              losers={losers}
              filter={filter}
              onFilterChange={setFilter}
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
