import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Customized } from 'recharts';
import { Button } from '@/components/ui/button';
import { Download, Code2, Copy, Check, ChevronDown, Minus, Type, Ruler, Pencil, Trash2, FileImage, FileText, FileCode2 } from 'lucide-react';
import { toPng, toSvg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';

interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'area';
  data: any[];
  xKey: string;
  yKeys: string[];
  title: string;
  colors: string[];
}

interface Annotation {
  id: string;
  type: 'text' | 'horizontal' | 'percentage';
  x: number;
  y: number;
  timestamp?: number;
  price: number;
  time?: string;
  text?: string;
  startTimestamp?: number;
  startPrice?: number;
  startTime?: string;
  endTimestamp?: number;
  endPrice?: number;
  endTime?: string;
  percentage?: number;
  verticalOffset?: number;
  horizontalOffset?: number;
}

interface Props {
  config: ChartConfig;
}

export function AICopilotChart({ config }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<{ offset: any; yScale: any } | null>(null);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedReact, setCopiedReact] = useState(false);
  const [copiedIframe, setCopiedIframe] = useState(false);
  
  // Annotation state
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annotationMode, setAnnotationMode] = useState<'text' | 'percentage' | 'horizontal' | null>(null);
  const [showAnnotationInput, setShowAnnotationInput] = useState(false);
  const [pendingAnnotation, setPendingAnnotation] = useState<Omit<Annotation, 'id' | 'text'> | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [annotationInput, setAnnotationInput] = useState('');
  const [horizontalValueInput, setHorizontalValueInput] = useState('');
  const [pendingPercentageStart, setPendingPercentageStart] = useState<{ timestamp: number; price: number; time: string } | null>(null);
  
  // Hover state for horizontal lines
  const [hoveredHorizontalId, setHoveredHorizontalId] = useState<string | null>(null);
  
  // Hover tool toggle
  const [showHoverTooltip, setShowHoverTooltip] = useState(true);

  // Calculate Y-axis domain from data for proper scaling
  const getYDomain = () => {
    if (!config.data || config.data.length === 0) return [0, 100];
    let min = Infinity;
    let max = -Infinity;
    config.data.forEach(item => {
      config.yKeys.forEach(key => {
        const val = item[key];
        if (typeof val === 'number') {
          min = Math.min(min, val);
          max = Math.max(max, val);
        }
      });
    });
    // Also include horizontal annotation lines in domain
    annotations.filter(a => a.type === 'horizontal').forEach(a => {
      min = Math.min(min, a.price);
      max = Math.max(max, a.price);
    });
    const padding = (max - min) * 0.1;
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  };

  const handleExportPNG = async () => {
    if (!chartRef.current) {
      console.error('Chart ref not found');
      alert('Chart not ready for export. Please try again.');
      return;
    }

    try {
      const dataUrl = await toPng(chartRef.current, {
        backgroundColor: '#121212',
        pixelRatio: 2,
        cacheBust: true,
      });

      const link = document.createElement('a');
      link.download = `${config.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export chart. Please try again.');
    }
  };

  const handleExportPDF = async () => {
    if (!chartRef.current) {
      alert('Chart not ready for export. Please try again.');
      return;
    }

    try {
      const dataUrl = await toPng(chartRef.current, {
        backgroundColor: '#121212',
        pixelRatio: 2,
        cacheBust: true,
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [chartRef.current.offsetWidth, chartRef.current.offsetHeight]
      });
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, chartRef.current.offsetWidth, chartRef.current.offsetHeight);
      pdf.save(`${config.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
    } catch (error) {
      console.error('Export PDF failed:', error);
      alert('Failed to export as PDF. Please try again.');
    }
  };

  const handleExportSVG = async () => {
    if (!chartRef.current) {
      alert('Chart not ready for export. Please try again.');
      return;
    }

    try {
      const dataUrl = await toSvg(chartRef.current, {
        backgroundColor: '#121212',
      });

      const link = document.createElement('a');
      link.download = `${config.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.svg`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Export SVG failed:', error);
      alert('Failed to export as SVG. Please try again.');
    }
  };

  // Handle chart click for annotations
  const handleChartClick = (event: any) => {
    if (!annotationMode || !event) return;
    
    // For horizontal line annotations, use the click position to estimate value
    if (annotationMode === 'horizontal') {
      // Get Y value from chart click
      if (event.activePayload && event.activePayload.length > 0) {
        const firstPayload = event.activePayload[0].payload;
        const yValue = firstPayload[config.yKeys[0]] || 0;
        
        const newAnnotation: Omit<Annotation, 'id' | 'text'> = {
          type: 'horizontal',
          x: 0,
          y: 0,
          price: yValue,
          time: String(firstPayload[config.xKey] || '')
        };
        
        setPendingAnnotation(newAnnotation);
        setHorizontalValueInput(yValue.toString());
        setShowAnnotationInput(true);
        setAnnotationInput('');
        setEditingAnnotation(null);
        setIsEditMode(false);
      }
      return;
    }
    
    // For text annotations (vertical lines)
    if (annotationMode === 'text' && event.activePayload && event.activePayload.length > 0) {
      const payload = event.activePayload[0].payload;
      const xValue = payload[config.xKey];
      const yValue = payload[config.yKeys[0]] || 0;
      
      const newAnnotation: Omit<Annotation, 'id' | 'text'> = {
        type: 'text',
        x: 0,
        y: 0,
        timestamp: Date.now(),
        price: yValue,
        time: String(xValue)
      };
      
      setPendingAnnotation(newAnnotation);
      setShowAnnotationInput(true);
      setAnnotationInput('');
      setEditingAnnotation(null);
      setIsEditMode(false);
    }
    
    // For percentage measurements
    if (annotationMode === 'percentage' && event.activePayload && event.activePayload.length > 0) {
      const payload = event.activePayload[0].payload;
      const xValue = payload[config.xKey];
      const yValue = payload[config.yKeys[0]] || 0;
      
      if (!pendingPercentageStart) {
        setPendingPercentageStart({
          timestamp: Date.now(),
          price: yValue,
          time: String(xValue)
        });
      } else {
        const startVal = pendingPercentageStart.price;
        const endVal = yValue;
        const percentageDiff = startVal !== 0 ? ((endVal - startVal) / Math.abs(startVal)) * 100 : 0;
        
        const newAnnotation: Annotation = {
          id: `percentage-${Date.now()}`,
          type: 'percentage',
          x: 0,
          y: 0,
          timestamp: pendingPercentageStart.timestamp,
          price: startVal,
          time: pendingPercentageStart.time,
          startTimestamp: pendingPercentageStart.timestamp,
          startPrice: startVal,
          startTime: pendingPercentageStart.time,
          endTimestamp: Date.now(),
          endPrice: endVal,
          endTime: String(xValue),
          percentage: percentageDiff
        };
        
        setAnnotations(prev => [...prev, newAnnotation]);
        setPendingPercentageStart(null);
      }
    }
  };

  // Handle annotation double-click for editing
  const handleAnnotationDoubleClick = (annotation: Annotation) => {
    if (annotation.type === 'text' || annotation.type === 'horizontal') {
      setEditingAnnotation(annotation);
      setIsEditMode(true);
      setAnnotationInput(annotation.text || '');
      if (annotation.type === 'horizontal') {
        setHorizontalValueInput(annotation.price?.toString() || '');
      }
      setShowAnnotationInput(true);
    } else if (annotation.type === 'percentage') {
      // Delete percentage annotations on double-click
      setAnnotations(prev => prev.filter(a => a.id !== annotation.id));
    }
  };

  // Save annotation
  const saveAnnotation = () => {
    if (isEditMode && editingAnnotation) {
      if (editingAnnotation.type === 'horizontal') {
        const newValue = parseFloat(horizontalValueInput);
        if (!isNaN(newValue)) {
          setAnnotations(prev => prev.map(annotation =>
            annotation.id === editingAnnotation.id
              ? { ...annotation, price: newValue, text: annotationInput.trim() }
              : annotation
          ));
        }
      } else if (annotationInput.trim()) {
        setAnnotations(prev => prev.map(annotation =>
          annotation.id === editingAnnotation.id
            ? { ...annotation, text: annotationInput.trim() }
            : annotation
        ));
      }
      setShowAnnotationInput(false);
      setAnnotationInput('');
      setHorizontalValueInput('');
      setEditingAnnotation(null);
      setIsEditMode(false);
    } else if (pendingAnnotation) {
      if (pendingAnnotation.type === 'horizontal') {
        const newValue = parseFloat(horizontalValueInput);
        if (!isNaN(newValue)) {
          const newAnnotation: Annotation = {
            ...pendingAnnotation,
            id: `annotation-${Date.now()}`,
            price: newValue,
            text: annotationInput.trim() || ''
          };
          setAnnotations(prev => [...prev, newAnnotation]);
        }
      } else if (annotationInput.trim()) {
        const newAnnotation: Annotation = {
          ...pendingAnnotation,
          id: `annotation-${Date.now()}`,
          text: annotationInput.trim()
        };
        setAnnotations(prev => [...prev, newAnnotation]);
      }
      setShowAnnotationInput(false);
      setAnnotationInput('');
      setHorizontalValueInput('');
      setPendingAnnotation(null);
    }
  };

  // Delete annotation
  const deleteAnnotation = () => {
    if (editingAnnotation) {
      setAnnotations(prev => prev.filter(annotation => annotation.id !== editingAnnotation.id));
      setShowAnnotationInput(false);
      setAnnotationInput('');
      setHorizontalValueInput('');
      setEditingAnnotation(null);
      setIsEditMode(false);
    }
  };

  // Cancel annotation
  const cancelAnnotation = () => {
    setShowAnnotationInput(false);
    setAnnotationInput('');
    setHorizontalValueInput('');
    setPendingAnnotation(null);
    setEditingAnnotation(null);
    setIsEditMode(false);
  };

  // Clear all annotations
  const clearAllAnnotations = () => {
    if (annotations.length > 0 && confirm('Delete all annotations?')) {
      setAnnotations([]);
      setPendingPercentageStart(null);
    }
  };

  const generateHtmlCode = () => {
    const dataJson = JSON.stringify(config.data, null, 2);
    const colorsJson = JSON.stringify(config.colors);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title}</title>
  <script crossorigin src="https://unpkg.com/react@17/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@17/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/recharts@2.5.0/dist/Recharts.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background-color: #121212;
      font-family: 'Mulish', sans-serif;
      color: #f7f7f7;
    }
    #chart-container {
      background-color: #121212;
      padding: 20px;
      border-radius: 8px;
    }
    .error {
      color: #ff6b6b;
      padding: 20px;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  
  <script>
    // Error handling
    window.onerror = function(msg, url, line, col, error) {
      document.getElementById('root').innerHTML = '<div class="error">Error loading chart: ' + msg + '</div>';
      return false;
    };
    
    // Check if dependencies loaded
    if (typeof React === 'undefined' || typeof ReactDOM === 'undefined' || typeof Recharts === 'undefined') {
      document.getElementById('root').innerHTML = '<div class="error">Failed to load required libraries. Please check your internet connection.</div>';
    }
  </script>
  
  <script type="text/babel">
    const { ${config.type === 'bar' ? 'BarChart, Bar' : config.type === 'line' ? 'LineChart, Line' : config.type === 'area' ? 'AreaChart, Area' : 'PieChart, Pie, Cell'}, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = Recharts;
    
    const data = ${dataJson};
    const colors = ${colorsJson};
    
    function Chart() {
      return (
        <div id="chart-container">
          <h2 style={{ fontFamily: 'Mulish, sans-serif', color: '#f7f7f7', marginBottom: '20px' }}>
            ${config.title}
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            ${generateChartComponent()}
          </ResponsiveContainer>
        </div>
      );
    }
    
    ReactDOM.render(<Chart />, document.getElementById('root'));
  </script>
</body>
</html>`;
  };

  const generateChartComponent = () => {
    const textStyle = `{ fontFamily: 'Mulish, sans-serif', fontSize: 12, fill: '#f7f7f7' }`;
    const tooltipStyle = `{ backgroundColor: '#121212', border: '1px solid #474747', color: '#f7f7f7', fontFamily: 'Mulish, sans-serif', fontSize: 12 }`;
    
    switch (config.type) {
      case 'bar':
        return `<BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#474747" />
              <XAxis dataKey="${config.xKey}" stroke="#474747" tick={${textStyle}} angle={-45} textAnchor="end" height={60} />
              <YAxis stroke="#474747" tick={${textStyle}} />
              <Tooltip contentStyle={${tooltipStyle}} />
              <Legend wrapperStyle={{ fontFamily: 'Mulish, sans-serif', color: '#f7f7f7', fontSize: 12 }} />
              ${config.yKeys.map((key, idx) => `<Bar dataKey="${key}" fill={colors[${idx}]} />`).join('\n              ')}
            </BarChart>`;
      case 'line':
        return `<LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#474747" />
              <XAxis dataKey="${config.xKey}" stroke="#474747" tick={${textStyle}} angle={-45} textAnchor="end" height={60} />
              <YAxis stroke="#474747" tick={${textStyle}} />
              <Tooltip contentStyle={${tooltipStyle}} />
              <Legend wrapperStyle={{ fontFamily: 'Mulish, sans-serif', color: '#f7f7f7', fontSize: 12 }} />
              ${config.yKeys.map((key, idx) => `<Line type="monotone" dataKey="${key}" stroke={colors[${idx}]} strokeWidth={2} />`).join('\n              ')}
            </LineChart>`;
      case 'area':
        return `<AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#474747" />
              <XAxis dataKey="${config.xKey}" stroke="#474747" tick={${textStyle}} angle={-45} textAnchor="end" height={60} />
              <YAxis stroke="#474747" tick={${textStyle}} />
              <Tooltip contentStyle={${tooltipStyle}} />
              <Legend wrapperStyle={{ fontFamily: 'Mulish, sans-serif', color: '#f7f7f7', fontSize: 12 }} />
              ${config.yKeys.map((key, idx) => `<Area type="monotone" dataKey="${key}" fill={colors[${idx}]} stroke={colors[${idx}]} fillOpacity={0.6} />`).join('\n              ')}
            </AreaChart>`;
      case 'pie':
        return `<PieChart>
              <Pie data={data} dataKey="${config.yKeys[0]}" nameKey="${config.xKey}" cx="50%" cy="50%" outerRadius={120} label={{ fill: '#f7f7f7', fontSize: 12, fontFamily: 'Mulish, sans-serif' }}>
                {data.map((entry, index) => <Cell key={'cell-' + index} fill={colors[index % colors.length]} />)}
              </Pie>
              <Tooltip contentStyle={${tooltipStyle}} />
              <Legend wrapperStyle={{ fontFamily: 'Mulish, sans-serif', color: '#f7f7f7', fontSize: 12 }} />
            </PieChart>`;
    }
  };

  const generateReactCode = () => {
    const dataJson = JSON.stringify(config.data, null, 2);
    const colorsJson = JSON.stringify(config.colors);
    
    return `import { ${config.type === 'bar' ? 'BarChart, Bar' : config.type === 'line' ? 'LineChart, Line' : config.type === 'area' ? 'AreaChart, Area' : 'PieChart, Pie, Cell'}, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const data = ${dataJson};

const colors = ${colorsJson};

export function Chart() {
  const textStyle = { 
    fontFamily: 'Mulish, sans-serif', 
    fontSize: 12,
    fill: '#f7f7f7'
  };

  return (
    <div className="space-y-4">
      <h2 style={{ fontFamily: 'Mulish, sans-serif', color: '#f7f7f7' }}>
        ${config.title}
      </h2>
      
      <div className="rounded-lg p-4" style={{ backgroundColor: '#121212' }}>
        <ResponsiveContainer width="100%" height={400}>
          ${generateChartComponent()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}`;
  };

  const generateIframeCode = () => {
    const htmlContent = generateHtmlCode();
    
    // UTF-8 safe base64 encoding for data URI
    // Split into chunks to avoid call stack size limits
    const utf8Bytes = new TextEncoder().encode(htmlContent);
    let binaryString = '';
    const chunkSize = 8192;
    for (let i = 0; i < utf8Bytes.length; i += chunkSize) {
      const chunk = utf8Bytes.slice(i, i + chunkSize);
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64Html = btoa(binaryString);
    
    // Escape title attribute
    const escapedTitle = config.title
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    return `<iframe 
  src="data:text/html;base64,${base64Html}"
  style="width: 100%; height: 500px; border: none;"
  title="${escapedTitle}"
></iframe>`;
  };

  const copyToClipboard = async (text: string, type: 'html' | 'react' | 'iframe') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'html') {
        setCopiedHtml(true);
        setTimeout(() => setCopiedHtml(false), 2000);
      } else if (type === 'react') {
        setCopiedReact(true);
        setTimeout(() => setCopiedReact(false), 2000);
      } else {
        setCopiedIframe(true);
        setTimeout(() => setCopiedIframe(false), 2000);
      }
    } catch (error) {
      console.error('Copy failed:', error);
      alert('Failed to copy code. Please try again.');
    }
  };

  const renderChart = () => {
    const commonProps = {
      data: config.data,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
      onClick: handleChartClick
    };

    const textStyle = { 
      fontFamily: 'Mulish, sans-serif', 
      fontSize: 12,
      fill: '#f7f7f7'
    };

    const yDomain = getYDomain();

    // Render horizontal annotations for line/bar/area charts
    const renderHorizontalAnnotations = () => {
      return annotations
        .filter(annotation => annotation.type === 'horizontal')
        .map((annotation) => {
          const isHovered = hoveredHorizontalId === annotation.id;
          return (
            <ReferenceLine
              key={annotation.id}
              y={annotation.price}
              stroke={isHovered ? "#CC99FF" : "#AA99FF"}
              strokeWidth={isHovered ? 3 : 2}
              strokeDasharray="5 5"
            />
          );
        });
    };

    // Render text annotations (vertical lines)
    const renderTextAnnotations = () => {
      return annotations
        .filter(annotation => annotation.type === 'text')
        .map((annotation) => (
          <ReferenceLine
            key={annotation.id}
            x={annotation.time}
            stroke="#FAFF50"
            strokeWidth={1}
            label={{
              value: annotation.text || '',
              position: 'top',
              fill: '#FAFF50',
              fontSize: 10
            }}
          />
        ));
    };

    // Render percentage measurement annotations
    const renderPercentageAnnotations = () => {
      return annotations
        .filter(annotation => annotation.type === 'percentage')
        .flatMap((annotation) => {
          const isPositive = (annotation.percentage || 0) >= 0;
          const lineColor = isPositive ? '#22C55E' : '#EF4444';
          
          // Find the data points for start and end times
          const startIdx = config.data.findIndex((d: any) => String(d[config.xKey]) === annotation.startTime);
          const endIdx = config.data.findIndex((d: any) => String(d[config.xKey]) === annotation.endTime);
          
          if (startIdx === -1 || endIdx === -1) return [];
          
          return [
            // Start vertical line
            <ReferenceLine
              key={`${annotation.id}-start`}
              x={annotation.startTime}
              stroke={lineColor}
              strokeWidth={2}
              strokeDasharray="3 3"
            />,
            // End vertical line
            <ReferenceLine
              key={`${annotation.id}-end`}
              x={annotation.endTime}
              stroke={lineColor}
              strokeWidth={2}
              strokeDasharray="3 3"
            />
          ];
        });
    };

    switch (config.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#474747" />
              <XAxis 
                dataKey={config.xKey} 
                stroke="#474747" 
                tick={textStyle}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="#474747" 
                tick={textStyle}
                domain={yDomain}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#121212', 
                  border: '1px solid #474747', 
                  color: '#f7f7f7',
                  fontFamily: 'Mulish, sans-serif',
                  fontSize: 12,
                  display: showHoverTooltip ? 'block' : 'none'
                }}
                labelStyle={{ fontFamily: 'Mulish, sans-serif', fontSize: 12 }}
                wrapperStyle={{ display: showHoverTooltip ? 'block' : 'none' }}
              />
              <Legend 
                wrapperStyle={{ fontFamily: 'Mulish, sans-serif', color: '#f7f7f7', fontSize: 12 }}
                iconSize={12}
              />
              {renderHorizontalAnnotations()}
              {renderTextAnnotations()}
              {renderPercentageAnnotations()}
              {config.yKeys.map((key, index) => (
                <Bar 
                  key={key} 
                  dataKey={key} 
                  fill={config.colors[index % config.colors.length]} 
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#474747" />
              <XAxis 
                dataKey={config.xKey} 
                stroke="#474747" 
                tick={textStyle}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="#474747" 
                tick={textStyle}
                domain={yDomain}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#121212', 
                  border: '1px solid #474747', 
                  color: '#f7f7f7',
                  fontFamily: 'Mulish, sans-serif',
                  fontSize: 12,
                  display: showHoverTooltip ? 'block' : 'none'
                }}
                labelStyle={{ fontFamily: 'Mulish, sans-serif', fontSize: 12 }}
                wrapperStyle={{ display: showHoverTooltip ? 'block' : 'none' }}
              />
              <Legend 
                wrapperStyle={{ fontFamily: 'Mulish, sans-serif', color: '#f7f7f7', fontSize: 12 }}
                iconSize={12}
              />
              {renderHorizontalAnnotations()}
              {renderTextAnnotations()}
              {renderPercentageAnnotations()}
              {config.yKeys.map((key, index) => (
                <Line 
                  key={key} 
                  type="monotone" 
                  dataKey={key} 
                  stroke={config.colors[index % config.colors.length]} 
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#474747" />
              <XAxis 
                dataKey={config.xKey} 
                stroke="#474747" 
                tick={textStyle}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="#474747" 
                tick={textStyle}
                domain={yDomain}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#121212', 
                  border: '1px solid #474747', 
                  color: '#f7f7f7',
                  fontFamily: 'Mulish, sans-serif',
                  fontSize: 12,
                  display: showHoverTooltip ? 'block' : 'none'
                }}
                labelStyle={{ fontFamily: 'Mulish, sans-serif', fontSize: 12 }}
                wrapperStyle={{ display: showHoverTooltip ? 'block' : 'none' }}
              />
              <Legend 
                wrapperStyle={{ fontFamily: 'Mulish, sans-serif', color: '#f7f7f7', fontSize: 12 }}
                iconSize={12}
              />
              {renderHorizontalAnnotations()}
              {renderTextAnnotations()}
              {renderPercentageAnnotations()}
              {config.yKeys.map((key, index) => (
                <Area 
                  key={key} 
                  type="monotone" 
                  dataKey={key} 
                  fill={config.colors[index % config.colors.length]} 
                  stroke={config.colors[index % config.colors.length]}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={config.data}
                dataKey={config.yKeys[0]}
                nameKey={config.xKey}
                cx="50%"
                cy="50%"
                outerRadius={120}
                label={{
                  fill: '#f7f7f7',
                  fontSize: 12,
                  fontFamily: 'Mulish, sans-serif'
                }}
              >
                {config.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={config.colors[index % config.colors.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#121212', 
                  border: '1px solid #474747', 
                  color: '#f7f7f7',
                  fontFamily: 'Mulish, sans-serif',
                  fontSize: 12,
                  display: showHoverTooltip ? 'block' : 'none'
                }}
                labelStyle={{ fontFamily: 'Mulish, sans-serif', fontSize: 12 }}
                wrapperStyle={{ display: showHoverTooltip ? 'block' : 'none' }}
              />
              <Legend 
                wrapperStyle={{ fontFamily: 'Mulish, sans-serif', color: '#f7f7f7', fontSize: 12 }}
                iconSize={12}
              />
            </PieChart>
          </ResponsiveContainer>
        );
    }
  };

  // Check if annotations are supported for this chart type
  const annotationsSupported = config.type !== 'pie';

  return (
    <>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 
            className="text-lg font-semibold"
            style={{ fontFamily: 'Mulish, sans-serif', color: '#F7F7F7' }}
          >
            {config.title}
          </h3>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Annotation Tools Dropdown - only for line/bar/area charts */}
            {annotationsSupported && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    data-testid="button-annotation-tools"
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
                    {annotationMode === 'percentage' && (
                      <>
                        <Ruler className="w-3 h-3 mr-1" style={{ color: '#22C55E' }} />
                        Measure
                      </>
                    )}
                    {!annotationMode && 'Annotate'}
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
                    Vertical Line
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
                    Horizontal Line
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setAnnotationMode('percentage');
                      setPendingPercentageStart(null);
                    }}
                    className="cursor-pointer"
                    data-testid="menu-annotation-percentage"
                  >
                    <Ruler className="w-3 h-3 mr-2" style={{ color: '#22C55E' }} />
                    Measure %
                  </DropdownMenuItem>
                  {annotations.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={clearAllAnnotations}
                        className="cursor-pointer text-red-400"
                        data-testid="menu-clear-annotations"
                      >
                        <Trash2 className="w-3 h-3 mr-2" />
                        Clear All
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {/* Hover Tool Toggle */}
            <div className="flex items-center gap-2">
              <label htmlFor="ai-hover-tool-toggle" className="text-xs text-muted-foreground">
                Hover tool
              </label>
              <Switch
                id="ai-hover-tool-toggle"
                checked={showHoverTooltip}
                onCheckedChange={setShowHoverTooltip}
                className="scale-75"
                data-testid="switch-hover-tool"
              />
            </div>

            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs border-[#5AF5FA]/30 text-[#5AF5FA] hover:bg-[#5AF5FA]/10"
                  data-testid="button-export"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Export
                  <ChevronDown className="w-3 h-3 ml-1" style={{ color: '#5AF5FA' }} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={handleExportPNG} className="cursor-pointer">
                  <FileImage className="w-4 h-4 mr-2" />
                  Export as PNG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                  <FileText className="w-4 h-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportSVG} className="cursor-pointer">
                  <FileImage className="w-4 h-4 mr-2" />
                  Export as SVG
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowCodeDialog(true)} className="cursor-pointer">
                  <FileCode2 className="w-4 h-4 mr-2" />
                  Code Embed
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mode indicator */}
        {annotationMode && annotationsSupported && (
          <div className="text-xs text-muted-foreground px-2 py-1 bg-[#1a1a1a] rounded inline-block">
            {annotationMode === 'text' && 'Click on chart to add vertical line annotation'}
            {annotationMode === 'horizontal' && 'Click on chart to add horizontal line at that value'}
            {annotationMode === 'percentage' && (
              pendingPercentageStart 
                ? 'Click second point to complete measurement' 
                : 'Click first point to start measurement'
            )}
            <button 
              onClick={() => {
                setAnnotationMode(null);
                setPendingPercentageStart(null);
              }}
              className="ml-2 text-[#5AF5FA] hover:underline"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Chart */}
        <div ref={chartRef} className="rounded-lg p-4 relative" style={{ backgroundColor: '#121212' }}>
          {renderChart()}
        </div>

        {/* Horizontal Lines Legend - clickable to edit */}
        {annotationsSupported && annotations.filter(a => a.type === 'horizontal').length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs text-muted-foreground">Horizontal Lines:</span>
            {annotations.filter(a => a.type === 'horizontal').map((annotation) => (
              <button
                key={annotation.id}
                onClick={() => handleAnnotationDoubleClick(annotation)}
                className="px-2 py-1 rounded text-xs cursor-pointer hover:opacity-80 flex items-center gap-1 transition-colors"
                style={{ 
                  backgroundColor: '#1a1a1a', 
                  color: '#AA99FF', 
                  border: '1px solid #AA99FF' 
                }}
                title="Click to edit"
              >
                <Minus className="w-3 h-3" />
                {annotation.price.toFixed(2)}{annotation.text && ` - ${annotation.text}`}
                <Pencil className="w-3 h-3 ml-1 opacity-60" />
              </button>
            ))}
          </div>
        )}

        {/* Percentage annotations display */}
        {annotations.filter(a => a.type === 'percentage').length > 0 && (
          <div className="flex flex-wrap gap-2">
            {annotations.filter(a => a.type === 'percentage').map((annotation) => {
              const isPositive = (annotation.percentage || 0) >= 0;
              return (
                <div
                  key={annotation.id}
                  className="px-2 py-1 rounded text-xs cursor-pointer hover:opacity-80"
                  style={{
                    backgroundColor: '#1a1a1a',
                    border: `1px solid ${isPositive ? '#22C55E' : '#EF4444'}`,
                    color: isPositive ? '#22C55E' : '#EF4444'
                  }}
                  onClick={() => handleAnnotationDoubleClick(annotation)}
                  title="Click to delete"
                >
                  {isPositive ? '↗' : '↘'} {(annotation.percentage || 0).toFixed(2)}%
                  <span className="text-muted-foreground ml-2">
                    ({annotation.startTime} → {annotation.endTime})
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Annotation Input Modal */}
      {showAnnotationInput && (pendingAnnotation || editingAnnotation) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="border border-border rounded-lg p-6 w-96 max-w-[90vw]" style={{ backgroundColor: '#3A3A3A' }}>
            <h3 className="text-lg font-semibold mb-4">
              {isEditMode ? 'Edit Annotation' : (pendingAnnotation?.type === 'horizontal' ? 'Add Horizontal Line' : 'Add Annotation')}
            </h3>
            
            {/* For horizontal annotations, show value input */}
            {(pendingAnnotation?.type === 'horizontal' || editingAnnotation?.type === 'horizontal') && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Value</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    value={horizontalValueInput}
                    onChange={(e) => setHorizontalValueInput(e.target.value)}
                    placeholder="Enter value..."
                    className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#5AF5FA]"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        saveAnnotation();
                      } else if (e.key === 'Escape') {
                        cancelAnnotation();
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the Y-axis value for the horizontal line
                </p>
              </div>
            )}
            
            {/* Show context info for non-horizontal annotations */}
            {pendingAnnotation?.type !== 'horizontal' && editingAnnotation?.type !== 'horizontal' && (
              <div className="mb-4 text-sm text-muted-foreground">
                <div>X: {isEditMode ? editingAnnotation?.time : pendingAnnotation?.time}</div>
                <div>Y: {(isEditMode ? editingAnnotation?.price || 0 : pendingAnnotation?.price || 0).toFixed(2)}</div>
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {(pendingAnnotation?.type === 'horizontal' || editingAnnotation?.type === 'horizontal') ? 'Label (optional)' : 'Annotation Text'}
              </label>
              <textarea
                value={annotationInput}
                onChange={(e) => setAnnotationInput(e.target.value)}
                placeholder={(pendingAnnotation?.type === 'horizontal' || editingAnnotation?.type === 'horizontal') ? 'e.g. Target, Support level...' : 'Enter annotation text...'}
                className="w-full h-20 px-3 py-2 border border-border rounded-md bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus={pendingAnnotation?.type !== 'horizontal' && editingAnnotation?.type !== 'horizontal'}
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
                disabled={(pendingAnnotation?.type === 'horizontal' || editingAnnotation?.type === 'horizontal') 
                  ? !horizontalValueInput.trim() 
                  : !annotationInput.trim()}
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

      {/* Code Export Dialog */}
      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Export Code</DialogTitle>
            <DialogDescription>
              Copy the code below to embed this chart in your own website or CodePen.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="iframe" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="iframe">iframe Embed</TabsTrigger>
              <TabsTrigger value="html">HTML File</TabsTrigger>
              <TabsTrigger value="react">React Component</TabsTrigger>
            </TabsList>
            
            <TabsContent value="iframe" className="flex-1 overflow-hidden flex flex-col mt-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-muted-foreground">
                  Paste this iframe code directly into any website. Note: Some platforms may block data URIs due to CSP restrictions. If the chart doesn't display, use the HTML File option instead.
                </p>
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(generateIframeCode(), 'iframe')}
                  variant="outline"
                  data-testid="button-copy-iframe"
                >
                  {copiedIframe ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
              <pre className="flex-1 overflow-auto rounded-lg border bg-[#1e1e1e] p-4 text-xs">
                <code>{generateIframeCode()}</code>
              </pre>
            </TabsContent>
            
            <TabsContent value="html" className="flex-1 overflow-hidden flex flex-col mt-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-muted-foreground">
                  Self-contained HTML file with embedded chart
                </p>
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(generateHtmlCode(), 'html')}
                  variant="outline"
                  data-testid="button-copy-html"
                >
                  {copiedHtml ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
              <pre className="flex-1 overflow-auto rounded-lg border bg-[#1e1e1e] p-4 text-xs">
                <code>{generateHtmlCode()}</code>
              </pre>
            </TabsContent>
            
            <TabsContent value="react" className="flex-1 overflow-hidden flex flex-col mt-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-muted-foreground">
                  React component (requires recharts package)
                </p>
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(generateReactCode(), 'react')}
                  variant="outline"
                  data-testid="button-copy-react"
                >
                  {copiedReact ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
              <pre className="flex-1 overflow-auto rounded-lg border bg-[#1e1e1e] p-4 text-xs">
                <code>{generateReactCode()}</code>
              </pre>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
