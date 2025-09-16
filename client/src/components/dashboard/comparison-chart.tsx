import { useState, useMemo, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceDot, ResponsiveContainer, Customized } from 'recharts';
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
  type: 'text' | 'percentage' | 'horizontal';
  x: number; // X coordinate on chart
  y: number; // Y coordinate on chart
  timestamp: number; // Data point timestamp
  price: number; // Price at this point
  text?: string; // User annotation text (for text and horizontal types)
  time: string; // Formatted time string
  horizontalOffset?: number; // Custom horizontal position offset in pixels for dragging
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
  annotationMode?: 'text' | 'percentage' | 'horizontal';
  pendingPercentageStart?: { timestamp: number; price: number; time: string } | null;
  setPendingPercentageStart?: (start: { timestamp: number; price: number; time: string } | null) => void;
  updateAnnotations?: (newAnnotations: Annotation[] | ((prev: Annotation[]) => Annotation[])) => void;
}


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
  
  // Drag state for horizontal lines
  const [isDragging, setIsDragging] = useState(false);
  const [dragAnnotationId, setDragAnnotationId] = useState<string | null>(null);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartPrice, setDragStartPrice] = useState(0);
  
  // Text annotation horizontal drag state
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [dragTextAnnotationId, setDragTextAnnotationId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartOffset, setDragStartOffset] = useState(0);
  
  // Vertical line horizontal drag state
  const [isDraggingVertical, setIsDraggingVertical] = useState(false);
  const [dragVerticalAnnotationId, setDragVerticalAnnotationId] = useState<string | null>(null);
  const [dragVerticalStartX, setDragVerticalStartX] = useState(0);
  const [dragVerticalStartTimestamp, setDragVerticalStartTimestamp] = useState(0);
  
  // Recharts geometry capture for precise positioning
  const layoutRef = useRef<{offset: any, yScale: any} | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Use controlled annotations from parent
  const annotations = controlledAnnotations || [];

  // Drag functionality for horizontal lines
  const handleMouseDown = (event: React.MouseEvent) => {
    if (!chartContainerRef.current) return;
    
    const rect = chartContainerRef.current.getBoundingClientRect();
    const mouseY = event.clientY - rect.top;
    
    // Convert mouse Y to percentage value (approximate)
    const chartHeight = rect.height - 80; // Account for margins
    const chartTop = 40; // Account for top margin
    const relativeY = mouseY - chartTop;
    const percentageAtMouse = ((chartHeight - relativeY) / chartHeight) * 10 - 5; // Rough conversion to percentage scale
    
    // Find the closest horizontal annotation
    const horizontalAnnotations = annotations.filter((ann): ann is Annotation => ann.type === 'horizontal');
    let closestHorizontalAnnotation: Annotation | null = null;
    let closestHorizontalDistance = Infinity;
    
    horizontalAnnotations.forEach(annotation => {
      const distance = Math.abs(annotation.price - percentageAtMouse);
      if (distance < closestHorizontalDistance && distance < 0.5) { // Within 0.5% tolerance - much more precise
        closestHorizontalDistance = distance;
        closestHorizontalAnnotation = annotation;
      }
    });
    
    // Find the closest vertical annotation (text annotation)
    const verticalAnnotations = annotations.filter((ann): ann is Annotation => ann.type === 'text');
    let closestVerticalAnnotation: Annotation | null = null;
    let closestVerticalDistance = Infinity;
    
    if (chartData.length > 0) {
      const mouseX = event.clientX - rect.left;
      const chartWidth = rect.width - 120; // Account for margins and axis labels
      const chartLeft = 60; // Account for left margin
      const relativeX = mouseX - chartLeft;
      const xPercent = relativeX / chartWidth;
      const estimatedDataIndex = Math.round(xPercent * (chartData.length - 1));
      
      verticalAnnotations.forEach(annotation => {
        const actualDataIndex = chartData.findIndex((d: any) => d.timestamp === annotation.timestamp);
        if (actualDataIndex !== -1) {
          const distance = Math.abs(actualDataIndex - estimatedDataIndex);
          const toleranceInDataPoints = Math.max(2, chartData.length * 0.02); // 2% of data points tolerance
          if (distance < closestVerticalDistance && distance < toleranceInDataPoints) {
            closestVerticalDistance = distance;
            closestVerticalAnnotation = annotation;
          }
        }
      });
    }
    
    // Prioritize the closest annotation (horizontal or vertical)
    if (closestHorizontalAnnotation && (!closestVerticalAnnotation || closestHorizontalDistance < closestVerticalDistance * 0.5)) {
      setIsDragging(true);
      setDragAnnotationId(closestHorizontalAnnotation.id);
      setDragStartY(mouseY);
      setDragStartPrice(closestHorizontalAnnotation.price);
      event.preventDefault();
      event.stopPropagation();
    } else if (closestVerticalAnnotation) {
      setIsDraggingVertical(true);
      setDragVerticalAnnotationId(closestVerticalAnnotation.id);
      setDragVerticalStartX(event.clientX);
      setDragVerticalStartTimestamp(closestVerticalAnnotation.timestamp);
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging || !dragAnnotationId || !chartContainerRef.current) return;
    
    const rect = chartContainerRef.current.getBoundingClientRect();
    const mouseY = event.clientY - rect.top;
    const deltaY = mouseY - dragStartY;
    
    // Convert pixel delta to percentage delta (approximate)
    const chartHeight = rect.height - 80;
    const percentageDelta = -(deltaY / chartHeight) * 10; // Negative because Y increases downward
    const newPrice = dragStartPrice + percentageDelta;
    
    // Update the annotation
    updateAnnotations?.(prev => prev.map(ann => 
      ann.id === dragAnnotationId 
        ? { ...ann, price: newPrice }
        : ann
    ));
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragAnnotationId(null);
      setDragStartY(0);
      setDragStartPrice(0);
    }
  };

  // Text annotation drag handlers
  const handleTextMouseDown = (e: React.MouseEvent, annotation: Annotation) => {
    setIsDraggingText(true);
    setDragTextAnnotationId(annotation.id);
    setDragStartX(e.clientX);
    setDragStartOffset(annotation.horizontalOffset || 0);
    e.preventDefault();
    e.stopPropagation();
  };

  const handleTextMouseUp = () => {
    if (isDraggingText) {
      setIsDraggingText(false);
      setDragTextAnnotationId(null);
      setDragStartX(0);
      setDragStartOffset(0);
    }
  };

  const handleVerticalMouseUp = () => {
    if (isDraggingVertical) {
      setIsDraggingVertical(false);
      setDragVerticalAnnotationId(null);
      setDragVerticalStartX(0);
      setDragVerticalStartTimestamp(0);
    }
  };

  // Fetch chart data for all tickers using useQueries for dynamic queries - must be declared before chartData
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

  // Helper function to format dates properly based on timeframe - must be declared before chartData
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

  // Process and align chart data for percentage calculation - must be declared before useEffect that depends on it
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

  // Add global mouse up listener to handle drag end outside chart
  useEffect(() => {
    if (isDragging || isDraggingText || isDraggingVertical) {
      const handleGlobalMouseUp = () => {
        handleMouseUp();
        handleTextMouseUp();
        handleVerticalMouseUp();
      };
      
      const handleGlobalMouseMove = (event: MouseEvent) => {
        // Handle horizontal line dragging
        if (isDragging && dragAnnotationId && layoutRef.current) {
          const { yScale } = layoutRef.current;
          if (typeof yScale.invert !== 'function') return;
          
          // Use Recharts' real Y-scale to convert mouse position to price (with 85px offset correction)
          const newPrice = yScale.invert(event.clientY - layoutRef.current.offset.top - 85);
          
          // Update the annotation with the precise value
          updateAnnotations?.(prev => prev.map(ann => 
            ann.id === dragAnnotationId 
              ? { ...ann, price: newPrice }
              : ann
          ));
        }
        
        // Handle text annotation horizontal dragging
        if (isDraggingText && dragTextAnnotationId) {
          const deltaX = event.clientX - dragStartX;
          const newOffset = dragStartOffset + deltaX;
          
          // Update the annotation's horizontal offset
          updateAnnotations?.(prev => prev.map(ann => 
            ann.id === dragTextAnnotationId 
              ? { ...ann, horizontalOffset: newOffset }
              : ann
          ));
        }
        
        // Handle vertical line horizontal dragging
        if (isDraggingVertical && dragVerticalAnnotationId && chartData) {
          const deltaX = event.clientX - dragVerticalStartX;
          
          // Calculate new timestamp based on horizontal movement
          const chartWidth = 800; // Approximate chart width
          const dataLength = chartData.length;
          const pixelsPerDataPoint = chartWidth / (dataLength - 1);
          const dataPointDelta = Math.round(deltaX / pixelsPerDataPoint);
          
          // Find current annotation's data index
          const currentIndex = chartData.findIndex((d: any) => d.timestamp === dragVerticalStartTimestamp);
          if (currentIndex !== -1) {
            const newIndex = Math.max(0, Math.min(dataLength - 1, currentIndex + dataPointDelta));
            const newDataPoint = chartData[newIndex];
            
            if (newDataPoint) {
              // Update the annotation with new timestamp and time
              updateAnnotations?.(prev => prev.map(ann => 
                ann.id === dragVerticalAnnotationId 
                  ? { 
                      ...ann, 
                      timestamp: (newDataPoint as any).timestamp,
                      time: new Date((newDataPoint as any).timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })
                    }
                  : ann
              ));
            }
          }
        }
      };
      
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('mousemove', handleGlobalMouseMove);
      
      return () => {
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.removeEventListener('mousemove', handleGlobalMouseMove);
      };
    }
  }, [isDragging, dragAnnotationId, dragStartY, dragStartPrice, isDraggingText, dragTextAnnotationId, dragStartX, dragStartOffset, isDraggingVertical, dragVerticalAnnotationId, dragVerticalStartX, dragVerticalStartTimestamp, updateAnnotations, chartData]);

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

  // Ticker queries moved above to fix initialization order

  // Helper function moved above to fix initialization order

  // Chart data moved above to fix initialization order

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

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Auto-select text if there's content when focusing
    const currentValue = inputRef.current?.value || searchTerm;
    if (currentValue.trim() && inputRef.current) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.select();
        }
      }, 10);
    }
    
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
    if (!event || !chartData) return;
    
    // For horizontal annotations, we handle ANY click on the chart (even without activePayload)
    if (annotationMode === 'horizontal') {
      // Freehand horizontal line placement
      if (event.chartY !== undefined && event.chartX !== undefined) {
        // For timestamp, use middle of chart data
        const middleIndex = Math.floor(chartData.length / 2);
        const timestamp = chartData[middleIndex]?.timestamp || Date.now();
        const time = chartData[middleIndex]?.date || new Date().toISOString();
        
        // Calculate percentage from Y coordinate
        let horizontalPrice = 0;
        
        // Get Y-axis domain (percentage range) from visible data
        const visibleData = chartData.filter(d => 
          tickers.some(t => t.visible && d[`${t.symbol}_percentage`] !== undefined)
        );
        
        if (visibleData.length > 0) {
          // Calculate min/max percentages from visible data
          let minPercent = Infinity;
          let maxPercent = -Infinity;
          
          visibleData.forEach(d => {
            tickers.filter(t => t.visible).forEach(ticker => {
              const value = d[`${ticker.symbol}_percentage`];
              if (value !== undefined) {
                const numValue = typeof value === 'string' ? parseFloat(value) : value;
                minPercent = Math.min(minPercent, numValue);
                maxPercent = Math.max(maxPercent, numValue);
              }
            });
          });
          
          // Add 5% padding to match YAxis domain calculation  
          const range = maxPercent - minPercent;
          const padding = range * 0.05;
          const yAxisMin = minPercent - padding;
          const yAxisMax = maxPercent + padding;
          
          // Get chart container to calculate actual dimensions
          const chartContainer = document.querySelector('[data-testid="comparison-chart-container"] .recharts-wrapper');
          if (chartContainer) {
            const rect = chartContainer.getBoundingClientRect();
            const chartHeight = rect.height;
            const plotTop = 10; // Approximate top margin
            const plotBottom = 40; // Approximate bottom margin for axis
            const plotHeight = chartHeight - plotTop - plotBottom;
            
            // Calculate relative Y position (0 = top, 1 = bottom)
            const relativeY = Math.max(0, Math.min(1, (event.chartY - plotTop) / plotHeight));
            
            // Convert click position to percentage value (Y is inverted)
            horizontalPrice = yAxisMax - (relativeY * (yAxisMax - yAxisMin));
          }
        }
        
        // Create horizontal annotation
        const newAnnotation: Omit<Annotation, 'id' | 'text'> = {
          type: 'horizontal',
          x: 0,
          y: 0,  
          timestamp,
          price: horizontalPrice,
          time
        };
        
        setPendingAnnotation(newAnnotation);
        setShowAnnotationInput(true);
        setAnnotationInput('');
        setEditingAnnotation(null);
        setIsEditMode(false);
        return; // Exit early for horizontal annotations
      }
    }
    
    // For other annotation types, require activePayload (clicking on data points)
    if (!event.activePayload || event.activePayload.length === 0) return;
    
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
    } else if (annotationMode === 'horizontal') {
      // This case is now handled earlier in the function for freehand placement
      // This code path should not be reached for horizontal annotations
      return;
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
    if (annotation.type === 'text' || annotation.type === 'horizontal') {
      setEditingAnnotation(annotation);
      setIsEditMode(true);
      setAnnotationInput(annotation.text || '');
      setShowAnnotationInput(true);
    } else if (annotation.type === 'percentage') {
      // For percentage annotations, delete directly like Price chart (no confirmation)
      updateAnnotations?.(prev => prev.filter(a => a.id !== annotation.id));
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

  // Helper function to manually draw comparison chart to canvas (completely bypasses OKLCH and SVG issues)
  const captureFullChartAsCanvas = async (): Promise<HTMLCanvasElement> => {
    console.log('Creating manual canvas export to bypass all OKLCH and SVG issues...');

    if (chartData.length === 0) {
      throw new Error('No chart data available for export');
    }

    // Create high-resolution canvas
    const canvas = document.createElement('canvas');
    canvas.width = 2000; // High resolution width
    canvas.height = 1400; // Height for chart + legend + title
    const ctx = canvas.getContext('2d')!;
    
    // Enable high-quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Use transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Add title
    ctx.fillStyle = '#5AF5FA';
    ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
    const visibleTickers = tickers.filter(ticker => ticker.visible);
    const title = `Stock Comparison: ${visibleTickers.map(t => t.symbol).join(' vs ')}`;
    ctx.fillText(title, 60, 80);
    
    // Add date range
    ctx.fillStyle = '#F7F7F7';
    ctx.font = '36px system-ui, -apple-system, sans-serif';
    const startDate = new Date(chartData[0].date);
    const endDate = new Date(chartData[chartData.length - 1].date);
    const dateRange = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    ctx.fillText(`Date Range: ${dateRange}`, 60, 140);
    
    // Chart area
    const chartArea = { x: 120, y: 220, width: 1680, height: 800 };
    
    // Draw grid lines
    ctx.strokeStyle = 'rgba(136, 136, 136, 0.3)';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines (percentage levels)
    const ySteps = 10;
    for (let i = 0; i <= ySteps; i++) {
      const y = chartArea.y + (i * chartArea.height / ySteps);
      ctx.beginPath();
      ctx.moveTo(chartArea.x, y);
      ctx.lineTo(chartArea.x + chartArea.width, y);
      ctx.stroke();
    }
    
    // Vertical grid lines (time)
    const xSteps = 8;
    for (let i = 0; i <= xSteps; i++) {
      const x = chartArea.x + (i * chartArea.width / xSteps);
      ctx.beginPath();
      ctx.moveTo(x, chartArea.y);
      ctx.lineTo(x, chartArea.y + chartArea.height);
      ctx.stroke();
    }
    
    // Draw 0% reference line (more prominent)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    const zeroY = chartArea.y + chartArea.height / 2; // Assuming 0% is in the middle
    ctx.beginPath();
    ctx.moveTo(chartArea.x, zeroY);
    ctx.lineTo(chartArea.x + chartArea.width, zeroY);
    ctx.stroke();
    
    // Draw Y-axis labels (percentages)
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px system-ui, sans-serif';
    ctx.textAlign = 'right';
    
    // Calculate min/max percentages for scaling
    let minPercent = 0, maxPercent = 0;
    visibleTickers.forEach(ticker => {
      chartData.forEach(dataPoint => {
        const percentage = Number(dataPoint[`${ticker.symbol}_percentage`] || 0);
        minPercent = Math.min(minPercent, percentage);
        maxPercent = Math.max(maxPercent, percentage);
      });
    });
    
    // Add some padding to the range
    const range = Math.max(Math.abs(minPercent), Math.abs(maxPercent)) * 1.1;
    minPercent = -range;
    maxPercent = range;
    
    for (let i = 0; i <= ySteps; i++) {
      const percentage = maxPercent - (i * (maxPercent - minPercent) / ySteps);
      const y = chartArea.y + (i * chartArea.height / ySteps);
      ctx.fillText(`${percentage.toFixed(1)}%`, chartArea.x - 20, y + 8);
    }
    
    // Draw lines for each visible ticker using the actual TICKER_COLORS from the chart
    const colors = ['#5AF5FA', '#FFA5FF', '#AA99FF', '#FAFF50', '#50FFA5'];
    
    visibleTickers.forEach((ticker, tickerIndex) => {
      ctx.strokeStyle = colors[tickerIndex % colors.length];
      ctx.lineWidth = 4;
      ctx.beginPath();
      
      let firstPoint = true;
      chartData.forEach((dataPoint, dataIndex) => {
        const percentage = Number(dataPoint[`${ticker.symbol}_percentage`] || 0);
        
        // Calculate position
        const x = chartArea.x + (dataIndex * chartArea.width / (chartData.length - 1));
        const y = chartArea.y + chartArea.height - ((percentage - minPercent) / (maxPercent - minPercent)) * chartArea.height;
        
        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
    });
    
    // Draw X-axis labels (dates)
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    
    const labelStep = Math.max(1, Math.floor(chartData.length / 6)); // Show ~6 date labels
    for (let i = 0; i < chartData.length; i += labelStep) {
      const date = new Date(chartData[i].date);
      const x = chartArea.x + (i * chartArea.width / (chartData.length - 1));
      ctx.fillText(date.toLocaleDateString(), x, chartArea.y + chartArea.height + 40);
    }
    
    // Draw legend
    ctx.textAlign = 'left';
    ctx.font = 'bold 32px system-ui, sans-serif';
    
    let legendY = chartArea.y + chartArea.height + 100;
    let legendX = 120;
    
    visibleTickers.forEach((ticker, index) => {
      // Draw color circle using exact chart colors
      ctx.fillStyle = colors[index % colors.length];
      ctx.beginPath();
      ctx.arc(legendX + 20, legendY, 15, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw ticker symbol and percentage
      ctx.fillStyle = '#ffffff';
      const latestData = chartData[chartData.length - 1];
      const percentage = latestData ? Number(latestData[`${ticker.symbol}_percentage`] || 0) : 0;
      const percentageStr = percentage > 0 ? `+${percentage.toFixed(2)}%` : `${percentage.toFixed(2)}%`;
      const text = `${ticker.symbol} ${percentageStr}`;
      
      ctx.fillText(text, legendX + 50, legendY + 10);
      
      // Move to next position
      const textWidth = ctx.measureText(text).width;
      legendX += textWidth + 120;
      
      // Wrap to next line if needed
      if (legendX > canvas.width - 300) {
        legendX = 120;
        legendY += 60;
      }
    });
    
    console.log('Manual canvas export completed successfully');
    return canvas;
  };

  // PNG export function
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
      console.log('Creating manual canvas export to bypass all export issues...');
      const canvas = await captureFullChartAsCanvas();
      
      // Ensure minimum width for high quality
      const minWidth = 2000;
      let finalCanvas = canvas;
      
      if (canvas.width < minWidth) {
        const scale = minWidth / canvas.width;
        const scaledCanvas = document.createElement('canvas');
        const ctx = scaledCanvas.getContext('2d')!;
        scaledCanvas.width = minWidth;
        scaledCanvas.height = canvas.height * scale;
        ctx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
        finalCanvas = scaledCanvas;
      }
      
      // Convert to blob and download
      finalCanvas.toBlob((blob) => {
        if (blob) {
          const fileName = `comparison-chart-${tickers.filter(t => t.visible).map(t => t.symbol).join('-')}-${new Date().toISOString().split('T')[0]}.png`;
          saveAs(blob, fileName);
          
          toast({
            title: "Export Successful", 
            description: "PNG file with legend has been downloaded",
          });
        } else {
          throw new Error('Failed to create blob from canvas');
        }
      }, 'image/png', 1.0);
    } catch (error) {
      console.error('Comparison PNG export error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error details:', { message: errorMessage, stack: error instanceof Error ? error.stack : undefined });
      toast({
        title: "Export Failed",
        description: `Unable to export PNG file: ${errorMessage}`,
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
      
      console.log('Creating manual canvas export for PDF to bypass all export issues...');
      const canvas = await captureFullChartAsCanvas();

      // Calculate dimensions for PDF (use actual canvas dimensions for best quality)
      const imgData = canvas.toDataURL('image/png', 1.0); // Maximum quality
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      // Add the full-quality image to PDF
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      
      // Save the PDF
      const fileName = `comparison-chart-${tickers.filter(t => t.visible).map(t => t.symbol).join('-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast({
        title: "Export Successful", 
        description: "PDF file with legend has been downloaded",
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
    <div className="space-y-4" data-testid="comparison-chart-full-container">
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
              ) : debouncedQuery.trim().length >= 2 ? (
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
                  ) : debouncedQuery && !isSearchLoading ? (
                    <div className="px-4 py-3 text-center text-muted-foreground">
                      No results found for "{debouncedQuery}"
                    </div>
                  ) : null}
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
      <div className="h-[600px] w-full rounded-lg relative pt-20 bg-background" data-testid="comparison-chart-container"> {/* Increased from h-80 (320px) to h-[600px] for much larger chart */}
        
        {/* Tolerance areas for vertical line dragging - positioned as overlays outside chart */}
        {annotations.filter(annotation => annotation.type === 'text').map((annotation) => {
          const dataIndex = chartData?.findIndex((d: any) => d.timestamp === annotation.timestamp) ?? -1;
          if (dataIndex === -1 || !chartData) return null;
          
          const totalDataPoints = chartData.length - 1;
          const xPercent = totalDataPoints > 0 ? (dataIndex / totalDataPoints) * 100 : 0;
          const toleranceWidth = Math.max(2, chartData.length * 0.02) * (100 / totalDataPoints); // 2% tolerance as percentage
          
          return (
            <div
              key={`tolerance-${annotation.id}`}
              className="absolute pointer-events-none z-10"
              style={{
                left: `${Math.max(0, xPercent - toleranceWidth/2)}%`,
                width: `${Math.min(toleranceWidth, 100 - Math.max(0, xPercent - toleranceWidth/2))}%`,
                top: '80px', // Start below annotation text area
                height: 'calc(100% - 140px)', // Cover chart area
                backgroundColor: 'rgba(250, 255, 80, 0.1)', // Very pale yellow
                borderLeft: '1px solid rgba(250, 255, 80, 0.3)',
                borderRight: '1px solid rgba(250, 255, 80, 0.3)'
              }}
              title="Click and drag to move vertical line horizontally"
            />
          );
        })}
        
        {/* Annotation Labels - positioned in reserved padding space above charts */}
        {annotations.length > 0 && (
          <div className="absolute top-0 left-0 w-full h-20 pointer-events-none">
            {annotations.map((annotation) => {
              if (annotation.type === 'text') {
                // Text annotations - display at single point
                const dataIndex = chartData?.findIndex((d: any) => d.timestamp === annotation.timestamp) ?? -1;
                if (dataIndex === -1) return null;
                
                const totalDataPoints = (chartData?.length ?? 1) - 1;
                const xPercent = totalDataPoints > 0 ? (dataIndex / totalDataPoints) * 100 : 0;
                
                return (
                  <div
                    key={annotation.id}
                    className="absolute"
                    style={{ 
                      left: `${xPercent}%`, 
                      top: '20px', 
                      transform: `translateX(calc(-50% + ${annotation.horizontalOffset || 0}px))`
                    }}
                  >
                    <div 
                      className="bg-background border border-border rounded px-2 py-1 text-xs max-w-48 pointer-events-auto cursor-grab hover:bg-muted shadow-lg select-none"
                      onMouseDown={(e) => handleTextMouseDown(e, annotation)}
                      onDoubleClick={() => handleAnnotationDoubleClick(annotation)}
                      title="Click and drag to move horizontally, double-click to delete"
                    >
                      <div className="font-medium" style={{ color: '#FAFF50' }}>{formatTime(annotation.time, timeframe)}</div>
                      <div className="text-muted-foreground">{annotation.price?.toFixed(2)}%</div>
                      <div className="text-foreground mt-1">{annotation.text || ''}</div>
                    </div>
                  </div>
                );
              } else if (annotation.type === 'horizontal') {
                // Horizontal annotations - display at single point
                const dataIndex = chartData?.findIndex((d: any) => d.timestamp === annotation.timestamp) ?? -1;
                if (dataIndex === -1) return null;
                
                const totalDataPoints = (chartData?.length ?? 1) - 1;
                const xPercent = totalDataPoints > 0 ? (dataIndex / totalDataPoints) * 100 : 0;
                
                return (
                  <div
                    key={annotation.id}
                    className="absolute"
                    style={{ 
                      left: `${xPercent}%`, 
                      top: '20px', 
                      transform: `translateX(calc(-50% + ${annotation.horizontalOffset || 0}px))`
                    }}
                  >
                    <div 
                      className="bg-background border border-border rounded px-2 py-1 text-xs max-w-48 pointer-events-auto cursor-grab hover:bg-muted shadow-lg select-none"
                      onMouseDown={(e) => handleTextMouseDown(e, annotation)}
                      onDoubleClick={() => handleAnnotationDoubleClick(annotation)}
                      title="Click and drag to move horizontally, double-click to delete"
                    >
                      <div className="font-medium" style={{ color: '#AA99FF' }}>{formatTime(annotation.time, timeframe)}</div>
                      <div className="text-muted-foreground">{annotation.price?.toFixed(2)}%</div>
                      <div className="text-foreground mt-1">{annotation.text || ''}</div>
                    </div>
                  </div>
                );
              } else if (annotation.type === 'percentage' && annotation.startTimestamp && annotation.endTimestamp) {
                // Percentage measurements - display at midpoint
                const startIndex = chartData?.findIndex((d: any) => d.timestamp === annotation.startTimestamp) ?? -1;
                const endIndex = chartData?.findIndex((d: any) => d.timestamp === annotation.endTimestamp) ?? -1;
                if (startIndex === -1 || endIndex === -1) return null;
                
                const totalDataPoints = (chartData?.length ?? 1) - 1;
                const startPercent = totalDataPoints > 0 ? (startIndex / totalDataPoints) * 100 : 0;
                const endPercent = totalDataPoints > 0 ? (endIndex / totalDataPoints) * 100 : 0;
                const midPercent = (startPercent + endPercent) / 2;
                
                const isPositive = (annotation.percentage || 0) >= 0;
                
                return (
                  <div
                    key={annotation.id}
                    className="absolute"
                    style={{ left: `${midPercent}%`, top: '20px', transform: 'translateX(-50%)' }}
                  >
                    <div 
                      className="bg-background border border-white/30 rounded px-2 py-1 text-xs pointer-events-auto shadow-lg cursor-pointer hover:bg-muted"
                      onDoubleClick={() => handleAnnotationDoubleClick(annotation)}
                      title="Double-click to delete"
                    >
                      <div className={`font-bold text-center ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {isPositive ? '↗' : '↘'} {(annotation.percentage || 0).toFixed(2)}%
                      </div>
                      <div className="text-xs text-muted-foreground text-center">
                        {(annotation.startPrice || 0).toFixed(2)}% → {(annotation.endPrice || 0).toFixed(2)}%
                      </div>
                      {annotation.startTime && annotation.endTime && (
                        <div className="text-[10px] text-muted-foreground text-center mt-1">
                          {formatTime(annotation.startTime, timeframe)} → {formatTime(annotation.endTime, timeframe)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}

        {/* Interactive overlay elements for horizontal lines - USING REAL RECHARTS GEOMETRY */}
        {chartData?.length > 0 && layoutRef.current && annotations.filter(annotation => annotation.type === 'horizontal').map((annotation) => {
          const { offset, yScale } = layoutRef.current!;
          
          // Use Recharts' exact positioning + 85px offset correction
          const yPixels = yScale(annotation.price) + 85; // Add 85px to align with visual line (moved up 5px)
          const tolerancePx = 12; // Pixel-based tolerance
          
          // Safety check for valid position
          if (isNaN(yPixels) || !offset) return null;
          
          return (
            <div
              key={`interactive-${annotation.id}-${annotation.price}`}
              className="absolute pointer-events-auto cursor-grab active:cursor-grabbing hover:opacity-80"
              style={{ 
                left: `${offset.left}px`, // Real chart left
                width: `${offset.width}px`, // Real chart width
                top: `${yPixels - tolerancePx/2}px`, // Centered on actual line position
                height: `${tolerancePx}px`, // Pixel-based hit area
                zIndex: 20,
                backgroundColor: 'transparent', // Invisible tolerance area
                border: 'none'
              }}
              onMouseDown={(e) => {
                console.log('✅ COMPARISON: Mouse down on horizontal line:', annotation.id, 'at price:', annotation.price, 'yPixels:', yPixels);
                setIsDragging(true);
                setDragAnnotationId(annotation.id);
                setDragStartY(e.clientY);
                setDragStartPrice(annotation.price);
                e.preventDefault();
                e.stopPropagation();
              }}
              onDoubleClick={() => handleAnnotationDoubleClick(annotation)}
              title={`Click and drag to move horizontal line (${annotation.price.toFixed(2)}%)`}
              data-testid={`horizontal-line-drag-${annotation.id}`}
            />
          );
        })}
        
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
          <ChartContainer 
            config={chartConfig} 
            className="h-full w-full"
          >
            <div 
              ref={chartContainerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              style={{ cursor: isDragging ? 'grabbing' : 'default' }}
              className="h-full w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={chartData} 
                  margin={{ left: 22, right: 22, top: 10, bottom: 0 }}
                  onClick={handleChartClick}
                  style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#3B3B3B" strokeOpacity={0.5} />
                <XAxis 
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#888' }}
                  tickLine={{ stroke: '#888' }}
                  axisLine={{ stroke: '#888' }}
                />
                <YAxis 
                  orientation="right"
                  tick={{ fontSize: 12, fill: '#888' }}
                  tickLine={{ stroke: '#888' }}
                  axisLine={{ stroke: '#888' }}
                  domain={[(dataMin: any) => Math.floor(Number(dataMin) - 5), (dataMax: any) => Math.ceil(Number(dataMax) + 5)]}
                  tickFormatter={(value) => `${value > 0 ? '+' : ''}${Number(value).toFixed(1)}%`}
                />
                <Tooltip 
                  content={<CustomTooltip />} 
                  active={!isDragging}
                  allowEscapeViewBox={{ x: false, y: false }}
                />
                
                {/* Zero reference line */}
                <ReferenceLine y={0} stroke="white" strokeWidth={1} />

                {/* Geometry probe to capture Recharts internals */}
                <Customized component={(props: any) => {
                  const { offset, yAxisMap } = props;
                  if (offset && yAxisMap) {
                    const yAxis = yAxisMap?.yAxisId || yAxisMap?.['0'] || Object.values(yAxisMap || {})[0];
                    if (yAxis?.scale && typeof yAxis.scale === 'function') {
                      // Update layout ref with real chart geometry
                      layoutRef.current = { offset, yScale: yAxis.scale };
                    }
                  }
                  return null; // Don't render anything
                }} />
                
                {/* Text Annotation Reference Lines - yellow vertical lines */}
                {annotations.filter(annotation => annotation.type === 'text').map((annotation) => {
                  // Find the actual date value from chart data that matches this annotation
                  const dataPoint = chartData?.find((d: any) => d.timestamp === annotation.timestamp);
                  return dataPoint ? (
                    <ReferenceLine 
                      key={annotation.id}
                      x={dataPoint.date}
                      stroke="#FAFF50"
                      strokeWidth={1}
                      vectorEffect="non-scaling-stroke"
                      shapeRendering="crispEdges"
                    />
                  ) : null;
                })}
                
                {/* Tolerance areas moved outside chart to prevent coordinate system interference */}

                {/* Horizontal Annotation Reference Lines - purple styling */}
                {annotations.filter(annotation => annotation.type === 'horizontal').map((annotation) => {
                  const isBeingDragged = isDragging && dragAnnotationId === annotation.id;
                  const lineColor = isBeingDragged ? "#7755CC" : "#AA99FF"; // Darker purple when dragging
                  return (
                    <ReferenceLine 
                      key={annotation.id}
                      y={annotation.price}
                      stroke={lineColor}
                      strokeWidth={isBeingDragged ? 3 : 2}
                      vectorEffect="non-scaling-stroke"
                      shapeRendering="crispEdges"
                    />
                  );
                })}


                {/* Percentage Measurement Lines - diagonal arrows */}
                {chartData && chartData.length > 0 && annotations.filter(annotation => annotation.type === 'percentage' && annotation.startTimestamp && annotation.endTimestamp).map((annotation) => {
                  const startDataPoint = chartData?.find((d: any) => d.timestamp === annotation.startTimestamp);
                  const endDataPoint = chartData?.find((d: any) => d.timestamp === annotation.endTimestamp);
                  
                  // Enhanced validation to prevent coordinate system errors
                  if (!startDataPoint || !endDataPoint || 
                      !startDataPoint.date || !endDataPoint.date ||
                      typeof annotation.startPrice !== 'number' || 
                      typeof annotation.endPrice !== 'number') {
                    return null;
                  }
                  
                  const isPositive = (annotation.percentage || 0) >= 0;
                  const lineColor = isPositive ? '#22C55E' : '#EF4444'; // Green for positive, red for negative
                  
                  return (
                    <g key={annotation.id}>
                      {/* Main diagonal line */}
                      <ReferenceLine 
                        segment={[
                          { x: startDataPoint.date, y: annotation.startPrice },
                          { x: endDataPoint.date, y: annotation.endPrice }
                        ]}
                        stroke={lineColor}
                        strokeWidth={2}
                        vectorEffect="non-scaling-stroke"
                      />
                      
                      {/* Start point circle - only render when data is valid */}
                      <ReferenceDot 
                        x={startDataPoint.date}
                        y={annotation.startPrice}
                        r={4}
                        fill={lineColor}
                        stroke={lineColor}
                        strokeWidth={1}
                      />
                      
                      {/* End point circle - only render when data is valid */}
                      <ReferenceDot 
                        x={endDataPoint.date}
                        y={annotation.endPrice}
                        r={4}
                        fill={lineColor}
                        stroke={lineColor}
                        strokeWidth={1}
                      />
                    </g>
                  );
                })}
                
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
            </div>
          </ChartContainer>
        )}
      </div>

      {/* Color-coded Legend with Percentage Changes */}
      {tickers.length > 0 && chartData.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap gap-4 justify-center">
            {tickers.map((ticker) => {
              // Calculate total percentage change over the time period
              const firstDataPoint = chartData[0];
              const lastDataPoint = chartData[chartData.length - 1];
              const startPercentage = Number(firstDataPoint?.[`${ticker.symbol}_percentage`]) || 0;
              const endPercentage = Number(lastDataPoint?.[`${ticker.symbol}_percentage`]) || 0;
              const totalChange = endPercentage - startPercentage;
              
              return (
                <div 
                  key={ticker.symbol}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-opacity cursor-pointer",
                    ticker.visible ? "bg-card/50" : "bg-card/20 opacity-50"
                  )}
                  onClick={() => toggleTickerVisibility(ticker.symbol)}
                >
                  <div 
                    className="w-3 h-3 rounded-full border border-border/50"
                    style={{ backgroundColor: ticker.color }}
                  />
                  <span className="text-sm font-medium">
                    {ticker.symbol}
                  </span>
                  <span 
                    className={cn(
                      "text-sm font-medium",
                      totalChange >= 0 ? "text-green-400" : "text-red-400"
                    )}
                  >
                    {totalChange >= 0 ? '+' : ''}{totalChange.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
          <div className="text-xs text-muted-foreground text-center">
            Showing percentage change from {timeframe} starting point • Click legend items to toggle visibility
          </div>
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