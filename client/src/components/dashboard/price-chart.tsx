import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
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

interface Annotation {
  id: string;
  x: number; // X coordinate on chart
  y: number; // Y coordinate on chart
  timestamp: number; // Data point timestamp
  price: number; // Price at this point
  text: string; // User annotation text
  time: string; // Formatted time string
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
  { label: '5D', value: '5D' },
  { label: '2W', value: '2W' },
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
  
  // Annotation state
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [showAnnotationInput, setShowAnnotationInput] = useState(false);
  const [annotationInput, setAnnotationInput] = useState('');
  const [pendingAnnotation, setPendingAnnotation] = useState<Omit<Annotation, 'id' | 'text'> | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

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
    
    // Get the active payload from the click event
    const { activePayload, activeLabel } = event;
    
    if (activePayload && activePayload.length > 0 && activeLabel) {
      const clickedData = activePayload[0].payload;
      const timestamp = clickedData.timestamp;
      const price = clickedData.close;
      const time = clickedData.time;
      
      // Only create new annotations on chart click, not edit existing ones
      const newAnnotation: Omit<Annotation, 'id' | 'text'> = {
        x: 0, // Will be set by chart rendering
        y: 0, // Will be set by chart rendering  
        timestamp,
        price,
        time
      };
      
      setPendingAnnotation(newAnnotation);
      setShowAnnotationInput(true);
      setAnnotationInput('');
      setEditingAnnotation(null);
      setIsEditMode(false);
    }
  };

  // Handle annotation double-click for editing
  const handleAnnotationDoubleClick = (annotation: Annotation) => {
    setEditingAnnotation(annotation);
    setIsEditMode(true);
    setAnnotationInput(annotation.text);
    setShowAnnotationInput(true);
  };

  // Save annotation with user text
  const saveAnnotation = () => {
    if (isEditMode && editingAnnotation && annotationInput.trim()) {
      // Update existing annotation
      setAnnotations(prev => prev.map(annotation => 
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
      
      setAnnotations(prev => [...prev, newAnnotation]);
      setShowAnnotationInput(false);
      setAnnotationInput('');
      setPendingAnnotation(null);
    }
  };

  // Delete annotation
  const deleteAnnotation = () => {
    if (editingAnnotation) {
      setAnnotations(prev => prev.filter(annotation => annotation.id !== editingAnnotation.id));
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
      // High resolution canvas - 1920px width with space for volume chart
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
      
      // Set transparent background
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
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
        
        // Price chart area (transparent background)
        // No background fill needed for transparency
        
        // Draw grid lines for price chart
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        for (let i = 0; i <= 5; i++) {
          const y = priceArea.y + (i * priceArea.height / 5);
          ctx.beginPath();
          ctx.moveTo(priceArea.x, y);
          ctx.lineTo(priceArea.x + priceArea.width, y);
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
        ctx.lineWidth = 6;
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
        
        // Volume chart area (transparent background)
        // No background fill needed for transparency
        
        // Draw grid lines for volume chart
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        for (let i = 0; i <= 3; i++) {
          const y = volumeArea.y + (i * volumeArea.height / 3);
          ctx.beginPath();
          ctx.moveTo(volumeArea.x, y);
          ctx.lineTo(volumeArea.x + volumeArea.width, y);
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
        
        // Draw X-axis labels at bottom with actual dates
        ctx.fillStyle = '#F7F7F7';
        ctx.font = '24px system-ui, -apple-system, sans-serif';
        const firstDate = formatTime(chartData.data[0].time, selectedTimeframe);
        const lastDate = formatTime(chartData.data[chartData.data.length - 1].time, selectedTimeframe);
        ctx.fillText(firstDate, volumeArea.x, volumeArea.y + volumeArea.height + 40);
        ctx.fillText(lastDate, volumeArea.x + volumeArea.width - ctx.measureText(lastDate).width, volumeArea.y + volumeArea.height + 40);
        
        // Draw annotations
        if (annotations.length > 0) {
          annotations.forEach((annotation) => {
            // Find the data index for this annotation
            const dataIndex = chartData.data.findIndex(d => d.timestamp === annotation.timestamp);
            if (dataIndex === -1) return;
            
            // Calculate annotation position
            const x = priceArea.x + (dataIndex / (chartData.data.length - 1)) * priceArea.width;
            
            // Draw vertical annotation line
            ctx.strokeStyle = '#FAFF50'; // Brand yellow
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x, priceArea.y);
            ctx.lineTo(x, volumeArea.y + volumeArea.height);
            ctx.stroke();
            
            // Draw annotation dot
            ctx.fillStyle = '#FAFF50';
            ctx.beginPath();
            ctx.arc(x, priceArea.y, 8, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw annotation text box
            const textBoxWidth = 240;
            const textBoxHeight = 80;
            const textBoxX = Math.min(x + 10, priceArea.x + priceArea.width - textBoxWidth);
            const textBoxY = priceArea.y + 20;
            
            // Text box background
            ctx.fillStyle = '#1C1C1C';
            ctx.strokeStyle = '#374151';
            ctx.lineWidth = 1;
            ctx.fillRect(textBoxX, textBoxY, textBoxWidth, textBoxHeight);
            ctx.strokeRect(textBoxX, textBoxY, textBoxWidth, textBoxHeight);
            
            // Text content
            ctx.fillStyle = '#FAFF50';
            ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
            ctx.fillText(formatTime(annotation.time, selectedTimeframe), textBoxX + 8, textBoxY + 20);
            
            ctx.fillStyle = '#9CA3AF';
            ctx.font = '14px system-ui, -apple-system, sans-serif';
            ctx.fillText(formatPrice(annotation.price), textBoxX + 8, textBoxY + 40);
            
            ctx.fillStyle = '#F7F7F7';
            ctx.font = '14px system-ui, -apple-system, sans-serif';
            // Wrap text if too long
            const maxWidth = textBoxWidth - 16;
            const words = annotation.text.split(' ');
            let line = '';
            let y = textBoxY + 60;
            
            for (let n = 0; n < words.length; n++) {
              const testLine = line + words[n] + ' ';
              const metrics = ctx.measureText(testLine);
              if (metrics.width > maxWidth && n > 0) {
                ctx.fillText(line, textBoxX + 8, y);
                line = words[n] + ' ';
                y += 16;
                if (y > textBoxY + textBoxHeight - 5) break; // Prevent overflow
              } else {
                line = testLine;
              }
            }
            ctx.fillText(line, textBoxX + 8, y);
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
      
      // Set transparent background
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
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
        
        // Price chart area (transparent background)
        // No background fill needed for transparency
        
        // Draw grid lines for price chart
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        for (let i = 0; i <= 5; i++) {
          const y = priceArea.y + (i * priceArea.height / 5);
          ctx.beginPath();
          ctx.moveTo(priceArea.x, y);
          ctx.lineTo(priceArea.x + priceArea.width, y);
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
        ctx.lineWidth = 6;
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
        
        // Volume chart area (transparent background)
        // No background fill needed for transparency
        
        // Draw grid lines for volume chart
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        for (let i = 0; i <= 3; i++) {
          const y = volumeArea.y + (i * volumeArea.height / 3);
          ctx.beginPath();
          ctx.moveTo(volumeArea.x, y);
          ctx.lineTo(volumeArea.x + volumeArea.width, y);
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
        
        // Draw X-axis labels at bottom with actual dates
        ctx.fillStyle = '#F7F7F7';
        ctx.font = '24px system-ui, -apple-system, sans-serif';
        const firstDate = formatTime(chartData.data[0].time, selectedTimeframe);
        const lastDate = formatTime(chartData.data[chartData.data.length - 1].time, selectedTimeframe);
        ctx.fillText(firstDate, volumeArea.x, volumeArea.y + volumeArea.height + 40);
        ctx.fillText(lastDate, volumeArea.x + volumeArea.width - ctx.measureText(lastDate).width, volumeArea.y + volumeArea.height + 40);
        
        // Draw annotations
        if (annotations.length > 0) {
          annotations.forEach((annotation) => {
            // Find the data index for this annotation
            const dataIndex = chartData.data.findIndex(d => d.timestamp === annotation.timestamp);
            if (dataIndex === -1) return;
            
            // Calculate annotation position
            const x = priceArea.x + (dataIndex / (chartData.data.length - 1)) * priceArea.width;
            
            // Draw vertical annotation line
            ctx.strokeStyle = '#FAFF50'; // Brand yellow
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x, priceArea.y);
            ctx.lineTo(x, volumeArea.y + volumeArea.height);
            ctx.stroke();
            
            // Draw annotation dot
            ctx.fillStyle = '#FAFF50';
            ctx.beginPath();
            ctx.arc(x, priceArea.y, 8, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw annotation text box
            const textBoxWidth = 240;
            const textBoxHeight = 80;
            const textBoxX = Math.min(x + 10, priceArea.x + priceArea.width - textBoxWidth);
            const textBoxY = priceArea.y + 20;
            
            // Text box background
            ctx.fillStyle = '#1C1C1C';
            ctx.strokeStyle = '#374151';
            ctx.lineWidth = 1;
            ctx.fillRect(textBoxX, textBoxY, textBoxWidth, textBoxHeight);
            ctx.strokeRect(textBoxX, textBoxY, textBoxWidth, textBoxHeight);
            
            // Text content
            ctx.fillStyle = '#FAFF50';
            ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
            ctx.fillText(formatTime(annotation.time, selectedTimeframe), textBoxX + 8, textBoxY + 20);
            
            ctx.fillStyle = '#9CA3AF';
            ctx.font = '14px system-ui, -apple-system, sans-serif';
            ctx.fillText(formatPrice(annotation.price), textBoxX + 8, textBoxY + 40);
            
            ctx.fillStyle = '#F7F7F7';
            ctx.font = '14px system-ui, -apple-system, sans-serif';
            // Wrap text if too long
            const maxWidth = textBoxWidth - 16;
            const words = annotation.text.split(' ');
            let line = '';
            let y = textBoxY + 60;
            
            for (let n = 0; n < words.length; n++) {
              const testLine = line + words[n] + ' ';
              const metrics = ctx.measureText(testLine);
              if (metrics.width > maxWidth && n > 0) {
                ctx.fillText(line, textBoxX + 8, y);
                line = words[n] + ' ';
                y += 16;
                if (y > textBoxY + textBoxHeight - 5) break; // Prevent overflow
              } else {
                line = testLine;
              }
            }
            ctx.fillText(line, textBoxX + 8, y);
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
            .grid-line { stroke: white; stroke-width: 2; stroke-opacity: 0.5; }
            .price-line { stroke: ${isPositive ? '#5AF5FA' : '#FFA5FF'}; stroke-width: 6; fill: none; stroke-linecap: round; stroke-linejoin: round; }
            .title-text { fill: #5AF5FA; font-family: system-ui, -apple-system, sans-serif; font-size: 48px; font-weight: bold; }
            .info-text { fill: #F7F7F7; font-family: system-ui, -apple-system, sans-serif; font-size: 36px; }
            .label-text { fill: #F7F7F7; font-family: system-ui, -apple-system, sans-serif; font-size: 24px; }
          </style>
        </defs>
        
        <!-- Transparent background -->
        <!-- Background removed for transparency -->
        
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
        for (let i = 0; i <= 5; i++) {
          const y = priceArea.y + (i * priceArea.height / 5);
          svgContent += `
            <line x1="${priceArea.x}" y1="${y}" x2="${priceArea.x + priceArea.width}" y2="${y}" class="grid-line"/>`;
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
        for (let i = 0; i <= 3; i++) {
          const y = volumeArea.y + (i * volumeArea.height / 3);
          svgContent += `
            <line x1="${volumeArea.x}" y1="${y}" x2="${volumeArea.x + volumeArea.width}" y2="${y}" class="grid-line"/>`;
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
        
        // Add X-axis labels at bottom with actual dates
        const firstDate = formatTime(chartData.data[0].time, selectedTimeframe);
        const lastDate = formatTime(chartData.data[chartData.data.length - 1].time, selectedTimeframe);
        svgContent += `
          <text x="${volumeArea.x}" y="${volumeArea.y + volumeArea.height + 40}" class="label-text">${firstDate}</text>
          <text x="${volumeArea.x + volumeArea.width - 60}" y="${volumeArea.y + volumeArea.height + 40}" class="label-text">${lastDate}</text>`;
        
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
              <line x1="${x}" y1="${priceArea.y}" x2="${x}" y2="${volumeArea.y + volumeArea.height}" stroke="#FAFF50" stroke-width="3"/>`;
            
            // Add annotation dot
            svgContent += `
              <circle cx="${x}" cy="${priceArea.y}" r="8" fill="#FAFF50"/>`;
            
            // Add annotation text box
            const textBoxWidth = 240;
            const textBoxHeight = 80;
            const textBoxX = Math.min(x + 10, priceArea.x + priceArea.width - textBoxWidth);
            const textBoxY = priceArea.y + 20;
            
            // Text box background
            svgContent += `
              <rect x="${textBoxX}" y="${textBoxY}" width="${textBoxWidth}" height="${textBoxHeight}" fill="#1C1C1C" stroke="#374151" stroke-width="1"/>`;
            
            // Text content
            svgContent += `
              <text x="${textBoxX + 8}" y="${textBoxY + 20}" fill="#FAFF50" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="bold">${formatTime(annotation.time, selectedTimeframe)}</text>
              <text x="${textBoxX + 8}" y="${textBoxY + 40}" fill="#9CA3AF" font-family="system-ui, -apple-system, sans-serif" font-size="14">${formatPrice(annotation.price)}</text>`;
            
            // Wrap annotation text
            const maxWidth = textBoxWidth - 16;
            const words = annotation.text.split(' ');
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
                  price: actualCurrentPrice,
                  percentChange: actualPercentChange,
                  marketCap: actualMarketCap
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
          <div ref={chartRef} className="w-full rounded-lg relative" style={{ backgroundColor: '#1C1C1C' }}>
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
                  
                  {/* Enhanced horizontal grid lines */}
                  <CartesianGrid 
                    strokeDasharray="1 1" 
                    stroke="white" 
                    opacity={0.5}
                    horizontal={true}
                    vertical={false}
                  />
                  
                  {/* Hidden X-axis for bottom line connection */}
                  <XAxis 
                    dataKey="time"
                    tick={false}
                    tickLine={false}
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
              
              {/* Annotation Overlay */}
              {annotations.length > 0 && chartDataWithPercentage && (
                <div className="absolute inset-0 pointer-events-none">
                  {annotations.map((annotation) => {
                    // Calculate position based on timestamp
                    const dataIndex = chartDataWithPercentage.findIndex(d => d.timestamp === annotation.timestamp);
                    if (dataIndex === -1) return null;
                    
                    const xPercent = (dataIndex / (chartDataWithPercentage.length - 1)) * 100;
                    // Account for chart margins (60px right margin for Y-axis)
                    const xPos = `calc(${xPercent}% - 30px)`;
                    
                    return (
                      <div
                        key={annotation.id}
                        className="absolute"
                        style={{ left: xPos, top: '15px', height: 'calc(100% - 20px)' }}
                      >
                        {/* Vertical annotation line */}
                        <div className="w-0.5 h-full relative" style={{ backgroundColor: '#FAFF50' }}>
                          {/* Annotation dot */}
                          <div className="absolute -top-1 -left-1 w-3 h-3 rounded-full border-2 border-background" style={{ backgroundColor: '#FAFF50' }}></div>
                          
                          {/* Annotation text */}
                          <div 
                            className="absolute top-0 left-2 bg-background border border-border rounded px-2 py-1 text-xs max-w-48 pointer-events-auto cursor-pointer hover:bg-muted"
                            onDoubleClick={() => handleAnnotationDoubleClick(annotation)}
                            title="Double-click to edit"
                          >
                            <div className="font-medium" style={{ color: '#FAFF50' }}>{formatTime(annotation.time, selectedTimeframe)}</div>
                            <div className="text-muted-foreground">{formatPrice(annotation.price)}</div>
                            <div className="text-foreground mt-1">{annotation.text}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                  <CartesianGrid 
                    strokeDasharray="1 1" 
                    stroke="white" 
                    opacity={0.5}
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
                    formatter={(value: number) => [formatNumber(value), 'Volume']}
                    contentStyle={{
                      backgroundColor: '#1C1C1C',
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
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

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