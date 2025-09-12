import { useState, useMemo, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Customized } from 'recharts';
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { createPortal } from "react-dom";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Search, X, Plus, Download, FileText, Image } from "lucide-react";
import { useQueries, useQuery } from "@tanstack/react-query";
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

interface Annotation {
  id: string;
  type: 'text' | 'percentage';
  x: number; // X coordinate on chart
  y: number; // Y coordinate on chart
  timestamp: number; // Data point timestamp
  price: number; // Price at this point
  text?: string; // User annotation text (for text type)
  time: string; // Formatted time string
  // For percentage measurements
  startTimestamp?: number;
  startPrice?: number;
  startTime?: string;
  endTimestamp?: number;
  endPrice?: number;
  endTime?: string;
  percentage?: number;
}

interface ComparisonChartProps {
  timeframe: string;
  startDate?: Date;
  endDate?: Date;
  annotations?: Annotation[];
  onAnnotationsChange?: (annotations: Annotation[]) => void;
  annotationMode?: 'text' | 'percentage';
  pendingPercentageStart?: { timestamp: number; price: number; time: string } | null;
  setPendingPercentageStart?: (start: { timestamp: number; price: number; time: string } | null) => void;
  updateAnnotations?: (newAnnotations: Annotation[] | ((prev: Annotation[]) => Annotation[])) => void;
}

// Annotation Layer component for rendering annotations with proper scaling
const AnnotationLayer: React.FC<any> = ({ 
  xAxisMap, 
  yAxisMap, 
  offset, 
  height, 
  formattedGraphicalItems, 
  annotations, 
  chartData, 
  onAnnotationDoubleClick 
}) => {
  if (!xAxisMap || !yAxisMap || !offset || !chartData) return null;
  
  const xAxis = Object.values(xAxisMap)[0] as any;
  const yAxis = Object.values(yAxisMap)[0] as any;
  
  if (!xAxis || !yAxis) return null;
  
  const yTop = offset.top;
  const yBottom = height - offset.bottom;
  
  // Create a map for fast timestamp-to-index lookup
  const tsToIndex = new Map(chartData.map((d: any, i: number) => [d.timestamp, i]));
  
  return (
    <g>
      {annotations.map((annotation) => {
        const idx = tsToIndex.get(annotation.timestamp);
        if (idx == null) return null;
        
        // Get x position with offset
        const x = (formattedGraphicalItems?.[0]?.props?.points?.[idx]?.x) ?? 
                  (xAxis.scale(chartData[idx].date) + offset.left);
        
        if (annotation.type === 'text') {
          const y = yAxis.scale(annotation.price) + offset.top;
          
          return (
            <g key={annotation.id}>
              <line 
                x1={x} 
                y1={yTop} 
                x2={x} 
                y2={yBottom} 
                stroke="#5AF5FA" 
                strokeWidth={2} 
                strokeDasharray="5 5" 
                style={{ cursor: 'pointer' }}
                onDoubleClick={() => onAnnotationDoubleClick(annotation)} 
              />
              <text 
                x={x + 5} 
                y={y - 10} 
                fill="#5AF5FA" 
                fontSize={12} 
                fontWeight="bold" 
                style={{ cursor: 'pointer' }}
                onDoubleClick={() => onAnnotationDoubleClick(annotation)}
              >
                {annotation.text || 'Annotation'}
              </text>
            </g>
          );
        } else if (annotation.type === 'percentage' && annotation.startTimestamp && annotation.endTimestamp) {
          const i1 = tsToIndex.get(annotation.startTimestamp);
          const i2 = tsToIndex.get(annotation.endTimestamp);
          
          if (i1 == null || i2 == null) return null;
          
          const x1 = (formattedGraphicalItems?.[0]?.props?.points?.[i1]?.x) ?? 
                     (xAxis.scale(chartData[i1].date) + offset.left);
          const x2 = (formattedGraphicalItems?.[0]?.props?.points?.[i2]?.x) ?? 
                     (xAxis.scale(chartData[i2].date) + offset.left);
          const y = yAxis.scale(annotation.price || 0) + offset.top;
          
          return (
            <g key={annotation.id}>
              <line 
                x1={x1} 
                y1={yTop} 
                x2={x1} 
                y2={yBottom} 
                stroke="#5AF5FA" 
                strokeWidth={2} 
                strokeDasharray="5 5" 
                style={{ cursor: 'pointer' }}
                onDoubleClick={() => onAnnotationDoubleClick(annotation)} 
              />
              <line 
                x1={x2} 
                y1={yTop} 
                x2={x2} 
                y2={yBottom} 
                stroke="#5AF5FA" 
                strokeWidth={2} 
                strokeDasharray="5 5" 
                style={{ cursor: 'pointer' }}
                onDoubleClick={() => onAnnotationDoubleClick(annotation)} 
              />
              <line 
                x1={x1} 
                y1={y} 
                x2={x2} 
                y2={y} 
                stroke="#5AF5FA" 
                strokeWidth={1} 
              />
              <text 
                x={(x1 + x2) / 2 + 6} 
                y={y - 8} 
                fill="#5AF5FA" 
                fontSize={12} 
                fontWeight="bold"
                style={{ cursor: 'pointer' }}
                onDoubleClick={() => onAnnotationDoubleClick(annotation)}
              >
                {`${((annotation.percentage ?? ((annotation.endPrice || 0) - (annotation.startPrice || 0)))).toFixed(2)}%`}
              </text>
            </g>
          );
        }
        return null;
      })}
    </g>
  );
};

export function ComparisonChart({ 
  timeframe, 
  startDate, 
  endDate,
  annotations: controlledAnnotations,
  onAnnotationsChange,
  annotationMode = 'text',
  pendingPercentageStart,
  setPendingPercentageStart,
  updateAnnotations
}: ComparisonChartProps) {
  const [tickers, setTickers] = useState<TickerData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const { toast } = useToast();

  // Annotation UI state (non-conflicting with props)
  const [showAnnotationInput, setShowAnnotationInput] = useState(false);
  const [annotationInput, setAnnotationInput] = useState('');
  const [pendingAnnotation, setPendingAnnotation] = useState<Omit<Annotation, 'id' | 'text'> | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Use controlled annotations from parent
  const annotations = controlledAnnotations || [];

  // Click outside handler - works with portal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current && !containerRef.current.contains(target) &&
          dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
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
  const { data: searchResults = [], isLoading: isSearchLoading } = useQuery({
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

  // Fetch chart data for all tickers using useQueries for dynamic queries
  const tickerQueries = useQueries({
    queries: tickers.map(ticker => ({
      queryKey: ['/api/stocks', ticker.symbol, 'chart', timeframe, startDate?.getTime(), endDate?.getTime()],
      queryFn: async () => {
        let url = `/api/stocks/${ticker.symbol}/chart?timeframe=${timeframe}`;
        
        // Add custom date range parameters for Custom timeframe
        if (timeframe === 'Custom' && startDate && endDate) {
          const fromTimestamp = Math.floor(startDate.getTime() / 1000);
          const toTimestamp = Math.floor(endDate.getTime() / 1000);
          url = `/api/stocks/${ticker.symbol}/chart?from=${fromTimestamp}&to=${toTimestamp}&timeframe=Custom`;
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch chart data');
        return response.json();
      },
      enabled: !!ticker.symbol,
      staleTime: 0, // Always refetch when timeframe changes
      cacheTime: 2 * 60 * 1000, // Keep in cache for 2 minutes
    }))
  });

  // Helper function to format dates properly based on timeframe (like main price chart)
  const formatTime = (timeValue: any, timeframe: string) => {
    // Handle both timestamp numbers and time strings like the main chart
    const date = typeof timeValue === 'string' ? new Date(timeValue) : new Date(timeValue * 1000);
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
      // Find the time string from the first ticker's data for this timestamp
      const firstTickerData = allChartData[0]?.data.find((d: any) => d.timestamp === timestamp);
      const timeString = firstTickerData?.time || new Date(timestamp * 1000).toISOString();
      
      const dataPoint: ChartDataPoint = {
        timestamp,
        date: formatTime(timeString, timeframe), // Use time string like main chart
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

  // Add to recent searches functionality
  const addToRecentSearches = (stock: SearchResult) => {
    const newRecent = [stock, ...recentSearches.filter(s => s.symbol !== stock.symbol)].slice(0, 6);
    setRecentSearches(newRecent);
    localStorage.setItem('recentComparisonSearches', JSON.stringify(newRecent));
  };

  // Handle input focus and dropdown positioning
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
    setSearchTerm(value);
    if (value.length > 0) {
      updateDropdownPosition();
      setIsDropdownOpen(true);
    } else {
      setIsDropdownOpen(false);
    }
  };

  const handleInputFocus = () => {
    updateDropdownPosition();
    setIsDropdownOpen(true);
  };

  const handleSelectStock = (stock: SearchResult) => {
    addTicker(stock.symbol, stock);
  };

  const addTicker = (symbol: string, stock?: SearchResult) => {
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
    
    // Add to recent searches if stock data is provided
    if (stock) {
      addToRecentSearches(stock);
    }
    
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

  // Annotation handling methods
  const handleChartClick = (event: any) => {
    if (!event || !chartData || !event.activePayload || event.activePayload.length === 0) return;
    
    // Get the active payload from the click event
    const { activePayload, activeLabel } = event;
    const clickedData = activePayload[0].payload;
    const timestamp = clickedData.timestamp;
    const time = clickedData.date;
    
    // For comparison chart, get the first visible ticker's percentage value at this point
    const firstVisibleTicker = tickers.find(t => t.visible);
    if (!firstVisibleTicker) return;
    
    const percentageValue = clickedData[`${firstVisibleTicker.symbol}_percentage`] || 0;
    
    if (annotationMode === 'text') {
      // Text annotation mode - single click
      const newAnnotation: Omit<Annotation, 'id' | 'text'> = {
        type: 'text',
        x: 0, // Will be calculated during rendering
        y: 0, // Will be calculated during rendering  
        timestamp,
        price: percentageValue,
        time
      };
      
      setPendingAnnotation(newAnnotation);
      setShowAnnotationInput(true);
      setAnnotationInput('');
      setEditingAnnotation(null);
      setIsEditMode(false);
    } else if (annotationMode === 'percentage') {
      // Percentage measurement mode - two clicks
      if (!pendingPercentageStart) {
        // First click - set start point
        setPendingPercentageStart?.({
          timestamp,
          price: percentageValue,
          time
        });
      } else {
        // Second click - create percentage measurement
        const startPercentage = pendingPercentageStart.price;
        const endPercentage = percentageValue;
        const percentageDifference = endPercentage - startPercentage; // Direct percentage point difference
        
        const newAnnotation: Annotation = {
          id: `percentage-${Date.now()}`,
          type: 'percentage',
          x: 0,
          y: 0,
          timestamp: pendingPercentageStart.timestamp,
          price: startPercentage,
          time: pendingPercentageStart.time,
          startTimestamp: pendingPercentageStart.timestamp,
          startPrice: startPercentage,
          startTime: pendingPercentageStart.time,
          endTimestamp: timestamp,
          endPrice: endPercentage,
          endTime: time,
          percentage: percentageDifference
        };
        
        updateAnnotations?.(prev => [...prev, newAnnotation]);
        setPendingPercentageStart?.(null);
      }
    }
  };

  // Handle annotation double-click for editing
  const handleAnnotationDoubleClick = (annotation: Annotation) => {
    if (annotation.type === 'text') {
      setEditingAnnotation(annotation);
      setIsEditMode(true);
      setAnnotationInput(annotation.text || '');
      setShowAnnotationInput(true);
    } else if (annotation.type === 'percentage') {
      // For percentage annotations, show a delete confirmation
      if (confirm('Delete this percentage measurement?')) {
        updateAnnotations?.(prev => prev.filter(a => a.id !== annotation.id));
      }
    }
  };

  // Clear all annotations
  const clearAllAnnotations = () => {
    if (confirm('Delete all annotations?')) {
      updateAnnotations?.([]);
      setPendingPercentageStart?.(null);
    }
  };

  // Save annotation with user text
  const saveAnnotation = () => {
    if (isEditMode && editingAnnotation && annotationInput.trim()) {
      // Update existing annotation
      updateAnnotations?.(prev => prev.map(annotation => 
        annotation.id === editingAnnotation.id 
          ? { ...annotation, text: annotationInput.trim() }
          : annotation
      ));
      setShowAnnotationInput(false);
      setAnnotationInput('');
      setEditingAnnotation(null);
      setIsEditMode(false);
    } else if (pendingAnnotation && annotationInput.trim()) {
      // Create new annotation
      const newAnnotation: Annotation = {
        ...pendingAnnotation,
        id: `annotation-${Date.now()}`,
        text: annotationInput.trim()
      };
      
      updateAnnotations?.(prev => [...prev, newAnnotation]);
      setShowAnnotationInput(false);
      setAnnotationInput('');
      setPendingAnnotation(null);
    }
  };

  // Delete annotation
  const deleteAnnotation = () => {
    if (editingAnnotation) {
      updateAnnotations?.(prev => prev.filter(annotation => annotation.id !== editingAnnotation.id));
      setShowAnnotationInput(false);
      setAnnotationInput('');
      setEditingAnnotation(null);
      setIsEditMode(false);
    }
  };

  // Cancel annotation
  const cancelAnnotation = () => {
    setShowAnnotationInput(false);
    setAnnotationInput('');
    setPendingAnnotation(null);
    setEditingAnnotation(null);
    setIsEditMode(false);
  };

  // Format price helper for percentage values
  const formatPrice = (price: number) => {
    return `${price > 0 ? '+' : ''}${price.toFixed(2)}`;
  };

  // Check loading and error states
  const isLoading = tickerQueries.some(query => query.isLoading);
  const hasErrors = tickerQueries.some(query => query.isError);
  const errorMessages = tickerQueries
    .filter(query => query.isError)
    .map((query, index) => `${tickers[index]?.symbol}: ${query.error?.message || 'Unknown error'}`);

  // Export CSV function for shared export functionality  
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

  // PNG export function for shared export functionality
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

      console.log('Capturing comparison chart with html2canvas...');
      
      // Wait for chart to render completely
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Export directly from SVG to avoid html2canvas OKLCH issues
      const svgElement = chartElement.querySelector('svg') as SVGElement;
      if (!svgElement) {
        throw new Error('SVG element not found in chart');
      }
      
      // Clone the SVG and normalize colors to RGB
      const svgClone = svgElement.cloneNode(true) as SVGElement;
      
      // Color mapping for OKLCH fallbacks
      const colorMap: Record<string, string> = {
        'oklch(0.4853 0.2967 278.3947)': 'rgb(124, 58, 237)',
        'oklch(0.4032 0.1861 327.5134)': 'rgb(103, 48, 208)',
        'oklch(0.3665 0.2460 267.3473)': 'rgb(93, 56, 192)',
        'oklch(0.3218 0.2190 265.8914)': 'rgb(82, 56, 166)',
        'oklch(0.2839 0.1937 265.6581)': 'rgb(72, 49, 149)',
        'oklch(1.0000 0 0)': 'rgb(255, 255, 255)',
        'oklch(0.2686 0 0)': 'rgb(68, 68, 68)',
        'oklch(0.1822 0 0)': 'rgb(46, 46, 46)',
        'oklch(0.9219 0 0)': 'rgb(235, 235, 235)',
      };
      
      // Normalize colors in all SVG elements
      const normalizeElement = (element: Element) => {
        const computedStyle = window.getComputedStyle(element as HTMLElement);
        const attributes = ['stroke', 'fill', 'stop-color'];
        
        attributes.forEach(attr => {
          const computedValue = computedStyle.getPropertyValue(attr);
          if (computedValue && computedValue !== 'none') {
            if (computedValue.includes('oklch')) {
              // Use color mapping for OKLCH values
              const rgbValue = colorMap[computedValue] || 'rgb(68, 68, 68)';
              element.setAttribute(attr, rgbValue);
            } else if (computedValue.startsWith('rgb')) {
              element.setAttribute(attr, computedValue);
            }
          }
        });
        
        // Handle text elements
        if (element.tagName === 'text') {
          const textColor = computedStyle.color;
          if (textColor.includes('oklch')) {
            element.setAttribute('fill', colorMap[textColor] || 'rgb(68, 68, 68)');
          } else if (textColor.startsWith('rgb')) {
            element.setAttribute('fill', textColor);
          }
          
          // Preserve font information for consistency
          const fontFamily = computedStyle.fontFamily || 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          const fontSize = computedStyle.fontSize || '12px';
          const fontWeight = computedStyle.fontWeight || 'normal';
          
          element.setAttribute('font-family', fontFamily);
          element.setAttribute('font-size', fontSize);
          element.setAttribute('font-weight', fontWeight);
        }
        
        // Remove style attributes that might contain CSS variables
        if (element.hasAttribute('style')) {
          const style = element.getAttribute('style') || '';
          if (style.includes('var(') || style.includes('oklch')) {
            element.removeAttribute('style');
          }
        }
      };
      
      // Process the cloned SVG and all its children
      normalizeElement(svgClone);
      const allElements = svgClone.querySelectorAll('*');
      allElements.forEach(normalizeElement);
      
      // Serialize SVG to data URL
      const svgData = new XMLSerializer().serializeToString(svgClone);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      // Create canvas and draw SVG
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = document.createElement('img');
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(svgUrl);
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(svgUrl);
          reject(new Error('Failed to load SVG image'));
        };
        img.src = svgUrl;
      });

      console.log('Canvas created successfully, converting to blob...');
      
      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const fileName = `comparison-chart-${tickers.filter(t => t.visible).map(t => t.symbol).join('-')}-${new Date().toISOString().split('T')[0]}.png`;
          saveAs(blob, fileName);
          
          toast({
            title: "Export Successful",
            description: "PNG file has been downloaded",
          });
        } else {
          throw new Error('Failed to create blob from canvas');
        }
      }, 'image/png', 1.0);
    } catch (error) {
      console.error('Comparison PNG export error:', error);
      toast({
        title: "Export Failed",
        description: `Unable to export PNG file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  // PDF export function for shared export functionality
  const exportPDF = async () => {
    if (chartData.length === 0) {
      toast({
        title: "No Data",
        description: "No chart data available to export",
        variant: "destructive",
      });
      return;
    }

    try {
      // Import jsPDF dynamically
      const { jsPDF } = await import('jspdf');
      
      // Find the chart container element
      const chartElement = document.querySelector('[data-testid="comparison-chart-container"]') as HTMLElement;
      if (!chartElement) {
        throw new Error('Chart element not found');
      }

      // Wait for chart to render completely
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Export directly from SVG to avoid html2canvas OKLCH issues
      const svgElement = chartElement.querySelector('svg') as SVGElement;
      if (!svgElement) {
        throw new Error('SVG element not found in chart');
      }
      
      // Clone the SVG and normalize colors to RGB
      const svgClone = svgElement.cloneNode(true) as SVGElement;
      
      // Color mapping for OKLCH fallbacks
      const colorMap: Record<string, string> = {
        'oklch(0.4853 0.2967 278.3947)': 'rgb(124, 58, 237)',
        'oklch(0.4032 0.1861 327.5134)': 'rgb(103, 48, 208)',
        'oklch(0.3665 0.2460 267.3473)': 'rgb(93, 56, 192)',
        'oklch(0.3218 0.2190 265.8914)': 'rgb(82, 56, 166)',
        'oklch(0.2839 0.1937 265.6581)': 'rgb(72, 49, 149)',
        'oklch(1.0000 0 0)': 'rgb(255, 255, 255)',
        'oklch(0.2686 0 0)': 'rgb(68, 68, 68)',
        'oklch(0.1822 0 0)': 'rgb(46, 46, 46)',
        'oklch(0.9219 0 0)': 'rgb(235, 235, 235)',
      };
      
      // Normalize colors in all SVG elements
      const normalizeElement = (element: Element) => {
        const computedStyle = window.getComputedStyle(element as HTMLElement);
        const attributes = ['stroke', 'fill', 'stop-color'];
        
        attributes.forEach(attr => {
          const computedValue = computedStyle.getPropertyValue(attr);
          if (computedValue && computedValue !== 'none') {
            if (computedValue.includes('oklch')) {
              // Use color mapping for OKLCH values
              const rgbValue = colorMap[computedValue] || 'rgb(68, 68, 68)';
              element.setAttribute(attr, rgbValue);
            } else if (computedValue.startsWith('rgb')) {
              element.setAttribute(attr, computedValue);
            }
          }
        });
        
        // Handle text elements
        if (element.tagName === 'text') {
          const textColor = computedStyle.color;
          if (textColor.includes('oklch')) {
            element.setAttribute('fill', colorMap[textColor] || 'rgb(68, 68, 68)');
          } else if (textColor.startsWith('rgb')) {
            element.setAttribute('fill', textColor);
          }
          
          // Preserve font information for consistency
          const fontFamily = computedStyle.fontFamily || 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          const fontSize = computedStyle.fontSize || '12px';
          const fontWeight = computedStyle.fontWeight || 'normal';
          
          element.setAttribute('font-family', fontFamily);
          element.setAttribute('font-size', fontSize);
          element.setAttribute('font-weight', fontWeight);
        }
        
        // Remove style attributes that might contain CSS variables
        if (element.hasAttribute('style')) {
          const style = element.getAttribute('style') || '';
          if (style.includes('var(') || style.includes('oklch')) {
            element.removeAttribute('style');
          }
        }
      };
      
      // Process the cloned SVG and all its children
      normalizeElement(svgClone);
      const allElements = svgClone.querySelectorAll('*');
      allElements.forEach(normalizeElement);
      
      // Serialize SVG to data URL
      const svgData = new XMLSerializer().serializeToString(svgClone);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      // Create canvas and draw SVG
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = document.createElement('img');
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(svgUrl);
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(svgUrl);
          reject(new Error('Failed to load SVG image'));
        };
        img.src = svgUrl;
      });

      // Calculate dimensions for PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4'); // landscape orientation
      const imgWidth = 280; // A4 landscape width minus margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add the image to PDF
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      
      // Save the PDF
      const fileName = `comparison-chart-${tickers.filter(t => t.visible).map(t => t.symbol).join('-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast({
        title: "Export Successful",
        description: "PDF file has been downloaded",
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "Export Failed",
        description: `Unable to export PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  // SVG export function for shared export functionality
  const exportSVG = async () => {
    if (chartData.length === 0) {
      toast({
        title: "No Data",
        description: "No chart data available to export",
        variant: "destructive",
      });
      return;
    }

    try {
      // Find the SVG element within the chart
      const svgElement = document.querySelector('[data-testid="comparison-chart-container"] svg') as SVGElement;
      if (!svgElement) {
        throw new Error('SVG chart element not found');
      }

      // Clone the SVG to avoid modifying the original
      const svgClone = svgElement.cloneNode(true) as SVGElement;
      
      // Add necessary attributes for standalone SVG
      svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
      
      // Get SVG content as string
      const svgData = new XMLSerializer().serializeToString(svgClone);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      
      // Download the SVG
      const fileName = `comparison-chart-${tickers.map(t => t.symbol).join('-')}-${new Date().toISOString().split('T')[0]}.svg`;
      saveAs(svgBlob, fileName);
      
      toast({
        title: "Export Successful",
        description: "SVG file has been downloaded",
      });
    } catch (error) {
      console.error('SVG export error:', error);
      toast({
        title: "Export Failed",
        description: "Unable to export SVG file",
        variant: "destructive",
      });
    }
  };

  // Add event listeners for shared export functionality
  useEffect(() => {
    const chartContainer = document.querySelector('[data-testid="comparison-chart-container"]');
    if (chartContainer) {
      const handleExportCSV = () => exportCSV();
      const handleExportPNG = () => exportPNG();
      const handleExportPDF = () => exportPDF();
      const handleExportSVG = () => exportSVG();
      
      chartContainer.addEventListener('exportCSV', handleExportCSV);
      chartContainer.addEventListener('exportPNG', handleExportPNG);
      chartContainer.addEventListener('exportPDF', handleExportPDF);
      chartContainer.addEventListener('exportSVG', handleExportSVG);
      
      return () => {
        chartContainer.removeEventListener('exportCSV', handleExportCSV);
        chartContainer.removeEventListener('exportPNG', handleExportPNG);
        chartContainer.removeEventListener('exportPDF', handleExportPDF);
        chartContainer.removeEventListener('exportSVG', handleExportSVG);
      };
    }
  }, [chartData, tickers]);


  // Custom tooltip that shows actual prices with better date formatting
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    // Use the properly formatted date from the chart data
    const formattedDate = label;

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
        
        <div className="flex items-center gap-2">
          {/* Pending Percentage Indicator */}
          {annotationMode === 'percentage' && pendingPercentageStart && (
            <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded border">
              Click second point to measure
            </div>
          )}

          {/* Annotation Management - removed clear all button per user request */}
        
        </div>
      </div>

      {/* Search Input with Predictive Search */}
      {isSearchVisible && (
        <div ref={containerRef}>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Search stocks (e.g., AAPL, Apple Inc)"
                value={searchTerm}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={handleInputFocus}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchTerm.trim()) {
                    // Try to find exact match in search results for recent searches
                    const exactMatch = searchResults.find(s => 
                      s.symbol.toLowerCase() === searchTerm.trim().toLowerCase()
                    );
                    addTicker(searchTerm.trim(), exactMatch);
                  }
                  if (e.key === 'Escape') {
                    setIsSearchVisible(false);
                    setSearchTerm('');
                    setIsDropdownOpen(false);
                  }
                }}
                className="flex-1"
                data-testid="input-ticker-search"
              />
              <Button
                onClick={() => {
                  if (searchTerm.trim()) {
                    // Try to find exact match in search results for recent searches
                    const exactMatch = searchResults.find(s => 
                      s.symbol.toLowerCase() === searchTerm.trim().toLowerCase()
                    );
                    addTicker(searchTerm.trim(), exactMatch);
                  }
                }}
                disabled={!searchTerm.trim()}
                size="sm"
                data-testid="button-add-ticker-search"
              >
                Add
              </Button>
            </div>
          </Card>

          {/* Search Results Dropdown */}
          {isDropdownOpen && createPortal(
            <Card 
              ref={dropdownRef}
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
              {(!searchTerm.trim() && recentSearches.length > 0) ? (
                <div className="py-2">
                  <div className="px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border/50">
                    Recent Searches
                  </div>
                  {recentSearches.map((stock) => {
                    const { value: changeValue, isPositive } = formatPercentChange(stock.percentChange);
                    return (
                      <div
                        key={`recent-${stock.symbol}-${stock.name}`}
                        className="w-full px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-b-0 cursor-pointer"
                        onClick={() => handleSelectStock(stock)}
                        data-testid={`recent-search-${stock.symbol}`}
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
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : searchTerm.trim().length >= 2 ? (
                <div className="py-2">
                  {isSearchLoading ? (
                    <div className="px-4 py-3 text-center text-muted-foreground">
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((stock) => {
                      const { value: changeValue, isPositive } = formatPercentChange(stock.percentChange);
                      return (
                        <div
                          key={`search-${stock.symbol}-${stock.name}`}
                          className="w-full px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-b-0 cursor-pointer"
                          onClick={() => handleSelectStock(stock)}
                          data-testid={`search-result-${stock.symbol}`}
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
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-4 py-3 text-center text-muted-foreground">
                      No results found for "{searchTerm}"
                    </div>
                  )}
                </div>
              ) : searchTerm.trim().length > 0 && searchTerm.trim().length < 2 ? (
                <div className="px-4 py-3 text-center text-muted-foreground">
                  Type at least 2 characters to search
                </div>
              ) : null}
            </Card>,
            document.body
          )}
        </div>
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
            <div style={{ width: '100%', height: '100%' }}>
              <LineChart 
                data={chartData} 
                width={846}
                height={600}
                margin={{ top: 30, right: 50, left: 30, bottom: 40 }}
                onClick={handleChartClick}
              >
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
                
                {/* Zero reference line */}
                <ReferenceLine y={0} stroke="white" strokeWidth={1} />
                
                {/* Render annotations using Customized component for proper scaling */}
                <Customized 
                  component={
                    <AnnotationLayer 
                      annotations={annotations} 
                      chartData={chartData} 
                      onAnnotationDoubleClick={handleAnnotationDoubleClick} 
                    />
                  } 
                />
                
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
            </div>
          </ChartContainer>
        )}
      </div>

      {/* Legend/Summary */}
      {tickers.length > 0 && (
        <div className="text-xs text-muted-foreground text-center">
          Showing percentage change from {timeframe} starting point • Click color dots to toggle visibility
        </div>
      )}

      {/* Annotation Input Modal */}
      {showAnnotationInput && (pendingAnnotation || editingAnnotation) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-96 max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-4">
              {isEditMode ? 'Edit Annotation' : 'Add Annotation'}
            </h3>
            <div className="mb-4 text-sm text-muted-foreground">
              <div>Time: {isEditMode ? editingAnnotation?.time : pendingAnnotation?.time}</div>
              <div>Value: {formatPrice(isEditMode ? editingAnnotation?.price || 0 : pendingAnnotation?.price || 0)}%</div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Event Description</label>
              <textarea
                value={annotationInput}
                onChange={(e) => setAnnotationInput(e.target.value)}
                placeholder="Enter event description..."
                className="w-full h-24 px-3 py-2 border border-border rounded-md bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    saveAnnotation();
                  } else if (e.key === 'Escape') {
                    cancelAnnotation();
                  }
                }}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={cancelAnnotation}>
                Cancel
              </Button>
              {isEditMode && (
                <Button 
                  variant="destructive"
                  onClick={deleteAnnotation}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  Delete
                </Button>
              )}
              <Button 
                onClick={saveAnnotation}
                disabled={!annotationInput.trim()}
                className="bg-[#5AF5FA] text-black hover:bg-[#5AF5FA]/90"
              >
                {isEditMode ? 'Update' : 'Save'}
              </Button>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Press Ctrl+Enter to save, Escape to cancel
            </div>
          </div>
        </div>
      )}
    </div>
  );
}