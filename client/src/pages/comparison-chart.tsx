import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogOut, BookOpen, ChevronDown, Minus, Type, Ruler, RotateCcw, Download, Code, X, Trash2, Plus } from "lucide-react";
import { ComparisonChart as ComparisonChartComponent } from "@/components/dashboard/comparison-chart";
import { useAuth } from "@/contexts/AuthContext";
import logoImage from "@assets/IPO Intelligence@2x_1758060026530.png";
import { format } from 'date-fns';
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CompareChartHistory } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import { saveAs } from 'file-saver';
import * as htmlToImage from 'html-to-image';
import jsPDF from 'jspdf';

interface Annotation {
  id: string;
  type: 'text' | 'percentage' | 'horizontal' | 'note';
  x: number;
  y: number;
  timestamp: number;
  price: number;
  text?: string;
  time: string;
  horizontalOffset?: number;
  verticalOffset?: number;
  startTimestamp?: number;
  startPrice?: number;
  startTime?: string;
  endTimestamp?: number;
  endPrice?: number;
  endTime?: string;
  percentage?: number;
}

interface TickerData {
  symbol: string;
  color: string;
  visible: boolean;
}

const timeframes = [
  { label: '1D', value: '1D' },
  { label: '5D', value: '5D' },
  { label: '2W', value: '2W' },
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' },
  { label: '1Y', value: '1Y' },
  { label: '3Y', value: '3Y' },
  { label: 'Custom', value: 'Custom' },
];

const timeIntervals = [
  { label: '15 min', value: '15' },
  { label: '1 hour', value: '60' },
  { label: '3 hour', value: '180' },
  { label: '6 hour', value: '360' },
  { label: 'Daily', value: 'D' },
  { label: 'Weekly', value: 'W' },
  { label: 'Monthly', value: 'M' },
];

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
      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      data-testid="button-logout"
      style={{ fontFamily: 'var(--font-sans)', fontSize: '16px', color: '#f7f7f7' }}
    >
      <LogOut className="h-5 w-5 text-[#5AF5FA]" />
      <span>Sign Out</span>
    </button>
  );
}

function generateSessionId(): string {
  return `compare-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default function ComparisonChart() {
  const [, setLocation] = useLocation();
  const [timeframe, setTimeframe] = useState("2W");
  const [chartType, setChartType] = useState<'line' | 'mountain'>('line');
  const [selectedInterval, setSelectedInterval] = useState('D');
  const [showHoverTooltip, setShowHoverTooltip] = useState(true);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annotationMode, setAnnotationMode] = useState<'text' | 'percentage' | 'horizontal' | 'note' | undefined>(undefined);
  const [pendingPercentageStart, setPendingPercentageStart] = useState<{ timestamp: number; price: number; time: string } | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [singleTradingDay, setSingleTradingDay] = useState(false);
  const [startCalendarMonth, setStartCalendarMonth] = useState<Date>(new Date());
  const [endCalendarMonth, setEndCalendarMonth] = useState<Date>(new Date());
  const [chartSessionId, setChartSessionId] = useState(() => generateSessionId());
  const [tickers, setTickers] = useState<TickerData[]>([]);
  const [chartKey, setChartKey] = useState(0);
  
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const confirmTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMountRef = useRef(true);
  const lastSavedStateRef = useRef<string | null>(null);
  
  const comparisonRef = useRef<HTMLDivElement>(null);
  const comparisonZoomInRef = useRef<(() => void) | null>(null);
  const comparisonZoomOutRef = useRef<(() => void) | null>(null);
  const comparisonFitToDataRef = useRef<(() => void) | null>(null);

  const { toast } = useToast();

  const handleChartTypeChange = (value: string) => {
    setLocation(value);
  };

  const clearAll = useCallback(() => {
    setAnnotations([]);
    setAnnotationMode(undefined);
    setPendingPercentageStart(null);
  }, []);

  const validIntervals = (() => {
    const tf = timeframe;
    if (tf === '1D') return ['15', '60', '180', '360'];
    if (tf === '5D') return ['15', '60', '180', '360', 'D'];
    if (tf === '2W') return ['60', '180', '360', 'D'];
    if (tf === '1M') return ['D'];
    if (tf === '3M') return ['D', 'W'];
    if (tf === '6M' || tf === '1Y') return ['D', 'W', 'M'];
    if (tf === '3Y') return ['W', 'M'];
    if (tf === 'Custom') {
      if (startDate && endDate) {
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        if (days <= 1) return ['15', '60', '180', '360'];
        if (days <= 7) return ['15', '60', '180', '360', 'D'];
        if (days <= 14) return ['60', '180', '360', 'D'];
        if (days <= 30) return ['D'];
        if (days <= 90) return ['D', 'W'];
        if (days <= 365) return ['D', 'W', 'M'];
        return ['W', 'M'];
      }
      return ['D'];
    }
    return ['D'];
  })();

  const { data: compareChartHistory = [] } = useQuery<CompareChartHistory[]>({
    queryKey: ['/api/compare-chart-history'],
    queryFn: async () => {
      const response = await fetch('/api/compare-chart-history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch compare chart history');
      return await response.json();
    },
  });

  const saveCompareChartHistoryMutation = useMutation({
    mutationFn: async ({ 
      sessionId, 
      timeframe, 
      customStartDate, 
      customEndDate, 
      tickers,
      annotations 
    }: { 
      sessionId: string;
      timeframe: string;
      customStartDate?: string;
      customEndDate?: string;
      tickers: TickerData[];
      annotations: Annotation[] 
    }) => {
      await apiRequest('POST', '/api/compare-chart-history', { 
        sessionId,
        timeframe,
        customStartDate,
        customEndDate,
        tickers,
        annotations 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compare-chart-history'] });
    },
    onError: (error) => {
      console.error('Failed to save compare chart history:', error);
    },
  });

  const deleteCompareChartHistoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/compare-chart-history/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compare-chart-history'] });
      toast({
        title: "Chart Deleted",
        description: "Compare chart history entry removed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete compare chart history entry",
        variant: "destructive",
      });
      console.error('Failed to delete compare chart history:', error);
    },
  });

  const deleteAllCompareChartHistoryMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', '/api/compare-chart-history', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compare-chart-history'] });
      setConfirmDeleteAll(false);
      toast({
        title: "All Charts Deleted",
        description: "All compare chart history entries have been removed",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete compare chart history",
        variant: "destructive",
      });
      console.error('Failed to delete all compare chart history:', error);
    },
  });

  const handleDeleteClick = (id: number) => {
    if (confirmDeleteId === id) {
      setDeletingId(id);
      setConfirmDeleteId(null);
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
      
      setTimeout(() => {
        deleteCompareChartHistoryMutation.mutate(id);
        setDeletingId(null);
      }, 300);
    } else {
      setConfirmDeleteId(id);
      setConfirmDeleteAll(false);
      
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
      confirmTimeoutRef.current = setTimeout(() => {
        setConfirmDeleteId(null);
      }, 4000);
    }
  };

  const handleDeleteAllClick = () => {
    if (confirmDeleteAll) {
      deleteAllCompareChartHistoryMutation.mutate();
      setConfirmDeleteAll(false);
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
    } else {
      setConfirmDeleteAll(true);
      setConfirmDeleteId(null);
      
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
      confirmTimeoutRef.current = setTimeout(() => {
        setConfirmDeleteAll(false);
      }, 4000);
    }
  };

  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      const initialState = JSON.stringify({
        timeframe,
        customStartDate: startDate?.toISOString(),
        customEndDate: endDate?.toISOString(),
        tickers,
        annotations
      });
      lastSavedStateRef.current = initialState;
      return;
    }

    const hasAnnotations = annotations.length > 0;
    const hasTickers = tickers.length > 0;
    const hasCustomDateRange = timeframe === 'Custom' && startDate && endDate;
    
    if (!hasAnnotations && !hasTickers && !hasCustomDateRange) {
      lastSavedStateRef.current = null;
      return;
    }

    const currentState = JSON.stringify({
      timeframe,
      customStartDate: startDate?.toISOString(),
      customEndDate: endDate?.toISOString(),
      tickers,
      annotations
    });
    
    if (currentState === lastSavedStateRef.current) {
      return;
    }

    const timeoutId = setTimeout(() => {
      saveCompareChartHistoryMutation.mutate({ 
        sessionId: chartSessionId,
        timeframe,
        customStartDate: timeframe === 'Custom' && startDate ? startDate.toISOString() : undefined,
        customEndDate: timeframe === 'Custom' && endDate ? endDate.toISOString() : undefined,
        tickers,
        annotations 
      });
      lastSavedStateRef.current = currentState;
    }, 2000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [annotations, timeframe, startDate, endDate, tickers, chartSessionId, saveCompareChartHistoryMutation]);

  const restoreFromHistory = (entry: CompareChartHistory) => {
    setTimeframe(entry.timeframe);
    
    if (entry.timeframe === 'Custom' && entry.customStartDate && entry.customEndDate) {
      setStartDate(new Date(entry.customStartDate));
      setEndDate(new Date(entry.customEndDate));
    } else {
      setStartDate(undefined);
      setEndDate(undefined);
    }
    
    setTickers(entry.tickers || []);
    setAnnotations(entry.annotations as Annotation[] || []);
    
    toast({
      title: "Chart Restored",
      description: `Loaded compare chart state from ${format(new Date(entry.savedAt), 'MMM dd, yyyy HH:mm')}`,
    });
  };

  const exportAsPNG = useCallback(async () => {
    if (!comparisonRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(comparisonRef.current, {
        backgroundColor: '#121212',
        quality: 1.0,
      });
      saveAs(dataUrl, `comparison-chart-${new Date().toISOString().split('T')[0]}.png`);
    } catch (error) {
      console.error('Error exporting as PNG:', error);
    }
  }, []);

  const exportAsPDF = useCallback(async () => {
    if (!comparisonRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(comparisonRef.current, {
        backgroundColor: '#121212',
        quality: 1.0,
      });
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });
      const pdf = new jsPDF({
        orientation: img.width > img.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [img.width, img.height],
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
      pdf.save(`comparison-chart-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error exporting as PDF:', error);
    }
  }, []);

  const exportAsSVG = useCallback(async () => {
    if (!comparisonRef.current) return;
    try {
      const dataUrl = await htmlToImage.toSvg(comparisonRef.current, {
        backgroundColor: '#121212',
      });
      const link = document.createElement('a');
      link.download = `comparison-chart-${new Date().toISOString().split('T')[0]}.svg`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error exporting as SVG:', error);
    }
  }, []);

  const handleTickersChange = useCallback((newTickers: TickerData[]) => {
    setTickers(newTickers);
  }, []);

  const handleNewChart = useCallback(() => {
    const hasContent = tickers.length > 0 || annotations.length > 0;
    
    if (hasContent) {
      saveCompareChartHistoryMutation.mutate({
        sessionId: chartSessionId,
        timeframe,
        customStartDate: timeframe === 'Custom' && startDate ? startDate.toISOString() : undefined,
        customEndDate: timeframe === 'Custom' && endDate ? endDate.toISOString() : undefined,
        tickers,
        annotations
      });
      
      toast({
        title: "Previous chart saved",
        description: "Your chart has been saved in the history below",
      });
    }
    
    setChartSessionId(generateSessionId());
    setTickers([]);
    setAnnotations([]);
    setAnnotationMode(undefined);
    setPendingPercentageStart(null);
    setTimeframe('2W');
    setStartDate(undefined);
    setEndDate(undefined);
    setShowDatePicker(false);
    setSingleTradingDay(false);
    setChartKey(prev => prev + 1);
    lastSavedStateRef.current = null;
    isInitialMountRef.current = true;
  }, [tickers, annotations, chartSessionId, timeframe, startDate, endDate, saveCompareChartHistoryMutation, toast]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/">
              <img src={logoImage} alt="Logo" className="w-[240px] h-auto max-[600px]:w-[180px] hover:opacity-80 transition-opacity cursor-pointer" data-testid="link-home" />
            </Link>

            {/* Navigation Items */}
            <nav className="flex items-center gap-6">
              {/* Chart Type Dropdown */}
              <Select value="/comparison-chart" onValueChange={handleChartTypeChange}>
                <SelectTrigger 
                  className="w-[200px] bg-card border-border"
                  data-testid="select-chart-type"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  <SelectValue placeholder="Chart Type" />
                </SelectTrigger>
                <SelectContent style={{ backgroundColor: '#3A3A3A' }}>
                  <SelectItem value="/price-chart">Price Chart</SelectItem>
                  <SelectItem value="/comparison-chart">Comparison Chart</SelectItem>
                  <SelectItem value="/ai-copilot">AI Co-Pilot</SelectItem>
                </SelectContent>
              </Select>

              {/* Walkthrough Link */}
              <Link href="/walkthrough">
                <span 
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                  data-testid="link-walkthrough"
                  style={{ fontFamily: 'var(--font-sans)', fontSize: '16px', color: '#f7f7f7' }}
                >
                  <BookOpen className="h-5 w-5 text-[#5AF5FA]" />
                  <span>Walkthrough</span>
                </span>
              </Link>

              {/* Logout Button */}
              <LogoutButton />
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Page Title with + New Chart button */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 
              className="text-4xl font-light"
              style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#f7f7f7' }}
            >
              Comparison Chart
            </h1>
            <Button
              onClick={handleNewChart}
              className="bg-[#5AF5FA] text-[#121212] hover:bg-[#5AF5FA]/90 font-medium"
              data-testid="button-new-chart"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Chart
            </Button>
          </div>
          <p 
            className="text-muted-foreground mt-2"
            style={{ fontFamily: 'Mulish, sans-serif' }}
          >
            Compare multiple tickers side-by-side to uncover performance trends and correlations
          </p>
        </div>

        {/* Chart Controls Row 1: Timeframe buttons + Chart Type + Time Interval */}
        <div className="flex gap-4 items-center flex-wrap max-[900px]:gap-2 w-full mb-4">
          {/* Mobile View: Timeframe Dropdown */}
          <div className="min-[760px]:hidden w-full flex gap-2 items-center">
            <Select 
              value={timeframe} 
              onValueChange={(value) => {
                setTimeframe(value);
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
                {timeframes.map((tf) => (
                  <SelectItem key={tf.value} value={tf.value} className="cursor-pointer">
                    {tf.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Desktop Buttons */}
          <div className="hidden min-[760px]:flex gap-1 items-center flex-wrap">
            {timeframes.map((tf) => (
              <Button
                key={tf.value}
                variant={timeframe === tf.value ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setTimeframe(tf.value);
                  if (tf.value !== 'Custom') {
                    setStartDate(undefined);
                    setEndDate(undefined);
                    setShowDatePicker(false);
                  } else {
                    setShowDatePicker(true);
                  }
                }}
                className={`h-8 px-3 text-xs ${
                  timeframe === tf.value 
                    ? 'bg-[#5AF5FA] text-black hover:bg-[#5AF5FA]/90' 
                    : 'hover:bg-muted'
                }`}
              >
                {tf.label}
              </Button>
            ))}
          </div>

          {/* Chart Type selector (Line/Mountain only for comparison) */}
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
                <ChevronDown className="w-3 h-3 ml-1" style={{ color: '#5AF5FA' }} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => setChartType('line')}
                className="cursor-pointer"
                data-testid="menu-chart-line"
              >
                Line
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setChartType('mountain')}
                className="cursor-pointer"
                data-testid="menu-chart-mountain"
              >
                Mountain
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Time Interval selector */}
          {validIntervals.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-xs"
                  data-testid="button-interval-dropdown"
                >
                  {timeIntervals.find(i => i.value === selectedInterval)?.label || 'Daily'}
                  <ChevronDown className="w-3 h-3 ml-1" style={{ color: '#5AF5FA' }} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {timeIntervals
                  .filter(interval => validIntervals.includes(interval.value))
                  .map(interval => (
                    <DropdownMenuItem
                      key={interval.value}
                      onClick={() => setSelectedInterval(interval.value)}
                      className={`cursor-pointer ${selectedInterval === interval.value ? 'bg-[#5AF5FA]/20' : ''}`}
                      data-testid={`menu-interval-${interval.value}`}
                    >
                      {interval.label}
                    </DropdownMenuItem>
                  ))
                }
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 text-xs opacity-50 cursor-not-allowed"
                    disabled
                    data-testid="button-interval-disabled"
                  >
                    Daily
                    <ChevronDown className="w-3 h-3 ml-1" style={{ color: '#5AF5FA' }} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Intraday intervals unavailable for ranges over 3 months</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Custom Date Picker */}
        {timeframe === 'Custom' && showDatePicker && (
          <div className="mb-4 p-4 border rounded-lg relative z-50" style={{ zIndex: 9999, backgroundColor: '#3A3A3A' }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex bg-muted rounded-lg p-1">
                  <button
                    onClick={() => {
                      setSingleTradingDay(false);
                      setEndDate(undefined);
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
                      setEndDate(undefined);
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
              <div className="flex items-start gap-3">
                {startDate && (singleTradingDay || endDate) && (
                  <div className="text-right">
                    <div className="text-sm text-foreground">
                      Selected: {format(startDate, 'MMM dd, yyyy')}{!singleTradingDay && endDate && ` – ${format(endDate, 'MMM dd, yyyy')}`}
                    </div>
                    <Button
                      onClick={() => {
                        if (singleTradingDay) {
                          setEndDate(startDate);
                        }
                        setShowDatePicker(false);
                      }}
                      className="mt-2 bg-[#5AF5FA] text-[#121212] hover:bg-[#5AF5FA]/90 font-medium"
                      size="sm"
                      data-testid="button-apply-date-range"
                    >
                      {singleTradingDay ? 'Show Trading Day' : 'Apply Date Range'}
                    </Button>
                  </div>
                )}
                <button
                  onClick={() => {
                    setShowDatePicker(false);
                    setSingleTradingDay(false);
                    setStartDate(undefined);
                    setEndDate(undefined);
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  title="Close date picker"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex gap-6 flex-wrap">
              <div className="space-y-2">
                <label className="text-sm font-medium">{singleTradingDay ? 'Select Date' : 'Start Date'}</label>
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
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    return isWeekend;
                  }}
                  className="rounded-md border"
                  classNames={{
                    day_today: "border border-white rounded bg-transparent text-foreground",
                    day_selected: "bg-[#5AF5FA] text-[#121212] hover:bg-[#5AF5FA] hover:text-[#121212] focus:bg-[#5AF5FA] focus:text-[#121212]",
                    day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-[#1C1C1C] hover:text-[#F7F7F7] focus:bg-[#1C1C1C] focus:text-[#F7F7F7] rounded transition-colors"
                  }}
                />
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
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      if (!!startDate && date < startDate) return true;
                      return isWeekend;
                    }}
                    className="rounded-md border"
                    classNames={{
                      day_today: "border border-white rounded bg-transparent text-foreground",
                      day_selected: "bg-[#5AF5FA] text-[#121212] hover:bg-[#5AF5FA] hover:text-[#121212] focus:bg-[#5AF5FA] focus:text-[#121212]",
                      day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-[#1C1C1C] hover:text-[#F7F7F7] focus:bg-[#1C1C1C] focus:text-[#F7F7F7] rounded transition-colors"
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chart Controls Row 2: Annotation tools, Zoom, Hover toggle, Clear, Export */}
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
                      onClick={() => {
                        setAnnotationMode('note');
                        setPendingPercentageStart(null);
                      }}
                      className="cursor-pointer"
                      data-testid="menu-annotation-note"
                    >
                      <Type className="w-3 h-3 mr-2" style={{ color: '#FFFFFF' }} />
                      Text Note
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Y-axis Zoom Controls */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground mr-1">Y-Axis:</span>
                <div className="flex border border-border rounded-md overflow-hidden bg-background">
                  <button
                    onClick={() => comparisonZoomInRef.current?.()}
                    className="h-8 w-8 text-sm font-medium bg-[#121212] text-white border-r border-border hover:bg-[#5AF5FA] hover:text-[#121212] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 flex items-center justify-center"
                    data-testid="button-zoom-in-price"
                    title="Zoom In Y-Axis"
                  >
                    +
                  </button>
                  <button
                    onClick={() => comparisonZoomOutRef.current?.()}
                    className="h-8 w-8 text-sm font-medium bg-[#121212] text-white border-r border-border hover:bg-[#5AF5FA] hover:text-[#121212] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 flex items-center justify-center"
                    data-testid="button-zoom-out-price"
                    title="Zoom Out Y-Axis"
                  >
                    −
                  </button>
                  <button
                    onClick={() => comparisonFitToDataRef.current?.()}
                    className="h-8 w-10 text-xs font-medium bg-[#121212] text-white hover:bg-[#5AF5FA] hover:text-[#121212] transition-colors duration-150 flex items-center justify-center"
                    data-testid="button-fit-price-data"
                    title="Fit Y-Axis to Data"
                  >
                    Fit
                  </button>
                </div>
              </div>

              {/* Hover Tool Toggle */}
              <div className="flex items-center gap-2 ml-2">
                <Switch
                  id="hover-tool"
                  checked={showHoverTooltip}
                  onCheckedChange={setShowHoverTooltip}
                  className="h-4 w-8"
                  data-testid="switch-hover-tool"
                />
                <label
                  htmlFor="hover-tool"
                  className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                >
                  Hover: {showHoverTooltip ? 'On' : 'Off'}
                </label>
              </div>

              {/* Clear All Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                className="h-8 px-3 text-xs text-destructive hover:text-black hover:bg-[#5AF5FA]"
                data-testid="button-clear-all"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Clear All
              </Button>
              
              {/* Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs border-[#5AF5FA]/30 text-[#5AF5FA] hover:bg-[#5AF5FA]/10 ml-2"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Export
                    <ChevronDown className="w-3 h-3 ml-1" style={{ color: '#5AF5FA' }} />
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
          </div>
        </div>

        {/* Comparison Chart Component */}
        <div ref={comparisonRef}>
          <ComparisonChartComponent 
            key={chartKey}
            timeframe={timeframe}
            startDate={startDate}
            endDate={endDate}
            singleTradingDay={singleTradingDay}
            annotations={annotations}
            onAnnotationsChange={setAnnotations}
            annotationMode={annotationMode}
            pendingPercentageStart={pendingPercentageStart}
            setPendingPercentageStart={setPendingPercentageStart}
            updateAnnotations={setAnnotations}
            showHoverTooltip={showHoverTooltip}
            onZoomIn={(fn) => { if (fn && typeof fn === 'function') comparisonZoomInRef.current = fn; }}
            onZoomOut={(fn) => { if (fn && typeof fn === 'function') comparisonZoomOutRef.current = fn; }}
            onFitToData={(fn) => { if (fn && typeof fn === 'function') comparisonFitToDataRef.current = fn; }}
            onTickersChange={handleTickersChange}
          />
        </div>

        {/* Compare Chart History Log */}
        <Card className="p-6 mt-8" style={{ backgroundColor: '#121212' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Compare Chart History</h3>
            {compareChartHistory.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteAllClick}
                className="hover:bg-transparent relative flex items-center justify-center"
                style={{ 
                  width: confirmDeleteAll ? '95px' : '90px',
                  height: '32px',
                  transition: 'width 300ms',
                  overflow: 'hidden'
                }}
                data-testid="button-delete-all-history"
              >
                <Trash2 
                  className={`h-4 w-4 absolute transition-all duration-300 ${
                    confirmDeleteAll ? 'opacity-0 -translate-x-12' : 'opacity-100 translate-x-0'
                  }`}
                  style={{ 
                    color: confirmDeleteAll ? '#5AF5FA' : '#F7F7F7',
                    left: '4px'
                  }}
                  onMouseEnter={(e) => !confirmDeleteAll && (e.currentTarget.style.color = '#5AF5FA')}
                  onMouseLeave={(e) => !confirmDeleteAll && (e.currentTarget.style.color = '#F7F7F7')}
                />
                <span 
                  className={`text-sm whitespace-nowrap font-medium absolute transition-all duration-300 ${
                    confirmDeleteAll ? 'opacity-0 -translate-x-12' : 'opacity-100 translate-x-0'
                  }`}
                  style={{ 
                    color: '#F7F7F7',
                    left: '28px'
                  }}
                  onMouseEnter={(e) => !confirmDeleteAll && (e.currentTarget.style.color = '#5AF5FA')}
                  onMouseLeave={(e) => !confirmDeleteAll && (e.currentTarget.style.color = '#F7F7F7')}
                >
                  Delete All
                </span>
                <span 
                  className={`text-sm whitespace-nowrap font-medium absolute transition-all duration-300 ${
                    confirmDeleteAll ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
                  }`}
                  style={{ 
                    color: '#5AF5FA',
                    left: '8px'
                  }}
                >
                  Delete Now
                </span>
              </Button>
            )}
          </div>
          <div className="h-[350px] overflow-y-scroll">
            {compareChartHistory.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {compareChartHistory.map((entry) => {
                  const tickerSymbols = (entry.tickers || []).map(t => t.symbol).join(', ');
                  const annotationCounts = (entry.annotations || []).reduce((acc, ann) => {
                    const type = ann.type === 'text' ? 'Vertical' : 
                                 ann.type === 'percentage' ? 'Measure' : 
                                 ann.type === 'horizontal' ? 'Horizontal' :
                                 'Note';
                    acc[type] = (acc[type] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);

                  const annotationSummary = Object.entries(annotationCounts)
                    .map(([type, count]) => `${count} ${type}`)
                    .join(', ');

                  return (
                    <Card 
                      key={entry.id} 
                      className={`p-4 bg-muted/50 cursor-pointer transition-all duration-300 hover:bg-muted/70 relative group ${
                        deletingId === entry.id ? 'opacity-0 -translate-x-full' : ''
                      }`}
                      data-testid={`compare-chart-history-${entry.id}`}
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
                            {tickerSymbols || 'No tickers'}
                          </div>
                          <div className="text-sm text-muted-foreground mb-2">
                            {format(new Date(entry.savedAt), 'MMM dd, yyyy HH:mm:ss')}
                          </div>
                          <div className="text-xs text-muted-foreground mb-1">
                            Timeframe: {entry.timeframe}
                            {(entry.tickers || []).length > 0 && ` • ${entry.tickers.length} ticker${entry.tickers.length > 1 ? 's' : ''}`}
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
                            handleDeleteClick(entry.id);
                          }}
                          className="ml-2 hover:bg-transparent relative flex items-center justify-center"
                          style={{ 
                            width: confirmDeleteId === entry.id ? '85px' : '36px',
                            height: '32px',
                            transition: 'width 300ms',
                            overflow: 'hidden'
                          }}
                          data-testid={`button-delete-history-${entry.id}`}
                        >
                          <Trash2 
                            className={`h-4 w-4 absolute transition-all duration-300 ${
                              confirmDeleteId === entry.id ? 'opacity-0 -translate-x-12' : 'opacity-100 translate-x-0'
                            }`}
                            style={{ 
                              color: confirmDeleteId === entry.id ? '#5AF5FA' : '#F7F7F7'
                            }}
                            onMouseEnter={(e) => confirmDeleteId !== entry.id && (e.currentTarget.style.color = '#5AF5FA')}
                            onMouseLeave={(e) => confirmDeleteId !== entry.id && (e.currentTarget.style.color = '#F7F7F7')}
                          />
                          <span 
                            className={`text-xs whitespace-nowrap font-medium absolute transition-all duration-300 ${
                              confirmDeleteId === entry.id ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
                            }`}
                            style={{ color: '#5AF5FA' }}
                          >
                            Delete Now
                          </span>
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-center">
                <p data-testid="text-no-history">No compare chart history yet. Add tickers or annotate a chart to see it here.</p>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
