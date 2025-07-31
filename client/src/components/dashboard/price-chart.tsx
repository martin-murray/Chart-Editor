import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';

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
  { label: '1Y', value: '1Y' }
];

export function PriceChart({ symbol, name, currentPrice, percentChange, marketCap }: PriceChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');

  const { data: chartData, isLoading, error } = useQuery({
    queryKey: ['/api/stocks', symbol, 'chart', selectedTimeframe],
    queryFn: async (): Promise<ChartResponse> => {
      const response = await fetch(`/api/stocks/${symbol}/chart?timeframe=${selectedTimeframe}`);
      if (!response.ok) throw new Error('Failed to fetch chart data');
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

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl font-medium flex items-center gap-2">
              <span className="text-[#5AF5FA]">{symbol}</span>
              <span className="text-muted-foreground">-</span>
              <span className="text-sm font-normal text-muted-foreground">{name}</span>
            </CardTitle>
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
          </div>
        </div>
        
        {/* Timeframe selector */}
        <div className="flex gap-1 mt-4">
          {timeframes.map((timeframe) => (
            <Button
              key={timeframe.value}
              variant={selectedTimeframe === timeframe.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTimeframe(timeframe.value)}
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
      </CardHeader>
      
      <CardContent>
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
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData.data}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="time"
                  tickFormatter={(value) => formatTime(value, selectedTimeframe)}
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: '#374151' }}
                />
                <YAxis 
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tickFormatter={formatPrice}
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: '#374151' }}
                />
                <Tooltip 
                  labelFormatter={(value) => formatTime(value, selectedTimeframe)}
                  formatter={(value: number) => [formatPrice(value), 'Price']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="close" 
                  stroke={lineColor}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: lineColor }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}