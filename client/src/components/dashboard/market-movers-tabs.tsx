import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { TickerSearch } from "./ticker-search";
import { DataTable, StockSymbolCell, PercentChangeCell, PriceChangeCell, IndexBadges } from "@/components/ui/data-table";
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

  const columns = [
    {
      key: "symbol" as keyof Stock,
      header: "Stock",
      cell: (value: string, row: Stock) => <StockSymbolCell symbol={value} name={row.name} />,
    },
    {
      key: "price" as keyof Stock,
      header: "Price",
      cell: (value: string) => `$${value}`,
    },
    {
      key: "change" as keyof Stock,
      header: "Change",
      cell: (value: string) => <PriceChangeCell value={value} />,
    },
    {
      key: "percentChange" as keyof Stock,
      header: "% Change",
      cell: (value: string) => <PercentChangeCell value={value} />,
    },
    {
      key: "marketCap" as keyof Stock,
      header: "Market Cap",
    },
    {
      key: "indices" as keyof Stock,
      header: "Index",
      cell: (value: string[]) => <IndexBadges indices={value} />,
    },
  ];

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
        
        {/* Filters Row - Always Inline */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <div className="flex-1 space-y-2">
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

          <div className="flex-1 space-y-2">
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

          <div className="flex-1 space-y-2">
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
            {gainersLoading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded"></div>
                ))}
              </div>
            ) : (
              <DataTable
                data={gainers}
                columns={columns}
              />
            )}
          </TabsContent>
          
          <TabsContent value="losers" className="mt-4">
            {losersLoading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded"></div>
                ))}
              </div>
            ) : (
              <DataTable
                data={losers}
                columns={columns}
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}