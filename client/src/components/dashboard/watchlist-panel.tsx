import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, TrendingUp, TrendingDown, Eye, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface WatchlistStock {
  symbol: string;
  name: string;
  price: string;
  percentChange: string;
  marketCap: string;
  addedAt: string;
}

interface WatchlistPanelProps {
  onAddStock?: (stock: Omit<WatchlistStock, 'addedAt'>) => void;
}

export function WatchlistPanel({ onAddStock }: WatchlistPanelProps) {
  const [watchlist, setWatchlist] = useState<WatchlistStock[]>([
    {
      symbol: "AAPL",
      name: "Apple Inc",
      price: "211.27",
      percentChange: "-1.30",
      marketCap: "$3.2T",
      addedAt: new Date().toISOString()
    },
    {
      symbol: "MSFT", 
      name: "Microsoft Corp",
      price: "512.57",
      percentChange: "0.01",
      marketCap: "$3.8T",
      addedAt: new Date().toISOString()
    }
  ]);

  const removeFromWatchlist = (symbol: string) => {
    setWatchlist(prev => prev.filter(stock => stock.symbol !== symbol));
  };

  const addToWatchlist = (stock: Omit<WatchlistStock, 'addedAt'>) => {
    const exists = watchlist.find(w => w.symbol === stock.symbol);
    if (!exists) {
      setWatchlist(prev => [...prev, { ...stock, addedAt: new Date().toISOString() }]);
    }
  };

  const formatPercentChange = (change: string) => {
    const numChange = parseFloat(change);
    return {
      value: Math.abs(numChange).toFixed(2),
      isPositive: numChange >= 0
    };
  };

  // Expose addToWatchlist function to parent
  if (onAddStock && !window.addToWatchlist) {
    window.addToWatchlist = addToWatchlist;
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Eye className="w-5 h-5 text-[#5AF5FA]" />
            My Watchlist
          </CardTitle>
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            {watchlist.length} stocks
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {watchlist.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Eye className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm">No stocks in watchlist</p>
            <p className="text-xs mt-1">Search and add stocks to track them</p>
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {watchlist.map((stock) => {
                const { value: changeValue, isPositive } = formatPercentChange(stock.percentChange);
                return (
                  <div
                    key={stock.symbol}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">
                          {stock.symbol}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {stock.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-medium text-foreground">
                          ${parseFloat(stock.price).toFixed(2)}
                        </span>
                        <div className={cn(
                          "flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium",
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
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {stock.marketCap}
                      </div>
                    </div>
                    <Button
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeFromWatchlist(stock.symbol)}
                      className="ml-2 h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Plus className="w-3 h-3" />
            <span>Use search to add more stocks</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Global function for adding to watchlist
declare global {
  interface Window {
    addToWatchlist: (stock: Omit<WatchlistStock, 'addedAt'>) => void;
  }
}