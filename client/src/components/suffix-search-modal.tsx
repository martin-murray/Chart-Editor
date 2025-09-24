import { useState, useEffect } from "react";
import { Search, Globe, Building2, DollarSign, Info, Clock, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { searchSuffix, getAllSuffixes, type SuffixInfo } from "@/data/suffix-mappings";
import { computeMarketStatus, type MarketStatus } from "@/lib/marketHours";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface SuffixSearchModalProps {
  children: React.ReactNode;
}

// Mapping from exchange names to Finnhub exchange codes  
const exchangeToFinnhubCode: { [key: string]: string } = {
  // US Exchanges
  'NYSE': 'US',
  'NASDAQ': 'US',
  'NASDAQ Global Select Market': 'US',
  'NASDAQ Global Market': 'US', 
  'NASDAQ Capital Market': 'US',
  'New York Stock Exchange': 'US',
  
  // International (fallback to US for now)
  'LSE': 'US',
  'London Stock Exchange': 'US',
  'Euronext Paris': 'US',
  'Frankfurt Stock Exchange': 'US',
  'SIX Swiss Exchange': 'US', 
  'Milan Stock Exchange': 'US',
  'Tokyo Stock Exchange': 'US',
  'Hong Kong Stock Exchange': 'US',
  'TSX': 'US',
  'ASX': 'US'
};

export function SuffixSearchModal({ children }: SuffixSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<SuffixInfo | null>(null);
  const [noResults, setNoResults] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);

  const allSuffixes = getAllSuffixes();

  // Get Finnhub exchange code for the selected exchange
  const finnhubExchange = searchResult?.exchange ? exchangeToFinnhubCode[searchResult.exchange] || 'US' : null;

  // Fetch holidays from Finnhub API
  const { data: holidayData } = useQuery({
    queryKey: ['market-holidays', finnhubExchange],
    queryFn: async () => {
      if (!finnhubExchange) return null;
      const response = await fetch(`/api/exchanges/${finnhubExchange}/holidays`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!finnhubExchange,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  // Process holiday data to get upcoming holidays  
  const upcomingHolidays = holidayData?.holidays?.filter((holiday: any) => {
    try {
      const holidayDate = new Date(holiday.atDate || holiday.eventDate || holiday.date);
      if (isNaN(holidayDate.getTime())) {
        return false;
      }
      
      const today = new Date();
      const maxDate = new Date();
      maxDate.setDate(today.getDate() + 365); // Next 365 days (full year)
      return holidayDate >= today && holidayDate <= maxDate;
    } catch (error) {
      return false;
    }
  }).slice(0, 5) || []; // Limit to 5 upcoming holidays

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setNoResults(false);

    if (!query.trim()) {
      setSearchResult(null);
      setMarketStatus(null);
      return;
    }

    const result = searchSuffix(query);
    if (result) {
      setSearchResult(result);
      // Update market status if market hours are available
      if (result.marketHours) {
        setMarketStatus(computeMarketStatus(result.marketHours));
      } else {
        setMarketStatus(null);
      }
    } else {
      setSearchResult(null);
      setMarketStatus(null);
      setNoResults(true);
    }
  };

  const handleSuffixClick = (suffix: string) => {
    const cleanSuffix = suffix.replace('.', '');
    setSearchQuery(cleanSuffix);
    handleSearch(cleanSuffix);
  };

  const handleClear = () => {
    setSearchQuery("");
    setSearchResult(null);
    setMarketStatus(null);
    setNoResults(false);
  };

  // Update market status every second when modal is open and we have results
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isOpen && searchResult?.marketHours) {
      interval = setInterval(() => {
        setMarketStatus(computeMarketStatus(searchResult.marketHours!));
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, searchResult]);

  const popularSuffixes = ['.UW', '.UN', '.L', '.T', '.HK', '.MC', '.PA', '.SE', '.TO', '.AX'];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Globe className="h-5 w-5 text-[#FAFF50]" />
            Stock Ticker Suffix Guide
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Section */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter a suffix (e.g., UW, SE, MC)..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-12"
                data-testid="input-suffix-search"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  data-testid="button-clear-search"
                >
                  ×
                </Button>
              )}
            </div>

            {/* Popular Suffixes */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Popular suffixes:</p>
              <div className="flex flex-wrap gap-2">
                {popularSuffixes.map((suffix) => (
                  <Badge
                    key={suffix}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => handleSuffixClick(suffix)}
                    data-testid={`badge-suffix-${suffix.replace('.', '')}`}
                  >
                    {suffix}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Search Results */}
          {searchResult && (
            <Card className="border-l-4 border-l-[#FAFF50]" data-testid="card-search-result">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="font-mono text-[#FAFF50] dark:text-[#FAFF50]">
                    {searchResult.suffix}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span>{searchResult.country}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-[#FAFF50] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Exchange</p>
                      <p className="text-sm text-muted-foreground">{searchResult.exchange}</p>
                      <p className="text-xs text-muted-foreground mt-1">{searchResult.fullExchangeName}</p>
                    </div>
                  </div>
                  
                  {searchResult.currency && (
                    <div className="flex items-start gap-3">
                      <DollarSign className="h-5 w-5 text-[#FAFF50] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-sm">Currency</p>
                        <p className="text-sm text-muted-foreground">{searchResult.currency}</p>
                      </div>
                    </div>
                  )}
                </div>

                {searchResult.notes && (
                  <div className="flex items-start gap-3 pt-2 border-t">
                    <Info className="h-5 w-5 text-[#FAFF50] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Notes</p>
                      <p className="text-sm text-muted-foreground">{searchResult.notes}</p>
                    </div>
                  </div>
                )}

                {/* Market Status Section */}
                {marketStatus && (
                  <div className="flex items-start gap-3 pt-2 border-t">
                    <Clock className="h-5 w-5 text-[#FAFF50] mt-0.5 flex-shrink-0" data-testid="icon-clock" />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">Market Status</p>
                        <Badge 
                          variant={marketStatus.isOpen ? "default" : "secondary"}
                          className={cn(
                            "text-xs px-2 py-0.5",
                            marketStatus.isOpen 
                              ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-100" 
                              : "bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-100"
                          )}
                          data-testid="text-market-status"
                        >
                          {marketStatus.isOpen ? 'OPEN' : 'CLOSED'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground" data-testid="text-countdown">
                        {marketStatus.formattedCountdown}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid="text-market-hours">
                        {marketStatus.marketHoursGMT}
                      </p>
                    </div>
                  </div>
                )}

                {/* National Holidays Section */}
                {searchResult && finnhubExchange && (
                  <div className="flex items-start gap-3 pt-2 border-t">
                    <Calendar className="h-5 w-5 text-[#FAFF50] mt-0.5 flex-shrink-0" data-testid="icon-calendar" />
                    <div className="space-y-2">
                      <p className="font-medium text-sm">Upcoming Market Holidays</p>
                      {upcomingHolidays.length > 0 ? (
                        <>
                          <div className="space-y-1">
                            {upcomingHolidays.map((holiday: any, index: number) => {
                              const holidayDate = new Date(holiday.atDate || holiday.eventDate || holiday.date);
                              const isToday = new Date().toDateString() === holidayDate.toDateString();
                              const dayOfWeek = holidayDate.toLocaleDateString('en-US', { weekday: 'short' });
                              const formattedDate = holidayDate.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              });
                              
                              return (
                                <div key={`${holiday.atDate || holiday.eventDate || holiday.date}-${index}`} className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm text-muted-foreground">
                                      {holiday.eventName || holiday.name || holiday.event || 'Market Holiday'}
                                    </p>
                                    {(holiday.tradingHour && holiday.tradingHour !== '') && (
                                      <Badge variant="outline" className="text-xs px-1 py-0 text-orange-600 border-orange-300 dark:text-orange-400">
                                        Half Day
                                      </Badge>
                                    )}
                                    {isToday && (
                                      <Badge variant="secondary" className="text-xs px-1 py-0 bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-100">
                                        Today
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {dayOfWeek} {formattedDate}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Markets will be closed on these dates
                          </p>
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          <p>Market is closed on: Loading holiday data...</p>
                          <p className="text-xs mt-1">
                            Holiday information provided by Finnhub API
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* No Results */}
          {noResults && (
            <Card className="border-l-4 border-l-yellow-500" data-testid="card-no-results">
              <CardContent className="py-6">
                <div className="text-center space-y-2">
                  <p className="font-medium">No suffix found</p>
                  <p className="text-sm text-muted-foreground">
                    Sorry, we don't have information for "{searchQuery}" in our database.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Try searching for suffixes like UW, SE, MC, PA, L, T, HK, etc.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Help Section */}
          {!searchQuery && (
            <Card className="bg-muted/50" data-testid="card-help-section">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">How to Use</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm">
                    <strong>Search:</strong> Enter any Bloomberg-style ticker suffix (with or without the dot)
                  </p>
                  <p className="text-sm">
                    <strong>Examples:</strong> UW, .SE, MC, PA, L, T, HK
                  </p>
                  <p className="text-sm">
                    <strong>Coverage:</strong> {allSuffixes.length} suffixes covering major global exchanges
                  </p>
                </div>
                
                <Separator className="my-3" />
                
                <div>
                  <p className="text-xs text-muted-foreground">
                    This tool helps you understand Bloomberg terminal ticker suffix notation 
                    for stocks listed on different exchanges worldwide.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}