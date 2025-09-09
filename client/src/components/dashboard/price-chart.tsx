import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, TrendingUp, TrendingDown, Plus, Calendar as CalendarIcon, X, Download, ChevronDown } from 'lucide-react';
import { format, subDays, subMonths, subYears } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';

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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

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
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
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
  const lineColor = isPositive ? '#5AF5FA' : '#FFA5FF'; // Cyan for positive, Pink for negative
  
  // Calculate percentage change for each data point relative to first price
  const chartDataWithPercentage = chartData?.data?.map((item, index) => {
    const firstPrice = chartData.data[0]?.close || item.close;
    const percentageChange = ((item.close - firstPrice) / firstPrice) * 100;
    return { ...item, percentageChange };
  }) || [];

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

  // Export functions
  const exportAsPNG = async () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Set background
      ctx.fillStyle = '#1C1C1C';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add title
      ctx.fillStyle = '#5AF5FA';
      ctx.font = 'bold 24px Arial';
      ctx.fillText(`${symbol} - ${name}`, 30, 40);
      
      // Add price info - fix the NaN issue
      ctx.fillStyle = '#F7F7F7';
      ctx.font = '18px Arial';
      const price = currentPrice && currentPrice !== 'NaN' ? formatPrice(parseFloat(currentPrice)) : 'N/A';
      const change = percentChange && percentChange !== '0' ? percentChange : 'N/A';
      const cap = marketCap && marketCap !== '--' ? marketCap : 'N/A';
      
      ctx.fillText(`Price: ${price} (${change}%)`, 30, 70);
      ctx.fillText(`Market Cap: ${cap}`, 30, 95);
      
      // Add timeframe info
      const timeframeText = startDate && endDate 
        ? `Date Range: ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`
        : `Timeframe: ${selectedTimeframe}`;
      ctx.fillText(timeframeText, 30, 120);
      
      // Draw actual chart if data is available
      if (chartData?.data && chartData.data.length > 0) {
        const chartArea = { x: 60, y: 150, width: 880, height: 350 };
        
        // Draw chart background
        ctx.fillStyle = '#1C1C1C';
        ctx.fillRect(chartArea.x, chartArea.y, chartArea.width, chartArea.height);
        
        // Draw grid lines
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
          const y = chartArea.y + (i * chartArea.height / 5);
          ctx.beginPath();
          ctx.moveTo(chartArea.x, y);
          ctx.lineTo(chartArea.x + chartArea.width, y);
          ctx.stroke();
        }
        
        // Get price data and calculate bounds
        const prices = chartData.data.map(d => d.close);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;
        
        // Draw price line
        const lineColor = isPositive ? '#5AF5FA' : '#FFA5FF';
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        chartData.data.forEach((point, index) => {
          const x = chartArea.x + (index / (chartData.data.length - 1)) * chartArea.width;
          const y = chartArea.y + chartArea.height - ((point.close - minPrice) / priceRange) * chartArea.height;
          
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
        
        // Draw Y-axis labels (prices)
        ctx.fillStyle = '#F7F7F7';
        ctx.font = '12px Arial';
        for (let i = 0; i <= 5; i++) {
          const price = minPrice + (i / 5) * priceRange;
          const y = chartArea.y + chartArea.height - (i * chartArea.height / 5);
          ctx.fillText(formatPrice(price), chartArea.x + chartArea.width + 10, y + 4);
        }
        
        // Draw X-axis labels (simplified)
        ctx.fillText('Start', chartArea.x, chartArea.y + chartArea.height + 20);
        ctx.fillText('End', chartArea.x + chartArea.width - 30, chartArea.y + chartArea.height + 20);
      } else {
        // Fallback if no chart data
        ctx.strokeStyle = '#5AF5FA';
        ctx.lineWidth = 2;
        ctx.strokeRect(60, 150, 880, 350);
        ctx.fillStyle = '#888888';
        ctx.font = '16px Arial';
        ctx.fillText('Chart data not available', 450, 325);
      }
      
      const filename = `${symbol}_chart_${selectedTimeframe}${
        startDate && endDate ? `_${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}` : ''
      }.png`;
      
      // Download the canvas
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = filename;
          link.href = url;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
      
    } catch (error) {
      console.error('PNG export failed:', error);
      alert('PNG export failed. Please try again.');
    }
  };

  const exportAsPDF = async () => {
    try {
      // First create the same canvas chart as PNG export
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Set background
      ctx.fillStyle = '#1C1C1C';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add title
      ctx.fillStyle = '#5AF5FA';
      ctx.font = 'bold 24px Arial';
      ctx.fillText(`${symbol} - ${name}`, 30, 40);
      
      // Add price info - fix the NaN issue
      ctx.fillStyle = '#F7F7F7';
      ctx.font = '18px Arial';
      const price = currentPrice && currentPrice !== 'NaN' ? formatPrice(parseFloat(currentPrice)) : 'N/A';
      const change = percentChange && percentChange !== '0' ? percentChange : 'N/A';
      const cap = marketCap && marketCap !== '--' ? marketCap : 'N/A';
      
      ctx.fillText(`Price: ${price} (${change}%)`, 30, 70);
      ctx.fillText(`Market Cap: ${cap}`, 30, 95);
      
      // Add timeframe info
      const timeframeText = startDate && endDate 
        ? `Date Range: ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`
        : `Timeframe: ${selectedTimeframe}`;
      ctx.fillText(timeframeText, 30, 120);
      
      // Draw actual chart if data is available
      if (chartData?.data && chartData.data.length > 0) {
        const chartArea = { x: 60, y: 150, width: 880, height: 350 };
        
        // Draw chart background
        ctx.fillStyle = '#1C1C1C';
        ctx.fillRect(chartArea.x, chartArea.y, chartArea.width, chartArea.height);
        
        // Draw grid lines
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
          const y = chartArea.y + (i * chartArea.height / 5);
          ctx.beginPath();
          ctx.moveTo(chartArea.x, y);
          ctx.lineTo(chartArea.x + chartArea.width, y);
          ctx.stroke();
        }
        
        // Get price data and calculate bounds
        const prices = chartData.data.map(d => d.close);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;
        
        // Draw price line
        const lineColor = isPositive ? '#5AF5FA' : '#FFA5FF';
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        chartData.data.forEach((point, index) => {
          const x = chartArea.x + (index / (chartData.data.length - 1)) * chartArea.width;
          const y = chartArea.y + chartArea.height - ((point.close - minPrice) / priceRange) * chartArea.height;
          
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
        
        // Draw Y-axis labels (prices)
        ctx.fillStyle = '#F7F7F7';
        ctx.font = '12px Arial';
        for (let i = 0; i <= 5; i++) {
          const price = minPrice + (i / 5) * priceRange;
          const y = chartArea.y + chartArea.height - (i * chartArea.height / 5);
          ctx.fillText(formatPrice(price), chartArea.x + chartArea.width + 10, y + 4);
        }
        
        // Draw X-axis labels (simplified)
        ctx.fillText('Start', chartArea.x, chartArea.y + chartArea.height + 20);
        ctx.fillText('End', chartArea.x + chartArea.width - 30, chartArea.y + chartArea.height + 20);
      }
      
      // Now create PDF and add the canvas as image
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      
      // Calculate dimensions to fit the chart nicely in PDF
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20; // Leave margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add the chart image
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, Math.min(imgHeight, pdfHeight - 30));
      
      // Add generation timestamp at bottom
      pdf.setFontSize(10);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 15, pdfHeight - 10);
      
      const filename = `${symbol}_chart_${selectedTimeframe}${
        startDate && endDate ? `_${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}` : ''
      }.pdf`;
      
      pdf.save(filename);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('PDF export failed. Please try again.');
    }
  };

  const exportAsSVG = async () => {
    // SVG export is more complex and would require recreating the chart in SVG format
    // For now, we'll provide a simplified implementation that creates a basic SVG
    try {
      const dateRange = startDate && endDate 
        ? `${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`
        : selectedTimeframe;
      
      const svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" style="background: #1C1C1C; color: #F7F7F7;">
          <text x="20" y="30" font-family="Arial" font-size="18" fill="#5AF5FA">${symbol} - ${name}</text>
          <text x="20" y="55" font-family="Arial" font-size="14" fill="#F7F7F7">Price: ${formatPrice(parseFloat(currentPrice))} (${percentChange})</text>
          <text x="20" y="75" font-family="Arial" font-size="14" fill="#F7F7F7">Market Cap: ${marketCap}</text>
          <text x="20" y="95" font-family="Arial" font-size="14" fill="#F7F7F7">Period: ${dateRange}</text>
          <text x="20" y="130" font-family="Arial" font-size="12" fill="#888">Note: Full chart visualization requires PNG or PDF export</text>
        </svg>
      `;
      
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const filename = `${symbol}_chart_${selectedTimeframe}${
        startDate && endDate ? `_${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}` : ''
      }.svg`;
      
      saveAs(blob, filename);
    } catch (error) {
      console.error('SVG export failed:', error);
    }
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
                  setShowDatePicker(false);
                } else {
                  setShowDatePicker(true);
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
          
          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs border-[#5AF5FA]/30 text-[#5AF5FA] hover:bg-[#5AF5FA]/10"
              >
                <Download className="w-3 h-3 mr-1" />
                Export
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-36">
              <DropdownMenuItem onClick={exportAsPNG} className="cursor-pointer">
                <Download className="w-4 h-4 mr-2" />
                Export as PNG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportAsPDF} className="cursor-pointer">
                <Download className="w-4 h-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportAsSVG} className="cursor-pointer">
                <Download className="w-4 h-4 mr-2" />
                Export as SVG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Custom Date Range Picker - Positioned Below Timeframes */}
        {selectedTimeframe === 'Custom' && showDatePicker && (
          <div className="mt-4 p-4 border rounded-lg bg-card relative z-50" style={{ zIndex: 9999 }}>
            {/* Close Button */}
            <button
              onClick={() => setShowDatePicker(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
              title="Close date picker"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
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
                    // Close the date picker while keeping Custom timeframe active
                    // The chart will continue showing the custom data based on startDate and endDate
                    setShowDatePicker(false);
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
          <div ref={chartRef} className="h-80 w-full rounded-lg" style={{ backgroundColor: '#1C1C1C' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartDataWithPercentage}
                margin={{ top: 15, right: 0, left: 0, bottom: 15 }}
              >
                <defs>
                  <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5AF5FA" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#5AF5FA" stopOpacity={0.2} />
                  </linearGradient>
                  <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFA5FF" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#FFA5FF" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                
                {/* Enhanced horizontal grid lines */}
                <CartesianGrid 
                  strokeDasharray="1 1" 
                  stroke="#333333" 
                  opacity={0.6}
                  horizontal={true}
                  vertical={false}
                />
                
                <XAxis 
                  dataKey="time"
                  tickFormatter={(value) => formatTime(value, selectedTimeframe)}
                  tick={{ fontSize: 12, fill: '#F7F7F7' }}
                  axisLine={{ stroke: '#F7F7F7' }}
                  tickLine={{ stroke: '#F7F7F7' }}
                />
                
                {/* Primary Y-axis for price (right side) */}
                <YAxis 
                  yAxisId="price"
                  orientation="right"
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tickFormatter={formatPrice}
                  tick={{ fontSize: 12, fill: '#F7F7F7' }}
                  axisLine={{ stroke: '#F7F7F7' }}
                  tickLine={{ stroke: '#F7F7F7' }}
                />
                
                
                <Tooltip 
                  labelFormatter={(value) => formatTime(value, selectedTimeframe)}
                  formatter={(value: number, name: string) => {
                    if (name === 'close') {
                      return [formatPrice(value), 'Price'];
                    } else if (name === 'percentageChange') {
                      return [`${value.toFixed(2)}%`, 'Change'];
                    }
                    return [value, name];
                  }}
                  contentStyle={{
                    backgroundColor: '#1C1C1C',
                    border: '1px solid #333333',
                    borderRadius: '6px',
                    color: '#F7F7F7'
                  }}
                />
                
                {/* Mountain area chart with gradient fill */}
                <Area
                  yAxisId="price"
                  type="monotone" 
                  dataKey="close" 
                  stroke={lineColor}
                  strokeWidth={2}
                  fill={`url(#${isPositive ? 'positiveGradient' : 'negativeGradient'})`}
                  dot={false}
                  activeDot={{ r: 4, fill: lineColor, stroke: '#1C1C1C', strokeWidth: 2 }}
                />
              </AreaChart>
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