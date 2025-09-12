import { useState, useMemo, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { createPortal } from "react-dom";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Search, X, Plus, Download, FileText, Image } from "lucide-react";
import { useQueries } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Color palette for different tickers (max 5 tickers)
const TICKER_COLORS = [
  '#5AF5FA', // Cyan - primary brand color
  '#FFA5FF', // Pink/Magenta  
  '#AA99FF', // Purple
  '#FAFF50', // Yellow
  '#50FFA5', // Green - added 5th color to complete the palette
];

interface ChartDataPoint {
  timestamp: number;
  date: string;
  [key: string]: number | string; // Dynamic keys for each ticker's percentage
}

interface TickerData {
  symbol: string;
  color: string;
  visible: boolean;
}

interface SearchResult {
  symbol: string;
  name: string;
  price: string;
  percentChange: string;
  marketCap: string;
}

interface ComparisonChartProps {
  timeframe: string;
}

export function ComparisonChart({ timeframe }: ComparisonChartProps) {
  const [tickers, setTickers] = useState<TickerData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Load recent searches from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('recentComparisonSearches');
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
      setDebouncedQuery(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch search results
  const { data: searchResults = [], isLoading: isSearchLoading } = useQueries({
    queries: [{
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
    }]
  })[0];

  // Fetch chart data for all tickers using useQueries for dynamic queries
  const tickerQueries = useQueries({
    queries: tickers.map(ticker => ({
      queryKey: ['/api/stocks', ticker.symbol, 'chart', timeframe],
      queryFn: async () => {
        const response = await fetch(`/api/stocks/${ticker.symbol}/chart?timeframe=${timeframe}`);
        if (!response.ok) throw new Error('Failed to fetch chart data');
        return response.json();
      },
      enabled: !!ticker.symbol,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }))
  });

  // Helper function to format dates properly based on timeframe (like main price chart)
  const formatTime = (timestamp: number, timeframe: string) => {
    const date = new Date(timestamp * 1000); // Convert Unix timestamp to Date
    switch (timeframe) {
      case '1D':
      case '5D':
      case '2W':
        return date.toLocaleDateString('en-US', { 
          month: 'numeric',
          day: 'numeric',
          year: '2-digit'
        });
      case '1M':
      case '3M':
        return date.toLocaleDateString('en-US', { 
          month: 'numeric',
          day: 'numeric',
          year: '2-digit'
        });
      case '1Y':
        return date.toLocaleDateString('en-US', { 
          month: 'short',
          year: '2-digit'
        });
      case 'Custom':
        return date.toLocaleDateString('en-US', { 
          month: 'numeric',
          day: 'numeric',
          year: '2-digit'
        });
      default:
        return date.toLocaleDateString('en-US', { 
          month: 'numeric',
          day: 'numeric',
          year: '2-digit'
        });
    }
  };

  // Process and align chart data for percentage calculation
  const chartData = useMemo(() => {
    if (tickers.length === 0) return [];
    
    // Check if all queries have loaded successfully
    const allLoaded = tickerQueries.every(query => query.isSuccess && query.data);
    if (!allLoaded) return [];

    // Get all the chart data
    const allChartData = tickerQueries.map((query, index) => ({
      ticker: tickers[index],
      data: query.data?.data || []
    })).filter(item => item.data.length > 0);

    if (allChartData.length === 0) return [];

    // Find common timestamps (intersection of all tickers)
    const allTimestamps = allChartData.map(item => 
      new Set(item.data.map((d: any) => d.timestamp as number))
    );
    
    let commonTimestamps: number[];
    if (allTimestamps.length === 1) {
      commonTimestamps = Array.from(allTimestamps[0]) as number[];
    } else {
      // Find intersection of all timestamp sets
      commonTimestamps = (Array.from(allTimestamps[0]) as number[]).filter(timestamp =>
        allTimestamps.every(set => set.has(timestamp))
      );
    }

    // Sort timestamps
    commonTimestamps.sort((a, b) => a - b);

    if (commonTimestamps.length === 0) return [];

    // Calculate base prices for each ticker from the first common timestamp
    const basePrices: Record<string, number> = {};
    const firstTimestamp = commonTimestamps[0];
    
    allChartData.forEach(({ ticker, data }) => {
      const firstPoint = data.find((d: any) => d.timestamp === firstTimestamp);
      if (firstPoint) {
        basePrices[ticker.symbol] = firstPoint.close;
      }
    });

    // Build aligned chart data with percentage calculations
    const alignedData: ChartDataPoint[] = commonTimestamps.map(timestamp => {
      const dataPoint: ChartDataPoint = {
        timestamp,
        date: formatTime(timestamp, timeframe), // Use proper date formatting
      };

      // Add percentage data for each ticker
      allChartData.forEach(({ ticker, data }) => {
        const tickerPoint = data.find((d: any) => d.timestamp === timestamp);
        const basePrice = basePrices[ticker.symbol];
        
        if (tickerPoint && basePrice > 0) {
          // Calculate percentage change from base price
          const percentageChange = ((tickerPoint.close - basePrice) / basePrice) * 100;
          dataPoint[`${ticker.symbol}_percentage`] = parseFloat(percentageChange.toFixed(2));
          dataPoint[`${ticker.symbol}_price`] = tickerPoint.close;
        }
      });

      return dataPoint;
    });

    return alignedData;
  }, [tickers, tickerQueries, timeframe]);

  // Chart configuration for shadcn
  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    tickers.forEach((ticker) => {
      config[`${ticker.symbol}_percentage`] = {
        label: ticker.symbol,
        color: ticker.color,
      };
    });
    return config;
  }, [tickers]);

  const addTicker = (symbol: string) => {
    if (tickers.length >= 5) {
      return; // Max 5 tickers
    }
    
    if (tickers.find(t => t.symbol === symbol)) {
      return; // Already added
    }

    const newTicker: TickerData = {
      symbol: symbol.toUpperCase(),
      color: TICKER_COLORS[tickers.length],
      visible: true,
    };

    setTickers(prev => [...prev, newTicker]);
    setSearchTerm('');
    setIsSearchVisible(false);
    setIsDropdownOpen(false);
  };

  const formatPercentChange = (change: string) => {
    const numChange = parseFloat(change);
    return {
      value: Math.abs(numChange).toFixed(2),
      isPositive: numChange >= 0
    };
  };

  const removeTicker = (symbol: string) => {
    setTickers(prev => prev.filter(t => t.symbol !== symbol));
  };

  const toggleTickerVisibility = (symbol: string) => {
    setTickers(prev => prev.map(t => 
      t.symbol === symbol ? { ...t, visible: !t.visible } : t
    ));
  };

  // Check loading and error states
  const isLoading = tickerQueries.some(query => query.isLoading);
  const hasErrors = tickerQueries.some(query => query.isError);
  const errorMessages = tickerQueries
    .filter(query => query.isError)
    .map((query, index) => `${tickers[index]?.symbol}: ${query.error?.message || 'Unknown error'}`);

  // Export functions
  const exportCSV = () => {
    if (chartData.length === 0) {
      toast({
        title: "No Data",
        description: "No chart data available to export",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create CSV header
      const headers = ['Date', ...tickers.filter(t => t.visible).map(t => `${t.symbol} %`), ...tickers.filter(t => t.visible).map(t => `${t.symbol} Price`)];
      
      // Create CSV rows
      const csvRows = chartData.map(dataPoint => {
        const row = [dataPoint.date];
        
        // Add percentage values
        tickers.filter(t => t.visible).forEach(ticker => {
          row.push(dataPoint[`${ticker.symbol}_percentage`]?.toString() || '');
        });
        
        // Add price values
        tickers.filter(t => t.visible).forEach(ticker => {
          row.push(dataPoint[`${ticker.symbol}_price`]?.toString() || '');
        });
        
        return row.join(',');
      });
      
      // Combine header and rows
      const csvContent = [headers.join(','), ...csvRows].join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const fileName = `comparison-chart-${tickers.map(t => t.symbol).join('-')}-${new Date().toISOString().split('T')[0]}.csv`;
      saveAs(blob, fileName);
      
      toast({
        title: "Export Successful",
        description: "CSV file has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Export Failed", 
        description: "Unable to export CSV file",
        variant: "destructive",
      });
    }
  };

  const exportPNG = async () => {
    if (chartData.length === 0) {
      toast({
        title: "No Data",
        description: "No chart data available to export",
        variant: "destructive",
      });
      return;
    }

    try {
      // Find the chart container element
      const chartElement = document.querySelector('[data-testid="comparison-chart-container"]') as HTMLElement;
      if (!chartElement) {
        console.error('Chart element not found');
        throw new Error('Chart element not found');
      }

      console.log('Capturing chart with html2canvas...');
      
      // Alternative approach: Create a simple fallback without modern CSS
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#121212',
        scale: 1, // Reduced scale to avoid issues
        useCORS: true,
        allowTaint: true,
        logging: true, // Enable logging to see issues
        foreignObjectRendering: true, // Enable modern rendering for SVG support
        removeContainer: true,
        width: chartElement.offsetWidth,
        height: chartElement.offsetHeight,
        ignoreElements: (element) => {
          // Skip only truly problematic elements (keep SVG for chart!)
          const tagName = element.tagName?.toLowerCase();
          return tagName === 'script' || tagName === 'style';
        }
      });

      console.log('Canvas created successfully, converting to blob...');
      
      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const fileName = `comparison-chart-${tickers.map(t => t.symbol).join('-')}-${new Date().toISOString().split('T')[0]}.png`;
          saveAs(blob, fileName);
          
          toast({
            title: "Export Successful",
            description: "PNG file has been downloaded",
          });
        } else {
          throw new Error('Failed to create blob from canvas');
        }
      }, 'image/png', 0.8);
    } catch (error) {
      console.error('PNG export error:', error);
      
      // Fallback: Try a simpler approach without html2canvas
      try {
        toast({
          title: "Export Alternative",
          description: "PNG export temporarily unavailable, use CSV export instead",
          variant: "destructive",
        });
      } catch (fallbackError) {
        toast({
          title: "Export Failed",
          description: "Unable to export PNG file - try CSV export instead", 
          variant: "destructive",
        });
      }
    }
  };

  // Custom tooltip that shows actual prices with better date formatting
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    // Find the timestamp from the data point to format the date properly
    const dataPoint = payload[0]?.payload;
    const formattedDate = dataPoint ? formatTime(dataPoint.timestamp, timeframe) : label;

    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <div className="font-medium mb-2">{formattedDate}</div>
        {payload.map((entry: any, index: number) => {
          const ticker = tickers.find(t => `${t.symbol}_percentage` === entry.dataKey);
          if (!ticker || !ticker.visible) return null;

          // Get actual price from data point  
          const percentage = entry.value;
          const actualPrice = entry.payload[`${ticker.symbol}_price`] || 0;

          return (
            <div key={index} className="flex items-center justify-between gap-4 py-1">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm">{ticker.symbol}</span>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm">
                  {percentage > 0 ? '+' : ''}{percentage.toFixed(2)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  ${actualPrice.toFixed(2)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with Ticker Management and Export */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap items-center gap-2">
        {/* Active Tickers */}
        {tickers.map((ticker) => (
          <div
            key={ticker.symbol}
            className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-sm"
          >
            <div 
              className="w-3 h-3 rounded-sm cursor-pointer"
              style={{ 
                backgroundColor: ticker.visible ? ticker.color : '#666',
                opacity: ticker.visible ? 1 : 0.5 
              }}
              onClick={() => toggleTickerVisibility(ticker.symbol)}
              data-testid={`toggle-visibility-${ticker.symbol}`}
            />
            <span className={ticker.visible ? '' : 'opacity-50'}>{ticker.symbol}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => removeTicker(ticker.symbol)}
              data-testid={`remove-ticker-${ticker.symbol}`}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}

        {/* Add Ticker Button */}
        {tickers.length < 5 && (
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={() => setIsSearchVisible(!isSearchVisible)}
            data-testid="button-add-ticker"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Ticker
          </Button>
        )}
        </div>
        
        {/* Export Buttons */}
        {tickers.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              disabled={isLoading || chartData.length === 0}
              data-testid="button-export-csv"
            >
              <FileText className="h-3 w-3 mr-1" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportPNG}
              disabled={isLoading || chartData.length === 0}
              data-testid="button-export-png"
            >
              <Image className="h-3 w-3 mr-1" />
              Export PNG
            </Button>
          </div>
        )}
      </div>

      {/* Search Input */}
      {isSearchVisible && (
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Enter ticker symbol (e.g., AAPL, TSLA)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm.trim()) {
                  addTicker(searchTerm.trim());
                }
                if (e.key === 'Escape') {
                  setIsSearchVisible(false);
                  setSearchTerm('');
                }
              }}
              className="flex-1"
              data-testid="input-ticker-search"
            />
            <Button
              onClick={() => searchTerm.trim() && addTicker(searchTerm.trim())}
              disabled={!searchTerm.trim()}
              size="sm"
              data-testid="button-add-ticker-search"
            >
              Add
            </Button>
          </div>
        </Card>
      )}

      {/* Chart */}
      <div className="h-[600px] w-full" data-testid="comparison-chart-container"> {/* Increased from h-80 (320px) to h-[600px] for much larger chart */}
        {tickers.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-medium text-foreground mb-2">Compare Stock Performance</div>
              <div className="text-sm text-muted-foreground mb-4">
                Add up to 5 tickers to compare their percentage performance
              </div>
              <Button
                variant="outline"
                onClick={() => setIsSearchVisible(true)}
                data-testid="button-get-started"
              >
                <Plus className="h-4 w-4 mr-2" />
                Get Started
              </Button>
            </div>
          </div>
        ) : hasErrors ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-medium text-foreground mb-2">Error Loading Data</div>
              <div className="text-sm text-muted-foreground">
                {errorMessages.join(', ')}
              </div>
            </div>
          </div>
        ) : isLoading || chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-medium text-foreground mb-2">Loading Chart Data...</div>
              <div className="text-sm text-muted-foreground">
                Fetching price data for {tickers.map(t => t.symbol).join(', ')}
              </div>
            </div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 30, right: 50, left: 30, bottom: 40 }}> {/* Increased margins for better spacing */}
                <CartesianGrid strokeDasharray="3 3" stroke="#3B3B3B" strokeOpacity={0.5} />
                <XAxis 
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#888' }}
                  tickLine={{ stroke: '#888' }}
                  axisLine={{ stroke: '#888' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#888' }}
                  tickLine={{ stroke: '#888' }}
                  axisLine={{ stroke: '#888' }}
                  domain={[(dataMin: any) => Math.floor(Number(dataMin) - 5), (dataMax: any) => Math.ceil(Number(dataMax) + 5)]}
                  tickFormatter={(value) => `${value > 0 ? '+' : ''}${Number(value).toFixed(1)}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {/* Render line for each visible ticker */}
                {tickers
                  .filter(ticker => ticker.visible)
                  .map((ticker, index) => (
                    <Line
                      key={ticker.symbol}
                      type="monotone"
                      dataKey={`${ticker.symbol}_percentage`}
                      stroke={ticker.color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </div>

      {/* Legend/Summary */}
      {tickers.length > 0 && (
        <div className="text-xs text-muted-foreground text-center">
          Showing percentage change from {timeframe} starting point • Click color dots to toggle visibility
        </div>
      )}
    </div>
  );
}