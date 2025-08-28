import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, TrendingUp, TrendingDown, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { format, subDays, subMonths, subYears } from 'date-fns';

interface ChartData {
  timestamp: number;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartResponse {
  symbol: string;
  timeframe: string;
  data: ChartData[];
}

interface StockDetails {
  quote: {
    c: number; // Current price
    d: number; // Change
    dp: number; // Percent change
    h: number; // High
    l: number; // Low
    o: number; // Open
    pc: number; // Previous close
    t: number; // Timestamp
  };
  profile: {
    marketCapitalization: number;
    shareOutstanding: number;
    name: string;
  };
  metrics: {
    peRatioTTM?: number;
    epsTTM?: number;
    beta?: number;
    "52WeekHigh"?: number;
    "52WeekLow"?: number;
    dividendYieldTTM?: number;
    [key: string]: any;
  };
}

interface PriceChartProps {
  symbol: string;
  name: string;
  currentPrice: string;
  percentChange: string;
  marketCap: string;
}

const timeframes = [
  { label: '1D', value: '1D' },
  { label: '1W', value: '1W' },
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '1Y', value: '1Y' },
  { label: 'Custom', value: 'Custom' }
];

export function PriceChart({ symbol, name, currentPrice, percentChange, marketCap }: PriceChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const { data: chartData, isLoading, error } = useQuery({
    queryKey: ['/api/stocks', symbol, 'chart', selectedTimeframe, startDate, endDate],
    queryFn: async (): Promise<ChartResponse> => {
      let url = `/api/stocks/${symbol}/chart?timeframe=${selectedTimeframe}`;
      if (selectedTimeframe === 'Custom' && startDate && endDate) {
        const fromTimestamp = Math.floor(startDate.getTime() / 1000);
        const toTimestamp = Math.floor(endDate.getTime() / 1000);
        url = `/api/stocks/${symbol}/chart?from=${fromTimestamp}&to=${toTimestamp}&timeframe=Custom`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch chart data');
      return await response.json();
    },
    enabled: !!symbol && (selectedTimeframe !== 'Custom' || (!!startDate && !!endDate)),
  });

  const { data: stockDetails } = useQuery({
    queryKey: ['/api/stocks', symbol, 'details'],
    queryFn: async (): Promise<StockDetails> => {
      const response = await fetch(`/api/stocks/${symbol}/details`);
      if (!response.ok) throw new Error('Failed to fetch stock details');
      return await response.json();
    },
    enabled: !!symbol,
  });

  const formatPrice = (value: number) => `$${value.toFixed(2)}`;
  
  const formatTime = (timeStr: string, timeframe: string) => {
    const date = new Date(timeStr);
    switch (timeframe) {
      case '1D':
        return date.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
      case '1W':
        return date.toLocaleDateString('en-US', { 
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
      case '1M':
      case '3M':
        return date.toLocaleDateString('en-US', { 
          month: 'short',
          day: 'numeric'
        });
      case '1Y':
        return date.toLocaleDateString('en-US', { 
          month: 'short',
          year: '2-digit'
        });
      default:
        return date.toLocaleDateString();
    }
  };

  const parseChange = parseFloat(percentChange);
  const isPositive = parseChange >= 0;
  const lineColor = isPositive ? '#10b981' : '#ef4444'; // Green for positive, red for negative

  const formatMarketCap = (marketCapInMillions: number) => {
    // Finnhub returns market cap in millions of dollars
    if (marketCapInMillions >= 1000000) return `${(marketCapInMillions / 1000000).toFixed(1)}T`;
    if (marketCapInMillions >= 1000) return `${(marketCapInMillions / 1000).toFixed(1)}B`;
    return `${marketCapInMillions.toFixed(1)}M`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num?.toLocaleString() || 'N/A';
  };

  const formatPercent = (value: number) => {
    return value ? `${(value * 100).toFixed(2)}%` : 'N/A';
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xl font-medium flex items-center gap-2">
              <span className="text-[#5AF5FA]">{symbol}</span>
              <span className="text-muted-foreground">-</span>
              <span className="text-sm font-normal text-muted-foreground">{name}</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-2xl font-bold">{formatPrice(parseFloat(currentPrice))}</span>
              <Badge 
                variant={isPositive ? "default" : "destructive"}
                className={`flex items-center gap-1 ${isPositive ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
              >
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(parseChange).toFixed(2)}%
              </Badge>
              <span className="text-sm text-muted-foreground">{marketCap}</span>
            </div>
            
            {/* Pre/After Market Display */}
            {stockDetails?.quote && (
              <div className="mt-3 flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  Pre-Market: <span className="text-foreground">N/A</span>
                </span>
                <span className="text-muted-foreground">
                  After Hours: <span className="text-foreground">N/A</span>
                </span>
              </div>
            )}
          </div>
          
          {/* Watch Button */}
          <Button
            size="sm"
            onClick={() => {
              if (window.addToWatchlist) {
                window.addToWatchlist({
                  symbol,
                  name,
                  price: currentPrice,
                  percentChange,
                  marketCap
                });
              }
            }}
            className="h-8 px-3 text-xs bg-[#5AF5FA]/10 text-[#5AF5FA] hover:bg-[#5AF5FA]/20 border border-[#5AF5FA]/30"
            variant="outline"
          >
            <Plus className="w-3 h-3 mr-1" />
            Watch
          </Button>
        </div>
        
        {/* Timeframe selector */}
        <div className="flex gap-1 items-center">
          {timeframes.map((timeframe) => (
            <Button
              key={timeframe.value}
              variant={selectedTimeframe === timeframe.value ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectedTimeframe(timeframe.value);
                if (timeframe.value !== 'Custom') {
                  setStartDate(undefined);
                  setEndDate(undefined);
                }
              }}
              className={`h-8 px-3 text-xs ${
                selectedTimeframe === timeframe.value 
                  ? 'bg-[#5AF5FA] text-black hover:bg-[#5AF5FA]/90' 
                  : 'hover:bg-muted'
              }`}
            >
              {timeframe.label}
            </Button>
          ))}
          
        </div>
        
        {/* Custom Date Range Picker - Positioned Below Timeframes */}
        {selectedTimeframe === 'Custom' && (
          <div className="mt-4 p-4 border rounded-lg bg-card relative z-50" style={{ zIndex: 9999 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  disabled={(date) => date > new Date() || (!!endDate && date > endDate)}
                  className="rounded-md border"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) => date > new Date() || (!!startDate && date < startDate)}
                  className="rounded-md border"
                />
              </div>
            </div>
            
            {startDate && endDate && (
              <div className="mt-4 text-center space-y-3">
                <div className="text-sm text-muted-foreground">
                  Selected: {format(startDate, 'MMM dd, yyyy')} - {format(endDate, 'MMM dd, yyyy')}
                </div>
                <Button
                  onClick={() => {
                    // Trigger chart refresh by clearing and resetting query
                    setSelectedTimeframe('1D');
                    setTimeout(() => setSelectedTimeframe('Custom'), 100);
                  }}
                  className="bg-[#5AF5FA] text-black hover:bg-[#5AF5FA]/90"
                  size="sm"
                >
                  Apply Date Range
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart Section */}
      <div className="bg-background relative z-10">
        {isLoading ? (
          <div className="h-80 flex items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading chart data...
            </div>
          </div>
        ) : error ? (
          <div className="h-80 flex items-center justify-center text-red-500">
            Failed to load chart data
          </div>
        ) : !chartData?.data || chartData.data.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No chart data available for {symbol}
          </div>
        ) : (
          <div className="h-80 w-full rounded-lg" style={{ backgroundColor: '#1C1C1C' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData.data}
                margin={{ top: 15, right: 30, left: 20, bottom: 15 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333333" opacity={0.3} />
                <XAxis 
                  dataKey="time"
                  tickFormatter={(value) => formatTime(value, selectedTimeframe)}
                  tick={{ fontSize: 12, fill: '#F7F7F7' }}
                  axisLine={{ stroke: '#F7F7F7' }}
                  tickLine={{ stroke: '#F7F7F7' }}
                />
                <YAxis 
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tickFormatter={formatPrice}
                  tick={{ fontSize: 12, fill: '#F7F7F7' }}
                  axisLine={{ stroke: '#F7F7F7' }}
                  tickLine={{ stroke: '#F7F7F7' }}
                />
                <Tooltip 
                  labelFormatter={(value) => formatTime(value, selectedTimeframe)}
                  formatter={(value: number) => [formatPrice(value), 'Price']}
                  contentStyle={{
                    backgroundColor: '#1C1C1C',
                    border: '1px solid #333333',
                    borderRadius: '6px',
                    color: '#F7F7F7'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="close" 
                  stroke={lineColor}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: lineColor, stroke: '#1C1C1C', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Stats Grid - 4 Columns */}
      {stockDetails && stockDetails.quote && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
          {/* Column 1 */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Previous Close</span>
              <span className="font-medium">{formatPrice(stockDetails.quote.pc)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Open</span>
              <span className="font-medium">{formatPrice(stockDetails.quote.o)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bid</span>
              <span className="font-medium">N/A</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ask</span>
              <span className="font-medium">N/A</span>
            </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Day's Range</span>
              <span className="font-medium">{formatPrice(stockDetails.quote.l)} - {formatPrice(stockDetails.quote.h)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">52 Week Range</span>
              <span className="font-medium">
                {stockDetails.metrics["52WeekLow"] && stockDetails.metrics["52WeekHigh"] 
                  ? `${formatPrice(stockDetails.metrics["52WeekLow"])} - ${formatPrice(stockDetails.metrics["52WeekHigh"])}`
                  : 'N/A'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Volume</span>
              <span className="font-medium">N/A</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg. Volume</span>
              <span className="font-medium">N/A</span>
            </div>
          </div>

          {/* Column 3 */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Market Cap</span>
              <span className="font-medium">{stockDetails.profile?.marketCapitalization ? formatMarketCap(stockDetails.profile.marketCapitalization) : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Beta (5Y Monthly)</span>
              <span className="font-medium">{stockDetails.metrics.beta?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">PE Ratio (TTM)</span>
              <span className="font-medium">{stockDetails.metrics.peRatioTTM?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">EPS (TTM)</span>
              <span className="font-medium">{stockDetails.metrics.epsTTM?.toFixed(2) || 'N/A'}</span>
            </div>
          </div>

          {/* Column 4 */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Earnings Date</span>
              <span className="font-medium">N/A</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Forward Dividend & Yield</span>
              <span className="font-medium">{stockDetails.metrics.dividendYieldTTM ? formatPercent(stockDetails.metrics.dividendYieldTTM) : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ex-Dividend Date</span>
              <span className="font-medium">N/A</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">1y Target Est</span>
              <span className="font-medium">N/A</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}