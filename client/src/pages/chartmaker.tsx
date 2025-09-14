import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Search, TrendingUp, TrendingDown, BarChart3, ArrowLeft, Trash2, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { PriceChart } from "@/components/dashboard/price-chart";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface GlobalSearchResult {
  symbol: string;
  description: string;
  displaySymbol: string;
  type: string;
}

interface Annotation {
  id: string;
  type: 'text' | 'percentage' | 'horizontal';
  x: number;
  y: number;
  timestamp: number;
  price: number;
  text?: string;
  time: string;
  // For percentage measurements
  startTimestamp?: number;
  startPrice?: number;
  startTime?: string;
  endTimestamp?: number;
  endPrice?: number;
  endTime?: string;
  percentage?: number;
}

interface GlobalTickerSearchProps {
  onSelectStock?: (stock: GlobalSearchResult) => void;
}

// Annotation persistence helpers
const getStoredAnnotations = (): Record<string, Annotation[]> => {
  try {
    const stored = localStorage.getItem('chartmaker-annotations');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const saveAnnotations = (annotationsBySymbol: Record<string, Annotation[]>) => {
  try {
    localStorage.setItem('chartmaker-annotations', JSON.stringify(annotationsBySymbol));
  } catch {
    // Ignore localStorage errors
  }
};

const getRememberSetting = (): boolean => {
  try {
    const stored = localStorage.getItem('chartmaker-remember-per-ticker');
    return stored !== null ? JSON.parse(stored) : true; // Default to true
  } catch {
    return true;
  }
};

const saveRememberSetting = (remember: boolean) => {
  try {
    localStorage.setItem('chartmaker-remember-per-ticker', JSON.stringify(remember));
  } catch {
    // Ignore localStorage errors
  }
};

function GlobalTickerSearch({ onSelectStock }: GlobalTickerSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<GlobalSearchResult | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [recentSearches, setRecentSearches] = useState<GlobalSearchResult[]>([]);
  
  // Annotation state management
  const [annotationsBySymbol, setAnnotationsBySymbol] = useState<Record<string, Annotation[]>>(() => getStoredAnnotations());
  const [rememberPerTicker, setRememberPerTicker] = useState(() => getRememberSetting());
  
  // Current annotations for selected stock
  const currentAnnotations = selectedStock && rememberPerTicker 
    ? annotationsBySymbol[selectedStock.displaySymbol] || []
    : [];

  // Load recent searches from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('recentTickerSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Error parsing recent searches:', error);
      }
    }
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch global search results using Finnhub API
  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ["/api/stocks/global-search", debouncedQuery],
    queryFn: async (): Promise<GlobalSearchResult[]> => {
      if (!debouncedQuery || debouncedQuery.trim().length < 2) {
        return [];
      }
      const response = await fetch(`/api/stocks/global-search?q=${encodeURIComponent(debouncedQuery.trim())}`);
      if (!response.ok) throw new Error("Global search failed");
      return await response.json();
    },
    enabled: debouncedQuery.trim().length >= 2,
  });

  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    updateDropdownPosition();
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    // Check actual input value to handle cases where state might be out of sync
    const actualValue = inputRef.current?.value || '';
    const isActuallyEmpty = actualValue.trim() === '';
    
    // Sync state with actual input if they're different
    if (isActuallyEmpty && searchQuery !== '') {
      setSearchQuery('');
    }
    
    updateDropdownPosition();
    setIsOpen(true);
  };

  const handleSelectStock = (stock: GlobalSearchResult) => {
    setSearchQuery(`${stock.displaySymbol} - ${stock.description}`);
    setIsOpen(false);
    setSelectedStock(stock);
    onSelectStock?.(stock);
    
    // Add to recent searches
    addToRecentSearches(stock);
  };

  const addToRecentSearches = (stock: GlobalSearchResult) => {
    const newRecent = [stock, ...recentSearches.filter(s => s.displaySymbol !== stock.displaySymbol)].slice(0, 6);
    setRecentSearches(newRecent);
    localStorage.setItem('recentTickerSearches', JSON.stringify(newRecent));
  };
  
  // Annotation management functions
  const handleAnnotationsChange = (newAnnotations: Annotation[]) => {
    if (selectedStock && rememberPerTicker) {
      const updated = {
        ...annotationsBySymbol,
        [selectedStock.displaySymbol]: newAnnotations
      };
      setAnnotationsBySymbol(updated);
      saveAnnotations(updated);
    }
  };
  
  const handleRememberToggle = (remember: boolean) => {
    setRememberPerTicker(remember);
    saveRememberSetting(remember);
  };
  
  const clearCurrentTickerAnnotations = () => {
    if (selectedStock) {
      const updated = { ...annotationsBySymbol };
      delete updated[selectedStock.displaySymbol];
      setAnnotationsBySymbol(updated);
      saveAnnotations(updated);
    }
  };
  
  const clearAllAnnotations = () => {
    setAnnotationsBySymbol({});
    saveAnnotations({});
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'common stock':
        return 'text-blue-600 dark:text-blue-400 bg-blue-500/10';
      case 'etf':
        return 'text-green-600 dark:text-green-400 bg-green-500/10';
      case 'reit':
        return 'text-purple-600 dark:text-purple-400 bg-purple-500/10';
      case 'mutual fund':
        return 'text-orange-600 dark:text-orange-400 bg-orange-500/10';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-500/10';
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search global stocks, ETFs, and companies..."
          value={searchQuery}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleInputFocus}
          className="pl-10 pr-4 bg-background border-border focus:border-[#5AF5FA] focus:ring-[#5AF5FA]/20 text-lg py-3"
        />
      </div>

      {/* Search Results Dropdown */}
      {isOpen && createPortal(
        <Card 
          className="max-h-80 overflow-y-auto shadow-xl border-border bg-card"
          style={{
            position: 'absolute',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 10000
          }}
        >
          {/* Show recent searches when query is empty */}
          {(searchQuery.trim() === '' && recentSearches.length > 0) ? (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border/50">
                Recent Searches
              </div>
              {recentSearches.map((stock, index) => (
                <div
                  key={`recent-${stock.symbol}-${index}`}
                  className="w-full px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-b-0 cursor-pointer"
                  onClick={() => handleSelectStock(stock)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-foreground text-lg">{stock.displaySymbol}</span>
                        <div className={cn(
                          "px-2 py-1 rounded-md text-xs font-medium",
                          getTypeColor(stock.type)
                        )}>
                          {stock.type}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 truncate">
                        {stock.description}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <BarChart3 className="w-4 h-4 text-[#5AF5FA]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery ? (
            // Show search results when typing
            isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#5AF5FA] border-t-transparent rounded-full animate-spin" />
                  Searching global markets...
                </div>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="py-2">
                {searchResults.map((stock, index) => (
                  <div
                    key={`${stock.symbol}-${index}`}
                    className="w-full px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-b-0 cursor-pointer"
                    onClick={() => handleSelectStock(stock)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-foreground text-lg">{stock.displaySymbol}</span>
                          <div className={cn(
                            "px-2 py-1 rounded-md text-xs font-medium",
                            getTypeColor(stock.type)
                          )}>
                            {stock.type}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 truncate">
                          {stock.description}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <BarChart3 className="w-4 h-4 text-[#5AF5FA]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : debouncedQuery && !isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                No global stocks found for "{debouncedQuery}"
              </div>
            ) : null
          ) : null}
        </Card>,
        document.body
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Annotation Controls */}
      {selectedStock && (
        <div className="mt-6 mb-4">
          <Card className="p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                {currentAnnotations.length > 0 && (
                  <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                    {currentAnnotations.length} annotation{currentAnnotations.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {selectedStock && currentAnnotations.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearCurrentTickerAnnotations}
                    className="text-xs hover:text-black hover:bg-[#5AF5FA]"
                    data-testid="button-clear-current"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Clear {selectedStock.displaySymbol}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Price Chart */}
      {selectedStock && (
        <div className="mt-6">
          <PriceChart
            symbol={selectedStock.displaySymbol}
            name={selectedStock.description}
            currentPrice="--"
            percentChange="0"
            marketCap="--"
            annotations={currentAnnotations}
            onAnnotationsChange={handleAnnotationsChange}
            rememberPerTicker={rememberPerTicker}
            onClearAll={Object.keys(annotationsBySymbol).length > 0 ? clearAllAnnotations : undefined}
          />
        </div>
      )}
    </div>
  );
}

function ChartMaker() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <Link 
                href="/" 
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="font-medium">← Back</span>
              </Link>
              <h1 className="text-2xl font-semibold">ChartMaker - Global Stock Charts</h1>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Search Section */}
          <Card className="p-6 mb-8" style={{ backgroundColor: '#121212' }}>
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="w-6 h-6 text-[#5AF5FA]" />
                <h2 className="text-xl font-semibold">Global Stock & ETF Search</h2>
              </div>
              <p className="text-muted-foreground">
                Search and visualize price charts for stocks, ETFs, and other securities from global exchanges including NYSE, NASDAQ, LSE, TSE, and 60+ others worldwide.
              </p>
            </div>
            
            <GlobalTickerSearch />
          </Card>

          {/* Info Section */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Global Market Coverage</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-muted-foreground">
              <div>
                <h4 className="font-medium text-foreground mb-2">US Markets</h4>
                <ul className="space-y-1">
                  <li>• NYSE (New York)</li>
                  <li>• NASDAQ</li>
                  <li>• NYSE American</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">European Markets</h4>
                <ul className="space-y-1">
                  <li>• LSE (London)</li>
                  <li>• Euronext (Paris)</li>
                  <li>• Frankfurt (XETRA)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">Asian Markets</h4>
                <ul className="space-y-1">
                  <li>• TSE (Tokyo)</li>
                  <li>• HKEX (Hong Kong)</li>
                  <li>• NSE (India)</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Tip:</strong> Search by company name (e.g., "Apple", "Tesla") or ticker symbol (e.g., "AAPL", "TSLA"). 
                The search supports fuzzy matching and will find the best matches across global exchanges.
              </p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default ChartMaker;