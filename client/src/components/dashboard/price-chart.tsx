import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, Customized } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip as HoverTooltip, TooltipContent as HoverTooltipContent, TooltipProvider, TooltipTrigger as HoverTooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, TrendingUp, TrendingDown, Plus, Calendar as CalendarIcon, X, Download, ChevronDown, MessageSquare, Ruler, Minus, RotateCcw } from 'lucide-react';
import { format, subDays, subMonths, subYears } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import { ComparisonChart } from './comparison-chart';

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
  type: 'text' | 'percentage' | 'horizontal';
  x: number; // X coordinate on chart
  y: number; // Y coordinate on chart
  timestamp: number; // Data point timestamp
  price: number; // Price at this point
  text?: string; // User annotation text (for text and horizontal types)
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
  percentChange, 
  marketCap,
  annotations: controlledAnnotations,
  onAnnotationsChange,
  rememberPerTicker = true,
  onClearAll
}: PriceChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeTab, setActiveTab] = useState('price-volume');
  const chartRef = useRef<HTMLDivElement>(null);
  const comparisonRef = useRef<HTMLDivElement>(null);
  
  // Annotation state - controlled if parent provides annotations
  const [internalAnnotations, setInternalAnnotations] = useState<Annotation[]>([]);
  const [showAnnotationInput, setShowAnnotationInput] = useState(false);
  const [annotationInput, setAnnotationInput] = useState('');
  const [pendingAnnotation, setPendingAnnotation] = useState<Omit<Annotation, 'id' | 'text'> | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Percentage measurement state
  const [annotationMode, setAnnotationMode] = useState<'text' | 'percentage' | 'horizontal'>('text');
  const [pendingPercentageStart, setPendingPercentageStart] = useState<{
    timestamp: number;
    price: number;
    time: string;
  } | null>(null);
  
  // Drag state for horizontal lines
  const [isDragging, setIsDragging] = useState(false);
  const [dragAnnotationId, setDragAnnotationId] = useState<string | null>(null);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartPrice, setDragStartPrice] = useState(0);
  
  // Use controlled annotations if provided, otherwise use internal state
  const annotations = controlledAnnotations || internalAnnotations;
  
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

  // Drag functionality for horizontal lines
  const handleMouseDown = (event: React.MouseEvent) => {
    if (!chartRef.current || annotationMode !== null) return;
    
    const rect = chartRef.current.getBoundingClientRect();
    const mouseY = event.clientY - rect.top;
    
    if (!chartData?.data) return;
    
    // Convert mouse Y to price value
    const chartHeight = rect.height - 120; // Account for margins and axis labels
    const chartTop = 60; // Account for top margin
    const relativeY = mouseY - chartTop;
    
    // Calculate price range from chart data
    const prices = chartData.data.flatMap(d => [d.high, d.low, d.open, d.close]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const priceAtMouse = maxPrice - (relativeY / chartHeight) * priceRange;
    
    // Find the closest horizontal annotation
    const horizontalAnnotations = annotations.filter(ann => ann.type === 'horizontal') as Annotation[];
    let closestAnnotation: Annotation | null = null;
    let closestDistance = Infinity;
    
    horizontalAnnotations.forEach(annotation => {
      const distance = Math.abs(annotation.price - priceAtMouse);
      const toleranceInPrice = priceRange * 0.02; // 2% of price range tolerance
      if (distance < closestDistance && distance < toleranceInPrice) {
        closestDistance = distance;
        closestAnnotation = annotation;
      }
    });
    
    if (closestAnnotation) {
      setIsDragging(true);
      setDragAnnotationId(closestAnnotation.id);
      setDragStartY(mouseY);
      setDragStartPrice(closestAnnotation.price);
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

  // Add global mouse up listener to handle drag end outside chart
  React.useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => handleMouseUp();
      const handleGlobalMouseMove = (event: MouseEvent) => {
        if (!chartRef.current) return;
        handleMouseMove(event as any);
      };
      
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('mousemove', handleGlobalMouseMove);
      
      return () => {
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.removeEventListener('mousemove', handleGlobalMouseMove);
      };
    }
  }, [isDragging, dragAnnotationId, dragStartY, dragStartPrice]);
  
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

  const formatMarketCap = (marketCapInMillions: number) => {
    // Finnhub returns market cap in millions of dollars
    if (marketCapInMillions >= 1000000) return `${(marketCapInMillions / 1000000).toFixed(1)}T`;
    if (marketCapInMillions >= 1000) return `${(marketCapInMillions / 1000).toFixed(1)}B`;
    return `${marketCapInMillions.toFixed(1)}M`;
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
        // For custom ranges, use the compact format
        return date.toLocaleDateString('en-US', { 
          month: 'numeric',
          day: 'numeric',
          year: '2-digit'
        });
      default:
        return date.toLocaleDateString();
    }
  };

  const parseChange = parseFloat(actualPercentChange);
  const isPositive = parseChange >= 0;
  const lineColor = isPositive ? '#5AF5FA' : '#FFA5FF'; // Cyan for positive, Pink for negative
  
  // Calculate percentage change for each data point relative to first price
  const chartDataWithPercentage = chartData?.data?.map((item, index) => {
    const firstPrice = chartData.data[0]?.close || item.close;
    const percentageChange = ((item.close - firstPrice) / firstPrice) * 100;
    return { ...item, percentageChange };
  }) || [];

  const formatNumber = (num: number) => {
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num?.toLocaleString() || 'N/A';
  };

  // Handle chart click for annotations
  const handleChartClick = (event: any) => {
    if (!event || !chartDataWithPercentage) return;
    
    // For horizontal annotations, we handle ANY click on the chart (even without activePayload)
    if (annotationMode === 'horizontal') {
      // Freehand horizontal line placement
      if (event.chartY !== undefined && event.chartX !== undefined) {
        // We'll calculate the price from the click Y position
        // For timestamp, we'll use the current time or middle of the chart data
        const middleIndex = Math.floor(chartDataWithPercentage.length / 2);
        const timestamp = chartDataWithPercentage[middleIndex]?.timestamp || Date.now();
        const time = chartDataWithPercentage[middleIndex]?.time || new Date().toISOString();
        
        // Calculate price from Y coordinate
        let horizontalPrice = 0;
        
        // Get price range from chart data
        if (chartDataWithPercentage.length > 0) {
          const prices = chartDataWithPercentage.map(d => d.close).filter(p => p != null);
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
          horizontalPrice = yAxisMax - (relativeY * (yAxisMax - yAxisMin));
          
          // Ensure price is within reasonable bounds
          horizontalPrice = Math.max(yAxisMin, Math.min(yAxisMax, horizontalPrice));
          
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
        
        // Ensure clean state before setting new annotation
        setEditingAnnotation(null);
        setIsEditMode(false);
        setAnnotationInput('');
        setPendingAnnotation(newAnnotation);
        setShowAnnotationInput(true);
        return; // Exit early for horizontal annotations
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
    if (annotation.type === 'text' || annotation.type === 'horizontal') {
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

  // Export functions
  const exportAsPNG = async () => {
    try {
      // High resolution canvas - minimum 2000px width with space for volume chart
      const canvas = document.createElement('canvas');
      canvas.width = 2000;
      canvas.height = 1400; // Increased height for price + volume charts
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Enable high-quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Use transparent background for PNG export
      // No background fill - canvas starts transparent
      
      // Add title with proper font
      ctx.fillStyle = '#5AF5FA';
      ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${symbol} - ${name}`, 60, 80);
      
      // Add price info - fix the NaN issue
      ctx.fillStyle = '#F7F7F7';
      ctx.font = '36px system-ui, -apple-system, sans-serif';
      const price = actualCurrentPrice && actualCurrentPrice !== 'NaN' && actualCurrentPrice !== '--' ? formatPrice(parseFloat(actualCurrentPrice)) : 'N/A';
      const change = actualPercentChange && actualPercentChange !== '0' && actualPercentChange !== '--' ? actualPercentChange : 'N/A';
      const cap = actualMarketCap && actualMarketCap !== '--' ? actualMarketCap : 'N/A';
      
      ctx.fillText(`Price: ${price} (${change}%)`, 60, 140);
      ctx.fillText(`Market Cap: ${cap}`, 60, 190);
      
      // Add timeframe info
      const timeframeText = startDate && endDate 
        ? `Date Range: ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`
        : `Timeframe: ${selectedTimeframe}`;
      ctx.fillText(timeframeText, 60, 240);
      
      // Draw actual charts if data is available
      if (chartData?.data && chartData.data.length > 0) {
        // Price chart area (upper portion)
        const priceArea = { x: 120, y: 300, width: 1680, height: 500 };
        
        // Price chart area - transparent background for PNG export
        
        // Draw grid lines for price chart
        ctx.strokeStyle = 'rgba(59, 59, 59, 0.5)';
        ctx.lineWidth = 2;
        // Horizontal grid lines
        for (let i = 0; i <= 5; i++) {
          const y = priceArea.y + (i * priceArea.height / 5);
          ctx.beginPath();
          ctx.moveTo(priceArea.x, y);
          ctx.lineTo(priceArea.x + priceArea.width, y);
          ctx.stroke();
        }
        // Vertical grid lines
        const priceVerticalLines = Math.min(7, chartData.data.length);
        for (let i = 0; i < priceVerticalLines; i++) {
          const x = priceArea.x + (i / (priceVerticalLines - 1)) * priceArea.width;
          ctx.beginPath();
          ctx.moveTo(x, priceArea.y);
          ctx.lineTo(x, priceArea.y + priceArea.height);
          ctx.stroke();
        }
        
        // Get price data and calculate bounds
        const prices = chartData.data.map(d => d.close);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;
        
        // Create gradient mountain fill for price
        const gradient = ctx.createLinearGradient(0, priceArea.y, 0, priceArea.y + priceArea.height);
        if (isPositive) {
          gradient.addColorStop(0, '#5AF5FA40'); // Cyan with transparency
          gradient.addColorStop(1, '#5AF5FA00'); // Transparent
        } else {
          gradient.addColorStop(0, '#FFA5FF40'); // Pink with transparency  
          gradient.addColorStop(1, '#FFA5FF00'); // Transparent
        }
        
        // Draw gradient area fill first
        ctx.beginPath();
        ctx.moveTo(priceArea.x, priceArea.y + priceArea.height);
        
        chartData.data.forEach((point, index) => {
          const x = priceArea.x + (index / (chartData.data.length - 1)) * priceArea.width;
          const y = priceArea.y + priceArea.height - ((point.close - minPrice) / priceRange) * priceArea.height;
          
          if (index === 0) {
            ctx.lineTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        
        ctx.lineTo(priceArea.x + priceArea.width, priceArea.y + priceArea.height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw price line on top
        const lineColor = isPositive ? '#5AF5FA' : '#FFA5FF';
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        chartData.data.forEach((point, index) => {
          const x = priceArea.x + (index / (chartData.data.length - 1)) * priceArea.width;
          const y = priceArea.y + priceArea.height - ((point.close - minPrice) / priceRange) * priceArea.height;
          
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
        
        // Draw Y-axis labels (prices)
        ctx.fillStyle = '#F7F7F7';
        ctx.font = '24px system-ui, -apple-system, sans-serif';
        for (let i = 0; i <= 5; i++) {
          const price = minPrice + (i / 5) * priceRange;
          const y = priceArea.y + priceArea.height - (i * priceArea.height / 5);
          ctx.fillText(formatPrice(price), priceArea.x + priceArea.width + 20, y + 8);
        }
        
        // Draw white separator line
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(priceArea.x, priceArea.y + priceArea.height + 10);
        ctx.lineTo(priceArea.x + priceArea.width, priceArea.y + priceArea.height + 10);
        ctx.stroke();
        
        // Volume chart area (lower portion)
        const volumeArea = { x: 120, y: priceArea.y + priceArea.height + 30, width: 1680, height: 250 };
        
        // Volume chart area

        
        // Draw grid lines for volume chart
        ctx.strokeStyle = 'rgba(59, 59, 59, 0.5)';
        ctx.lineWidth = 2;
        // Horizontal grid lines
        for (let i = 0; i <= 3; i++) {
          const y = volumeArea.y + (i * volumeArea.height / 3);
          ctx.beginPath();
          ctx.moveTo(volumeArea.x, y);
          ctx.lineTo(volumeArea.x + volumeArea.width, y);
          ctx.stroke();
        }
        // Vertical grid lines
        const volumeVerticalLines = Math.min(7, chartData.data.length);
        for (let i = 0; i < volumeVerticalLines; i++) {
          const x = volumeArea.x + (i / (volumeVerticalLines - 1)) * volumeArea.width;
          ctx.beginPath();
          ctx.moveTo(x, volumeArea.y);
          ctx.lineTo(x, volumeArea.y + volumeArea.height);
          ctx.stroke();
        }
        
        // Get volume data and calculate bounds
        const volumes = chartData.data.map(d => d.volume);
        const maxVolume = Math.max(...volumes);
        
        // Draw volume bars
        chartData.data.forEach((point, index) => {
          // Green for buying pressure (close >= open), red for selling pressure (close < open)
          const isBullish = point.close >= point.open;
          ctx.fillStyle = isBullish ? '#22c55e' : '#ef4444';
          
          const barWidth = volumeArea.width / chartData.data.length * 0.8;
          const x = volumeArea.x + (index / chartData.data.length) * volumeArea.width + barWidth * 0.1;
          const barHeight = (point.volume / maxVolume) * volumeArea.height;
          const y = volumeArea.y + volumeArea.height - barHeight;
          
          ctx.fillRect(x, y, barWidth, barHeight);
        });
        
        // Draw Y-axis labels (volume)
        ctx.fillStyle = '#F7F7F7';
        ctx.font = '20px system-ui, -apple-system, sans-serif';
        for (let i = 0; i <= 3; i++) {
          const volume = (i / 3) * maxVolume;
          const y = volumeArea.y + volumeArea.height - (i * volumeArea.height / 3);
          ctx.fillText(formatNumber(volume), volumeArea.x + volumeArea.width + 20, y + 8);
        }
        
        // Draw X-axis labels at bottom with actual dates (more comprehensive)
        ctx.fillStyle = '#F7F7F7';
        ctx.font = '24px system-ui, -apple-system, sans-serif';
        
        // Show 6-8 date labels across the X-axis
        const numLabels = Math.min(7, chartData.data.length);
        for (let i = 0; i < numLabels; i++) {
          const dataIndex = Math.floor((i / (numLabels - 1)) * (chartData.data.length - 1));
          const date = formatTime(chartData.data[dataIndex].time, selectedTimeframe);
          const x = volumeArea.x + (i / (numLabels - 1)) * volumeArea.width;
          
          // Center the text, but adjust for edge labels
          let textX = x;
          if (i === 0) {
            textX = volumeArea.x; // Left align first label
          } else if (i === numLabels - 1) {
            textX = volumeArea.x + volumeArea.width - ctx.measureText(date).width; // Right align last label
          } else {
            textX = x - ctx.measureText(date).width / 2; // Center align middle labels
          }
          
          ctx.fillText(date, textX, volumeArea.y + volumeArea.height + 40);
        }
        
        // Draw earnings markers on export
        if (earningsData?.earnings?.length) {
          const toMs = (ts: number) => (String(ts).length === 10 ? ts * 1000 : ts);
          earningsData.earnings.forEach(e => {
            const eMs = new Date(e.date || e.datetime || e.announcementDate).getTime();
            let nearestIdx = 0;
            let best = Number.POSITIVE_INFINITY;
            chartData.data.forEach((d, i) => {
              const diff = Math.abs(toMs(d.timestamp) - eMs);
              if (diff < best) { best = diff; nearestIdx = i; }
            });
            const x = priceArea.x + (chartData.data.length > 1 ? (nearestIdx / (chartData.data.length - 1)) * priceArea.width : 0);
            const dotY = volumeArea.y + volumeArea.height - 10; // sits on timeline above labels
            ctx.fillStyle = '#FAFF50';
            ctx.beginPath();
            ctx.arc(x, dotY, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#121212';
            ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('E', x, dotY);
            ctx.textAlign = 'start';
            ctx.textBaseline = 'alphabetic';
          });
        }
        
        // Draw annotations
        if (annotations.length > 0) {
          annotations.forEach((annotation) => {
            if (annotation.type === 'text') {
              // Text annotations - yellow vertical lines
              const dataIndex = chartData.data.findIndex(d => d.timestamp === annotation.timestamp);
              if (dataIndex === -1) return;
              
              const x = priceArea.x + (dataIndex / (chartData.data.length - 1)) * priceArea.width;
              
              // Draw vertical annotation line
              ctx.strokeStyle = '#FAFF50'; // Brand yellow
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(x + 0.5, priceArea.y);
              ctx.lineTo(x + 0.5, volumeArea.y + volumeArea.height);
              ctx.stroke();
              
              // Draw annotation dot
              ctx.fillStyle = '#FAFF50';
              ctx.beginPath();
              ctx.arc(x + 0.5, priceArea.y, 3, 0, 2 * Math.PI);
              ctx.fill();
            } else if (annotation.type === 'percentage' && annotation.startTimestamp && annotation.endTimestamp) {
              // Percentage measurements - white diagonal arrows
              const startIndex = chartData.data.findIndex(d => d.timestamp === annotation.startTimestamp);
              const endIndex = chartData.data.findIndex(d => d.timestamp === annotation.endTimestamp);
              if (startIndex === -1 || endIndex === -1) return;
              
              const x1 = priceArea.x + (startIndex / (chartData.data.length - 1)) * priceArea.width;
              const x2 = priceArea.x + (endIndex / (chartData.data.length - 1)) * priceArea.width;
              
              // Map prices to Y coordinates 
              const minPrice = Math.min(...chartData.data.map(d => d.low));
              const maxPrice = Math.max(...chartData.data.map(d => d.high));
              const priceRange = maxPrice - minPrice;
              const y1 = priceArea.y + priceArea.height - ((annotation.startPrice! - minPrice) / priceRange) * priceArea.height;
              const y2 = priceArea.y + priceArea.height - ((annotation.endPrice! - minPrice) / priceRange) * priceArea.height;
              
              // Determine line color based on percentage
              const isPositive = (annotation.percentage || 0) >= 0;
              const lineColor = isPositive ? '#22C55E' : '#EF4444'; // Green for positive, red for negative
              
              // Draw main line
              ctx.strokeStyle = lineColor;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
              
              // Draw outlined arrow head (larger)
              const arrowSize = 12;
              const angle = Math.atan2(y2 - y1, x2 - x1);
              
              ctx.strokeStyle = lineColor;
              ctx.lineWidth = 2;
              ctx.lineJoin = 'round';
              ctx.beginPath();
              ctx.moveTo(x2, y2);
              ctx.lineTo(x2 - arrowSize * Math.cos(angle - Math.PI / 6), y2 - arrowSize * Math.sin(angle - Math.PI / 6));
              ctx.lineTo(x2 - arrowSize * Math.cos(angle + Math.PI / 6), y2 - arrowSize * Math.sin(angle + Math.PI / 6));
              ctx.stroke();
              
              // Draw start and end points
              ctx.fillStyle = lineColor;
              ctx.strokeStyle = '#121212';
              ctx.lineWidth = 1;
              
              ctx.beginPath();
              ctx.arc(x1, y1, 3, 0, 2 * Math.PI);
              ctx.fill();
              ctx.stroke();
              
              ctx.beginPath();
              ctx.arc(x2, y2, 3, 0, 2 * Math.PI);
              ctx.fill();
              ctx.stroke();
              
              // Draw percentage display text box positioned next to the measurement line
              const textBoxWidth = 240;
              const textBoxHeight = 80;
              const textBoxX = Math.min(x2 + 10, priceArea.x + priceArea.width - textBoxWidth);
              // Position tooltip at the midpoint of the measurement line, offset to the side
              const midY = (y1 + y2) / 2;
              const textBoxY = Math.max(priceArea.y, Math.min(midY - textBoxHeight / 2, priceArea.y + priceArea.height - textBoxHeight));
            
            // Text box background
            ctx.fillStyle = '#121212';
            ctx.strokeStyle = '#374151';
            ctx.lineWidth = 1;
            ctx.fillRect(textBoxX, textBoxY, textBoxWidth, textBoxHeight);
            ctx.strokeRect(textBoxX, textBoxY, textBoxWidth, textBoxHeight);
            
            // Text content - show percentage measurement data
            ctx.fillStyle = '#FAFF50';
            ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
            const percentageText = `${annotation.percentage !== undefined ? (annotation.percentage > 0 ? '+' : '') + annotation.percentage.toFixed(2) + '%' : 'N/A'}`;
            ctx.fillText(percentageText, textBoxX + 8, textBoxY + 20);
            
            ctx.fillStyle = '#9CA3AF';
            ctx.font = '14px system-ui, -apple-system, sans-serif';
            ctx.fillText(`${formatPrice(annotation.startPrice!)} → ${formatPrice(annotation.endPrice!)}`, textBoxX + 8, textBoxY + 40);
            
            ctx.fillStyle = '#F7F7F7';
            ctx.font = '14px system-ui, -apple-system, sans-serif';
            const priceDiff = annotation.endPrice! - annotation.startPrice!;
            const priceDiffText = `${priceDiff > 0 ? '+' : ''}${formatPrice(Math.abs(priceDiff))}`;
            ctx.fillText(priceDiffText, textBoxX + 8, textBoxY + 60);
            } else if (annotation.type === 'horizontal') {
              // Horizontal annotations - purple horizontal lines
              const dataIndex = chartData.data.findIndex(d => d.timestamp === annotation.timestamp);
              if (dataIndex !== -1) {
                const minPrice = Math.min(...chartData.data.map(d => d.low));
                const maxPrice = Math.max(...chartData.data.map(d => d.high));
                const priceRange = maxPrice - minPrice;
                const y = Math.max(priceArea.y, Math.min(priceArea.y + priceArea.height, 
                  priceArea.y + priceArea.height - ((annotation.price - minPrice) / priceRange) * priceArea.height));
                
                // Draw horizontal line
                ctx.strokeStyle = '#AA99FF';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(priceArea.x, y);
                ctx.lineTo(priceArea.x + priceArea.width, y);
                ctx.stroke();
                
                // Draw text label if present
                if (annotation.text) {
                  ctx.fillStyle = '#AA99FF';
                  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
                  const label = annotation.text;
                  const w = ctx.measureText(label).width + 12;
                  const h = 22;
                  const tx = Math.min(priceArea.x + priceArea.width - w - 6, priceArea.x + 8);
                  const ty = Math.max(priceArea.y + 6, Math.min(y - h / 2, priceArea.y + priceArea.height - h - 6));
                  
                  ctx.fillStyle = '#121212';
                  ctx.strokeStyle = '#AA99FF';
                  ctx.fillRect(tx, ty, w, h);
                  ctx.strokeRect(tx, ty, w, h);
                  ctx.fillStyle = '#AA99FF';
                  ctx.fillText(label, tx + 6, ty + h - 6);
                }
              }
            }
          });
        }
      } else {
        // Fallback if no chart data
        ctx.strokeStyle = '#5AF5FA';
        ctx.lineWidth = 4;
        ctx.strokeRect(120, 300, 1680, 700);
        ctx.fillStyle = '#888888';
        ctx.font = '32px system-ui, -apple-system, sans-serif';
        ctx.fillText('Chart data not available', 860, 650);
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
      }, 'image/png', 1.0); // Maximum quality
      
    } catch (error) {
      console.error('PNG export failed:', error);
      alert('PNG export failed. Please try again.');
    }
  };

  const exportAsPDF = async () => {
    try {
      // Create the same high-resolution canvas as PNG export with gradient mountain
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1400; // Increased height for price + volume charts
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Enable high-quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Set background to #121212
      ctx.fillStyle = '#121212';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add title with proper font
      ctx.fillStyle = '#5AF5FA';
      ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${symbol} - ${name}`, 60, 80);
      
      // Add price info - fix the NaN issue
      ctx.fillStyle = '#F7F7F7';
      ctx.font = '36px system-ui, -apple-system, sans-serif';
      const price = actualCurrentPrice && actualCurrentPrice !== 'NaN' && actualCurrentPrice !== '--' ? formatPrice(parseFloat(actualCurrentPrice)) : 'N/A';
      const change = actualPercentChange && actualPercentChange !== '0' && actualPercentChange !== '--' ? actualPercentChange : 'N/A';
      const cap = actualMarketCap && actualMarketCap !== '--' ? actualMarketCap : 'N/A';
      
      ctx.fillText(`Price: ${price} (${change}%)`, 60, 140);
      ctx.fillText(`Market Cap: ${cap}`, 60, 190);
      
      // Add timeframe info
      const timeframeText = startDate && endDate 
        ? `Date Range: ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`
        : `Timeframe: ${selectedTimeframe}`;
      ctx.fillText(timeframeText, 60, 240);
      
      // Draw actual charts if data is available
      if (chartData?.data && chartData.data.length > 0) {
        // Price chart area (upper portion)
        const priceArea = { x: 120, y: 300, width: 1680, height: 500 };
        
        // Price chart area
        ctx.fillStyle = '#121212';
        ctx.fillRect(priceArea.x, priceArea.y, priceArea.width, priceArea.height);
        
        // Draw grid lines for price chart
        ctx.strokeStyle = 'rgba(59, 59, 59, 0.5)';
        ctx.lineWidth = 2;
        // Horizontal grid lines
        for (let i = 0; i <= 5; i++) {
          const y = priceArea.y + (i * priceArea.height / 5);
          ctx.beginPath();
          ctx.moveTo(priceArea.x, y);
          ctx.lineTo(priceArea.x + priceArea.width, y);
          ctx.stroke();
        }
        // Vertical grid lines
        const priceVerticalLines = Math.min(7, chartData.data.length);
        for (let i = 0; i < priceVerticalLines; i++) {
          const x = priceArea.x + (i / (priceVerticalLines - 1)) * priceArea.width;
          ctx.beginPath();
          ctx.moveTo(x, priceArea.y);
          ctx.lineTo(x, priceArea.y + priceArea.height);
          ctx.stroke();
        }
        
        // Get price data and calculate bounds
        const prices = chartData.data.map(d => d.close);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;
        
        // Create gradient mountain fill for price
        const gradient = ctx.createLinearGradient(0, priceArea.y, 0, priceArea.y + priceArea.height);
        if (isPositive) {
          gradient.addColorStop(0, '#5AF5FA40'); // Cyan with transparency
          gradient.addColorStop(1, '#5AF5FA00'); // Transparent
        } else {
          gradient.addColorStop(0, '#FFA5FF40'); // Pink with transparency  
          gradient.addColorStop(1, '#FFA5FF00'); // Transparent
        }
        
        // Draw gradient area fill first
        ctx.beginPath();
        ctx.moveTo(priceArea.x, priceArea.y + priceArea.height);
        
        chartData.data.forEach((point, index) => {
          const x = priceArea.x + (index / (chartData.data.length - 1)) * priceArea.width;
          const y = priceArea.y + priceArea.height - ((point.close - minPrice) / priceRange) * priceArea.height;
          
          if (index === 0) {
            ctx.lineTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        
        ctx.lineTo(priceArea.x + priceArea.width, priceArea.y + priceArea.height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw price line on top
        const lineColor = isPositive ? '#5AF5FA' : '#FFA5FF';
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        chartData.data.forEach((point, index) => {
          const x = priceArea.x + (index / (chartData.data.length - 1)) * priceArea.width;
          const y = priceArea.y + priceArea.height - ((point.close - minPrice) / priceRange) * priceArea.height;
          
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
        
        // Draw Y-axis labels (prices)
        ctx.fillStyle = '#F7F7F7';
        ctx.font = '24px system-ui, -apple-system, sans-serif';
        for (let i = 0; i <= 5; i++) {
          const price = minPrice + (i / 5) * priceRange;
          const y = priceArea.y + priceArea.height - (i * priceArea.height / 5);
          ctx.fillText(formatPrice(price), priceArea.x + priceArea.width + 20, y + 8);
        }
        
        // Draw white separator line
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(priceArea.x, priceArea.y + priceArea.height + 10);
        ctx.lineTo(priceArea.x + priceArea.width, priceArea.y + priceArea.height + 10);
        ctx.stroke();
        
        // Volume chart area (lower portion)
        const volumeArea = { x: 120, y: priceArea.y + priceArea.height + 30, width: 1680, height: 250 };
        
        // Volume chart area

        
        // Draw grid lines for volume chart
        ctx.strokeStyle = 'rgba(59, 59, 59, 0.5)';
        ctx.lineWidth = 2;
        // Horizontal grid lines
        for (let i = 0; i <= 3; i++) {
          const y = volumeArea.y + (i * volumeArea.height / 3);
          ctx.beginPath();
          ctx.moveTo(volumeArea.x, y);
          ctx.lineTo(volumeArea.x + volumeArea.width, y);
          ctx.stroke();
        }
        // Vertical grid lines
        const volumeVerticalLines = Math.min(7, chartData.data.length);
        for (let i = 0; i < volumeVerticalLines; i++) {
          const x = volumeArea.x + (i / (volumeVerticalLines - 1)) * volumeArea.width;
          ctx.beginPath();
          ctx.moveTo(x, volumeArea.y);
          ctx.lineTo(x, volumeArea.y + volumeArea.height);
          ctx.stroke();
        }
        
        // Get volume data and calculate bounds
        const volumes = chartData.data.map(d => d.volume);
        const maxVolume = Math.max(...volumes);
        
        // Draw volume bars
        chartData.data.forEach((point, index) => {
          // Green for buying pressure (close >= open), red for selling pressure (close < open)
          const isBullish = point.close >= point.open;
          ctx.fillStyle = isBullish ? '#22c55e' : '#ef4444';
          
          const barWidth = volumeArea.width / chartData.data.length * 0.8;
          const x = volumeArea.x + (index / chartData.data.length) * volumeArea.width + barWidth * 0.1;
          const barHeight = (point.volume / maxVolume) * volumeArea.height;
          const y = volumeArea.y + volumeArea.height - barHeight;
          
          ctx.fillRect(x, y, barWidth, barHeight);
        });
        
        // Draw Y-axis labels (volume)
        ctx.fillStyle = '#F7F7F7';
        ctx.font = '20px system-ui, -apple-system, sans-serif';
        for (let i = 0; i <= 3; i++) {
          const volume = (i / 3) * maxVolume;
          const y = volumeArea.y + volumeArea.height - (i * volumeArea.height / 3);
          ctx.fillText(formatNumber(volume), volumeArea.x + volumeArea.width + 20, y + 8);
        }
        
        // Draw X-axis labels at bottom with actual dates (more comprehensive)
        ctx.fillStyle = '#F7F7F7';
        ctx.font = '24px system-ui, -apple-system, sans-serif';
        
        // Show 6-8 date labels across the X-axis
        const numLabels = Math.min(7, chartData.data.length);
        for (let i = 0; i < numLabels; i++) {
          const dataIndex = Math.floor((i / (numLabels - 1)) * (chartData.data.length - 1));
          const date = formatTime(chartData.data[dataIndex].time, selectedTimeframe);
          const x = volumeArea.x + (i / (numLabels - 1)) * volumeArea.width;
          
          // Center the text, but adjust for edge labels
          let textX = x;
          if (i === 0) {
            textX = volumeArea.x; // Left align first label
          } else if (i === numLabels - 1) {
            textX = volumeArea.x + volumeArea.width - ctx.measureText(date).width; // Right align last label
          } else {
            textX = x - ctx.measureText(date).width / 2; // Center align middle labels
          }
          
          ctx.fillText(date, textX, volumeArea.y + volumeArea.height + 40);
        }
        
        // Draw earnings markers on export
        if (earningsData?.earnings?.length) {
          const toMs = (ts: number) => (String(ts).length === 10 ? ts * 1000 : ts);
          earningsData.earnings.forEach(e => {
            const eMs = new Date(e.date || e.datetime || e.announcementDate).getTime();
            let nearestIdx = 0;
            let best = Number.POSITIVE_INFINITY;
            chartData.data.forEach((d, i) => {
              const diff = Math.abs(toMs(d.timestamp) - eMs);
              if (diff < best) { best = diff; nearestIdx = i; }
            });
            const x = priceArea.x + (chartData.data.length > 1 ? (nearestIdx / (chartData.data.length - 1)) * priceArea.width : 0);
            const dotY = volumeArea.y + volumeArea.height - 10; // sits on timeline above labels
            ctx.fillStyle = '#FAFF50';
            ctx.beginPath();
            ctx.arc(x, dotY, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#121212';
            ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('E', x, dotY);
            ctx.textAlign = 'start';
            ctx.textBaseline = 'alphabetic';
          });
        }
        
        // Draw annotations
        if (annotations.length > 0) {
          annotations.forEach((annotation) => {
            if (annotation.type === 'text') {
              // Text annotations - yellow vertical lines
              const dataIndex = chartData.data.findIndex(d => d.timestamp === annotation.timestamp);
              if (dataIndex === -1) return;
              
              const x = priceArea.x + (dataIndex / (chartData.data.length - 1)) * priceArea.width;
              
              // Draw vertical annotation line
              ctx.strokeStyle = '#FAFF50'; // Brand yellow
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(x + 0.5, priceArea.y);
              ctx.lineTo(x + 0.5, volumeArea.y + volumeArea.height);
              ctx.stroke();
              
              // Draw annotation dot
              ctx.fillStyle = '#FAFF50';
              ctx.beginPath();
              ctx.arc(x + 0.5, priceArea.y, 3, 0, 2 * Math.PI);
              ctx.fill();
            } else if (annotation.type === 'percentage' && annotation.startTimestamp && annotation.endTimestamp) {
              // Percentage measurements - white diagonal arrows
              const startIndex = chartData.data.findIndex(d => d.timestamp === annotation.startTimestamp);
              const endIndex = chartData.data.findIndex(d => d.timestamp === annotation.endTimestamp);
              if (startIndex === -1 || endIndex === -1) return;
              
              const x1 = priceArea.x + (startIndex / (chartData.data.length - 1)) * priceArea.width;
              const x2 = priceArea.x + (endIndex / (chartData.data.length - 1)) * priceArea.width;
              
              // Map prices to Y coordinates 
              const minPrice = Math.min(...chartData.data.map(d => d.low));
              const maxPrice = Math.max(...chartData.data.map(d => d.high));
              const priceRange = maxPrice - minPrice;
              const y1 = priceArea.y + priceArea.height - ((annotation.startPrice! - minPrice) / priceRange) * priceArea.height;
              const y2 = priceArea.y + priceArea.height - ((annotation.endPrice! - minPrice) / priceRange) * priceArea.height;
              
              // Determine line color based on percentage
              const isPositive = (annotation.percentage || 0) >= 0;
              const lineColor = isPositive ? '#22C55E' : '#EF4444'; // Green for positive, red for negative
              
              // Draw main line
              ctx.strokeStyle = lineColor;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
              
              // Draw outlined arrow head (larger)
              const arrowSize = 12;
              const angle = Math.atan2(y2 - y1, x2 - x1);
              
              ctx.strokeStyle = lineColor;
              ctx.lineWidth = 2;
              ctx.lineJoin = 'round';
              ctx.beginPath();
              ctx.moveTo(x2, y2);
              ctx.lineTo(x2 - arrowSize * Math.cos(angle - Math.PI / 6), y2 - arrowSize * Math.sin(angle - Math.PI / 6));
              ctx.lineTo(x2 - arrowSize * Math.cos(angle + Math.PI / 6), y2 - arrowSize * Math.sin(angle + Math.PI / 6));
              ctx.stroke();
              
              // Draw start and end points
              ctx.fillStyle = lineColor;
              ctx.strokeStyle = '#121212';
              ctx.lineWidth = 1;
              
              ctx.beginPath();
              ctx.arc(x1, y1, 3, 0, 2 * Math.PI);
              ctx.fill();
              ctx.stroke();
              
              ctx.beginPath();
              ctx.arc(x2, y2, 3, 0, 2 * Math.PI);
              ctx.fill();
              ctx.stroke();
              
              // Draw percentage display text box positioned next to the measurement line
              const textBoxWidth = 240;
              const textBoxHeight = 80;
              const textBoxX = Math.min(x2 + 10, priceArea.x + priceArea.width - textBoxWidth);
              // Position tooltip at the midpoint of the measurement line, offset to the side
              const midY = (y1 + y2) / 2;
              const textBoxY = Math.max(priceArea.y, Math.min(midY - textBoxHeight / 2, priceArea.y + priceArea.height - textBoxHeight));
            
            // Text box background
            ctx.fillStyle = '#121212';
            ctx.strokeStyle = '#374151';
            ctx.lineWidth = 1;
            ctx.fillRect(textBoxX, textBoxY, textBoxWidth, textBoxHeight);
            ctx.strokeRect(textBoxX, textBoxY, textBoxWidth, textBoxHeight);
            
            // Text content - show percentage measurement data
            ctx.fillStyle = '#FAFF50';
            ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
            const percentageText = `${annotation.percentage !== undefined ? (annotation.percentage > 0 ? '+' : '') + annotation.percentage.toFixed(2) + '%' : 'N/A'}`;
            ctx.fillText(percentageText, textBoxX + 8, textBoxY + 20);
            
            ctx.fillStyle = '#9CA3AF';
            ctx.font = '14px system-ui, -apple-system, sans-serif';
            ctx.fillText(`${formatPrice(annotation.startPrice!)} → ${formatPrice(annotation.endPrice!)}`, textBoxX + 8, textBoxY + 40);
            
            ctx.fillStyle = '#F7F7F7';
            ctx.font = '14px system-ui, -apple-system, sans-serif';
            const priceDiff = annotation.endPrice! - annotation.startPrice!;
            const priceDiffText = `${priceDiff > 0 ? '+' : ''}${formatPrice(Math.abs(priceDiff))}`;
            ctx.fillText(priceDiffText, textBoxX + 8, textBoxY + 60);
            } else if (annotation.type === 'horizontal') {
              // Horizontal annotations - purple horizontal lines
              const dataIndex = chartData.data.findIndex(d => d.timestamp === annotation.timestamp);
              if (dataIndex !== -1) {
                const minPrice = Math.min(...chartData.data.map(d => d.low));
                const maxPrice = Math.max(...chartData.data.map(d => d.high));
                const priceRange = maxPrice - minPrice;
                const y = Math.max(priceArea.y, Math.min(priceArea.y + priceArea.height, 
                  priceArea.y + priceArea.height - ((annotation.price - minPrice) / priceRange) * priceArea.height));
                
                // Draw horizontal line
                ctx.strokeStyle = '#AA99FF';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(priceArea.x, y);
                ctx.lineTo(priceArea.x + priceArea.width, y);
                ctx.stroke();
                
                // Draw text label if present
                if (annotation.text) {
                  ctx.fillStyle = '#AA99FF';
                  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
                  const label = annotation.text;
                  const w = ctx.measureText(label).width + 12;
                  const h = 22;
                  const tx = Math.min(priceArea.x + priceArea.width - w - 6, priceArea.x + 8);
                  const ty = Math.max(priceArea.y + 6, Math.min(y - h / 2, priceArea.y + priceArea.height - h - 6));
                  
                  ctx.fillStyle = '#121212';
                  ctx.strokeStyle = '#AA99FF';
                  ctx.fillRect(tx, ty, w, h);
                  ctx.strokeRect(tx, ty, w, h);
                  ctx.fillStyle = '#AA99FF';
                  ctx.fillText(label, tx + 6, ty + h - 6);
                }
              }
            }
          });
        }
      } else {
        // Fallback if no chart data
        ctx.strokeStyle = '#5AF5FA';
        ctx.lineWidth = 4;
        ctx.strokeRect(120, 300, 1680, 700);
        ctx.fillStyle = '#888888';
        ctx.font = '32px system-ui, -apple-system, sans-serif';
        ctx.fillText('Chart data not available', 860, 650);
      }
      
      // Now create PDF and add the high-resolution canvas as image
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png', 1.0); // Maximum quality
      
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
    try {
      const price = actualCurrentPrice && actualCurrentPrice !== 'NaN' && actualCurrentPrice !== '--' ? formatPrice(parseFloat(actualCurrentPrice)) : 'N/A';
      const change = actualPercentChange && actualPercentChange !== '0' && actualPercentChange !== '--' ? actualPercentChange : 'N/A';
      const cap = actualMarketCap && actualMarketCap !== '--' ? actualMarketCap : 'N/A';
      
      const timeframeText = startDate && endDate 
        ? `Date Range: ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`
        : `Timeframe: ${selectedTimeframe}`;
      
      // Create high-resolution SVG with complete UI duplication
      let svgContent = `<svg width="1920" height="1400" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Define gradient for mountain fill -->
          <linearGradient id="mountainGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:${isPositive ? '#5AF5FA' : '#FFA5FF'};stop-opacity:0.25" />
            <stop offset="100%" style="stop-color:${isPositive ? '#5AF5FA' : '#FFA5FF'};stop-opacity:0" />
          </linearGradient>
          
          <!-- Grid line style -->
          <style>
            .grid-line { stroke: #3B3B3B; stroke-width: 2; stroke-opacity: 0.5; }
            .price-line { stroke: ${isPositive ? '#5AF5FA' : '#FFA5FF'}; stroke-width: 3; fill: none; stroke-linecap: round; stroke-linejoin: round; }
            .title-text { fill: #5AF5FA; font-family: system-ui, -apple-system, sans-serif; font-size: 48px; font-weight: bold; }
            .info-text { fill: #F7F7F7; font-family: system-ui, -apple-system, sans-serif; font-size: 36px; }
            .label-text { fill: #F7F7F7; font-family: system-ui, -apple-system, sans-serif; font-size: 24px; }
          </style>
        </defs>
        
        <!-- Background -->
        <rect width="1920" height="1400" fill="#121212"/>
        
        <!-- Title and metadata -->
        <text x="60" y="80" class="title-text">${symbol} - ${name}</text>
        <text x="60" y="140" class="info-text">Price: ${price} (${change}%)</text>
        <text x="60" y="190" class="info-text">Market Cap: ${cap}</text>
        <text x="60" y="240" class="info-text">${timeframeText}</text>`;
      
      // Add charts if data is available
      if (chartData?.data && chartData.data.length > 0) {
        // Price chart area (upper portion)
        const priceArea = { x: 120, y: 300, width: 1680, height: 500 };
        const prices = chartData.data.map(d => d.close);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;
        
        // Add grid lines for price chart
        // Horizontal grid lines
        for (let i = 0; i <= 5; i++) {
          const y = priceArea.y + (i * priceArea.height / 5);
          svgContent += `
            <line x1="${priceArea.x}" y1="${y}" x2="${priceArea.x + priceArea.width}" y2="${y}" class="grid-line"/>`;
        }
        // Vertical grid lines
        const svgPriceVerticalLines = Math.min(7, chartData.data.length);
        for (let i = 0; i < svgPriceVerticalLines; i++) {
          const x = priceArea.x + (i / (svgPriceVerticalLines - 1)) * priceArea.width;
          svgContent += `
            <line x1="${x}" y1="${priceArea.y}" x2="${x}" y2="${priceArea.y + priceArea.height}" class="grid-line"/>`;
        }
        
        // Create path for mountain area fill
        let areaPath = `M${priceArea.x},${priceArea.y + priceArea.height}`;
        chartData.data.forEach((point, index) => {
          const x = priceArea.x + (index / (chartData.data.length - 1)) * priceArea.width;
          const y = priceArea.y + priceArea.height - ((point.close - minPrice) / priceRange) * priceArea.height;
          areaPath += ` L${x},${y}`;
        });
        areaPath += ` L${priceArea.x + priceArea.width},${priceArea.y + priceArea.height} Z`;
        
        // Add mountain gradient fill
        svgContent += `
          <path d="${areaPath}" fill="url(#mountainGradient)"/>`;
        
        // Create path for price line
        let linePath = '';
        chartData.data.forEach((point, index) => {
          const x = priceArea.x + (index / (chartData.data.length - 1)) * priceArea.width;
          const y = priceArea.y + priceArea.height - ((point.close - minPrice) / priceRange) * priceArea.height;
          linePath += index === 0 ? `M${x},${y}` : ` L${x},${y}`;
        });
        
        // Add price line
        svgContent += `
          <path d="${linePath}" class="price-line"/>`;
        
        // Add Y-axis price labels
        for (let i = 0; i <= 5; i++) {
          const price = minPrice + (i / 5) * priceRange;
          const y = priceArea.y + priceArea.height - (i * priceArea.height / 5);
          svgContent += `
            <text x="${priceArea.x + priceArea.width + 20}" y="${y + 8}" class="label-text">${formatPrice(price)}</text>`;
        }
        
        // Add white separator line
        svgContent += `
          <line x1="${priceArea.x}" y1="${priceArea.y + priceArea.height + 10}" x2="${priceArea.x + priceArea.width}" y2="${priceArea.y + priceArea.height + 10}" stroke="#FFFFFF" stroke-width="3"/>`;
        
        // Volume chart area (lower portion)
        const volumeArea = { x: 120, y: priceArea.y + priceArea.height + 30, width: 1680, height: 250 };
        const volumes = chartData.data.map(d => d.volume);
        const maxVolume = Math.max(...volumes);
        
        // Add grid lines for volume chart
        // Horizontal grid lines
        for (let i = 0; i <= 3; i++) {
          const y = volumeArea.y + (i * volumeArea.height / 3);
          svgContent += `
            <line x1="${volumeArea.x}" y1="${y}" x2="${volumeArea.x + volumeArea.width}" y2="${y}" class="grid-line"/>`;
        }
        // Vertical grid lines
        const svgVolumeVerticalLines = Math.min(7, chartData.data.length);
        for (let i = 0; i < svgVolumeVerticalLines; i++) {
          const x = volumeArea.x + (i / (svgVolumeVerticalLines - 1)) * volumeArea.width;
          svgContent += `
            <line x1="${x}" y1="${volumeArea.y}" x2="${x}" y2="${volumeArea.y + volumeArea.height}" class="grid-line"/>`;
        }
        
        // Add volume bars
        chartData.data.forEach((point, index) => {
          // Green for buying pressure (close >= open), red for selling pressure (close < open)
          const isBullish = point.close >= point.open;
          const fillColor = isBullish ? '#22c55e' : '#ef4444';
          
          const barWidth = volumeArea.width / chartData.data.length * 0.8;
          const x = volumeArea.x + (index / chartData.data.length) * volumeArea.width + barWidth * 0.1;
          const barHeight = (point.volume / maxVolume) * volumeArea.height;
          const y = volumeArea.y + volumeArea.height - barHeight;
          
          svgContent += `
            <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${fillColor}" opacity="0.7" rx="1"/>`;
        });
        
        // Add Y-axis volume labels
        for (let i = 0; i <= 3; i++) {
          const volume = (i / 3) * maxVolume;
          const y = volumeArea.y + volumeArea.height - (i * volumeArea.height / 3);
          svgContent += `
            <text x="${volumeArea.x + volumeArea.width + 20}" y="${y + 8}" class="label-text" font-size="20">${formatNumber(volume)}</text>`;
        }
        
        // Add X-axis labels at bottom with actual dates (more comprehensive)
        const numLabels = Math.min(7, chartData.data.length);
        for (let i = 0; i < numLabels; i++) {
          const dataIndex = Math.floor((i / (numLabels - 1)) * (chartData.data.length - 1));
          const date = formatTime(chartData.data[dataIndex].time, selectedTimeframe);
          const x = volumeArea.x + (i / (numLabels - 1)) * volumeArea.width;
          
          // Position text appropriately
          let textX = x;
          let textAnchor = 'middle';
          if (i === 0) {
            textX = volumeArea.x;
            textAnchor = 'start';
          } else if (i === numLabels - 1) {
            textX = volumeArea.x + volumeArea.width;
            textAnchor = 'end';
          }
          
          svgContent += `
            <text x="${textX}" y="${volumeArea.y + volumeArea.height + 40}" class="label-text" text-anchor="${textAnchor}">${date}</text>`;
        }
        
        // Add earnings markers to SVG export
        if (earningsData?.earnings?.length) {
          const toMs = (ts: number) => (String(ts).length === 10 ? ts * 1000 : ts);
          earningsData.earnings.forEach(e => {
            const eMs = new Date(e.date || e.datetime || e.announcementDate).getTime();
            let nearestIdx = 0;
            let best = Number.POSITIVE_INFINITY;
            chartData.data.forEach((d, i) => {
              const diff = Math.abs(toMs(d.timestamp) - eMs);
              if (diff < best) { best = diff; nearestIdx = i; }
            });
            const x = priceArea.x + (chartData.data.length > 1 ? (nearestIdx / (chartData.data.length - 1)) * priceArea.width : 0);
            const dotY = volumeArea.y + volumeArea.height - 10; // sits on timeline above labels
            
            // Add earnings circle and text to SVG
            svgContent += `
              <circle cx="${x}" cy="${dotY}" r="10" fill="#FAFF50" stroke="#121212" stroke-width="1"/>
              <text x="${x}" y="${dotY}" text-anchor="middle" dominant-baseline="central" fill="#121212" font-weight="bold" font-size="12" font-family="system-ui, -apple-system, sans-serif">E</text>`;
          });
        }
        
        // Add annotations
        if (annotations.length > 0) {
          annotations.forEach((annotation) => {
            // Find the data index for this annotation
            const dataIndex = chartData.data.findIndex(d => d.timestamp === annotation.timestamp);
            if (dataIndex === -1) return;
            
            // Calculate annotation position
            const x = priceArea.x + (dataIndex / (chartData.data.length - 1)) * priceArea.width;
            
            // Add vertical annotation line
            svgContent += `
              <line x1="${x}" y1="${priceArea.y}" x2="${x}" y2="${volumeArea.y + volumeArea.height}" stroke="#FAFF50" stroke-width="1"/>`;
            
            // Add annotation dot
            svgContent += `
              <circle cx="${x}" cy="${priceArea.y}" r="8" fill="#FAFF50"/>`;
            
            // Add annotation text box positioned next to the annotation line
            const textBoxWidth = 240;
            const textBoxHeight = 80;
            const textBoxX = Math.min(x + 10, priceArea.x + priceArea.width - textBoxWidth);
            // Position tooltip within the chart area, offset from the annotation line
            const textBoxY = Math.max(priceArea.y + 10, Math.min(priceArea.y + 100, priceArea.y + priceArea.height - textBoxHeight - 10));
            
            // Text box background
            svgContent += `
              <rect x="${textBoxX}" y="${textBoxY}" width="${textBoxWidth}" height="${textBoxHeight}" fill="#121212" stroke="#374151" stroke-width="1"/>`;
            
            // Text content
            svgContent += `
              <text x="${textBoxX + 8}" y="${textBoxY + 20}" fill="#FAFF50" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="bold">${formatTime(annotation.time, selectedTimeframe)}</text>
              <text x="${textBoxX + 8}" y="${textBoxY + 40}" fill="#9CA3AF" font-family="system-ui, -apple-system, sans-serif" font-size="14">${formatPrice(annotation.price)}</text>`;
            
            // Wrap annotation text
            const maxWidth = textBoxWidth - 16;
            const words = (annotation.text || '').split(' ');
            let line = '';
            let y = textBoxY + 60;
            
            // Simple text wrapping for SVG
            const lines: string[] = [];
            for (let n = 0; n < words.length; n++) {
              const testLine = line + words[n] + ' ';
              if (testLine.length > 30 && n > 0) { // Rough character count for wrapping
                lines.push(line.trim());
                line = words[n] + ' ';
                if (lines.length >= 2) break; // Limit to 2 lines
              } else {
                line = testLine;
              }
            }
            if (line.trim() && lines.length < 2) {
              lines.push(line.trim());
            }
            
            lines.forEach((textLine, index) => {
              svgContent += `
                <text x="${textBoxX + 8}" y="${y + (index * 16)}" fill="#F7F7F7" font-family="system-ui, -apple-system, sans-serif" font-size="14">${textLine}</text>`;
            });
          });
        }
        
      } else {
        // Fallback if no chart data
        svgContent += `
          <rect x="120" y="300" width="1680" height="700" fill="none" stroke="#5AF5FA" stroke-width="4"/>
          <text x="960" y="650" class="info-text" text-anchor="middle">Chart data not available</text>`;
      }
      
      svgContent += '</svg>';
      
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const filename = `${symbol}_chart_${selectedTimeframe}${
        startDate && endDate ? `_${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}` : ''
      }.svg`;
      
      saveAs(blob, filename);
    } catch (error) {
      console.error('SVG export failed:', error);
      alert('SVG export failed. Please try again.');
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

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[#5AF5FA] text-xl font-medium">{symbol}</span>
                <span className="text-muted-foreground">-</span>
                <span className="text-sm font-normal text-muted-foreground">{name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold">{actualCurrentPrice !== '--' ? formatPrice(parseFloat(actualCurrentPrice)) : '--'}</span>
                <Badge 
                  variant={isPositive ? "default" : "destructive"}
                  className={`flex items-center gap-1 ${isPositive ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
                >
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(parseChange).toFixed(2)}%
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

      {/* Chart Tabs Section with Export Button */}
      <div className="flex items-center justify-between mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger 
                  value="price-volume" 
                  className="data-[state=active]:bg-[#5AF5FA] data-[state=active]:text-black"
                  data-testid="trigger-price-volume"
                >
                  Price
                </TabsTrigger>
                <TabsTrigger 
                  value="comparison" 
                  className="data-[state=active]:bg-[#5AF5FA] data-[state=active]:text-black"
                  data-testid="trigger-comparison"
                >
                  Compare
                </TabsTrigger>
              </TabsList>
              
              {/* Annotation Mode Controls */}
              <div className="flex items-center gap-2">
                <div className="flex border border-border rounded-md overflow-hidden bg-background">
                  <Button
                    size="sm"
                    variant={annotationMode === 'text' ? 'default' : 'ghost'}
                    onClick={() => {
                      setAnnotationMode('text');
                      setPendingPercentageStart(null);
                    }}
                    className="h-8 px-3 text-xs rounded-none border-0"
                    data-testid="button-annotation-text"
                  >
                    <div className="w-3 h-3 mr-1 flex items-center justify-center">
                      <div className="w-0.5 h-3 bg-current" />
                    </div>
                    Vertical
                  </Button>
                  <Button
                    size="sm"
                    variant={annotationMode === 'percentage' ? 'default' : 'ghost'}
                    onClick={() => {
                      setAnnotationMode('percentage');
                      setPendingPercentageStart(null);
                    }}
                    className="h-8 px-3 text-xs rounded-none border-0"
                    data-testid="button-annotation-percentage"
                  >
                    <Ruler className="w-3 h-3 mr-1" />
                    Measure
                  </Button>
                  <Button
                    size="sm"
                    variant={annotationMode === 'horizontal' ? 'default' : 'ghost'}
                    onClick={() => {
                      setAnnotationMode('horizontal');
                      setPendingPercentageStart(null);
                    }}
                    className="h-8 px-3 text-xs rounded-none border-0"
                    data-testid="button-annotation-horizontal"
                  >
                    <Minus className="w-3 h-3 mr-1" />
                    Horizontal
                  </Button>
                </div>
                
                {onClearAll && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClearAll}
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
                  <ChevronDown className="w-3 h-3 ml-1" />
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
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
          <div className="h-80 flex items-center justify-center text-red-500">
            <div className="text-center">
              <div>Failed to load chart data</div>
              <div className="text-sm text-muted-foreground mt-1">No single day data during the weekend</div>
            </div>
          </div>
        ) : !chartData?.data || chartData.data.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No chart data available for {symbol}
          </div>
        ) : (
          <div 
            ref={chartRef} 
            className="w-full rounded-lg relative pt-20" 
            style={{ backgroundColor: '#121212', cursor: isDragging ? 'grabbing' : 'default' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* Annotation Labels - positioned in reserved padding space above charts */}
            {annotations.length > 0 && (
              <div className="absolute top-0 left-0 w-full h-20 pointer-events-none">
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
                        style={{ left: `${xPercent}%`, top: '20px', transform: 'translateX(-50%)' }}
                      >
                        <div 
                          className="bg-background border border-border rounded px-2 py-1 text-xs max-w-48 pointer-events-auto cursor-pointer hover:bg-muted shadow-lg"
                          onDoubleClick={() => handleAnnotationDoubleClick(annotation)}
                          title="Double-click to delete"
                        >
                          <div className="font-medium" style={{ color: '#FAFF50' }}>{formatTime(annotation.time, selectedTimeframe)}</div>
                          <div className="text-muted-foreground">{formatPrice(annotation.price)}</div>
                          <div className="text-foreground mt-1">{annotation.text || ''}</div>
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
                        style={{ left: `${xPercent}%`, top: '20px', transform: 'translateX(-50%)' }}
                      >
                        <div 
                          className="bg-background border border-border rounded px-2 py-1 text-xs max-w-48 pointer-events-auto cursor-pointer hover:bg-muted shadow-lg"
                          onDoubleClick={() => handleAnnotationDoubleClick(annotation)}
                          title="Double-click to delete"
                        >
                          <div className="font-medium" style={{ color: '#AA99FF' }}>{formatTime(annotation.time, selectedTimeframe)}</div>
                          <div className="text-muted-foreground">{formatPrice(annotation.price)}</div>
                          <div className="text-foreground mt-1">{annotation.text || ''}</div>
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
                            {formatPrice(annotation.startPrice || 0)} → {formatPrice(annotation.endPrice || 0)}
                          </div>
                          {annotation.startTime && annotation.endTime && (
                            <div className="text-[10px] text-muted-foreground text-center mt-1">
                              {formatTime(annotation.startTime, selectedTimeframe)} → {formatTime(annotation.endTime, selectedTimeframe)}
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

            {/* Price Chart - No X-axis */}
            <div className="h-80 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartDataWithPercentage}
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

                  {/* Primary Y-axis for price (right side) */}
                  <YAxis 
                    yAxisId="price"
                    orientation="right"
                    domain={['dataMin - 1', 'dataMax + 1']}
                    tickFormatter={formatPrice}
                    tick={{ fontSize: 12, fill: '#F7F7F7' }}
                    axisLine={{ stroke: '#F7F7F7' }}
                    tickLine={{ stroke: '#F7F7F7' }}
                    width={60}
                  />
                  
                  <Tooltip 
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      const dateStr = formatTime(value, selectedTimeframe);
                      const timeStr = date.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false 
                      });
                      return `${dateStr} ${timeStr}`;
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'close') {
                        return [formatPrice(value), 'Price'];
                      } else if (name === 'percentageChange') {
                        return [`${value.toFixed(2)}%`, 'Change'];
                      }
                      return [value, name];
                    }}
                    contentStyle={{
                      backgroundColor: '#121212',
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
                    activeDot={{ r: 4, fill: lineColor, stroke: '#121212', strokeWidth: 2 }}
                  />
                  
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
                  {annotations.filter(annotation => annotation.type === 'horizontal').map((annotation) => (
                    <ReferenceLine 
                      key={annotation.id}
                      y={annotation.price}
                      yAxisId="price"
                      stroke="#AA99FF"
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                      shapeRendering="crispEdges"
                    />
                  ))}

                  {/* Click Capture Overlay for Annotations - only active in annotation mode */}
                  {annotationMode === 'percentage' && (
                    <Customized 
                      component={(props: any) => {
                        const { offset, xAxisMap, payload } = props;
                        if (!offset || !xAxisMap || !chartDataWithPercentage) return null;
                        
                        const xAxis = xAxisMap[0];
                        if (!xAxis) return null;
                      
                      const handleOverlayClick = (e: React.MouseEvent) => {
                        if (!chartDataWithPercentage) return;
                        
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
                        const dataIndex = Math.round(xPercent * (chartDataWithPercentage.length - 1));
                        const clampedIndex = Math.max(0, Math.min(dataIndex, chartDataWithPercentage.length - 1));
                        const clickedData = chartDataWithPercentage[clampedIndex];
                        
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
                            
                            // Map prices to Y coordinates - ensure they stay within chart bounds
                            const priceRange = yAxis.domain[1] - yAxis.domain[0];
                            const rawY1 = yAxis.y + yAxis.height - ((annotation.startPrice! - yAxis.domain[0]) / priceRange) * yAxis.height;
                            const rawY2 = yAxis.y + yAxis.height - ((annotation.endPrice! - yAxis.domain[0]) / priceRange) * yAxis.height;
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

                  {/* Earnings Markers - small yellow dots with 'E' */}
                  <Customized 
                    component={(props: any) => {
                      const { payload, xAxisMap, yAxisMap } = props;
                      if (!earningsData?.earnings || !chartData?.data) return null;
                      
                      const xAxis = xAxisMap[Object.keys(xAxisMap)[0]];
                      const yAxis = yAxisMap['price'];
                      
                      if (!xAxis || !yAxis) return null;
                      
                      return (
                        <>
                          {earningsData.earnings.map((earning: any, index: number) => {
                            // Find if this earnings date falls within our chart data
                            const earningsDate = new Date(earning.date);
                            const earningsTime = earningsDate.toISOString();
                            
                            // Find corresponding data point in chart
                            const dataPoint = chartData.data.find(d => {
                              const chartDate = new Date(d.time);
                              return Math.abs(chartDate.getTime() - earningsDate.getTime()) < 24 * 60 * 60 * 1000; // Within 1 day
                            });
                            
                            if (!dataPoint) return null;
                            
                            // Calculate position using chart scales
                            const x = xAxis.scale(dataPoint.time) + (xAxis.offset?.left || 0);
                            const y = xAxis.y - 10; // Position on timeline (x-axis baseline)
                            
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
                                  r={10}
                                  fill="#FAFF50"
                                  stroke="#121212"
                                  strokeWidth={1}
                                />
                                {/* 'E' text inside circle */}
                                <text
                                  x={x}
                                  y={y + 2}
                                  textAnchor="middle"
                                  fontSize={12}
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
                </AreaChart>
              </ResponsiveContainer>
              
            </div>

            {/* Spacing between charts */}
            <div className="my-3"></div>

            {/* Volume Bar Chart - Below with spacing */}
            <div className="h-40 w-full mt-2 relative volume-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={chartDataWithPercentage}
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
                  
                  <Tooltip 
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      const dateStr = formatTime(value, selectedTimeframe);
                      const timeStr = date.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false 
                      });
                      return `${dateStr} ${timeStr}`;
                    }}
                    formatter={(value: number, name: string, props: any) => {
                      // Get the data point to determine color based on close vs open
                      const dataPoint = props.payload;
                      const isBullish = dataPoint ? dataPoint.close >= dataPoint.open : true;
                      const color = isBullish ? '#22c55e' : '#ef4444';
                      return [
                        <span style={{ color }}>{formatNumber(value)}</span>, 
                        <span style={{ color: '#F7F7F7' }}>Volume</span>
                      ];
                    }}
                    contentStyle={{
                      backgroundColor: '#121212',
                      border: '1px solid #333333',
                      borderRadius: '6px',
                      color: '#F7F7F7',
                      fontSize: '12px'
                    }}
                  />
                  
                  <Bar 
                    dataKey="volume" 
                    opacity={0.7}
                    radius={[1, 1, 0, 0]}
                  >
                    {chartDataWithPercentage?.map((entry, index) => {
                      // Green for buying pressure (close > open), red for selling pressure (close < open)
                      const isBullish = entry.close >= entry.open;
                      return (
                        <Cell key={`cell-${index}`} fill={isBullish ? '#22c55e' : '#ef4444'} />
                      );
                    })}
                  </Bar>
                  
                  {/* Average Daily Volume Reference Line */}
                  {chartDataWithPercentage && chartDataWithPercentage.length > 0 && (() => {
                    const totalVolume = chartDataWithPercentage.reduce((sum, data) => sum + (data.volume || 0), 0);
                    const avgVolume = totalVolume / chartDataWithPercentage.length;
                    return (
                      <ReferenceLine 
                        y={avgVolume} 
                        stroke="#FAFF50" 
                        strokeWidth={1}
                        strokeDasharray="0"
                        label={{ value: "Avg Daily Volume", position: "top", fill: "#FAFF50", fontSize: 11 }}
                      />
                    );
                  })()}

                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        </TabsContent>

      {/* Annotation Input Modal */}
      {showAnnotationInput && (pendingAnnotation || editingAnnotation) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-96 max-w-[90vw]">
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

      {/* Earnings Modal Lightbox */}
      {earningsModal.visible && earningsModal.data && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setEarningsModal({ visible: false, data: null })}
        >
          <div
            className="bg-card border border-border rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 relative"
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
                      <span className="font-medium text-[#5AF5FA]">${earningsModal.data.epsActual}</span>
                    </div>
                  )}
                  {earningsModal.data.epsEstimate !== null && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">EPS Estimate:</span>
                      <span className="font-medium">${earningsModal.data.epsEstimate}</span>
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
                        <span className="font-medium text-[#5AF5FA]">${(earningsModal.data.revenueActual / 1000000).toFixed(1)}M</span>
                      </div>
                    )}
                    {earningsModal.data.revenueEstimate !== null && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Revenue Estimate:</span>
                        <span className="font-medium">${(earningsModal.data.revenueEstimate / 1000000).toFixed(1)}M</span>
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
            annotations={annotations}
            onAnnotationsChange={onAnnotationsChange}
            annotationMode={annotationMode}
            pendingPercentageStart={pendingPercentageStart}
            setPendingPercentageStart={setPendingPercentageStart}
            updateAnnotations={updateAnnotations}
          />
        </TabsContent>
        </Tabs>
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