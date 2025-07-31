import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, TrendingUp, TrendingDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PriceChart } from "./price-chart";

interface SearchResult {
  symbol: string;
  name: string;
  price: string;
  percentChange: string;
  marketCap: string;
}

interface TickerSearchProps {
  onSelectStock?: (stock: SearchResult) => void;
}

export function TickerSearch({ onSelectStock }: TickerSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<SearchResult | null>(null);

  // Debounce search query - increased delay for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500); // Increased from 300ms to 500ms

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch search results
  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ["/api/stocks/search", debouncedQuery],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!debouncedQuery || debouncedQuery.trim().length < 2) {
        return [];
      }
      const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(debouncedQuery.trim())}`);
      if (!response.ok) throw new Error("Search failed");
      return await response.json();
    },
    enabled: debouncedQuery.trim().length >= 2,
  });

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    setIsOpen(value.length > 0);
  };

  const handleSelectStock = (stock: SearchResult) => {
    setSearchQuery(`${stock.symbol} - ${stock.name}`);
    setIsOpen(false);
    setSelectedStock(stock);
    onSelectStock?.(stock);
  };

  const handleAddToWatchlist = (e: React.MouseEvent, stock: SearchResult) => {
    e.stopPropagation(); // Prevent triggering the parent button click
    if (window.addToWatchlist) {
      window.addToWatchlist({
        symbol: stock.symbol,
        name: stock.name,
        price: stock.price,
        percentChange: stock.percentChange,
        marketCap: stock.marketCap
      });
    }
  };

  const formatPercentChange = (change: string) => {
    const numChange = parseFloat(change);
    return {
      value: Math.abs(numChange).toFixed(2),
      isPositive: numChange >= 0
    };
  };

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          type="text"
          placeholder="Search ticker or company name..."
          value={searchQuery}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => searchQuery.length > 0 && setIsOpen(true)}
          className="pl-10 pr-4 bg-background border-border focus:border-[#5AF5FA] focus:ring-[#5AF5FA]/20"
        />
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-1 max-h-80 overflow-y-auto z-[9999] shadow-lg border-border bg-card">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-[#5AF5FA] border-t-transparent rounded-full animate-spin" />
                Searching...
              </div>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="py-2">
              {searchResults.map((stock) => {
                const { value: changeValue, isPositive } = formatPercentChange(stock.percentChange);
                return (
                  <div
                    key={`${stock.symbol}-${stock.name}`}
                    className="w-full px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-b-0 cursor-pointer"
                    onClick={() => handleSelectStock(stock)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{stock.symbol}</span>
                          <span className="text-sm text-muted-foreground truncate">
                            {stock.name}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {stock.marketCap}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="font-medium text-foreground">
                          ${parseFloat(stock.price).toFixed(2)}
                        </span>
                        <div className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
                          isPositive 
                            ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                        )}>
                          {isPositive ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {changeValue}%
                        </div>
                        <button
                          onClick={(e) => handleAddToWatchlist(e, stock)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-[#5AF5FA]/10 text-[#5AF5FA] hover:bg-[#5AF5FA]/20 transition-colors border border-[#5AF5FA]/30"
                          title="Add to Watchlist"
                        >
                          <Plus className="w-3 h-3" />
                          Watch
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : debouncedQuery && !isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              No stocks found for "{debouncedQuery}"
            </div>
          ) : null}
        </Card>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Price Chart */}
      {selectedStock && (
        <div className="mt-6">
          <PriceChart
            symbol={selectedStock.symbol}
            name={selectedStock.name}
            currentPrice={selectedStock.price}
            percentChange={selectedStock.percentChange}
            marketCap={selectedStock.marketCap}
          />
        </div>
      )}
    </div>
  );
}