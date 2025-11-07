import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Download, Code2, Copy, Check } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'area';
  data: any[];
  xKey: string;
  yKeys: string[];
  title: string;
  colors: string[];
}

interface Props {
  config: ChartConfig;
}

export function AICopilotChart({ config }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedReact, setCopiedReact] = useState(false);

  const handleExport = async () => {
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
  </style>
</head>
<body>
  <div id="root"></div>
  
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

  const copyToClipboard = async (text: string, type: 'html' | 'react') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'html') {
        setCopiedHtml(true);
        setTimeout(() => setCopiedHtml(false), 2000);
      } else {
        setCopiedReact(true);
        setTimeout(() => setCopiedReact(false), 2000);
      }
    } catch (error) {
      console.error('Copy failed:', error);
      alert('Failed to copy code. Please try again.');
    }
  };

  const renderChart = () => {
    const commonProps = {
      data: config.data,
      margin: { top: 20, right: 30, left: 20, bottom: 20 }
    };

    const textStyle = { 
      fontFamily: 'Mulish, sans-serif', 
      fontSize: 12,
      fill: '#f7f7f7'
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
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#121212', 
                  border: '1px solid #474747', 
                  color: '#f7f7f7',
                  fontFamily: 'Mulish, sans-serif',
                  fontSize: 12
                }}
                labelStyle={{ fontFamily: 'Mulish, sans-serif', fontSize: 12 }}
              />
              <Legend 
                wrapperStyle={{ fontFamily: 'Mulish, sans-serif', color: '#f7f7f7', fontSize: 12 }}
                iconSize={12}
              />
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
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#121212', 
                  border: '1px solid #474747', 
                  color: '#f7f7f7',
                  fontFamily: 'Mulish, sans-serif',
                  fontSize: 12
                }}
                labelStyle={{ fontFamily: 'Mulish, sans-serif', fontSize: 12 }}
              />
              <Legend 
                wrapperStyle={{ fontFamily: 'Mulish, sans-serif', color: '#f7f7f7', fontSize: 12 }}
                iconSize={12}
              />
              {config.yKeys.map((key, index) => (
                <Line 
                  key={key} 
                  type="monotone" 
                  dataKey={key} 
                  stroke={config.colors[index % config.colors.length]} 
                  strokeWidth={2}
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
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#121212', 
                  border: '1px solid #474747', 
                  color: '#f7f7f7',
                  fontFamily: 'Mulish, sans-serif',
                  fontSize: 12
                }}
                labelStyle={{ fontFamily: 'Mulish, sans-serif', fontSize: 12 }}
              />
              <Legend 
                wrapperStyle={{ fontFamily: 'Mulish, sans-serif', color: '#f7f7f7', fontSize: 12 }}
                iconSize={12}
              />
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
                  fontSize: 12
                }}
                labelStyle={{ fontFamily: 'Mulish, sans-serif', fontSize: 12 }}
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

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 
            className="text-lg font-semibold"
            style={{ fontFamily: 'Mulish, sans-serif', color: '#F7F7F7' }}
          >
            {config.title}
          </h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => setShowCodeDialog(true)}
              variant="outline"
              data-testid="button-export-code"
            >
              <Code2 className="h-4 w-4 mr-2" />
              Export Code
            </Button>
            <Button
              size="sm"
              onClick={handleExport}
              variant="outline"
              data-testid="button-export-png"
            >
              <Download className="h-4 w-4 mr-2" />
              Export PNG
            </Button>
          </div>
        </div>

        <div ref={chartRef} className="rounded-lg p-4" style={{ backgroundColor: '#121212' }}>
          {renderChart()}
        </div>
      </div>

      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Export Code</DialogTitle>
            <DialogDescription>
              Copy the code below to embed this chart in your own website or CodePen.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="html" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="html">HTML Embed</TabsTrigger>
              <TabsTrigger value="react">React Component</TabsTrigger>
            </TabsList>
            
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
