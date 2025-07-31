import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { TickerSearch } from "./ticker-search";
import { GainersTable } from "./gainers-table";
import { LosersTable } from "./losers-table";
import { type Stock, type StockFilter } from "@/types/stock";

interface MarketMoversTabsProps {
  gainers: Stock[];
  losers: Stock[];
  filter: StockFilter;
  onFilterChange: (filter: StockFilter) => void;
  gainersLoading: boolean;
  losersLoading: boolean;
  onFinnhubRefresh: () => void;
  isRefreshing: boolean;
}

export function MarketMoversTabs({ 
  gainers, 
  losers, 
  filter, 
  onFilterChange, 
  gainersLoading, 
  losersLoading,
  onFinnhubRefresh,
  isRefreshing
}: MarketMoversTabsProps) {
  const [activeTab, setActiveTab] = useState("gainers");

  const updateFilter = (key: keyof StockFilter, value: any) => {
    onFilterChange({ ...filter, [key]: value });
  };

  return (
    <Card className="overflow-visible">
      <CardHeader className="pb-4">
        <div className="w-full">
          {/* Ticker Search - Full Width */}
          <div className="relative w-full" style={{ zIndex: 1000 }}>
            <TickerSearch onSelectStock={(stock) => {
              console.log("Selected stock:", stock);
            }} />
          </div>
        </div>
        
        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="changeThreshold">% Change Threshold</Label>
            <Select
              value={filter.changeThreshold.toString()}
              onValueChange={(value) => updateFilter("changeThreshold", parseInt(value))}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">≥ 1%</SelectItem>
                <SelectItem value="2">≥ 2%</SelectItem>
                <SelectItem value="3">≥ 3%</SelectItem>
                <SelectItem value="5">≥ 5%</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sortBy">Sort By</Label>
            <Select
              value={filter.sortBy}
              onValueChange={(value) => updateFilter("sortBy", value)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentChange">% Change</SelectItem>
                <SelectItem value="marketCapValue">Market Cap</SelectItem>
                <SelectItem value="volume">Volume</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="marketCap">Market Cap</Label>
            <Select
              value={filter.marketCap}
              onValueChange={(value) => updateFilter("marketCap", value)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2B">≥ $2B</SelectItem>
                <SelectItem value="5B">≥ $5B</SelectItem>
                <SelectItem value="10B">≥ $10B</SelectItem>
                <SelectItem value="50B">≥ $50B</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="indexFilter">Index Filter</Label>
            <Select
              value={filter.indexFilter}
              onValueChange={(value) => updateFilter("indexFilter", value)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Indices (146)</SelectItem>
                <SelectItem value="russell1000">Russell 1000 (146)</SelectItem>
                <SelectItem value="sp500">S&P 500 (31)</SelectItem>
                <SelectItem value="nasdaq100">NASDAQ 100 (11)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Market Movers</h3>
          <Button
            onClick={onFinnhubRefresh}
            disabled={isRefreshing}
            size="sm"
            className="bg-[#5AF5FA] hover:bg-[#4AE5EA] text-black"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh from Finnhub'}
          </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="gainers" className="data-[state=active]:bg-[#5AF5FA] data-[state=active]:text-black">
              Top Gainers ({gainers.length})
            </TabsTrigger>
            <TabsTrigger value="losers" className="data-[state=active]:bg-[#FFA5FF] data-[state=active]:text-black">
              Top Losers ({losers.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="gainers" className="mt-4">
            <GainersTable
              gainers={gainers}
              filter={filter}
              onFilterChange={onFilterChange}
              isLoading={gainersLoading}
            />
          </TabsContent>
          
          <TabsContent value="losers" className="mt-4">
            <LosersTable
              losers={losers}
              filter={filter}
              onFilterChange={onFilterChange}
              isLoading={losersLoading}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}