import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Search, TrendingUp, TrendingDown, BarChart3, Trash2, RotateCcw, BarChart2, Cookie, X, Globe, LogOut, MessageSquare } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { PriceChart } from "@/components/dashboard/price-chart";
import { FeedbackForm } from "@/components/feedback-form";
import { SuffixSearchModal } from "@/components/suffix-search-modal";
import { useAuth } from "@/contexts/AuthContext";
import logoImage from "@assets/IPO Intelligence@2x_1758060026530.png";

interface GlobalSearchResult {
  symbol: string;
  description: string;
  displaySymbol: string;
  type: string;
  exchange?: string;
  currency?: string;
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

function LogoutButton() {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation('/login');
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      data-testid="button-logout"
      style={{ fontFamily: 'var(--font-sans)', fontSize: '18px' }}
    >
      <LogOut className="h-5 w-5 text-[#5AF5FA]" />
      <span>Sign Out</span>
    </button>
  );
}

function GlobalTickerSearch({ onSelectStock }: GlobalTickerSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<GlobalSearchResult | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [recentSearches, setRecentSearches] = useState<GlobalSearchResult[]>([]);

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

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Check actual input value to handle cases where state might be out of sync
    const actualValue = inputRef.current?.value || '';
    const isActuallyEmpty = actualValue.trim() === '';
    
    // Sync state with actual input if they're different
    if (isActuallyEmpty && searchQuery !== '') {
      setSearchQuery('');
    }
    
    // Auto-select text if there's content when focusing
    if (actualValue.trim() && inputRef.current) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.select();
        }
      }, 10);
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
  

  // Type display text conversion - convert ETP to ETF for display
  const getDisplayType = (type: string | undefined) => {
    if (!type) return "Common Stock";
    if (type.toLowerCase() === 'etp') return 'ETF';
    return type;
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'common stock':
        return 'text-blue-600 dark:text-blue-400 bg-blue-500/10';
      case 'etp':
      case 'etf':
        return 'text-[#FFA5FF] bg-[#FFA5FF]/30'; // Pink ETF styling as requested
      case 'index':
        return 'index-tag'; // Brand yellow with 30% opacity background, 100% text
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
          placeholder="Search global stocks, indices, ETFs, and companies..."
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
                        {stock.exchange && stock.currency && (
                          <span className="ml-2 text-[#5AF5FA]">
                            - {stock.exchange} - {stock.currency}
                          </span>
                        )}
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
                            {getDisplayType(stock.type)}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 truncate">
                          {stock.description}
                          {stock.exchange && stock.currency && (
                            <span className="ml-2 text-[#5AF5FA]">
                              - {stock.exchange} - {stock.currency}
                            </span>
                          )}
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


    </div>
  );
}

function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        data-testid="button-feedback"
        style={{ fontSize: '18px' }}
      >
        <MessageSquare className="h-5 w-5 text-[#5AF5FA]" />
        <span>Issues / Feedback</span>
      </button>
      <FeedbackForm open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}

// Cookie Policy Banner Component
function CookiePolicyBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already accepted/declined cookies
    const cookieConsent = localStorage.getItem('cookie-consent');
    if (!cookieConsent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-card border-t shadow-lg" data-testid="cookie-policy-banner">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Cookie className="w-5 h-5 text-[#5AF5FA] mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-foreground">
                <strong>Cookie Policy:</strong> This website uses necessary cookies to ensure optimal functionality and enhance your browsing experience. 
                We use session cookies for chart annotations and visitor analytics. No personal data is shared with third parties.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDecline}
              data-testid="button-decline-cookies"
              className="text-xs"
            >
              Decline
            </Button>
            <Button 
              size="sm" 
              onClick={handleAccept}
              data-testid="button-accept-cookies"
              className="bg-[#5AF5FA] hover:bg-[#4FE5EA] text-black text-xs"
            >
              Accept
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBanner(false)}
              data-testid="button-close-banner"
              className="p-1 h-auto"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartMaker() {
  const [chartMakerSelectedStock, setChartMakerSelectedStock] = useState<GlobalSearchResult | null>(null);
  
  // Annotation state management - moved from GlobalTickerSearch
  const [annotationsBySymbol, setAnnotationsBySymbol] = useState<Record<string, Annotation[]>>(() => getStoredAnnotations());
  const [rememberPerTicker, setRememberPerTicker] = useState(() => getRememberSetting());
  
  // Current annotations for selected stock
  const currentAnnotations = chartMakerSelectedStock && rememberPerTicker 
    ? annotationsBySymbol[chartMakerSelectedStock.displaySymbol] || []
    : [];

  // Annotation management functions
  const handleAnnotationsChange = (newAnnotations: Annotation[]) => {
    if (chartMakerSelectedStock && rememberPerTicker) {
      const updated = {
        ...annotationsBySymbol,
        [chartMakerSelectedStock.displaySymbol]: newAnnotations
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
    if (chartMakerSelectedStock) {
      const updated = { ...annotationsBySymbol };
      delete updated[chartMakerSelectedStock.displaySymbol];
      setAnnotationsBySymbol(updated);
      saveAnnotations(updated);
    }
  };
  
  const clearAllAnnotations = () => {
    setAnnotationsBySymbol({});
    saveAnnotations({});
  };

  const handleIndexSelect = (symbol: string, name: string) => {
    const indexResult: GlobalSearchResult = {
      symbol: symbol,
      description: name,
      displaySymbol: symbol,
      type: 'Index',
      exchange: symbol.startsWith('^') ? 'Index' : 'ETF',
      currency: symbol.startsWith('^') ? 'USD' : 'USD'
    };
    
    setChartMakerSelectedStock(indexResult);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center min-h-16 py-2 max-[900px]:flex-wrap max-[900px]:gap-3">
            <div className="flex items-center max-[900px]:w-full max-[900px]:justify-center">
              <img 
                src={logoImage} 
                alt="Intropic Chart Studio" 
                className="w-[240px] h-auto max-[600px]:w-[180px]"
                data-testid="header-logo"
              />
            </div>
            <div className="flex items-center gap-4 max-[900px]:w-full max-[900px]:justify-center max-[600px]:gap-2 max-[600px]:flex-wrap">
              <SuffixSearchModal>
                <button 
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors max-[600px]:text-xs"
                  data-testid="button-suffix-search"
                  style={{ fontSize: '18px' }}
                >
                  <Globe className="h-5 w-5 text-[#FAFF50]" />
                  <span className="max-[600px]:hidden">Suffix Guide</span>
                  <span className="min-[601px]:hidden">Guide</span>
                </button>
              </SuffixSearchModal>
              <FeedbackButton />
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 max-[900px]:px-3 max-[900px]:py-4 overflow-x-hidden">
        <div className="mx-auto w-full" style={{ maxWidth: '1200px' }}>
          {/* Search Section */}
          <Card className="p-6 mb-8 max-[900px]:p-4 max-[600px]:p-3" style={{ backgroundColor: '#121212' }}>
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="w-6 h-6 text-[#5AF5FA]" />
                <h2 className="text-xl font-semibold">Global Stock & ETF Search</h2>
              </div>
              <p className="text-muted-foreground">
                Search and visualise price charts for stocks, ETFs, and securities globally
              </p>
            </div>
            
            <GlobalTickerSearch onSelectStock={setChartMakerSelectedStock} />
          </Card>

          {/* Price Chart - renders for both search results and index selections */}
          {chartMakerSelectedStock && (
            <div className="mt-6">
              <PriceChart
                symbol={chartMakerSelectedStock.displaySymbol}
                name={chartMakerSelectedStock.description}
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

          {/* Combined Info Section */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Global Market Coverage & Index Coverage</h3>
            
            {/* Global Market Coverage */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-muted-foreground mb-6">
              <div>
                <h4 className="font-medium text-foreground mb-2">US Markets</h4>
                <ul className="space-y-1">
                  <li>• <a href="https://www.nyse.com/" target="_blank" rel="noopener noreferrer" className="text-[#5AF5FA] hover:text-[#4FE5EA] transition-colors underline underline-offset-2" data-testid="link-nyse">NYSE (New York)</a></li>
                  <li>• <a href="https://www.nasdaq.com/" target="_blank" rel="noopener noreferrer" className="text-[#5AF5FA] hover:text-[#4FE5EA] transition-colors underline underline-offset-2" data-testid="link-nasdaq">NASDAQ</a></li>
                  <li>• <a href="https://www.nyse.com/markets/nyse-american" target="_blank" rel="noopener noreferrer" className="text-[#5AF5FA] hover:text-[#4FE5EA] transition-colors underline underline-offset-2" data-testid="link-nyse-american">NYSE American</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">European Markets</h4>
                <ul className="space-y-1">
                  <li>• <a href="https://www.londonstockexchange.com/" target="_blank" rel="noopener noreferrer" className="text-[#5AF5FA] hover:text-[#4FE5EA] transition-colors underline underline-offset-2" data-testid="link-lse">LSE (London)</a></li>
                  <li>• <a href="https://www.euronext.com/" target="_blank" rel="noopener noreferrer" className="text-[#5AF5FA] hover:text-[#4FE5EA] transition-colors underline underline-offset-2" data-testid="link-euronext">Euronext (Paris)</a></li>
                  <li>• <a href="https://www.xetra.com/" target="_blank" rel="noopener noreferrer" className="text-[#5AF5FA] hover:text-[#4FE5EA] transition-colors underline underline-offset-2" data-testid="link-xetra">Frankfurt (XETRA)</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">Asian Markets</h4>
                <ul className="space-y-1">
                  <li>• <a href="https://www.jpx.co.jp/english/" target="_blank" rel="noopener noreferrer" className="text-[#5AF5FA] hover:text-[#4FE5EA] transition-colors underline underline-offset-2" data-testid="link-tse">TSE (Tokyo)</a></li>
                  <li>• <a href="https://www.hkex.com.hk/" target="_blank" rel="noopener noreferrer" className="text-[#5AF5FA] hover:text-[#4FE5EA] transition-colors underline underline-offset-2" data-testid="link-hkex">HKEX (Hong Kong)</a></li>
                  <li>• <a href="https://www.nseindia.com/" target="_blank" rel="noopener noreferrer" className="text-[#5AF5FA] hover:text-[#4FE5EA] transition-colors underline underline-offset-2" data-testid="link-nse">NSE (India)</a></li>
                </ul>
              </div>
            </div>

            {/* Line break separator */}
            <hr className="border-muted-foreground/20 mb-6" />

            {/* Index Coverage */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
              <div>
                <h4 className="font-medium text-foreground mb-2">US Indices</h4>
                <ul className="space-y-1">
                  <li>• <button 
                    onClick={() => handleIndexSelect('^GSPC', 'S&P 500')} 
                    className="text-[#5AF5FA] hover:text-[#4FE5EA] transition-colors underline underline-offset-2 text-left bg-transparent border-none cursor-pointer" 
                    data-testid="link-sp500"
                  >S&P 500 (^GSPC)</button></li>
                  <li>• <button 
                    onClick={() => handleIndexSelect('^DJI', 'Dow Jones Industrial Average')} 
                    className="text-[#5AF5FA] hover:text-[#4FE5EA] transition-colors underline underline-offset-2 text-left bg-transparent border-none cursor-pointer" 
                    data-testid="link-dow"
                  >Dow Jones (^DJI)</button></li>
                  <li>• <button 
                    onClick={() => handleIndexSelect('QQQ', 'NASDAQ Composite (QQQ)')} 
                    className="text-[#5AF5FA] hover:text-[#4FE5EA] transition-colors underline underline-offset-2 text-left bg-transparent border-none cursor-pointer" 
                    data-testid="link-nasdaq-comp"
                  >NASDAQ Composite (QQQ)</button></li>
                  <li>• <button 
                    onClick={() => handleIndexSelect('^RUT', 'Russell 2000')} 
                    className="text-[#5AF5FA] hover:text-[#4FE5EA] transition-colors underline underline-offset-2 text-left bg-transparent border-none cursor-pointer" 
                    data-testid="link-russell"
                  >Russell 2000 (^RUT)</button></li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">European Indices</h4>
                <ul className="space-y-1">
                  <li>• <button 
                    onClick={() => handleIndexSelect('^FTSE', 'FTSE 100')} 
                    className="text-[#5AF5FA] hover:text-[#4FE5EA] transition-colors underline underline-offset-2 text-left bg-transparent border-none cursor-pointer" 
                    data-testid="link-ftse100"
                  >FTSE 100 (^FTSE)</button></li>
                  <li>• <button 
                    onClick={() => handleIndexSelect('^GDAXI', 'DAX')} 
                    className="text-[#5AF5FA] hover:text-[#4FE5EA] transition-colors underline underline-offset-2 text-left bg-transparent border-none cursor-pointer" 
                    data-testid="link-dax"
                  >DAX (^GDAXI)</button></li>
                  <li>• <button 
                    onClick={() => handleIndexSelect('^FCHI', 'CAC 40')} 
                    className="text-[#5AF5FA] hover:text-[#4FE5EA] transition-colors underline underline-offset-2 text-left bg-transparent border-none cursor-pointer" 
                    data-testid="link-cac40"
                  >CAC 40 (^FCHI)</button></li>
                  <li>• <button 
                    onClick={() => handleIndexSelect('^STOXX50E', 'Euro Stoxx 50')} 
                    className="text-[#5AF5FA] hover:text-[#4FE5EA] transition-colors underline underline-offset-2 text-left bg-transparent border-none cursor-pointer" 
                    data-testid="link-eurostoxx"
                  >Euro Stoxx 50 (^STOXX50E)</button></li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">Asian & Global Indices</h4>
                <ul className="space-y-1">
                  <li>• <button 
                    onClick={() => handleIndexSelect('^N225', 'Nikkei 225')} 
                    className="text-[#5AF5FA] hover:text-[#4FE5EA] transition-colors underline underline-offset-2 text-left bg-transparent border-none cursor-pointer" 
                    data-testid="link-nikkei"
                  >Nikkei 225 (^N225)</button></li>
                  <li>• <button 
                    onClick={() => handleIndexSelect('^HSI', 'Hang Seng')} 
                    className="text-[#5AF5FA] hover:text-[#4FE5EA] transition-colors underline underline-offset-2 text-left bg-transparent border-none cursor-pointer" 
                    data-testid="link-hangseng"
                  >Hang Seng (^HSI)</button></li>
                  <li>• <button 
                    onClick={() => handleIndexSelect('ACWI', 'iShares MSCI ACWI ETF')} 
                    className="text-[#5AF5FA] hover:text-[#4FE5EA] transition-colors underline underline-offset-2 text-left bg-transparent border-none cursor-pointer" 
                    data-testid="link-acwi"
                  >MSCI All Country (ACWI)</button></li>
                  <li>• <button 
                    onClick={() => handleIndexSelect('KSA', 'iShares MSCI Saudi Arabia ETF')} 
                    className="text-[#5AF5FA] hover:text-[#4FE5EA] transition-colors underline underline-offset-2 text-left bg-transparent border-none cursor-pointer" 
                    data-testid="link-ksa"
                  >Saudi Arabia (KSA)</button></li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-white">
                <strong className="text-white">Tip:</strong> Search by company name ("Apple", "Tesla") or ticker ("AAPL", "TSLA"). 
                Our intelligent search finds matches across global exchanges—no Bloomberg-style suffixes (.UW, .SE, .SW) needed!
                Click any index to view its price chart with real-time data, technical indicators, and annotation tools.
              </p>
            </div>
          </Card>
        </div>
      </main>
      
      {/* Cookie Policy Banner */}
      <CookiePolicyBanner />
    </div>
  );
}

export default ChartMaker;