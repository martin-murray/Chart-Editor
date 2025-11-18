import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, Customized } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip as HoverTooltip, TooltipContent as HoverTooltipContent, TooltipProvider, TooltipTrigger as HoverTooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, TrendingUp, TrendingDown, Plus, Calendar as CalendarIcon, X, Download, ChevronDown, MessageSquare, Ruler, Minus, RotateCcw, Code, Type, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { format, subDays, subMonths, subYears } from 'date-fns';
import * as htmlToImage from 'html-to-image';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';
import { ComparisonChart } from './comparison-chart';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { ChartHistory } from '@shared/schema';

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

interface Annotation {
  id: string;
  type: 'text' | 'percentage' | 'horizontal' | 'note';
  x: number; // X coordinate on chart
  y: number; // Y coordinate on chart
  timestamp: number; // Data point timestamp
  price: number; // Price at this point
  text?: string; // User annotation text (for text, horizontal, and note types)
  time: string; // Formatted time string
  horizontalOffset?: number; // Custom horizontal position offset in pixels for dragging
  verticalOffset?: number; // Custom vertical position offset in pixels for dragging
  // For percentage measurements
  startTimestamp?: number;
  startPrice?: number;
  startTime?: string;
  endTimestamp?: number;
  endPrice?: number;
  endTime?: string;
  percentage?: number;
}

interface PriceChartProps {
  symbol: string;
  name: string;
  currentPrice: string;
  percentChange: string;
  marketCap: string;
  annotations?: Annotation[];
  onAnnotationsChange?: (annotations: Annotation[]) => void;
  rememberPerTicker?: boolean;
  onClearAll?: () => void;
  initialTab?: 'price-volume' | 'comparison';
  onHistorySelect?: (entry: ChartHistory) => void;
  pendingHistoryRestore?: ChartHistory | null;
  onHistoryRestoreComplete?: () => void;
}

const timeframes = [
  { label: '1D', value: '1D' },
  { label: '5D', value: '5D' },
  { label: '2W', value: '2W' },
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '1Y', value: '1Y' },
  { label: '3Y', value: '3Y' },
  { label: '5Y', value: '5Y' },
  { label: 'Custom', value: 'Custom' }
];

export function PriceChart({ 
  symbol, 
  name, 
  currentPrice,
  initialTab = 'price-volume', 
  percentChange, 
  marketCap,
  annotations: controlledAnnotations,
  onAnnotationsChange,
  rememberPerTicker = true,
  onClearAll,
  onHistorySelect,
  pendingHistoryRestore,
  onHistoryRestoreComplete
}: PriceChartProps) {
  const { toast } = useToast();
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [singleTradingDay, setSingleTradingDay] = useState(false);
  const [startCalendarMonth, setStartCalendarMonth] = useState<Date>(new Date());
  const [endCalendarMonth, setEndCalendarMonth] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState(initialTab);
  const [chartType, setChartType] = useState<'line' | 'mountain' | 'candlestick'>('mountain');
  const [showDividendOverlay, setShowDividendOverlay] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const comparisonRef = useRef<HTMLDivElement>(null);
  
  // Sync activeTab with initialTab prop changes (e.g., from walkthrough navigation)
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  
  // Refs to store comparison chart zoom functions
  const comparisonZoomInRef = useRef<(() => void) | null>(null);
  const comparisonZoomOutRef = useRef<(() => void) | null>(null);
  const comparisonFitToDataRef = useRef<(() => void) | null>(null);

  // Clear comparison zoom refs when switching away from comparison tab
  useEffect(() => {
    if (activeTab !== 'comparison') {
      comparisonZoomInRef.current = null;
      comparisonZoomOutRef.current = null;
      comparisonFitToDataRef.current = null;
    }
  }, [activeTab]);
  
  // Annotation state - controlled if parent provides annotations
  const [internalAnnotations, setInternalAnnotations] = useState<Annotation[]>([]);
  const [showAnnotationInput, setShowAnnotationInput] = useState(false);
  const [annotationInput, setAnnotationInput] = useState('');
  const [pendingAnnotation, setPendingAnnotation] = useState<Omit<Annotation, 'id' | 'text'> | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Percentage measurement state
  const [annotationMode, setAnnotationMode] = useState<'text' | 'percentage' | 'horizontal' | 'note'>('text');
  const [pendingPercentageStart, setPendingPercentageStart] = useState<{
    timestamp: number;
    price: number;
    time: string;
  } | null>(null);

  // CSV Overlay state
  const [csvOverlay, setCsvOverlay] = useState<{timestamp: number, value: number}[]>([]);
  const [showCsvModal, setShowCsvModal] = useState(false);

  // Price Y-axis zoom state
  const [priceAxisMode, setPriceAxisMode] = useState<'auto' | 'fixed'>('auto');
  const [priceAxisRange, setPriceAxisRange] = useState<number>(100); // Current zoom range in price units
  const [yAxisDisplayMode, setYAxisDisplayMode] = useState<'price' | 'percentage'>('price');
  
  // Predefined zoom levels for price scaling (percentage of current price range)
  const priceZoomLevels = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 7.5, 10.0];


  
  // Drag state for horizontal lines
  const [isDragging, setIsDragging] = useState(false);
  const [dragAnnotationId, setDragAnnotationId] = useState<string | null>(null);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartPrice, setDragStartPrice] = useState(0);
  
  // Text annotation 2D drag state
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [dragTextAnnotationId, setDragTextAnnotationId] = useState<string | null>(null);
  const [dragTextStartX, setDragTextStartX] = useState(0);
  const [dragTextStartY, setDragTextStartY] = useState(0);
  const [dragStartOffset, setDragStartOffset] = useState(0);
  const [dragStartVerticalOffset, setDragStartVerticalOffset] = useState(0);
  
  // Vertical line horizontal drag state
  const [isDraggingVertical, setIsDraggingVertical] = useState(false);
  const [dragVerticalAnnotationId, setDragVerticalAnnotationId] = useState<string | null>(null);
  const [dragVerticalStartX, setDragVerticalStartX] = useState(0);
  const [dragVerticalStartTimestamp, setDragVerticalStartTimestamp] = useState(0);
  
  // Use controlled annotations if provided, otherwise use internal state
  const annotations = controlledAnnotations || internalAnnotations;
  
  // Hover tool toggle state
  const [showHoverTooltip, setShowHoverTooltip] = useState(true);
  
  // Session ID tracking - regenerates when symbol changes
  const [chartSessionId, setChartSessionId] = useState<string>(() => crypto.randomUUID());
  
  // Helper function to update annotations in both controlled and uncontrolled modes
  const updateAnnotations = (newAnnotations: Annotation[] | ((prev: Annotation[]) => Annotation[])) => {
    if (onAnnotationsChange) {
      // Controlled mode - resolve function to actual array
      const resolvedAnnotations = typeof newAnnotations === 'function' 
        ? newAnnotations(annotations)
        : newAnnotations;
      onAnnotationsChange(resolvedAnnotations);
    } else {
      // Uncontrolled mode - use internal state setter
      setInternalAnnotations(newAnnotations);
    }
  };

  // Track last saved state (all fields, not just annotations) to prevent duplicate saves
  const lastSavedStateRef = useRef<string | null>(null);
  const isInitialMountRef = useRef(true);

  // Mutation to save chart history
  const saveChartHistoryMutation = useMutation({
    mutationFn: async ({ 
      sessionId, 
      symbol, 
      timeframe, 
      customStartDate, 
      customEndDate, 
      dividendAdjusted, 
      csvOverlay, 
      annotations 
    }: { 
      sessionId: string;
      symbol: string; 
      timeframe: string;
      customStartDate?: string;
      customEndDate?: string;
      dividendAdjusted: boolean;
      csvOverlay: { timestamp: number; value: number }[];
      annotations: Annotation[] 
    }) => {
      await apiRequest('POST', '/api/chart-history', { 
        sessionId,
        symbol, 
        timeframe,
        customStartDate,
        customEndDate,
        dividendAdjusted,
        csvOverlay,
        annotations 
      });
    },
    onSuccess: () => {
      // Invalidate chart history query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/chart-history'] });
    },
    onError: (error) => {
      // Handle errors gracefully - log to console only, don't show toast
      console.error('Failed to save chart history:', error);
    },
  });

  // Delete individual chart history entry
  const deleteChartHistoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/chart-history/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chart-history'] });
      toast({
        title: "Chart Deleted",
        description: "Chart history entry removed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete chart history entry",
        variant: "destructive",
      });
      console.error('Failed to delete chart history:', error);
    },
  });

  // Delete all chart history entries
  const deleteAllChartHistoryMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', '/api/chart-history', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chart-history'] });
      toast({
        title: "All Charts Deleted",
        description: "All chart history entries have been removed",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete chart history",
        variant: "destructive",
      });
      console.error('Failed to delete all chart history:', error);
    },
  });

  // Auto-save full chart state with debouncing
  useEffect(() => {
    // Skip on initial mount (don't save pre-loaded state)
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      const initialState = JSON.stringify({
        timeframe: selectedTimeframe,
        customStartDate: startDate?.toISOString(),
        customEndDate: endDate?.toISOString(),
        dividendAdjusted: showDividendOverlay,
        csvOverlay,
        annotations
      });
      lastSavedStateRef.current = initialState;
      return;
    }

    // Only save when annotations exist
    if (annotations.length === 0) {
      lastSavedStateRef.current = null;
      return;
    }

    // Check if any state actually changed since last save
    const currentState = JSON.stringify({
      timeframe: selectedTimeframe,
      customStartDate: startDate?.toISOString(),
      customEndDate: endDate?.toISOString(),
      dividendAdjusted: showDividendOverlay,
      csvOverlay,
      annotations
    });
    
    if (currentState === lastSavedStateRef.current) {
      return; // No changes, skip save
    }

    // Debounce the save operation (2000ms delay)
    const timeoutId = setTimeout(() => {
      saveChartHistoryMutation.mutate({ 
        sessionId: chartSessionId,
        symbol, 
        timeframe: selectedTimeframe,
        customStartDate: selectedTimeframe === 'Custom' && startDate ? startDate.toISOString() : undefined,
        customEndDate: selectedTimeframe === 'Custom' && endDate ? endDate.toISOString() : undefined,
        dividendAdjusted: showDividendOverlay,
        csvOverlay,
        annotations 
      });
      lastSavedStateRef.current = currentState;
    }, 2000);

    // Clear timeout on new changes to avoid multiple saves
    return () => {
      clearTimeout(timeoutId);
    };
  }, [annotations, selectedTimeframe, startDate, endDate, showDividendOverlay, csvOverlay, symbol, chartSessionId, saveChartHistoryMutation]);

  // Reset initial mount flag when symbol changes
  useEffect(() => {
    isInitialMountRef.current = true;
    lastSavedStateRef.current = null;
  }, [symbol]);

  // Use symbol as sessionId to prevent duplicates when switching back to the same ticker
  useEffect(() => {
    setChartSessionId(symbol);
  }, [symbol]);

  const handleMouseDown = (event: React.MouseEvent) => {
    if (!chartRef.current) return;
    if (!chartData?.data) return;
    
    const rect = chartRef.current.getBoundingClientRect();
    const mouseY = event.clientY - rect.top;
    
    const chartHeight = rect.height - 120;
    const chartTop = 60;
    const relativeY = mouseY - chartTop;
    
    const prices = chartData.data.flatMap(d => [d.high, d.low, d.open, d.close]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const priceAtMouse = maxPrice - (relativeY / chartHeight) * priceRange;
    
    let closestHorizontalAnnotation: Annotation | null = null;
    let closestHorizontalDistance = Infinity;
    
    annotations.forEach(annotation => {
      if (annotation.type === 'horizontal' && 'price' in annotation) {
        const distance = Math.abs(annotation.price - priceAtMouse);
        const toleranceInPrice = priceRange * 0.005;
        if (distance < closestHorizontalDistance && distance < toleranceInPrice) {
          closestHorizontalDistance = distance;
          closestHorizontalAnnotation = annotation;
        }
      }
    });
    
    let closestVerticalAnnotation: Annotation | null = null;
    let closestVerticalDistance = Infinity;
    
    const mouseX = event.clientX - rect.left;
    const chartWidth = rect.width - 120;
    const chartLeft = 60;
    const relativeX = mouseX - chartLeft;
    const xPercent = relativeX / chartWidth;
    const estimatedDataIndex = Math.round(xPercent * (chartData.data.length - 1));
    
    annotations.forEach(annotation => {
      if (annotation.type === 'text' && 'timestamp' in annotation) {
        const actualDataIndex = chartData.data.findIndex(d => d.timestamp === annotation.timestamp);
        if (actualDataIndex !== -1) {
          const distance = Math.abs(actualDataIndex - estimatedDataIndex);
          const toleranceInDataPoints = Math.max(2, chartData.data.length * 0.02);
          if (distance < closestVerticalDistance && distance < toleranceInDataPoints) {
            closestVerticalDistance = distance;
            closestVerticalAnnotation = annotation;
          }
        }
      }
    });
    
    if (closestHorizontalAnnotation && (!closestVerticalAnnotation || closestHorizontalDistance < closestVerticalDistance * 0.5)) {
      const horizontalAnnotation = closestHorizontalAnnotation as Annotation & { price: number };
      setIsDragging(true);
      setDragAnnotationId(horizontalAnnotation.id);
      setDragStartY(mouseY);
      setDragStartPrice(horizontalAnnotation.price);
      event.preventDefault();
      event.stopPropagation();
    } else if (closestVerticalAnnotation) {
      const verticalAnnotation = closestVerticalAnnotation as Annotation & { timestamp: number };
      setIsDraggingVertical(true);
      setDragVerticalAnnotationId(verticalAnnotation.id);
      setDragVerticalStartX(event.clientX);
      setDragVerticalStartTimestamp(verticalAnnotation.timestamp);
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging || !dragAnnotationId || !chartRef.current || !chartData?.data) return;
    
    const rect = chartRef.current.getBoundingClientRect();
    const mouseY = event.clientY - rect.top;
    const deltaY = mouseY - dragStartY;
    
    // Convert pixel delta to price delta
    const chartHeight = rect.height - 120;
    const prices = chartData.data.flatMap(d => [d.high, d.low, d.open, d.close]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const priceDelta = -(deltaY / chartHeight) * priceRange; // Negative because Y increases downward
    const newPrice = dragStartPrice + priceDelta;
    
    // Update the annotation
    updateAnnotations(prev => prev.map(ann => 
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

  const handleVerticalMouseUp = () => {
    if (isDraggingVertical) {
      setIsDraggingVertical(false);
      setDragVerticalAnnotationId(null);
      setDragVerticalStartX(0);
      setDragVerticalStartTimestamp(0);
    }
  };

  // Text annotation drag handlers
  const handleTextMouseDown = (e: React.MouseEvent, annotation: Annotation) => {
    setIsDraggingText(true);
    setDragTextAnnotationId(annotation.id);
    setDragTextStartX(e.clientX);
    setDragTextStartY(e.clientY);
    setDragStartOffset(annotation.horizontalOffset || 0);
    setDragStartVerticalOffset(annotation.verticalOffset || 0);
    e.preventDefault();
    e.stopPropagation();
  };

  const handleTextMouseUp = () => {
    if (isDraggingText) {
      setIsDraggingText(false);
      setDragTextAnnotationId(null);
      setDragTextStartX(0);
      setDragTextStartY(0);
      setDragStartOffset(0);
      setDragStartVerticalOffset(0);
    }
  };



  // Chart data query - must be declared before useEffect that depends on it
  // Stock Details Query for Exchange and Currency Info
  const { data: stockDetails } = useQuery({
    queryKey: ['/api/stocks', symbol, 'details'],
    queryFn: async () => {
      const response = await fetch(`/api/stocks/${symbol}/details`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!symbol,
    staleTime: 300000, // 5 minutes
  });

  const { data: chartData, isLoading, error } = useQuery({
    queryKey: [
      '/api/stocks', 
      symbol, 
      'chart', 
      selectedTimeframe, 
      startDate?.toISOString(), 
      endDate?.toISOString(), 
      singleTradingDay
    ],
    queryFn: async (): Promise<ChartResponse> => {
      let url = `/api/stocks/${symbol}/chart?timeframe=${selectedTimeframe}`;
      if (selectedTimeframe === 'Custom' && startDate && endDate) {
        let fromTimestamp: number;
        let toTimestamp: number;
        
        if (singleTradingDay || startDate.toDateString() === endDate.toDateString()) {
          // Single trading day - use full day range to support global markets
          // Don't restrict to US market hours - let Finnhub return whatever intraday data exists
          const tradingDay = startDate;
          
          // Use start and end of the selected day in UTC
          // This allows each market's natural trading hours to show through
          const dayStart = new Date(tradingDay.getFullYear(), tradingDay.getMonth(), tradingDay.getDate(), 0, 0, 0, 0);
          const dayEnd = new Date(tradingDay.getFullYear(), tradingDay.getMonth(), tradingDay.getDate(), 23, 59, 59, 999);
          
          fromTimestamp = Math.floor(dayStart.getTime() / 1000);
          toTimestamp = Math.floor(dayEnd.getTime() / 1000);
        } else {
          // Date range - use full days, ensuring we capture the entire selected dates
          // Create new dates at midnight local time to avoid timezone issues
          const rangeStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);
          const rangeEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
          
          fromTimestamp = Math.floor(rangeStart.getTime() / 1000);
          toTimestamp = Math.floor(rangeEnd.getTime() / 1000);
        }
        
        url = `/api/stocks/${symbol}/chart?from=${fromTimestamp}&to=${toTimestamp}&timeframe=Custom`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      
      // Debug logging for Single Trading Day
      if (selectedTimeframe === 'Custom' && singleTradingDay) {
        console.log('🔍 Single Trading Day API response:', {
          symbol,
          url,
          dataLength: data?.data?.length || 0,
          hasData: Boolean(data?.data?.length),
          timeframe: data?.timeframe,
          response: data
        });
      }
      
      // Ensure we have valid data structure
      if (!data || !data.data) {
        throw new Error('Invalid response format');
      }
      
      return data;
    },
    enabled: !!symbol && (selectedTimeframe !== 'Custom' || (!!startDate && !!endDate)),
    staleTime: 30000, // Consider data fresh for 30 seconds
    retry: (failureCount, error) => {
      // Don't retry if it's a clear 404 or data structure issue
      if (error?.message?.includes('404') || error?.message?.includes('Invalid response format')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  React.useEffect(() => {
    if (isDragging || isDraggingText || isDraggingVertical) {
      const handleGlobalMouseUp = () => {
        handleMouseUp();
        handleTextMouseUp();
        handleVerticalMouseUp();
      };
      
      const handleGlobalMouseMove = (event: MouseEvent) => {
        if (isDragging && dragAnnotationId && chartData?.data) {
          const deltaY = event.clientY - dragStartY;
          const prices = chartData.data.flatMap(d => [d.high, d.low, d.open, d.close]);
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          const priceRange = maxPrice - minPrice;
          
          const chartHeight = 320;
          const priceDelta = (deltaY / chartHeight) * priceRange;
          const newPrice = dragStartPrice - priceDelta;
          
          updateAnnotations(prev => prev.map(ann => 
            ann.id === dragAnnotationId 
              ? { ...ann, price: newPrice }
              : ann
          ));
        }
        
        // Handle text annotation 2D dragging
        if (isDraggingText && dragTextAnnotationId) {
          const deltaX = event.clientX - dragTextStartX;
          const deltaY = event.clientY - dragTextStartY;
          const newHorizontalOffset = dragStartOffset + deltaX;
          const newVerticalOffset = dragStartVerticalOffset + deltaY;
          
          // Update the annotation's horizontal and vertical offsets
          updateAnnotations(prev => prev.map(ann => 
            ann.id === dragTextAnnotationId 
              ? { ...ann, horizontalOffset: newHorizontalOffset, verticalOffset: newVerticalOffset }
              : ann
          ));
        }
        
        // Handle vertical line horizontal dragging
        if (isDraggingVertical && dragVerticalAnnotationId && chartData?.data) {
          const deltaX = event.clientX - dragVerticalStartX;
          
          // Calculate new timestamp based on horizontal movement
          const chartWidth = 800; // Approximate chart width
          const dataLength = chartData.data.length;
          const pixelsPerDataPoint = chartWidth / (dataLength - 1);
          const dataPointDelta = Math.round(deltaX / pixelsPerDataPoint);
          
          // Find current annotation's data index
          const currentIndex = chartData.data.findIndex(d => d.timestamp === dragVerticalStartTimestamp);
          if (currentIndex !== -1) {
            const newIndex = Math.max(0, Math.min(dataLength - 1, currentIndex + dataPointDelta));
            const newDataPoint = chartData.data[newIndex];
            
            if (newDataPoint) {
              // Update the annotation with new timestamp and time
              updateAnnotations(prev => prev.map(ann => 
                ann.id === dragVerticalAnnotationId 
                  ? { 
                      ...ann, 
                      timestamp: newDataPoint.timestamp,
                      time: new Date(newDataPoint.timestamp).toLocaleTimeString('en-US', {
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
  }, [isDragging, dragAnnotationId, dragStartY, dragStartPrice, isDraggingText, dragTextAnnotationId, dragTextStartX, dragTextStartY, dragStartOffset, dragStartVerticalOffset, isDraggingVertical, dragVerticalAnnotationId, dragVerticalStartX, dragVerticalStartTimestamp, updateAnnotations, chartData]);
  
  // Earnings modal state
  const [earningsModal, setEarningsModal] = useState<{
    visible: boolean;
    data: any;
  }>({ visible: false, data: null });

  // Earnings data state
  const { data: earningsData } = useQuery({
    queryKey: ['/api/stocks', symbol, 'earnings'],
    queryFn: async (): Promise<{ symbol: string; earnings: any[] }> => {
      const response = await fetch(`/api/stocks/${symbol}/earnings`);
      if (!response.ok) throw new Error('Failed to fetch earnings data');
      return await response.json();
    },
    enabled: !!symbol
  });

  // Calculate timestamp range for dividend query
  const dividendTimeRange = useMemo(() => {
    if (!chartData?.data || chartData.data.length === 0) {
      return { from: undefined, to: undefined };
    }
    
    // Get the timestamp range from chart data
    const firstTimestamp = chartData.data[0].timestamp;
    const lastTimestamp = chartData.data[chartData.data.length - 1].timestamp;
    
    // Check if timestamps are in seconds or milliseconds
    const isSeconds = firstTimestamp < 10000000000;
    
    // Add some buffer for dividends (30 days before to ensure we capture all relevant dividends)
    const bufferSeconds = 30 * 24 * 60 * 60; // 30 days in seconds
    const bufferAmount = isSeconds ? bufferSeconds : bufferSeconds * 1000; // Adjust for milliseconds
    const from = firstTimestamp - bufferAmount;
    const to = lastTimestamp;
    
    // Convert to seconds for API if timestamps are in milliseconds
    const apiFrom = isSeconds ? from : Math.floor(from / 1000);
    const apiTo = isSeconds ? to : Math.floor(to / 1000);
    
    return { from: apiFrom, to: apiTo };
  }, [chartData]);

  // Dividend data query - only fetch when overlay is enabled and we have chart data
  const { data: dividendData } = useQuery({
    queryKey: ['/api/stocks', symbol, 'dividends', dividendTimeRange.from, dividendTimeRange.to],
    queryFn: async (): Promise<{ symbol: string; dividends: Array<{ date: string; amount: number; currency: string }>; count: number }> => {
      const params = new URLSearchParams();
      if (dividendTimeRange.from) params.append('from', dividendTimeRange.from.toString());
      if (dividendTimeRange.to) params.append('to', dividendTimeRange.to.toString());
      
      const response = await fetch(`/api/stocks/${symbol}/dividends?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch dividend data');
      return await response.json();
    },
    enabled: !!symbol && showDividendOverlay && !!dividendTimeRange.from && !!dividendTimeRange.to,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });

  // Chart data query moved above to fix initialization order

  // Fetch chart history (all tickers - user can see their entire history)
  const { data: chartHistory = [] } = useQuery<ChartHistory[]>({
    queryKey: ['/api/chart-history'],
    queryFn: async () => {
      const response = await fetch('/api/chart-history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch chart history');
      return await response.json();
    },
  });

  // Function to restore chart state from history
  const restoreFromHistory = (entry: ChartHistory) => {
    // If ticker is different and parent provided a callback, let parent handle ticker switching
    if (entry.symbol !== symbol && onHistorySelect) {
      onHistorySelect(entry);
      return;
    }
    
    // Set timeframe
    setSelectedTimeframe(entry.timeframe);
    
    // Set custom dates if applicable
    if (entry.timeframe === 'Custom' && entry.customStartDate && entry.customEndDate) {
      setStartDate(new Date(entry.customStartDate));
      setEndDate(new Date(entry.customEndDate));
    } else {
      setStartDate(undefined);
      setEndDate(undefined);
    }
    
    // Set dividend adjusted toggle
    setShowDividendOverlay(entry.dividendAdjusted || false);
    
    // Set CSV overlay
    setCsvOverlay(entry.csvOverlay || []);
    
    // Set annotations
    updateAnnotations(entry.annotations as Annotation[] || []);
    
    // Show toast to confirm restoration
    toast({
      title: "Chart Restored",
      description: `Loaded chart state from ${format(new Date(entry.savedAt), 'MMM dd, yyyy HH:mm')}`,
    });
  };
  
  // Effect to handle pending history restoration after ticker change
  useEffect(() => {
    if (pendingHistoryRestore && 
        pendingHistoryRestore.symbol === symbol && 
        chartData?.data && 
        chartData.data.length > 0 &&
        !isLoading) {
      // Data is ready, restore the chart state
      setSelectedTimeframe(pendingHistoryRestore.timeframe);
      
      if (pendingHistoryRestore.timeframe === 'Custom' && 
          pendingHistoryRestore.customStartDate && 
          pendingHistoryRestore.customEndDate) {
        setStartDate(new Date(pendingHistoryRestore.customStartDate));
        setEndDate(new Date(pendingHistoryRestore.customEndDate));
      } else {
        setStartDate(undefined);
        setEndDate(undefined);
      }
      
      setShowDividendOverlay(pendingHistoryRestore.dividendAdjusted || false);
      setCsvOverlay(pendingHistoryRestore.csvOverlay || []);
      updateAnnotations(pendingHistoryRestore.annotations as Annotation[] || []);
      
      toast({
        title: "Chart Restored",
        description: `Loaded ${pendingHistoryRestore.symbol} from ${format(new Date(pendingHistoryRestore.savedAt), 'MMM dd, yyyy HH:mm')}`,
      });
      
      // Notify parent that restoration is complete
      if (onHistoryRestoreComplete) {
        onHistoryRestoreComplete();
      }
    }
  }, [pendingHistoryRestore, symbol, chartData, isLoading, onHistoryRestoreComplete, toast, updateAnnotations]);

  // Currency mapping for different markets
  const getCurrencySymbol = (currencyCode: string | undefined): string => {
    if (!currencyCode) return '$';
    
    const currencyMap: Record<string, string> = {
      'USD': '$',
      'JPY': '¥',
      'EUR': '€',
      'GBP': '£',
      'CAD': 'C$',
      'AUD': 'A$',
      'CHF': 'CHF ',
      'CNY': '¥',
      'KRW': '₩',
      'HKD': 'HK$',
      'SGD': 'S$',
      'INR': '₹',
      'BRL': 'R$',
      'MXN': '$',
      'SEK': 'kr',
      'NOK': 'kr',
      'DKK': 'kr',
      'PLN': 'zł',
      'CZK': 'Kč',
      'HUF': 'Ft',
      'RUB': '₽',
      'TRY': '₺',
      'ZAR': 'R',
      'ILS': '₪',
      'THB': '฿',
      'MYR': 'RM',
      'PHP': '₱',
      'IDR': 'Rp',
      'VND': '₫',
      'TWD': 'NT$'
    };
    
    return currencyMap[currencyCode.toUpperCase()] || currencyCode.toUpperCase() + ' ';
  };

  const formatPrice = (value: number | undefined | null) => {
    const currencySymbol = getCurrencySymbol((stockDetails?.profile as any)?.currency);
    
    // Handle undefined/null values
    if (value === undefined || value === null || isNaN(value)) {
      return `${currencySymbol}N/A`;
    }
    
    // For JPY and similar currencies, don't show decimal places
    if ((stockDetails?.profile as any)?.currency === 'JPY' || (stockDetails?.profile as any)?.currency === 'KRW') {
      return `${currencySymbol}${Math.round(value).toLocaleString()}`;
    }
    
    return `${currencySymbol}${value.toFixed(2)}`;
  };

  const formatMarketCap = (marketCapInMillions: number) => {
    // Finnhub returns market cap in millions of local currency
    const currencySymbol = getCurrencySymbol((stockDetails?.profile as any)?.currency);
    if (marketCapInMillions >= 1000000) return `${currencySymbol}${(marketCapInMillions / 1000000).toFixed(1)}T`;
    if (marketCapInMillions >= 1000) return `${currencySymbol}${(marketCapInMillions / 1000).toFixed(1)}B`;
    return `${currencySymbol}${marketCapInMillions.toFixed(1)}M`;
  };

  // Handle CSV submit
  const handleCsvSubmit = () => {
    try {
      const textarea = document.getElementById('csv-textarea') as HTMLTextAreaElement;
      let csvText = textarea?.value || '';
      
      if (!csvText.trim()) {
        toast({ title: "Error", description: "Please paste CSV data", variant: "destructive" });
        return;
      }
      
      // Remove UTF-8 BOM if present
      if (csvText.charCodeAt(0) === 0xFEFF) {
        csvText = csvText.slice(1);
      }
      
      const lines = csvText.trim().split('\n');
      const parsed: {timestamp: number, value: number}[] = [];
      
      // Check if first line is a header by looking for common header patterns
      let startIndex = 0;
      if (lines.length > 0) {
        const firstLine = lines[0].trim();
        const [firstCol] = firstLine.split(',');
        const normalizedFirstCol = firstCol?.trim().toLowerCase();
        
        // Treat as header if it matches common header names (not a date)
        if (normalizedFirstCol && 
            (normalizedFirstCol === 'date' || 
             normalizedFirstCol === 'time' || 
             normalizedFirstCol === 'timestamp' ||
             normalizedFirstCol.startsWith('date') ||
             normalizedFirstCol.startsWith('time'))) {
          startIndex = 1;
        }
      }
      
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const [dateStr, valueStr] = line.split(',');
        
        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr?.trim())) {
          toast({ 
            title: "Error", 
            description: `Invalid date format on line ${i+1}. Expected YYYY-MM-DD`,
            variant: "destructive" 
          });
          return;
        }
        
        const value = parseFloat(valueStr?.trim());
        if (isNaN(value) || value < 0 || value > 1) {
          toast({ 
            title: "Error", 
            description: `Invalid value on line ${i+1}. Must be between 0 and 1`,
            variant: "destructive" 
          });
          return;
        }
        
        const timestamp = new Date(dateStr.trim()).getTime();
        parsed.push({ timestamp, value });
      }
      
      // Validate that we have at least one data point
      if (parsed.length === 0) {
        toast({ 
          title: "Error", 
          description: "No valid data points found. Please check your CSV format.",
          variant: "destructive" 
        });
        return;
      }
      
      setCsvOverlay(parsed);
      setShowCsvModal(false);
      toast({ title: "Success", description: `Added overlay with ${parsed.length} data points` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to parse CSV", variant: "destructive" });
    }
  };

  // Handle CSV file upload
  useEffect(() => {
    const input = document.getElementById('csv-upload');
    const handleFileChange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const textarea = document.getElementById('csv-textarea') as HTMLTextAreaElement;
        if (textarea) textarea.value = event.target?.result as string || '';
      };
      reader.readAsText(file);
    };
    
    input?.addEventListener('change', handleFileChange);
    return () => input?.removeEventListener('change', handleFileChange);
  }, [showCsvModal]);

  const formatRevenue = (revenueInMillions: number) => {
    // Format revenue in millions with correct currency
    const currencySymbol = getCurrencySymbol((stockDetails?.profile as any)?.currency);
    return `${currencySymbol}${(revenueInMillions / 1000000).toFixed(1)}M`;
  };

  // Use stock details data if currentPrice is placeholder or invalid
  const actualCurrentPrice = (currentPrice && currentPrice !== '--' && !isNaN(parseFloat(currentPrice))) 
    ? currentPrice 
    : stockDetails?.quote?.c?.toString() || '--';
    
  const actualPercentChange = (percentChange && percentChange !== '0' && percentChange !== '--') 
    ? percentChange 
    : stockDetails?.quote?.dp?.toString() || '0';
    
  const actualMarketCap = (marketCap && marketCap !== '--') 
    ? marketCap 
    : stockDetails?.profile?.marketCapitalization 
      ? formatMarketCap(stockDetails.profile.marketCapitalization) 
      : '--';
  
  const formatTime = (timeStr: string, timeframe: string) => {
    const date = new Date(timeStr);
    switch (timeframe) {
      case '1D':
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
      case '5D':
      case '2W':
        // New format: 3/9/25 instead of Wed, Sep 3
        return date.toLocaleDateString('en-US', { 
          month: 'numeric',
          day: 'numeric',
          year: '2-digit'
        });
      case '1M':
      case '3M':
        // Month view: 11/8/25 format
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
        // For single trading day, show hours; for date ranges, show dates
        if (singleTradingDay || (startDate && endDate && startDate.toDateString() === endDate.toDateString())) {
          return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          });
        } else {
          // For custom ranges, use the compact format
          return date.toLocaleDateString('en-US', { 
            month: 'numeric',
            day: 'numeric',
            year: '2-digit'
          });
        }
      default:
        return date.toLocaleDateString();
    }
  };

  // Calculate timeframe-based percentage change instead of daily change
  const calculateTimeframeChange = () => {
    if (!chartData?.data || chartData.data.length === 0) {
      // Fallback to daily change if no chart data
      const parseChange = parseFloat(actualPercentChange);
      return parseChange;
    }
    
    // Get first and last prices from the timeframe period
    const firstPrice = chartData.data[0]?.close;
    const lastPrice = chartData.data[chartData.data.length - 1]?.close;
    
    if (!firstPrice || !lastPrice || firstPrice === 0) {
      // Fallback to daily change if prices are invalid
      const parseChange = parseFloat(actualPercentChange);
      return parseChange;
    }
    
    // Calculate percentage change over the entire timeframe period
    return ((lastPrice - firstPrice) / firstPrice) * 100;
  };

  const timeframePercentChange = calculateTimeframeChange();
  const isPositive = timeframePercentChange >= 0;
  const lineColor = isPositive ? '#5AF5FA' : '#FFA5FF'; // Cyan for positive, Pink for negative
  
  // Calculate moving average for volume (20-period moving average)
  const calculateMovingAverage = (data: any[], period: number = 20) => {
    return data.map((item, index) => {
      if (index < period - 1) {
        // For early data points, use available data
        const availableData = data.slice(0, index + 1);
        const sum = availableData.reduce((acc, curr) => acc + (curr.volume || 0), 0);
        return sum / availableData.length;
      } else {
        // Calculate moving average for the period
        const slice = data.slice(index - period + 1, index + 1);
        const sum = slice.reduce((acc, curr) => acc + (curr.volume || 0), 0);
        return sum / period;
      }
    });
  };

  // Calculate percentage change for each data point relative to first price and add volume moving average
  const chartDataWithPercentage = chartData?.data?.map((item, index) => {
    const firstPrice = chartData.data[0]?.close || item.close;
    const percentageChange = ((item.close - firstPrice) / firstPrice) * 100;
    return { ...item, percentageChange };
  }) || [];

  // Add volume moving averages to the data
  const volumeMovingAverages = chartData?.data ? calculateMovingAverage(chartData.data) : [];
  const chartDataWithMA = chartDataWithPercentage.map((item, index) => ({
    ...item,
    volumeMA: volumeMovingAverages[index] || 0
  }));

  // Merge CSV overlay data into chart data
  const chartDataWithOverlay = useMemo(() => {
    if (!chartDataWithMA || csvOverlay.length === 0) {
      return chartDataWithMA;
    }
    
    return chartDataWithMA.map(point => {
      // Both chart and CSV timestamps are in milliseconds
      const match = csvOverlay.find(overlay => {
        const diff = Math.abs(overlay.timestamp - point.timestamp);
        const oneDayMs = 86400000; // 1 day in milliseconds
        return diff < oneDayMs;
      });
      
      return {
        ...point,
        csvOverlay: match ? match.value * 100 : null // Convert 0-1 to 0-100%
      };
    });
  }, [chartDataWithMA, csvOverlay]);

  // Calculate non-dividend adjusted prices (add back dividends)
  const chartDataWithDividendOverlay = useMemo(() => {
    if (!chartDataWithOverlay || !dividendData?.dividends || dividendData.dividends.length === 0) {
      return chartDataWithOverlay;
    }

    // Sort dividends by date
    const sortedDividends = [...dividendData.dividends].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Process each data point and add cumulative dividends
    return chartDataWithOverlay.map(dataPoint => {
      // Use timestamp field which is always present, convert to milliseconds if needed
      const timestampMs = dataPoint.timestamp * (dataPoint.timestamp < 10000000000 ? 1000 : 1);
      const dataDate = new Date(timestampMs);
      
      // Calculate cumulative dividends up to this date
      // Dividends are added to prices that occur on or after the ex-dividend date
      let cumulativeDividends = 0;
      
      for (const dividend of sortedDividends) {
        // Parse dividend date (ex-dividend date)
        // Handle timezone by parsing at noon UTC for date-only strings
        const exDivDate = new Date(dividend.date + 'T12:00:00Z');
        
        // If the data point is on or after ex-dividend date, add the dividend
        // This creates the step-up effect immediately after ex-dividend date
        if (dataDate >= exDivDate) {
          cumulativeDividends += dividend.amount;
        }
      }
      
      // Calculate non-dividend adjusted prices (current price + cumulative dividends)
      return {
        ...dataPoint,
        dividendAdjustedClose: dataPoint.close + cumulativeDividends,
        dividendAdjustedOpen: dataPoint.open ? dataPoint.open + cumulativeDividends : undefined,
        dividendAdjustedHigh: dataPoint.high ? dataPoint.high + cumulativeDividends : undefined,
        dividendAdjustedLow: dataPoint.low ? dataPoint.low + cumulativeDividends : undefined,
        cumulativeDividends // Store for tooltip display
      };
    });
  }, [chartDataWithOverlay, dividendData, showDividendOverlay]);

  // Calculate current price data extremes for zoom functionality
  const priceExtremes = useMemo(() => {
    if (!chartDataWithMA || chartDataWithMA.length === 0) {
      return { min: 0, max: 100, baseRange: 100, center: 50 };
    }

    const prices = chartDataWithMA.map(d => d.close).filter(p => p != null);
    if (prices.length === 0) {
      return { min: 0, max: 100, baseRange: 100, center: 50 };
    }

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const baseRange = max - min || 1; // Prevent division by zero
    const center = (min + max) / 2;
    
    return { min, max, baseRange, center };
  }, [chartDataWithMA]);

  // Unified zoom control functions that work for both charts
  const zoomInPrice = () => {
    if (activeTab === 'comparison' && comparisonZoomInRef.current) {
      comparisonZoomInRef.current();
    } else {
      const currentIndex = priceZoomLevels.findIndex(level => level >= (priceAxisRange / priceExtremes.baseRange));
      const nextIndex = Math.max(0, currentIndex - 1);
      setPriceAxisRange(priceZoomLevels[nextIndex] * priceExtremes.baseRange);
      setPriceAxisMode('fixed');
    }
  };

  const zoomOutPrice = () => {
    if (activeTab === 'comparison' && comparisonZoomOutRef.current) {
      comparisonZoomOutRef.current();
    } else {
      const currentIndex = priceZoomLevels.findIndex(level => level >= (priceAxisRange / priceExtremes.baseRange));
      const nextIndex = Math.min(priceZoomLevels.length - 1, currentIndex + 1);
      setPriceAxisRange(priceZoomLevels[nextIndex] * priceExtremes.baseRange);
      setPriceAxisMode('fixed');
    }
  };

  const fitPriceToData = () => {
    if (activeTab === 'comparison' && comparisonFitToDataRef.current) {
      comparisonFitToDataRef.current();
    } else {
      setPriceAxisMode('auto');
    }
  };

  // Get current price Y-axis domain based on zoom state and display mode
  const getPriceAxisDomain = (): any => {
    if (yAxisDisplayMode === 'percentage') {
      // For percentage mode, use dataMin/dataMax of percentage changes
      if (priceAxisMode === 'auto') {
        return ['dataMin - 0.5', 'dataMax + 0.5'];
      } else {
        // For fixed mode in percentage, calculate based on current percentage range
        const halfRange = priceAxisRange / 2;
        return [-halfRange, halfRange];
      }
    } else {
      // Original price mode logic
      if (priceAxisMode === 'auto') {
        return ['dataMin - 1', 'dataMax + 1'];
      } else {
        const halfRange = priceAxisRange / 2;
        const center = priceExtremes.center;
        return [center - halfRange, center + halfRange];
      }
    }
  };

  // Handle Y-axis click to toggle between price and percentage view
  const handleYAxisClick = () => {
    setYAxisDisplayMode(prev => prev === 'price' ? 'percentage' : 'price');
  };

  const formatNumber = (num: number) => {
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num?.toLocaleString() || 'N/A';
  };

  // Handle chart click for annotations
  const handleChartClick = (event: any) => {
    if (!event || !chartDataWithMA) return;
    
    // For horizontal and note annotations, we handle ANY click on the chart (even without activePayload)
    if (annotationMode === 'horizontal' || annotationMode === 'note') {
      // Freehand placement
      if (event.chartY !== undefined && event.chartX !== undefined) {
        // We'll calculate the price from the click Y position
        // For timestamp, we'll use the current time or middle of the chart data
        const middleIndex = Math.floor(chartDataWithMA.length / 2);
        const timestamp = chartDataWithMA[middleIndex]?.timestamp || Date.now();
        const time = chartDataWithMA[middleIndex]?.time || new Date().toISOString();
        
        // Calculate price from Y coordinate
        let calculatedPrice = 0;
        
        // Get price range from chart data
        if (chartDataWithMA.length > 0) {
          const prices = chartDataWithMA.map(d => d.close).filter(p => p != null);
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          
          // Add 5% padding to match YAxis domain calculation
          const range = maxPrice - minPrice;
          const padding = range * 0.05;
          const yAxisMin = minPrice - padding;
          const yAxisMax = maxPrice + padding;
          
          // Use a more reliable chart coordinate calculation
          // event.chartY is relative to the chart plotting area, not the full container
          // We can use this directly with a reasonable height assumption
          
          // For Recharts, event.chartY typically ranges from 0 (top) to chart height (bottom)
          // We'll assume a standard chart height and calculate accordingly
          const assumedChartHeight = 400; // Reasonable assumption for most chart configurations
          
          // Calculate relative position (0 = top, 1 = bottom)
          const relativeY = Math.max(0, Math.min(1, event.chartY / assumedChartHeight));
          
          // Convert to price (Y axis is inverted - top is max price, bottom is min price)
          calculatedPrice = yAxisMax - (relativeY * (yAxisMax - yAxisMin));
          
          // Ensure price is within reasonable bounds
          calculatedPrice = Math.max(yAxisMin, Math.min(yAxisMax, calculatedPrice));
          
        }
        
        // Create annotation
        const newAnnotation: Omit<Annotation, 'id' | 'text'> = {
          type: annotationMode === 'horizontal' ? 'horizontal' : 'note',
          x: 0,
          y: 0,  
          timestamp,
          price: calculatedPrice,
          time
        };
        
        // Ensure clean state before setting new annotation
        setEditingAnnotation(null);
        setIsEditMode(false);
        setAnnotationInput('');
        setPendingAnnotation(newAnnotation);
        setShowAnnotationInput(true);
        return; // Exit early for horizontal and note annotations
      }
    }
    
    // For other annotation types, require activePayload (clicking on data points)
    const { activePayload, activeLabel } = event;
    
    if (activePayload && activePayload.length > 0 && activeLabel) {
      const clickedData = activePayload[0].payload;
      const timestamp = clickedData.timestamp;
      const price = clickedData.close;
      const time = clickedData.time;
      
      if (annotationMode === 'text') {
        // Text annotation mode - single click
        const newAnnotation: Omit<Annotation, 'id' | 'text'> = {
          type: 'text',
          x: 0, // Will be set by chart rendering
          y: 0, // Will be set by chart rendering  
          timestamp,
          price,
          time
        };
        
        // Ensure clean state before setting new annotation
        setEditingAnnotation(null);
        setIsEditMode(false);
        setAnnotationInput('');
        setPendingAnnotation(newAnnotation);
        setShowAnnotationInput(true);
      } else if (annotationMode === 'horizontal') {
        // This case is now handled earlier in the function for freehand placement
        // This code path should not be reached for horizontal annotations
        return;
      } else if (annotationMode === 'percentage') {
        // Percentage measurement mode - two clicks
        if (!pendingPercentageStart) {
          // First click - set start point
          setPendingPercentageStart({
            timestamp,
            price,
            time
          });
        } else {
          // Second click - create percentage measurement
          const startPrice = pendingPercentageStart.price;
          const endPrice = price;
          const percentage = ((endPrice - startPrice) / startPrice) * 100;
          
          const newAnnotation: Annotation = {
            id: `percentage-${Date.now()}`,
            type: 'percentage',
            x: 0,
            y: 0,
            timestamp: pendingPercentageStart.timestamp, // Use start timestamp as primary
            price: startPrice,
            time: pendingPercentageStart.time,
            startTimestamp: pendingPercentageStart.timestamp,
            startPrice,
            startTime: pendingPercentageStart.time,
            endTimestamp: timestamp,
            endPrice,
            endTime: time,
            percentage
          };
          
          updateAnnotations(prev => [...prev, newAnnotation]);
          setPendingPercentageStart(null);
        }
      }
    }
  };

  // Handle annotation double-click for editing or deletion
  const handleAnnotationDoubleClick = (annotation: Annotation) => {
    if (annotation.type === 'text' || annotation.type === 'horizontal' || annotation.type === 'note') {
      setEditingAnnotation(annotation);
      setIsEditMode(true);
      setAnnotationInput(annotation.text || '');
      setShowAnnotationInput(true);
    } else if (annotation.type === 'percentage') {
      // Percentage annotations can be deleted on double-click
      handlePercentageAnnotationDelete(annotation);
    }
  };

  // Delete percentage annotation
  const handlePercentageAnnotationDelete = (annotation: Annotation) => {
    updateAnnotations(prev => prev.filter(a => a.id !== annotation.id));
  };

  // Save annotation with user text
  const saveAnnotation = () => {
    if (isEditMode && editingAnnotation && annotationInput.trim()) {
      // Update existing annotation
      updateAnnotations(prev => prev.map(annotation => 
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
      
      updateAnnotations(prev => [...prev, newAnnotation]);
      setShowAnnotationInput(false);
      setAnnotationInput('');
      setPendingAnnotation(null);
    }
  };

  // Delete annotation
  const deleteAnnotation = () => {
    if (editingAnnotation) {
      updateAnnotations(prev => prev.filter(annotation => annotation.id !== editingAnnotation.id));
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

  const formatPercent = (value: number) => {
    return value ? `${(value * 100).toFixed(2)}%` : 'N/A';
  };

  // Export functions - Using html-to-image for pixel-perfect captures
  const exportAsPNG = async () => {
    try {
      if (!chartRef.current) {
        toast({
          title: "Export Failed",
          description: "Chart not found. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      // Create high-resolution PNG using html-to-image (captures exactly what's rendered)
      const dataUrl = await htmlToImage.toPng(chartRef.current, {
        quality: 1.0,
        pixelRatio: 2, // High resolution
        backgroundColor: 'transparent', // Transparent background for PNG
        cacheBust: true, // Prevent caching issues
        skipFonts: true, // Skip external font loading to avoid CORS issues
        style: {
          transform: 'scale(1)'
        },
        filter: (node) => {
          // Exclude any UI elements that shouldn't be in export
          return !node.classList?.contains('no-export');
        }
      });
      
      // Download the image
      const filename = `${symbol}_chart_${selectedTimeframe}${startDate && endDate ? `_${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}` : ''}.png`;
      
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: `Chart exported as ${filename}`
      });
      
    } catch (error) {
      console.error('PNG export failed:', error);
      toast({
        title: "Export Failed",
        description: "PNG export failed. Please try again.",
        variant: "destructive"
      });
    }
  };

  const exportAsPDF = async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(chartRef.current, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: '#121212',
        skipFonts: true,
        style: { 
          transform: 'scale(1)',
          paddingBottom: '20px'
        },
        filter: (n) => !n.classList?.contains('no-export'),
      });
      const img = new Image();
      img.src = dataUrl;
      await (img.decode ? img.decode() : new Promise(r => (img.onload = () => r(null))));
      const orientation = img.width >= img.height ? 'landscape' : 'portrait';
      const pdf = new jsPDF({ orientation, unit: 'px', format: [img.width, img.height] });
      pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height, undefined, 'FAST');
      const filename = `${symbol}_chart_${selectedTimeframe}${startDate && endDate ? `_${format(startDate,'yyyy-MM-dd')}_${format(endDate,'yyyy-MM-dd')}` : ''}.pdf`;
      pdf.save(filename);
      toast({ title: 'Export Successful', description: `Chart exported as ${filename}` });
    } catch (err) {
      console.error('PDF export failed:', err);
      toast({ title: 'Export Failed', description: 'PDF export failed. Please try again.', variant: 'destructive' });
    }
  };

  const exportAsSVG = async () => {
    if (!chartRef.current) return;
    try {
      const svgDataUrl = await htmlToImage.toSvg(chartRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        filter: (n) => !n.classList?.contains('no-export'),
      });
      
      // Convert data URL to proper blob
      const blob = await (await fetch(svgDataUrl)).blob();
      const filename = `${symbol}_chart_${selectedTimeframe}${startDate && endDate ? `_${format(startDate,'yyyy-MM-dd')}_${format(endDate,'yyyy-MM-dd')}` : ''}.svg`;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; 
      a.download = filename; 
      document.body.appendChild(a); 
      a.click();
      document.body.removeChild(a); 
      URL.revokeObjectURL(url);
      
      toast({ title: 'Export Successful', description: `Chart exported as ${filename}` });
    } catch (e) {
      console.error('SVG export failed:', e);
      toast({ title: 'SVG Export Failed', description: 'SVG export failed. Please try again.', variant: 'destructive' });
    }
  };

  const exportAsCode = async () => {
    if (!chartRef.current) {
      toast({
        title: "Export Failed",
        description: "Chart not found. Please try again.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Generate SVG of the chart
      const svgDataUrl = await htmlToImage.toSvg(chartRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        filter: (n) => !n.classList?.contains('no-export'),
      });
      
      // Convert data URL to SVG string
      const svgString = decodeURIComponent(svgDataUrl.split(',')[1]);
      
      // Create embeddable code with the SVG
      const embedCode = `<!-- Intropic Chart Editor - ${symbol} ${selectedTimeframe} Chart -->
<!-- Generated on ${new Date().toLocaleDateString()} -->
<div class="intropic-chart-container" style="width: 100%; max-width: 800px; margin: 0 auto;">
  ${svgString}
</div>

<!-- Alternative: Inline SVG with custom styling -->
<div class="stock-chart-${symbol.toLowerCase()}" style="
  display: inline-block; 
  border: 1px solid #e2e8f0; 
  border-radius: 8px; 
  padding: 16px;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
">
  ${svgString}
  <div style="margin-top: 8px; text-align: center; font-size: 12px; color: #666;">
    Powered by Intropic Chart Editor
  </div>
</div>

<!-- For WordPress/CMS: Base64 Encoded -->
<img src="${svgDataUrl}" alt="${symbol} ${selectedTimeframe} Chart" style="max-width: 100%; height: auto;" />`;

      navigator.clipboard.writeText(embedCode).then(() => {
        toast({
          title: "SVG Embed Code Copied!",
          description: "Chart SVG code has been copied to your clipboard.",
        });
      }).catch(() => {
        // Fallback: download the code
        const blob = new Blob([embedCode], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${symbol}_${selectedTimeframe}_chart_embed.html`;
        a.click();
        URL.revokeObjectURL(url);
        toast({
          title: "SVG Embed Code Downloaded",
          description: "Chart SVG code has been downloaded as an HTML file.",
        });
      });
    } catch (error) {
      console.error('Code export failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate embed code. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Comparison chart export functions

  const exportComparisonAsCSV = () => {
    // Get the comparison chart data from the comparison chart component
    // This will trigger a CSV export by dispatching a custom event
    const comparisonChart = document.querySelector('[data-testid="comparison-chart-container"]');
    if (comparisonChart) {
      // Dispatch a custom event to trigger CSV export in the comparison chart
      const event = new CustomEvent('exportCSV');
      comparisonChart.dispatchEvent(event);
    } else {
      alert('Comparison chart not found. Please ensure the comparison chart is visible.');
    }
  };

  const exportComparisonAsPNG = () => {
    // Get the comparison chart and trigger PNG export
    const comparisonChart = document.querySelector('[data-testid="comparison-chart-container"]');
    if (comparisonChart) {
      // Dispatch a custom event to trigger PNG export in the comparison chart
      const event = new CustomEvent('exportPNG');
      comparisonChart.dispatchEvent(event);
    } else {
      alert('Comparison chart not found. Please ensure the comparison chart is visible.');
    }
  };

  const exportComparisonAsPDF = () => {
    // Get the comparison chart and trigger PDF export
    const comparisonChart = document.querySelector('[data-testid="comparison-chart-container"]');
    if (comparisonChart) {
      // Dispatch a custom event to trigger PDF export in the comparison chart
      const event = new CustomEvent('exportPDF');
      comparisonChart.dispatchEvent(event);
    } else {
      alert('Comparison chart not found. Please ensure the comparison chart is visible.');
    }
  };

  const exportComparisonAsSVG = () => {
    // Get the comparison chart and trigger SVG export
    const comparisonChart = document.querySelector('[data-testid="comparison-chart-container"]');
    if (comparisonChart) {
      // Dispatch a custom event to trigger SVG export in the comparison chart
      const event = new CustomEvent('exportSVG');
      comparisonChart.dispatchEvent(event);
    } else {
      alert('Comparison chart not found. Please ensure the comparison chart is visible.');
    }
  };

  const exportComparisonAsCode = () => {
    // Get the comparison chart and trigger SVG code export
    const comparisonChart = document.querySelector('[data-testid="comparison-chart-container"]');
    if (comparisonChart) {
      // Dispatch a custom event to trigger SVG code export in the comparison chart
      const event = new CustomEvent('exportCode');
      comparisonChart.dispatchEvent(event);
    } else {
      toast({
        title: "Export Failed",
        description: "Comparison chart not found. Please ensure the comparison chart is visible.",
        variant: "destructive"
      });
    }
  };


  // Handle chart click for annotations - implementation is in the main handleChartClick function above

  // Main chart content
  const chartContent = (
    <div className="w-full space-y-6 overflow-x-hidden max-[900px]:space-y-4">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex flex-col max-[900px]:gap-3 min-[901px]:flex-row min-[901px]:items-start min-[901px]:justify-between">
          <div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[#5AF5FA] text-xl font-medium">{symbol}</span>
                  <span className="text-muted-foreground">-</span>
                  <span className="text-sm font-normal text-muted-foreground">{name}</span>
                </div>
                {stockDetails?.profile && (
                  <div className="text-xs text-muted-foreground" style={{ fontSize: '14px' }}>
                    {stockDetails.profile.exchange} - {stockDetails.profile.currency}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-2xl font-bold">{actualCurrentPrice !== '--' ? formatPrice(parseFloat(actualCurrentPrice)) : '--'}</span>
                <Badge 
                  variant="secondary"
                  className={`flex items-center gap-1 font-semibold text-[#121212] border-0 ${isPositive ? 'bg-[#5AF5FA]' : 'bg-[#FFA5FF]'}`}
                >
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {isPositive ? "+" : ""}{Math.abs(timeframePercentChange).toFixed(2)}%
                </Badge>
                <span className="text-sm text-muted-foreground">{actualMarketCap}</span>
              </div>
            </div>
            
          </div>
          
          
          {/* Pending Percentage Indicator */}
          {annotationMode === 'percentage' && pendingPercentageStart && (
            <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded border">
              Click second point to measure
            </div>
          )}
          
        </div>
        
      </div>

      {/* Tabs Wrapper - Encompasses entire chart section including controls and content */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'price-volume' | 'comparison')} className="w-full">
        {/* Chart Controls: Timeframe, Chart Type, and Tabs (Mobile) */}
        <div className="flex gap-4 items-center flex-wrap max-[900px]:gap-2 w-full mb-4">
          {/* Mobile View (< 760px): Timeframe Dropdown + Price/Compare Tabs */}
          <div className="min-[760px]:hidden w-full flex gap-2 items-center">
            <Select 
              value={selectedTimeframe} 
              onValueChange={(value) => {
                setSelectedTimeframe(value);
                if (value !== 'Custom') {
                  setStartDate(undefined);
                  setEndDate(undefined);
                  setShowDatePicker(false);
                } else {
                  setShowDatePicker(true);
                }
              }}
            >
              <SelectTrigger className="flex-1 h-9 text-sm" data-testid="select-timeframe-mobile">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent style={{ backgroundColor: '#1a1a1a' }}>
                {timeframes.map((timeframe) => (
                  <SelectItem 
                    key={timeframe.value} 
                    value={timeframe.value}
                    className="cursor-pointer"
                  >
                    {timeframe.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Desktop Buttons (760px+) */}
          <div className="hidden min-[760px]:flex gap-1 items-center flex-wrap">
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
          </div>

          {/* Chart Type selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs"
                data-testid="button-chart-type-dropdown"
              >
                {chartType === 'line' && 'Line'}
                {chartType === 'mountain' && 'Mountain'}
                {chartType === 'candlestick' && 'Candles'}
                <ChevronDown className="w-3 h-3 ml-1" style={{ color: '#5AF5FA' }} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => {
                  setChartType('line');
                }}
                className="cursor-pointer"
                data-testid="menu-chart-line"
              >
                Line
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setChartType('mountain');
                }}
                className="cursor-pointer"
                data-testid="menu-chart-mountain"
              >
                Mountain
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setChartType('candlestick');
                }}
                className="cursor-pointer"
                data-testid="menu-chart-candles"
              >
                Candles
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dividend Overlay Toggle - Only show in price-volume tab */}
          {activeTab === 'price-volume' && (
            <div className="flex items-center gap-2 ml-2">
              <Switch
                id="dividend-overlay"
                checked={showDividendOverlay}
                onCheckedChange={setShowDividendOverlay}
                className="h-4 w-8"
                data-testid="switch-dividend-overlay"
              />
              <label
                htmlFor="dividend-overlay"
                className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              >
                Dividend Overlay
              </label>
            </div>
          )}
        </div>
        
        {/* Redesigned Custom Date Picker - Limited to 10 Years */}
        {selectedTimeframe === 'Custom' && showDatePicker && (
          <div className="mt-4 p-4 border rounded-lg relative z-50" style={{ zIndex: 9999, backgroundColor: '#3A3A3A' }}>
            {/* Close Button */}
            <button
              onClick={() => {
                setShowDatePicker(false);
                // Reset states when closing
                setSingleTradingDay(false);
                setStartDate(undefined);
                setEndDate(undefined);
              }}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
              title="Close date picker"
            >
              <X className="w-4 h-4" />
            </button>
            
            {/* Mode Toggle */}
            <div className="mb-4 pr-8">
              <div className="flex items-center justify-center gap-4">
                <div className="flex bg-muted rounded-lg p-1">
                  <button
                    onClick={() => {
                      setSingleTradingDay(false);
                      setEndDate(undefined); // Clear end date when switching to range mode
                    }}
                    className={`px-4 py-2 rounded-md text-sm transition-colors ${
                      !singleTradingDay 
                        ? 'bg-background shadow-sm text-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Date Range
                  </button>
                  <button
                    onClick={() => {
                      setSingleTradingDay(true);
                      setEndDate(undefined); // Clear end date for single day mode
                    }}
                    className={`px-4 py-2 rounded-md text-sm transition-colors ${
                      singleTradingDay 
                        ? 'bg-background shadow-sm text-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Single Trading Day
                  </button>
                </div>
              </div>
              
              {singleTradingDay && (
                <div className="text-center mt-2 text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-2 rounded">
                  ⏰ Will show hourly data from market open to close
                </div>
              )}
            </div>
            
            {/* Smart Quick Presets */}
            <div className="mb-4 pr-8">
              <label className="text-sm font-medium mb-2 block">
                {singleTradingDay ? 'Quick Single Days' : 'Quick Ranges'}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(singleTradingDay ? [
                  { label: 'Yesterday', getDates: () => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    // Move to Friday if weekend
                    if (yesterday.getDay() === 0) yesterday.setDate(yesterday.getDate() - 2);
                    if (yesterday.getDay() === 6) yesterday.setDate(yesterday.getDate() - 1);
                    return { start: yesterday, end: undefined };
                  }},
                  { label: 'Last Friday', getDates: () => {
                    const date = new Date();
                    const daysSinceFriday = (date.getDay() + 2) % 7;
                    date.setDate(date.getDate() - (daysSinceFriday === 0 ? 7 : daysSinceFriday));
                    return { start: date, end: undefined };
                  }},
                  { label: '2 Days Ago', getDates: () => {
                    const date = new Date();
                    date.setDate(date.getDate() - 2);
                    // Move to Friday if weekend
                    if (date.getDay() === 0) date.setDate(date.getDate() - 2);
                    if (date.getDay() === 6) date.setDate(date.getDate() - 1);
                    return { start: date, end: undefined };
                  }},
                  { label: '1 Week Ago', getDates: () => {
                    const date = new Date();
                    date.setDate(date.getDate() - 7);
                    // Move to Friday if weekend
                    if (date.getDay() === 0) date.setDate(date.getDate() - 2);
                    if (date.getDay() === 6) date.setDate(date.getDate() - 1);
                    return { start: date, end: undefined };
                  }}
                ] : [
                  { label: 'This Week', getDates: () => {
                    const today = new Date();
                    const monday = new Date(today);
                    monday.setDate(today.getDate() - today.getDay() + 1);
                    return { start: monday, end: today };
                  }},
                  { label: 'Last Week', getDates: () => {
                    const today = new Date();
                    const lastSunday = new Date(today);
                    lastSunday.setDate(today.getDate() - today.getDay());
                    const lastMonday = new Date(lastSunday);
                    lastMonday.setDate(lastSunday.getDate() - 6);
                    return { start: lastMonday, end: lastSunday };
                  }},
                  { label: 'This Month', getDates: () => {
                    const today = new Date();
                    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                    return { start: firstDay, end: today };
                  }},
                  { label: 'Last 3 Months', getDates: () => {
                    const today = new Date();
                    const threeMonthsAgo = new Date(today);
                    threeMonthsAgo.setMonth(today.getMonth() - 3);
                    return { start: threeMonthsAgo, end: today };
                  }}
                ]).map(({ label, getDates }) => (
                  <Button
                    key={label}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      const { start, end } = getDates();
                      setStartDate(start);
                      setEndDate(end);
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Calendar Section */}
            <div className={`pr-8 ${singleTradingDay ? 'flex justify-center' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}`}>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {singleTradingDay ? 'Pick Trading Day' : 'Start Date'}
                </label>
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  month={startCalendarMonth}
                  onMonthChange={setStartCalendarMonth}
                  enableYearDropdown
                  fromYear={new Date().getFullYear() - 10}
                  toYear={new Date().getFullYear()}
                  fromDate={(() => {
                    const tenYearsAgo = new Date();
                    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
                    return tenYearsAgo;
                  })()}
                  toDate={new Date()}
                  disabled={(date) => {
                    // Disable weekends and suggest alternatives
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    // For range mode, disable if after end date
                    if (!singleTradingDay && !!endDate && date > endDate) return false; // Don't disable, just warn
                    return isWeekend; // Only disable weekends
                  }}
                  className="rounded-md border"
                />
                
                {/* Enhanced validation with smart suggestions */}
                {startDate && (startDate.getDay() === 0 || startDate.getDay() === 6) && (
                  <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950 p-2 rounded">
                    <div className="font-medium">⚠️ No trading data available</div>
                    <div className="mt-1">
                      Try {(() => {
                        const suggestion = new Date(startDate);
                        if (startDate.getDay() === 0) { // Sunday
                          suggestion.setDate(startDate.getDate() - 2); // Friday
                        } else if (startDate.getDay() === 6) { // Saturday
                          suggestion.setDate(startDate.getDate() - 1); // Friday
                        }
                        return format(suggestion, 'MMM dd, yyyy');
                      })()} instead
                    </div>
                  </div>
                )}
              </div>
              
              {!singleTradingDay && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    month={endCalendarMonth}
                    onMonthChange={setEndCalendarMonth}
                    enableYearDropdown
                    fromYear={new Date().getFullYear() - 10}
                    toYear={new Date().getFullYear()}
                    fromDate={(() => {
                      const tenYearsAgo = new Date();
                      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
                      return tenYearsAgo;
                    })()}
                    toDate={new Date()}
                    disabled={(date) => {
                      // Disable weekends
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      // Disable if before start date
                      if (!!startDate && date < startDate) return true;
                      return isWeekend;
                    }}
                    className="rounded-md border"
                  />
                  
                  {endDate && (endDate.getDay() === 0 || endDate.getDay() === 6) && (
                    <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950 p-2 rounded">
                      <div className="font-medium">⚠️ No trading data available</div>
                      <div className="mt-1">
                        Try {(() => {
                          const suggestion = new Date(endDate);
                          if (endDate.getDay() === 0) { // Sunday
                            suggestion.setDate(endDate.getDate() - 2); // Friday
                          } else if (endDate.getDay() === 6) { // Saturday
                            suggestion.setDate(endDate.getDate() - 1); // Friday
                          }
                          return format(suggestion, 'MMM dd, yyyy');
                        })()} instead
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Apply Button */}
            {startDate && (singleTradingDay || endDate) && (
              <div className="mt-4 text-center space-y-3">
                <div className="text-sm text-muted-foreground">
                  {singleTradingDay ? (
                    <>
                      Selected: {format(startDate, 'MMM dd, yyyy')}
                      <span className="text-xs block mt-1">
                        Single day with hourly intervals
                      </span>
                    </>
                  ) : (
                    <>
                      Selected: {format(startDate, 'MMM dd, yyyy')} - {format(endDate!, 'MMM dd, yyyy')}
                      <span className="text-xs block mt-1">
                        ({Math.ceil((endDate!.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days)
                      </span>
                    </>
                  )}
                </div>
                <Button
                  onClick={() => {
                    if (singleTradingDay) {
                      // For single trading day, set end date to same as start date
                      setEndDate(startDate);
                    }
                    setShowDatePicker(false);
                  }}
                  className="bg-[#5AF5FA] text-black hover:bg-[#5AF5FA]/90"
                  size="sm"
                >
                  {singleTradingDay ? 'Show Trading Day' : 'Apply Date Range'}
                </Button>
              </div>
            )}
          </div>
        )}

      {/* Chart Controls Section with Export Button */}
      <div className="flex items-center justify-between mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Annotation Mode Controls */}
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs"
                      data-testid="button-annotation-dropdown"
                    >
                      {annotationMode === 'text' && (
                        <>
                          <div className="w-3 h-3 mr-1 flex items-center justify-center" style={{ color: '#FAFF50' }}>
                            <div className="w-0.5 h-3 bg-current" />
                          </div>
                          Vertical
                        </>
                      )}
                      {annotationMode === 'percentage' && (
                        <>
                          <Ruler className="w-3 h-3 mr-1" style={{ color: '#22C55E' }} />
                          Measure
                        </>
                      )}
                      {annotationMode === 'horizontal' && (
                        <>
                          <Minus className="w-3 h-3 mr-1" style={{ color: '#AA99FF' }} />
                          Horizontal
                        </>
                      )}
                      {annotationMode === 'note' && (
                        <>
                          <Type className="w-3 h-3 mr-1" style={{ color: '#FFFFFF' }} />
                          Text Note
                        </>
                      )}
                      {!annotationMode && 'Select Tool'}
                      <ChevronDown className="w-3 h-3 ml-1" style={{ color: '#5AF5FA' }} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      onClick={() => {
                        setAnnotationMode('text');
                        setPendingPercentageStart(null);
                      }}
                      className="cursor-pointer"
                      data-testid="menu-annotation-text"
                    >
                      <div className="w-3 h-3 mr-2 flex items-center justify-center" style={{ color: '#FAFF50' }}>
                        <div className="w-0.5 h-3 bg-current" />
                      </div>
                      Vertical
                    </DropdownMenuItem>
                    <HoverTooltip>
                      <HoverTooltipTrigger asChild>
                        <DropdownMenuItem
                          onClick={() => {
                            if (activeTab !== 'comparison') {
                              setAnnotationMode('percentage');
                              setPendingPercentageStart(null);
                            }
                          }}
                          disabled={activeTab === 'comparison'}
                          className={`cursor-pointer ${
                            activeTab === 'comparison' ? 'opacity-40 cursor-not-allowed' : ''
                          }`}
                          data-testid="menu-annotation-percentage"
                        >
                          <Ruler className="w-3 h-3 mr-2" style={{ color: '#22C55E' }} />
                          Measure
                        </DropdownMenuItem>
                      </HoverTooltipTrigger>
                      {activeTab === 'comparison' && (
                        <HoverTooltipContent>
                          <p>Percentage measurement is deactivated on Compare</p>
                        </HoverTooltipContent>
                      )}
                    </HoverTooltip>
                    <DropdownMenuItem
                      onClick={() => {
                        setAnnotationMode('horizontal');
                        setPendingPercentageStart(null);
                      }}
                      className="cursor-pointer"
                      data-testid="menu-annotation-horizontal"
                    >
                      <Minus className="w-3 h-3 mr-2" style={{ color: '#AA99FF' }} />
                      Horizontal
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setShowCsvModal(true)}
                      className="cursor-pointer"
                      data-testid="menu-csv-overlay"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add % Overlay (CSV)
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setAnnotationMode('note')}
                      className="cursor-pointer"
                      data-testid="menu-note"
                    >
                      <Type className="w-3 h-3 mr-2" style={{ color: '#FFFFFF' }} />
                      Add Text Note
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Price Y-axis Zoom Controls */}
                <div className="flex border border-border rounded-md overflow-hidden bg-background">
                  <button
                    onClick={zoomInPrice}
                    disabled={priceAxisRange <= priceZoomLevels[0] * priceExtremes.baseRange}
                    className="h-8 w-8 text-sm font-medium bg-[#121212] text-white border-r border-border hover:bg-[#5AF5FA] hover:text-[#121212] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 flex items-center justify-center"
                    data-testid="button-zoom-in-price"
                    title="Zoom In Price"
                  >
                    +
                  </button>
                  <button
                    onClick={zoomOutPrice}
                    disabled={priceAxisRange >= priceZoomLevels[priceZoomLevels.length - 1] * priceExtremes.baseRange}
                    className="h-8 w-8 text-sm font-medium bg-[#121212] text-white border-r border-border hover:bg-[#5AF5FA] hover:text-[#121212] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 flex items-center justify-center"
                    data-testid="button-zoom-out-price"
                    title="Zoom Out Price"
                  >
                    −
                  </button>
                  <button
                    onClick={fitPriceToData}
                    className="h-8 w-10 text-xs font-medium bg-[#121212] text-white hover:bg-[#5AF5FA] hover:text-[#121212] transition-colors duration-150 flex items-center justify-center"
                    data-testid="button-fit-price-data"
                    title="Fit Price to Data"
                  >
                    Fit
                  </button>
                </div>
                
                {/* Hover Tool Toggle */}
                <div className="flex items-center gap-2">
                  <label htmlFor="hover-tool-toggle" className="text-xs text-muted-foreground">
                    Hover tool
                  </label>
                  <Switch
                    id="hover-tool-toggle"
                    checked={showHoverTooltip}
                    onCheckedChange={setShowHoverTooltip}
                    className="scale-75"
                    data-testid="switch-hover-tool"
                  />
                </div>
                
                {onClearAll && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCsvOverlay([]);
                      onClearAll();
                    }}
                    className="h-8 px-3 text-xs text-destructive hover:text-black hover:bg-[#5AF5FA]"
                    data-testid="button-clear-all"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>
            </div>

            {/* Shared Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs border-[#5AF5FA]/30 text-[#5AF5FA] hover:bg-[#5AF5FA]/10 ml-4"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Export
                  <ChevronDown className="w-3 h-3 ml-1" style={{ color: '#5AF5FA' }} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-36">
                {activeTab === 'price-volume' ? (
                  <>
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
                    <DropdownMenuItem onClick={exportAsCode} className="cursor-pointer">
                      <Code className="w-4 h-4 mr-2" />
                      Get Embed Code
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={exportComparisonAsPNG} className="cursor-pointer">
                      <Download className="w-4 h-4 mr-2" />
                      Export as PNG
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportComparisonAsPDF} className="cursor-pointer">
                      <Download className="w-4 h-4 mr-2" />
                      Export as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportComparisonAsSVG} className="cursor-pointer">
                      <Download className="w-4 h-4 mr-2" />
                      Export as SVG
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportComparisonAsCSV} className="cursor-pointer">
                      <Download className="w-4 h-4 mr-2" />
                      Export as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportComparisonAsCode} className="cursor-pointer">
                      <Code className="w-4 h-4 mr-2" />
                      Get Embed Code
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
          
        <TabsContent value="price-volume" className="bg-background relative z-10" data-testid="tabpanel-price-volume">
        {isLoading ? (
          <div className="h-80 flex items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading chart data...
            </div>
          </div>
        ) : error ? (
          <div className="h-80 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="text-red-500 font-medium mb-2">Error Loading Data</div>
              <div className="text-sm text-muted-foreground mb-4">
                {symbol}: Failed to fetch chart data
              </div>
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
                <div className="font-medium mb-1">Possible reasons:</div>
                <ul className="text-left space-y-1">
                  <li>• Symbol not found or invalid</li>
                  <li>• Weekend or market holiday selected</li>
                  <li>• Date range too far in the past</li>
                  <li>• Data not available for this timeframe</li>
                </ul>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  if (selectedTimeframe === 'Custom') {
                    setStartDate(undefined);
                    setEndDate(undefined);
                    setShowDatePicker(true);
                  }
                }}
              >
                Try Different Dates
              </Button>
            </div>
          </div>
        ) : !chartData?.data || chartData.data.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No chart data available for {symbol}
          </div>
        ) : (
          <div 
            ref={chartRef} 
            className={`w-full rounded-lg relative pt-20 ${
              isDragging 
                ? '' 
                : annotationMode === 'percentage'
                  ? 'annotation-measure-mode'
                  : annotationMode === 'text'
                    ? 'annotation-vertical-mode'
                    : annotationMode === 'horizontal'
                      ? 'annotation-horizontal-mode'
                      : annotationMode === 'note'
                        ? 'annotation-note-mode'
                        : ''
            }`}
            style={{ 
              backgroundColor: '#121212',
              cursor: isDragging ? 'grabbing' : undefined
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* Annotation Labels - positioned in reserved padding space above charts */}
            {annotations.length > 0 && (
              <div className="absolute top-0 left-0 w-full h-20 pointer-events-none" style={{ zIndex: 1000 }}>
                {annotations.map((annotation) => {
                  if (annotation.type === 'text') {
                    // Text annotations - display at single point
                    const dataIndex = chartData?.data?.findIndex(d => d.timestamp === annotation.timestamp) ?? -1;
                    if (dataIndex === -1) return null;
                    
                    const totalDataPoints = (chartData?.data?.length ?? 1) - 1;
                    const xPercent = totalDataPoints > 0 ? (dataIndex / totalDataPoints) * 100 : 0;
                    
                    return (
                      <div
                        key={annotation.id}
                        className="absolute"
                        style={{ 
                          left: `${xPercent}%`, 
                          top: `${20 + (annotation.verticalOffset || 0)}px`, 
                          transform: `translateX(calc(-50% + ${annotation.horizontalOffset || 0}px))`
                        }}
                      >
                        <div 
                          className="rounded px-1.5 py-0.5 max-w-32 pointer-events-auto cursor-grab hover:opacity-80 shadow-lg select-none"
                          style={{ 
                            backgroundColor: '#121212', 
                            border: '1px solid #FAFF50',
                            minWidth: '40px',
                            fontSize: '10px',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            whiteSpace: 'pre-wrap'
                          }}
                          onMouseDown={(e) => handleTextMouseDown(e, annotation)}
                          onDoubleClick={() => handleAnnotationDoubleClick(annotation)}
                          title="Click and drag to move in any direction, double-click to delete"
                        >
                          <div className="text-foreground">{annotation.text || ''}</div>
                        </div>
                      </div>
                    );
                  } else if (annotation.type === 'horizontal') {
                    // Horizontal annotations - display at single point
                    const dataIndex = chartData?.data?.findIndex(d => d.timestamp === annotation.timestamp) ?? -1;
                    if (dataIndex === -1) return null;
                    
                    const totalDataPoints = (chartData?.data?.length ?? 1) - 1;
                    const xPercent = totalDataPoints > 0 ? (dataIndex / totalDataPoints) * 100 : 0;
                    
                    return (
                      <div
                        key={annotation.id}
                        className="absolute"
                        style={{ left: `${xPercent}%`, top: `${20 + (annotation.verticalOffset || 0)}px`, transform: `translateX(calc(-50% + ${annotation.horizontalOffset || 0}px))` }}
                      >
                        <div 
                          className="rounded px-1.5 py-0.5 max-w-32 pointer-events-auto cursor-grab hover:opacity-80 shadow-lg select-none"
                          style={{ 
                            backgroundColor: '#121212', 
                            border: '1px solid #AA99FF',
                            minWidth: '40px',
                            fontSize: '10px',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            whiteSpace: 'pre-wrap'
                          }}
                          onMouseDown={(e) => handleTextMouseDown(e, annotation)}
                          onDoubleClick={() => handleAnnotationDoubleClick(annotation)}
                          title="Click and drag to move in any direction, double-click to delete"
                        >
                          <div className="text-foreground">{annotation.text || ''}</div>
                        </div>
                      </div>
                    );
                  } else if (annotation.type === 'note') {
                    // Note annotations - floating text box (no line)
                    const dataIndex = chartData?.data?.findIndex(d => d.timestamp === annotation.timestamp) ?? -1;
                    if (dataIndex === -1) return null;
                    
                    const totalDataPoints = (chartData?.data?.length ?? 1) - 1;
                    const xPercent = totalDataPoints > 0 ? (dataIndex / totalDataPoints) * 100 : 0;
                    
                    return (
                      <div
                        key={annotation.id}
                        className="absolute"
                        style={{ 
                          left: `${xPercent}%`, 
                          top: `${20 + (annotation.verticalOffset || 0)}px`, 
                          transform: `translateX(calc(-50% + ${annotation.horizontalOffset || 0}px))`
                        }}
                      >
                        <div 
                          className="rounded px-1.5 py-0.5 max-w-32 pointer-events-auto cursor-grab hover:opacity-80 shadow-lg select-none"
                          style={{ 
                            backgroundColor: '#121212', 
                            border: '1px solid #FFFFFF',
                            minWidth: '40px',
                            fontSize: '10px',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            whiteSpace: 'pre-wrap'
                          }}
                          onMouseDown={(e) => handleTextMouseDown(e, annotation)}
                          onDoubleClick={() => handleAnnotationDoubleClick(annotation)}
                          title="Click and drag to move in any direction, double-click to delete"
                        >
                          <div className="text-foreground">{annotation.text || ''}</div>
                        </div>
                      </div>
                    );
                  } else if (annotation.type === 'percentage' && annotation.startTimestamp && annotation.endTimestamp) {
                    // Percentage measurements - display at midpoint
                    const startIndex = chartData?.data?.findIndex(d => d.timestamp === annotation.startTimestamp) ?? -1;
                    const endIndex = chartData?.data?.findIndex(d => d.timestamp === annotation.endTimestamp) ?? -1;
                    if (startIndex === -1 || endIndex === -1) return null;
                    
                    const totalDataPoints = (chartData?.data?.length ?? 1) - 1;
                    const startPercent = totalDataPoints > 0 ? (startIndex / totalDataPoints) * 100 : 0;
                    const endPercent = totalDataPoints > 0 ? (endIndex / totalDataPoints) * 100 : 0;
                    const midPercent = (startPercent + endPercent) / 2;
                    
                    const isPositive = (annotation.percentage || 0) >= 0;
                    
                    // Calculate time span between start and end
                    const timeDiffMs = annotation.endTimestamp - annotation.startTimestamp;
                    const timeDiffDays = timeDiffMs / (1000 * 60 * 60 * 24);
                    const timeDiffHours = timeDiffMs / (1000 * 60 * 60);
                    const timeDiffMinutes = timeDiffMs / (1000 * 60);
                    
                    let timeSpanText = '';
                    if (timeDiffDays >= 1) {
                      const days = Math.floor(timeDiffDays);
                      timeSpanText = `${days} day${days !== 1 ? 's' : ''}`;
                    } else if (timeDiffHours >= 1) {
                      const hours = Math.floor(timeDiffHours);
                      timeSpanText = `${hours} hour${hours !== 1 ? 's' : ''}`;
                    } else {
                      const minutes = Math.floor(timeDiffMinutes);
                      timeSpanText = `${minutes} min${minutes !== 1 ? 's' : ''}`;
                    }
                    
                    return (
                      <div
                        key={annotation.id}
                        className="absolute"
                        style={{ left: `${midPercent}%`, top: `${20 + (annotation.verticalOffset || 0)}px`, transform: `translateX(calc(-50% + ${annotation.horizontalOffset || 0}px))` }}
                      >
                        <div 
                          className="rounded px-2 py-1 text-xs pointer-events-auto shadow-lg cursor-grab hover:opacity-80 overflow-hidden"
                          style={{ backgroundColor: '#121212', border: `1px solid ${isPositive ? '#22c55e' : '#ef4444'}` }}
                          onMouseDown={(e) => handleTextMouseDown(e, annotation)}
                          onDoubleClick={() => handleAnnotationDoubleClick(annotation)}
                          title="Click and drag to move in any direction, double-click to delete"
                        >
                          <div className={`font-bold text-left whitespace-nowrap ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {isPositive ? '↗' : '↘'} {(annotation.percentage || 0).toFixed(2)}%
                          </div>
                          <div className="text-xs text-muted-foreground text-left whitespace-nowrap">
                            {formatPrice(annotation.startPrice || 0)} → {formatPrice(annotation.endPrice || 0)}
                          </div>
                          <div className="text-[10px] text-muted-foreground text-left mt-0.5 whitespace-nowrap">
                            {timeSpanText}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}

            {/* Interactive overlay elements for horizontal lines */}
            {annotations.filter(annotation => annotation.type === 'horizontal').map((annotation) => {
              if (!chartData?.data) return null;
              
              // Calculate Y position using Y-axis domain (handles price/percentage mode)
              const yAxisDomain = getPriceAxisDomain();
              let annotationValue = annotation.price;
              
              // Convert annotation price to appropriate coordinate system
              if (yAxisDisplayMode === 'percentage' && chartData?.data?.length > 0) {
                // Find a baseline price (first data point's close price)
                const baselinePrice = chartData.data[0]?.close;
                if (baselinePrice && baselinePrice > 0) {
                  // Convert stored price to percentage change from baseline
                  annotationValue = ((annotation.price - baselinePrice) / baselinePrice) * 100;
                }
              }
              
              // Chart dimensions (approximate)  
              const chartHeight = 320; // Price chart height
              const chartTop = 80; // Account for header margin
              
              // Calculate position using Y-axis domain
              let domainMin, domainMax;
              if (typeof yAxisDomain[0] === 'string') {
                // Handle 'dataMin - X' and 'dataMax + X' format
                const prices = yAxisDisplayMode === 'percentage' 
                  ? chartData.data.map(d => (d as any).percentageChange || 0)
                  : chartData.data.flatMap(d => [d.high, d.low, d.open, d.close]);
                domainMin = Math.min(...prices) - (yAxisDisplayMode === 'percentage' ? 0.5 : 1);
                domainMax = Math.max(...prices) + (yAxisDisplayMode === 'percentage' ? 0.5 : 1);
              } else {
                domainMin = yAxisDomain[0];
                domainMax = yAxisDomain[1];
              }
              
              const yRange = domainMax - domainMin;
              const yPercent = (domainMax - annotationValue) / yRange; // Position from top
              const yPixels = chartTop + (yPercent * chartHeight);
              
              return (
                <div
                  key={`interactive-${annotation.id}`}
                  className="absolute pointer-events-auto cursor-grab active:cursor-grabbing hover:opacity-80"
                  style={{ 
                    left: '60px', // Chart left margin
                    right: '30px', // Chart right margin
                    top: `${yPixels - 8}px`, 
                    height: '16px', // Large hit area
                    zIndex: 20,
                    backgroundColor: 'transparent'
                  }}
                  onMouseDown={(e) => {
                    setIsDragging(true);
                    setDragAnnotationId(annotation.id);
                    setDragStartY(e.clientY);
                    setDragStartPrice(annotation.price);
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDoubleClick={() => handleAnnotationDoubleClick(annotation)}
                  title="Click and drag to move horizontal line"
                  data-testid={`horizontal-line-drag-${annotation.id}`}
                />
              );
            })}

            {/* Price Chart - Dynamic chart type */}
            <div className="h-80 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartDataWithDividendOverlay || chartDataWithMA}
                  margin={{ top: 15, right: 0, left: 0, bottom: -5 }}
                  onClick={handleChartClick}
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
                  
                  {/* Custom grid lines - horizontal dashed, vertical solid */}
                  {/* Horizontal grid lines (dashed) */}
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="#3B3B3B" 
                    opacity={0.5}
                    horizontal={true}
                    vertical={false}
                  />
                  {/* Vertical grid lines (solid) */}
                  <CartesianGrid 
                    stroke="#3B3B3B" 
                    strokeWidth={1}
                    opacity={0.3}
                    horizontal={false}
                    vertical={true}
                  />
                  
                  {/* X-axis with date/time labels */}
                  <XAxis 
                    dataKey="time"
                    tickFormatter={(value) => formatTime(value, selectedTimeframe)}
                    tick={{ fontSize: 12, fill: '#F7F7F7' }}
                    tickLine={{ stroke: '#F7F7F7' }}
                    axisLine={{ stroke: '#F7F7F7' }}
                  />

                  {/* Primary Y-axis for price (right side) - clickable to toggle to percentage view */}
                  <YAxis 
                    yAxisId="price"
                    orientation="right"
                    domain={getPriceAxisDomain()}
                    allowDataOverflow={priceAxisMode === 'fixed'}
                    dataKey={yAxisDisplayMode === 'percentage' ? 'percentageChange' : 'close'}
                    tick={(props) => (
                      <g 
                        onClick={handleYAxisClick}
                        style={{ cursor: 'pointer' }}
                        className="group"
                      >
                        <text
                          x={props.x}
                          y={props.y}
                          dx={0}
                          dy={0}
                          textAnchor={props.textAnchor}
                          fill="#F7F7F7"
                          className="group-hover:fill-[#5AF5FA] transition-colors duration-200"
                          fontSize={12}
                        >
                          {yAxisDisplayMode === 'percentage' ? `${props.payload.value.toFixed(1)}%` : formatPrice(props.payload.value)}
                        </text>
                      </g>
                    )}
                    axisLine={{ stroke: '#F7F7F7' }}
                    tickLine={{ stroke: '#F7F7F7' }}
                    width={60}
                  />
                  
                  {/* CSV Overlay Y-axis (left side) */}
                  {csvOverlay.length > 0 && (
                    <YAxis
                      yAxisId="overlay"
                      orientation="left"
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                      stroke="#b0b0b0"
                      tick={{ fill: '#b0b0b0', fontSize: 11 }}
                      width={50}
                      axisLine={{ stroke: '#b0b0b0' }}
                      tickLine={{ stroke: '#b0b0b0' }}
                    />
                  )}
                  
                  {showHoverTooltip && (
                    <Tooltip 
                      active={!isDragging}
                      allowEscapeViewBox={{ x: false, y: false }}
                      cursor={annotationMode ? false : { stroke: '#666', strokeWidth: 1, strokeDasharray: '5 5' }}
                      content={(props) => {
                        if (!props.active || !props.payload?.length) return null;
                        
                        const data = props.payload[0]?.payload;
                        if (!data) return null;
                        
                        const date = new Date(props.label);
                        const dateStr = formatTime(props.label, selectedTimeframe);
                        const timeStr = date.toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false 
                        });
                        
                        return (
                          <div style={{
                            backgroundColor: 'rgba(18, 18, 18, 0.7)',
                            border: '1px solid rgba(51, 51, 51, 0.5)',
                            borderRadius: '6px',
                            color: '#F7F7F7',
                            padding: '6px 10px',
                            fontSize: '11px',
                            opacity: 0.8
                          }}>
                            <div style={{ 
                              marginBottom: '6px', 
                              lineHeight: '1.4',
                              paddingBottom: '3px',
                              borderBottom: '1px solid rgba(51, 51, 51, 0.5)'
                            }}>{`${dateStr} ${timeStr}`}</div>
                            {chartType === 'candlestick' && data.open && data.high && data.low && data.close ? (
                              <>
                                <div>Open: {formatPrice(data.open)}</div>
                                <div>High: {formatPrice(data.high)}</div>
                                <div>Low: {formatPrice(data.low)}</div>
                                <div>Close: {formatPrice(data.close)}</div>
                              </>
                            ) : (
                              <>
                                {yAxisDisplayMode === 'percentage' && data.percentageChange !== undefined ? (
                                  <div>Change: {data.percentageChange.toFixed(2)}%</div>
                                ) : (
                                  <div>Price: {formatPrice(data.close)}</div>
                                )}
                              </>
                            )}
                            {/* Show dividend overlay information */}
                            {showDividendOverlay && data.dividendAdjustedClose !== undefined && (
                              <>
                                <div style={{ 
                                  marginTop: '6px',
                                  paddingTop: '4px',
                                  borderTop: '1px solid rgba(51, 51, 51, 0.5)'
                                }}>
                                  <div style={{ color: '#808080' }}>Non-Adjusted: {formatPrice(data.dividendAdjustedClose)}</div>
                                  {data.cumulativeDividends > 0 && (
                                    <div style={{ color: '#5AF5FA', fontSize: '10px' }}>
                                      Dividends: {formatPrice(data.cumulativeDividends)}
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                            {/* Show CSV overlay information */}
                            {csvOverlay.length > 0 && (data as any).csvOverlay !== undefined && (data as any).csvOverlay !== null && (
                              <div style={{ 
                                marginTop: '6px',
                                paddingTop: '4px',
                                borderTop: '1px solid rgba(51, 51, 51, 0.5)'
                              }}>
                                <div style={{ color: '#FFFFFF', fontSize: '10px' }}>
                                  CSV Overlay: {(data as any).csvOverlay.toFixed(2)}%
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }}

                    />
                  )}
                  
                  {/* Dynamic chart rendering based on chart type */}
                  {chartType === 'line' ? (
                    <Line
                      yAxisId="price"
                      type="linear"
                      dataKey={yAxisDisplayMode === 'percentage' ? 'percentageChange' : 'close'}
                      stroke={lineColor}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: lineColor, stroke: '#121212', strokeWidth: 2 }}
                    />
                  ) : chartType === 'candlestick' ? (
                    <Customized 
                      component={(props: any) => {
                        const { payload, xAxisMap, yAxisMap } = props;
                        if (!xAxisMap || !yAxisMap || !chartDataWithMA) return null;
                        
                        const xAxis = xAxisMap[0];
                        const yAxis = yAxisMap.price;
                        if (!xAxis || !yAxis) return null;
                        
                        return (
                          <g>
                            {chartDataWithMA.map((data, index) => {
                              if (!data.open || !data.high || !data.low || !data.close) return null;
                              
                              const x = xAxis.x + (index / (chartDataWithMA.length - 1)) * xAxis.width;
                              const bodyWidth = Math.max(1, xAxis.width / chartDataWithMA.length * 0.6);
                              
                              // Calculate Y positions
                              const priceRange = yAxis.domain[1] - yAxis.domain[0];
                              const openY = yAxis.y + yAxis.height - ((data.open - yAxis.domain[0]) / priceRange) * yAxis.height;
                              const closeY = yAxis.y + yAxis.height - ((data.close - yAxis.domain[0]) / priceRange) * yAxis.height;
                              const highY = yAxis.y + yAxis.height - ((data.high - yAxis.domain[0]) / priceRange) * yAxis.height;
                              const lowY = yAxis.y + yAxis.height - ((data.low - yAxis.domain[0]) / priceRange) * yAxis.height;
                              
                              const isGreen = data.close >= data.open;
                              const bodyColor = isGreen ? '#22C55E' : '#EF4444';
                              const wickColor = '#F7F7F7';
                              
                              const bodyTop = isGreen ? closeY : openY;
                              const bodyBottom = isGreen ? openY : closeY;
                              const bodyHeight = Math.abs(closeY - openY) || 1;
                              
                              return (
                                <g key={index}>
                                  {/* High-Low Wick */}
                                  <line
                                    x1={x}
                                    y1={highY}
                                    x2={x}
                                    y2={lowY}
                                    stroke={wickColor}
                                    strokeWidth={1}
                                  />
                                  {/* Body */}
                                  <rect
                                    x={x - bodyWidth / 2}
                                    y={bodyTop}
                                    width={bodyWidth}
                                    height={bodyHeight}
                                    fill={bodyColor}
                                    stroke={bodyColor}
                                    strokeWidth={1}
                                  />
                                </g>
                              );
                            })}
                          </g>
                        );
                      }}
                    />
                  ) : (
                    <Area
                      yAxisId="price"
                      type="linear" 
                      dataKey={yAxisDisplayMode === 'percentage' ? 'percentageChange' : 'close'}
                      stroke={lineColor}
                      strokeWidth={2}
                      fill={`url(#${isPositive ? 'positiveGradient' : 'negativeGradient'})`}
                      dot={false}
                      activeDot={{ r: 4, fill: lineColor, stroke: '#121212', strokeWidth: 2 }}
                    />
                  )}
                  
                  {/* Invisible overlay line for candlestick tooltip data */}
                  {chartType === 'candlestick' && (
                    <Line 
                      yAxisId="price" 
                      type="linear" 
                      dataKey="close" 
                      strokeOpacity={0} 
                      strokeWidth={1} 
                      dot={false} 
                      activeDot={false} 
                      isAnimationActive={false}
                      connectNulls
                    />
                  )}
                  
                  {/* Dividend Overlay Line - shows non-dividend adjusted prices */}
                  {showDividendOverlay && dividendData?.dividends && dividendData.dividends.length > 0 && (
                    <Line
                      yAxisId="price"
                      type="stepAfter" // Use stepAfter to show the step-up immediately after ex-dividend
                      dataKey="dividendAdjustedClose"
                      stroke="#808080" // Grey line as specified
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#808080', stroke: '#121212', strokeWidth: 2 }}
                      name="Non-Adjusted Price"
                      isAnimationActive={false}
                    />
                  )}
                  
                  {/* CSV Overlay Line - shows percentage overlay data */}
                  {csvOverlay.length > 0 && (
                    <Line
                      yAxisId="overlay"
                      type="monotone"
                      dataKey="csvOverlay"
                      stroke="#FFFFFF"
                      strokeWidth={2}
                      dot={false}
                      name="CSV Overlay"
                      connectNulls
                      activeDot={{ r: 4, fill: '#FFFFFF', stroke: '#121212', strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                  )}
                  
                  {/* Custom annotation markers and percentage lines */}
                  <Customized 
                    component={(props: any) => {
                      const { payload, xAxisMap, yAxisMap } = props;
                      
                      const xAxis = xAxisMap[Object.keys(xAxisMap)[0]];
                      const yAxis = yAxisMap['price'];
                      
                      if (!xAxis || !yAxis) return null;
                      
                      return (
                        <g>
                          {/* Render horizontal annotations using proper Recharts scale */}
                          {annotations.filter(annotation => annotation.type === 'horizontal').map((annotation) => {
                            // Helper function to convert stored price to current display mode value
                            const getDisplayValue = () => {
                              if (yAxisDisplayMode === 'percentage' && chartDataWithMA?.length > 0) {
                                // Use first data point as baseline for consistent conversion
                                const baselinePrice = chartDataWithMA[0]?.close;
                                if (baselinePrice && baselinePrice > 0) {
                                  return ((annotation.price - baselinePrice) / baselinePrice) * 100;
                                }
                              }
                              return annotation.price;
                            };
                            
                            const displayValue = getDisplayValue();
                            // Use Recharts scale for accurate positioning
                            const y = yAxis.scale(displayValue);
                            
                            const isBeingDragged = isDragging && dragAnnotationId === annotation.id;
                            const lineColor = isBeingDragged ? "#FFD700" : "#AA99FF";
                            
                            return (
                              <g key={`horizontal-${annotation.id}`}>
                                {/* Invisible wider line for better hit detection */}
                                <line
                                  x1={xAxis.x}
                                  y1={y}
                                  x2={xAxis.x + xAxis.width}
                                  y2={y}
                                  stroke="transparent"
                                  strokeWidth={12}
                                  style={{ cursor: 'pointer' }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onDoubleClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleAnnotationDoubleClick(annotation);
                                  }}
                                />
                                {/* Visible horizontal line */}
                                <line
                                  x1={xAxis.x}
                                  y1={y}
                                  x2={xAxis.x + xAxis.width}
                                  y2={y}
                                  stroke={lineColor}
                                  strokeWidth={isBeingDragged ? 3 : 2}
                                  style={{ pointerEvents: 'none' }}
                                />
                              </g>
                            );
                          })}
                          
                          {annotations.filter(annotation => annotation.type === 'percentage').map((annotation) => {
                            if (!annotation.endPrice) return null;
                            
                            const isBeingDragged = isDragging && dragAnnotationId === annotation.id;
                            const lineColor = isBeingDragged ? "#7755CC" : "#AA99FF";
                            
                            const x1 = xAxis.scale(annotation.time) + (xAxis.offset?.left || 0);
                            const y1 = yAxis.scale(annotation.price);
                            const x2 = xAxis.scale(annotation.endTime || annotation.time) + (xAxis.offset?.left || 0);
                            const y2 = yAxis.scale(annotation.endPrice);
                            
                            return (
                              <g key={annotation.id}>
                                {/* Connection line */}
                                <line
                                  x1={x1}
                                  y1={y1}
                                  x2={x2}
                                  y2={y2}
                                  stroke={lineColor}
                                  strokeWidth={isBeingDragged ? 3 : 2}
                                  strokeDasharray="4 4"
                                />
                                {/* Start point dot */}
                                <circle
                                  cx={x1}
                                  cy={y1}
                                  r={3}
                                  fill={lineColor}
                                  stroke="#121212"
                                  strokeWidth={1}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onDoubleClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleAnnotationDoubleClick(annotation);
                                  }}
                                />
                                {/* End point dot */}
                                <circle
                                  cx={x2}
                                  cy={y2}
                                  r={3}
                                  fill={lineColor}
                                  stroke="#121212"
                                  strokeWidth={1}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onDoubleClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleAnnotationDoubleClick(annotation);
                                  }}
                                />
                              </g>
                            );
                          })}
                        </g>
                      );
                    }}
                  />

                  {/* Custom grid lines - horizontal dashed, vertical solid */}
                  {/* Horizontal grid lines (dashed) */}
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="#3B3B3B" 
                    opacity={0.5}
                    horizontal={true}
                    vertical={false}
                  />
                  {/* Vertical grid lines (solid) */}
                  <CartesianGrid 
                    stroke="#3B3B3B" 
                    strokeWidth={1}
                    opacity={0.3}
                    horizontal={false}
                    vertical={true}
                  />
                  
                  {/* X-axis with date/time labels */}
                  <XAxis 
                    dataKey="time"
                    tickFormatter={(value) => formatTime(value, selectedTimeframe)}
                    tick={{ fontSize: 12, fill: '#F7F7F7' }}
                    tickLine={{ stroke: '#F7F7F7' }}
                    axisLine={{ stroke: '#F7F7F7' }}
                  />

                  {/* Primary Y-axis for price (right side) - clickable to toggle to percentage view */}
                  <YAxis 
                    yAxisId="price"
                    orientation="right"
                    domain={getPriceAxisDomain()}
                    allowDataOverflow={priceAxisMode === 'fixed'}
                    dataKey={yAxisDisplayMode === 'percentage' ? 'percentageChange' : 'close'}
                    tick={(props) => (
                      <g 
                        onClick={handleYAxisClick}
                        style={{ cursor: 'pointer' }}
                        className="group"
                      >
                        <text
                          x={props.x}
                          y={props.y}
                          dx={0}
                          dy={0}
                          textAnchor={props.textAnchor}
                          fill="#F7F7F7"
                          className="group-hover:fill-[#5AF5FA] transition-colors duration-200"
                          fontSize={12}
                        >
                          {yAxisDisplayMode === 'percentage' ? `${props.payload.value.toFixed(1)}%` : formatPrice(props.payload.value)}
                        </text>
                      </g>
                    )}
                    axisLine={{ stroke: '#F7F7F7' }}
                    tickLine={{ stroke: '#F7F7F7' }}
                    width={60}
                  />
                  
                  {/* CSV Overlay Y-axis (left side) */}
                  {csvOverlay.length > 0 && (
                    <YAxis
                      yAxisId="overlay"
                      orientation="left"
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                      stroke="#b0b0b0"
                      tick={{ fill: '#b0b0b0', fontSize: 11 }}
                      width={50}
                      axisLine={{ stroke: '#b0b0b0' }}
                      tickLine={{ stroke: '#b0b0b0' }}
                    />
                  )}
                  
                  {showHoverTooltip && (
                    <Tooltip 
                      active={!isDragging}
                      allowEscapeViewBox={{ x: false, y: false }}
                      cursor={annotationMode ? false : { stroke: '#666', strokeWidth: 1, strokeDasharray: '5 5' }}
                      content={(props) => {
                        if (!props.active || !props.payload?.length) return null;
                        
                        const data = props.payload[0]?.payload;
                        if (!data) return null;
                        
                        const date = new Date(props.label);
                        const dateStr = formatTime(props.label, selectedTimeframe);
                        const timeStr = date.toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false 
                        });
                        
                        return (
                          <div style={{
                            backgroundColor: 'rgba(18, 18, 18, 0.7)',
                            border: '1px solid rgba(51, 51, 51, 0.5)',
                            borderRadius: '6px',
                            color: '#F7F7F7',
                            padding: '6px 10px',
                            fontSize: '11px',
                            opacity: 0.8
                          }}>
                            <div style={{ 
                              marginBottom: '6px', 
                              lineHeight: '1.4',
                              paddingBottom: '3px',
                              borderBottom: '1px solid rgba(51, 51, 51, 0.5)'
                            }}>{`${dateStr} ${timeStr}`}</div>
                            {chartType === 'candlestick' && data.open && data.high && data.low && data.close ? (
                              <>
                                <div>Open: {formatPrice(data.open)}</div>
                                <div>High: {formatPrice(data.high)}</div>
                                <div>Low: {formatPrice(data.low)}</div>
                                <div>Close: {formatPrice(data.close)}</div>
                              </>
                            ) : (
                              <>
                                {yAxisDisplayMode === 'percentage' && data.percentageChange !== undefined ? (
                                  <div>Change: {data.percentageChange.toFixed(2)}%</div>
                                ) : (
                                  <div>Price: {formatPrice(data.close)}</div>
                                )}
                              </>
                            )}
                            {/* Show dividend overlay information */}
                            {showDividendOverlay && data.dividendAdjustedClose !== undefined && (
                              <>
                                <div style={{ 
                                  marginTop: '6px',
                                  paddingTop: '4px',
                                  borderTop: '1px solid rgba(51, 51, 51, 0.5)'
                                }}>
                                  <div style={{ color: '#808080' }}>Non-Adjusted: {formatPrice(data.dividendAdjustedClose)}</div>
                                  {data.cumulativeDividends > 0 && (
                                    <div style={{ color: '#5AF5FA', fontSize: '10px' }}>
                                      Dividends: {formatPrice(data.cumulativeDividends)}
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                            {/* Show CSV overlay information */}
                            {csvOverlay.length > 0 && (data as any).csvOverlay !== undefined && (data as any).csvOverlay !== null && (
                              <div style={{ 
                                marginTop: '6px',
                                paddingTop: '4px',
                                borderTop: '1px solid rgba(51, 51, 51, 0.5)'
                              }}>
                                <div style={{ color: '#FFFFFF', fontSize: '10px' }}>
                                  CSV Overlay: {(data as any).csvOverlay.toFixed(2)}%
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }}

                    />
                  )}
                  
                  
                  {/* Text Annotation Reference Lines - yellow vertical lines */}
                  {annotations.filter(annotation => annotation.type === 'text').map((annotation) => (
                    <ReferenceLine 
                      key={annotation.id}
                      x={annotation.time}
                      yAxisId="price"
                      stroke="#FAFF50"
                      strokeWidth={1}
                      vectorEffect="non-scaling-stroke"
                      shapeRendering="crispEdges"
                    />
                  ))}

                  {/* Horizontal Annotation Reference Lines - purple styling */}
                  {annotations.filter(annotation => annotation.type === 'horizontal').map((annotation) => {
                    const isBeingDragged = isDragging && dragAnnotationId === annotation.id;
                    const lineColor = isBeingDragged ? "#7755CC" : "#AA99FF"; // Darker purple when dragging
                    return (
                      <ReferenceLine 
                        key={annotation.id}
                        y={annotation.price}
                        yAxisId="price"
                        stroke={lineColor}
                        strokeWidth={isBeingDragged ? 3 : 2}
                        vectorEffect="non-scaling-stroke"
                        shapeRendering="crispEdges"
                      />
                    );
                  })}


                  {/* Click Capture Overlay for Annotations - only active in annotation mode */}
                  {annotationMode === 'percentage' && (
                    <Customized 
                      component={(props: any) => {
                        const { offset, xAxisMap, payload } = props;
                        if (!offset || !xAxisMap || !chartDataWithMA) return null;
                        
                        const xAxis = xAxisMap[0];
                        if (!xAxis) return null;
                      
                      const handleOverlayClick = (e: React.MouseEvent) => {
                        if (!chartDataWithMA) return;
                        
                        // Get SVG coordinates with fallback
                        const svg = (e.currentTarget as SVGElement).ownerSVGElement;
                        let relativeX: number;
                        
                        if (svg && svg.getScreenCTM()) {
                          // Preferred method: SVG coordinate transformation
                          const pt = svg.createSVGPoint();
                          pt.x = e.clientX;
                          pt.y = e.clientY;
                          const inverse = svg.getScreenCTM()?.inverse();
                          if (inverse) {
                            const svgCoords = pt.matrixTransform(inverse);
                            relativeX = svgCoords.x - offset.left;
                          } else {
                            // Fallback: use bounding rect
                            const rect = svg.getBoundingClientRect();
                            relativeX = e.clientX - rect.left - offset.left;
                          }
                        } else {
                          // Fallback: use element bounding rect
                          const rect = e.currentTarget.getBoundingClientRect();
                          relativeX = e.clientX - rect.left;
                        }
                        
                        // Find closest data point by x coordinate
                        const xPercent = Math.max(0, Math.min(relativeX / offset.width, 1));
                        const dataIndex = Math.round(xPercent * (chartDataWithMA.length - 1));
                        const clampedIndex = Math.max(0, Math.min(dataIndex, chartDataWithMA.length - 1));
                        const clickedData = chartDataWithMA[clampedIndex];
                        
                        if (clickedData) {
                          // Create synthetic event for handleChartClick
                          const syntheticEvent = {
                            activePayload: [{ payload: clickedData }],
                            activeLabel: clickedData.time
                          };
                          handleChartClick(syntheticEvent);
                        }
                      };
                      
                      return (
                        <rect
                          x={offset.left}
                          y={offset.top}
                          width={offset.width}
                          height={offset.height}
                          fill="transparent"
                          style={{ pointerEvents: 'all', cursor: 'crosshair' }}
                          onClick={handleOverlayClick}
                        />
                      );
                    }}
                  />
                  )}

                  {/* Percentage Measurement Lines - white diagonal arrows */}
                  <Customized 
                    component={(props: any) => {
                      const { payload, xAxisMap, yAxisMap } = props;
                      if (!xAxisMap || !yAxisMap || !chartData?.data) return null;
                      
                      const xAxis = xAxisMap[0];
                      const yAxis = yAxisMap.price;
                      if (!xAxis || !yAxis) return null;
                      
                      return (
                        <g>
                          {annotations.filter(annotation => 
                            annotation.type === 'percentage' && 
                            annotation.startTimestamp && 
                            annotation.endTimestamp &&
                            annotation.startPrice !== undefined &&
                            annotation.endPrice !== undefined
                          ).map((annotation) => {
                            const startIndex = chartData.data.findIndex(d => d.timestamp === annotation.startTimestamp);
                            const endIndex = chartData.data.findIndex(d => d.timestamp === annotation.endTimestamp);
                            if (startIndex === -1 || endIndex === -1) return null;
                            
                            // Calculate positions using chart coordinate system
                            const x1 = xAxis.x + (startIndex / (chartData.data.length - 1)) * xAxis.width;
                            const x2 = xAxis.x + (endIndex / (chartData.data.length - 1)) * xAxis.width;
                            
                            // Convert stored prices to appropriate coordinate system for current display mode
                            let startValue = annotation.startPrice!;
                            let endValue = annotation.endPrice!;
                            
                            if (yAxisDisplayMode === 'percentage' && chartData?.data?.length > 0) {
                              // Find baseline price (first data point's close price)
                              const baselinePrice = chartData.data[0]?.close;
                              if (baselinePrice && baselinePrice > 0) {
                                // Convert stored prices to percentage change from baseline
                                startValue = ((annotation.startPrice! - baselinePrice) / baselinePrice) * 100;
                                endValue = ((annotation.endPrice! - baselinePrice) / baselinePrice) * 100;
                              }
                            }
                            
                            // Map values to Y coordinates - ensure they stay within chart bounds
                            const valueRange = yAxis.domain[1] - yAxis.domain[0];
                            const rawY1 = yAxis.y + yAxis.height - ((startValue - yAxis.domain[0]) / valueRange) * yAxis.height;
                            const rawY2 = yAxis.y + yAxis.height - ((endValue - yAxis.domain[0]) / valueRange) * yAxis.height;
                            // Clamp Y coordinates to stay within chart area
                            const y1 = Math.max(yAxis.y, Math.min(rawY1, yAxis.y + yAxis.height));
                            const y2 = Math.max(yAxis.y, Math.min(rawY2, yAxis.y + yAxis.height));
                            
                            const isPositive = (annotation.percentage || 0) >= 0;
                            const lineColor = isPositive ? '#22C55E' : '#EF4444'; // Green for positive, red for negative
                            
                            // Calculate arrow direction
                            const arrowSize = 12;
                            const angle = Math.atan2(y2 - y1, x2 - x1);
                            
                            // Arrow head points
                            const arrowX1 = x2 - arrowSize * Math.cos(angle - Math.PI / 6);
                            const arrowY1 = y2 - arrowSize * Math.sin(angle - Math.PI / 6);
                            const arrowX2 = x2 - arrowSize * Math.cos(angle + Math.PI / 6);
                            const arrowY2 = y2 - arrowSize * Math.sin(angle + Math.PI / 6);
                            
                            // Calculate text box position
                            const textBoxWidth = 240;
                            const textBoxHeight = 80;
                            const textBoxX = Math.min(x2 + 10, xAxis.x + xAxis.width - textBoxWidth);
                            const midY = (y1 + y2) / 2;
                            const textBoxY = Math.max(yAxis.y, Math.min(midY - textBoxHeight / 2, yAxis.y + yAxis.height - textBoxHeight));

                            return (
                              <g key={annotation.id} style={{ cursor: 'pointer' }}>
                                {/* Main line */}
                                <line
                                  x1={x1}
                                  y1={y1}
                                  x2={x2}
                                  y2={y2}
                                  stroke={lineColor}
                                  strokeWidth={2}
                                  vectorEffect="non-scaling-stroke"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onDoubleClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleAnnotationDoubleClick(annotation);
                                  }}
                                />
                                {/* Arrow head - outlined instead of filled */}
                                <polygon
                                  points={`${x2},${y2} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}`}
                                  fill="none"
                                  stroke={lineColor}
                                  strokeWidth={2}
                                  strokeLinejoin="round"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onDoubleClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleAnnotationDoubleClick(annotation);
                                  }}
                                />
                                {/* Start point dot */}
                                <circle
                                  cx={x1}
                                  cy={y1}
                                  r={3}
                                  fill={lineColor}
                                  stroke="#121212"
                                  strokeWidth={1}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onDoubleClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleAnnotationDoubleClick(annotation);
                                  }}
                                />
                                {/* End point dot */}
                                <circle
                                  cx={x2}
                                  cy={y2}
                                  r={3}
                                  fill={lineColor}
                                  stroke="#121212"
                                  strokeWidth={1}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onDoubleClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleAnnotationDoubleClick(annotation);
                                  }}
                                />
                                
                                {/* Percentage text box - COMPLETELY REMOVED per user request to eliminate duplicate */}
                              </g>
                            );
                          })}
                        </g>
                      );
                    }}
                  />

                </ComposedChart>
              </ResponsiveContainer>
              
              
            </div>

            {/* Spacing between charts */}
            <div className="my-3"></div>

            {/* Volume Bar Chart - Below with spacing */}
            <div className="h-40 w-full mt-2 relative volume-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart 
                  data={chartDataWithMA}
                  margin={{ top: -15, right: 0, left: 0, bottom: 15 }}
                >
                  {/* Custom grid lines - horizontal dashed, vertical solid */}
                  {/* Horizontal grid lines (dashed) */}
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="#3B3B3B" 
                    opacity={0.5}
                    horizontal={true}
                    vertical={false}
                  />
                  {/* Vertical grid lines (solid) */}
                  <CartesianGrid 
                    stroke="#3B3B3B" 
                    strokeWidth={1}
                    opacity={0.3}
                    horizontal={false}
                    vertical={true}
                  />
                  
                  <XAxis 
                    dataKey="time"
                    tickFormatter={(value) => formatTime(value, selectedTimeframe)}
                    tick={{ fontSize: 12, fill: '#F7F7F7' }}
                    axisLine={{ stroke: '#F7F7F7' }}
                    tickLine={{ stroke: '#F7F7F7' }}
                  />
                  
                  <YAxis 
                    orientation="right"
                    tickFormatter={(value) => formatNumber(value)}
                    tick={{ fontSize: 12, fill: '#F7F7F7' }}
                    axisLine={{ stroke: '#F7F7F7', strokeDasharray: 'none' }}
                    tickLine={{ stroke: '#F7F7F7' }}
                    width={60}
                    type="number"
                    domain={[0, 'dataMax']}
                  />
                  
                  {showHoverTooltip && (
                    <Tooltip 
                      active={!isDragging}
                      allowEscapeViewBox={{ x: false, y: false }}

                      formatter={(value: number, name: string, props: any) => {
                        if (name === 'volume') {
                          return [
                            <span style={{ color: '#AA99FF' }}>{formatNumber(value)}</span>, 
                            <span style={{ color: '#F7F7F7' }}>Volume</span>
                          ];
                        } else if (name === 'volumeMA') {
                          return [
                            <span style={{ color: '#F7F7F7' }}>{formatNumber(value)}</span>, 
                            <span style={{ color: '#F7F7F7' }}>20-Day MA</span>
                          ];
                        }
                        return [formatNumber(value), name];
                      }}
                      contentStyle={{
                        backgroundColor: '#121212',
                        border: '1px solid #333333',
                        borderRadius: '6px',
                        color: '#F7F7F7',
                        fontSize: '12px'
                      }}
                    />
                  )}
                  
                  <Bar 
                    dataKey="volume" 
                    opacity={0.7}
                    radius={[1, 1, 0, 0]}
                    fill="#AA99FF"
                  />
                  
                  {/* Volume Moving Average Line */}
                  <Line 
                    dataKey="volumeMA" 
                    stroke="#F7F7F7" 
                    strokeWidth={2}
                    dot={false}
                    connectNulls={true}
                    type="monotone"
                  />

                  {/* Earnings Markers - moved to volume chart */}
                  <Customized 
                    component={(props: any) => {
                      const { payload, xAxisMap, yAxisMap } = props;
                      if (!earningsData?.earnings || !chartData?.data) return null;
                      
                      const xAxis = xAxisMap[Object.keys(xAxisMap)[0]];
                      const yAxis = yAxisMap[Object.keys(yAxisMap)[0]];
                      
                      if (!xAxis || !yAxis) return null;
                      
                      return (
                        <>
                          {earningsData.earnings.map((earning: any, index: number) => {
                            // Find if this earnings date falls within our chart data
                            // Parse the date at noon UTC to avoid timezone issues with date-only strings
                            const earningsDate = new Date(earning.date + 'T12:00:00Z');
                            const earningsTime = earningsDate.toISOString();
                            
                            // Find the closest data point in chart (not just any within 24 hours)
                            let closestDataPoint = null;
                            let minTimeDiff = Infinity;
                            
                            for (const d of chartData.data) {
                              const chartDate = new Date(d.time);
                              const timeDiff = Math.abs(chartDate.getTime() - earningsDate.getTime());
                              
                              // Only consider points within 2 days (earnings could be pre/post market)
                              if (timeDiff < 2 * 24 * 60 * 60 * 1000 && timeDiff < minTimeDiff) {
                                minTimeDiff = timeDiff;
                                closestDataPoint = d;
                              }
                            }
                            
                            const dataPoint = closestDataPoint;
                            
                            if (!dataPoint) return null;
                            
                            // Calculate position using chart scales - positioned in volume chart area
                            const x = xAxis.scale(dataPoint.time) + (xAxis.offset?.left || 0);
                            const y = xAxis.y - 25; // Position above volume chart timeline
                            
                            return (
                              <g 
                                key={`earning-${earning.date}-${index}`}
                                style={{ cursor: 'pointer' }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEarningsModal({
                                    visible: true,
                                    data: earning
                                  });
                                }}
                              >
                                {/* Yellow circle */}
                                <circle
                                  cx={x}
                                  cy={y}
                                  r={8}
                                  fill="#FAFF50"
                                  stroke="#121212"
                                  strokeWidth={1}
                                />
                                {/* 'E' text inside circle */}
                                <text
                                  x={x}
                                  y={y + 2}
                                  textAnchor="middle"
                                  fontSize={10}
                                  fontWeight="bold"
                                  fill="#121212"
                                  style={{ pointerEvents: 'none' }}
                                >
                                  E
                                </text>
                              </g>
                            );
                          })}
                        </>
                      );
                    }}
                  />

                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        </TabsContent>

      {/* Annotation Input Modal */}
      {showAnnotationInput && (pendingAnnotation || editingAnnotation) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="border border-border rounded-lg p-6 w-96 max-w-[90vw]" style={{ backgroundColor: '#3A3A3A' }}>
            <h3 className="text-lg font-semibold mb-4">
              {isEditMode ? 'Edit Annotation' : 'Add Annotation'}
            </h3>
            <div className="mb-4 text-sm text-muted-foreground">
              <div>Time: {isEditMode ? editingAnnotation?.time : pendingAnnotation?.time}</div>
              <div>Price: {formatPrice(isEditMode ? editingAnnotation?.price || 0 : pendingAnnotation?.price || 0)}</div>
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

      {/* CSV Overlay Modal */}
      {showCsvModal && (
        <Dialog open={showCsvModal} onOpenChange={setShowCsvModal}>
          <DialogContent className="bg-[#1E1E1E] border-[#474747]">
            <DialogHeader>
              <DialogTitle className="text-[#f7f7f7]">Add % Overlay (CSV)</DialogTitle>
              <DialogDescription className="text-[#b0b0b0]">
                Upload or paste CSV data to add a percentage overlay to the chart.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-[#2A2A2A] p-4 rounded-md text-sm">
                <p className="font-semibold text-[#f7f7f7] mb-2">CSV Format Requirements</p>
                <ul className="list-disc list-inside space-y-1 text-[#b0b0b0]">
                  <li>Two columns only: date, value</li>
                  <li>date must be in YYYY-MM-DD format</li>
                  <li>value must be a decimal between 0 and 1 (0% to 100%)</li>
                  <li>No header row (first line is data)</li>
                </ul>
                <p className="mt-3 text-[#b0b0b0]">Example:</p>
                <pre className="mt-1 text-xs bg-[#1E1E1E] p-2 rounded">
2025-06-06,0.0255
2025-06-09,0.0325
2025-09-19,1
                </pre>
              </div>
              
              <Textarea
                placeholder="Paste CSV data here..."
                className="min-h-[200px] bg-[#2A2A2A] border-[#474747] text-[#f7f7f7]"
                id="csv-textarea"
              />
              
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  id="csv-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('csv-upload')?.click()}
                  className="flex-1"
                >
                  Upload CSV File
                </Button>
                <Button
                  onClick={handleCsvSubmit}
                  className="flex-1"
                >
                  Apply Overlay
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Earnings Modal Lightbox */}
      {earningsModal.visible && earningsModal.data && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setEarningsModal({ visible: false, data: null })}
        >
          <div
            className="border border-border rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 relative"
            style={{ backgroundColor: '#3A3A3A' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setEarningsModal({ visible: false, data: null })}
              aria-label="Close earnings modal"
            >
              ×
            </button>
            
            {/* Modal Content */}
            <div className="pr-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#FAFF50] rounded-full flex items-center justify-center">
                  <span className="text-black font-bold text-sm">E</span>
                </div>
                <div className="font-semibold text-lg">Quarterly Earnings</div>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">{new Date(earningsModal.data.date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Quarter:</span>
                  <span className="font-medium">Q{earningsModal.data.quarter} {earningsModal.data.year}</span>
                </div>
                
                {/* EPS Section */}
                <div className="pt-2 border-t border-border">
                  <div className="font-medium text-[#5AF5FA] mb-2">Earnings Per Share</div>
                  {earningsModal.data.epsActual !== null && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">EPS Actual:</span>
                      <span className="font-medium text-[#5AF5FA]">{formatPrice(earningsModal.data.epsActual)}</span>
                    </div>
                  )}
                  {earningsModal.data.epsEstimate !== null && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">EPS Estimate:</span>
                      <span className="font-medium">{formatPrice(earningsModal.data.epsEstimate)}</span>
                    </div>
                  )}
                  {earningsModal.data.epsActual !== null && earningsModal.data.epsEstimate !== null && (
                    <div className="flex justify-between gap-4 mt-2 pt-2 border-t border-border/50">
                      <span className="text-muted-foreground">Beat/Miss:</span>
                      <span className={`font-medium ${
                        earningsModal.data.epsActual >= earningsModal.data.epsEstimate 
                          ? 'text-green-500' 
                          : 'text-red-500'
                      }`}>
                        {earningsModal.data.epsActual >= earningsModal.data.epsEstimate ? '✓ Beat' : '✗ Miss'}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Revenue Section */}
                {(earningsModal.data.revenueActual !== null || earningsModal.data.revenueEstimate !== null) && (
                  <div className="pt-3 border-t border-border">
                    <div className="font-medium text-[#5AF5FA] mb-2">Revenue</div>
                    {earningsModal.data.revenueActual !== null && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Revenue Actual:</span>
                        <span className="font-medium text-[#5AF5FA]">{formatRevenue(earningsModal.data.revenueActual)}</span>
                      </div>
                    )}
                    {earningsModal.data.revenueEstimate !== null && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Revenue Estimate:</span>
                        <span className="font-medium">{formatRevenue(earningsModal.data.revenueEstimate)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
        
        <TabsContent value="comparison" className="bg-background relative z-10" data-testid="tabpanel-comparison">
          <ComparisonChart 
            timeframe={selectedTimeframe} 
            startDate={startDate} 
            endDate={endDate}
            singleTradingDay={singleTradingDay}
            annotations={annotations}
            onAnnotationsChange={onAnnotationsChange}
            annotationMode={annotationMode}
            pendingPercentageStart={pendingPercentageStart}
            setPendingPercentageStart={setPendingPercentageStart}
            updateAnnotations={updateAnnotations}
            showHoverTooltip={showHoverTooltip}
            onZoomIn={(fn) => { if (fn && typeof fn === 'function') comparisonZoomInRef.current = fn; }}
            onZoomOut={(fn) => { if (fn && typeof fn === 'function') comparisonZoomOutRef.current = fn; }}
            onFitToData={(fn) => { if (fn && typeof fn === 'function') comparisonFitToDataRef.current = fn; }}
          />
        </TabsContent>
      </Tabs>

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

      {/* Chart History Log */}
      <Card className="p-6 mt-8" style={{ backgroundColor: '#121212' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Chart History Log</h3>
          {chartHistory.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteAllChartHistoryMutation.mutate()}
              className="flex items-center gap-2 hover:bg-transparent"
              data-testid="button-delete-all-history"
            >
              <Trash2 
                className="h-4 w-4 transition-colors" 
                style={{ color: '#F7F7F7' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#5AF5FA'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#F7F7F7'}
              />
              <span 
                className="text-sm transition-colors"
                style={{ color: '#F7F7F7' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#5AF5FA'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#F7F7F7'}
              >
                Delete All
              </span>
            </Button>
          )}
        </div>
        <div className="h-[350px] overflow-y-scroll">
          {chartHistory.length > 0 ? (
            <div className="space-y-3">
              {chartHistory.map((entry) => {
                const annotationCounts = entry.annotations.reduce((acc, ann) => {
                  const type = ann.type === 'text' ? 'Text' : 
                               ann.type === 'percentage' ? 'Measure' : 
                               'Horizontal';
                  acc[type] = (acc[type] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);

                const annotationSummary = Object.entries(annotationCounts)
                  .map(([type, count]) => `${count} ${type}`)
                  .join(', ');

                return (
                  <Card 
                    key={entry.id} 
                    className="p-4 bg-muted/50 cursor-pointer transition-all duration-200 hover:bg-muted/70 relative group" 
                    data-testid={`chart-history-${entry.id}`}
                    onClick={() => restoreFromHistory(entry)}
                    style={{
                      borderRadius: '4px',
                    }}
                  >
                    {/* Hover gradient border */}
                    <div 
                      className="absolute inset-0 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                      style={{
                        background: 'linear-gradient(90deg, #5AF5FA 0%, #FFA5FF 100%)',
                        padding: '1px',
                        borderRadius: '4px',
                        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        WebkitMaskComposite: 'xor',
                        maskComposite: 'exclude',
                      }}
                    />
                    <div className="flex items-start justify-between relative z-10">
                      <div className="flex-1">
                        <div className="font-bold text-[#5AF5FA] mb-1">
                          {entry.symbol}
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          {format(new Date(entry.savedAt), 'MMM dd, yyyy HH:mm:ss')}
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">
                          Timeframe: {entry.timeframe}
                          {entry.dividendAdjusted && ' • Dividend Adjusted'}
                          {entry.csvOverlay && entry.csvOverlay.length > 0 && ` • CSV Overlay (${entry.csvOverlay.length} points)`}
                        </div>
                        <div className="text-sm text-foreground">
                          {annotationSummary || 'No annotations'}
                        </div>
                      </div>
                      {/* Delete button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChartHistoryMutation.mutate(entry.id);
                        }}
                        className="ml-2 p-1 h-auto hover:bg-transparent"
                        data-testid={`button-delete-history-${entry.id}`}
                      >
                        <Trash2 
                          className="h-4 w-4 transition-colors" 
                          style={{ color: '#F7F7F7' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#5AF5FA'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#F7F7F7'}
                        />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-center">
              <p data-testid="text-no-history">No chart history yet. Annotate a chart to see it here.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  return chartContent;
}