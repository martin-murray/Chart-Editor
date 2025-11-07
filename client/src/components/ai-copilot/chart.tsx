import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useRef } from 'react';

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
    <div className="space-y-4" ref={chartRef}>
      <div className="flex items-center justify-between">
        <h3 
          className="text-lg font-semibold"
          style={{ fontFamily: 'Mulish, sans-serif', color: '#F7F7F7' }}
        >
          {config.title}
        </h3>
        <Button
          size="sm"
          onClick={handleExport}
          variant="outline"
          data-testid="button-export-chart"
        >
          <Download className="h-4 w-4 mr-2" />
          Export PNG
        </Button>
      </div>

      <div className="rounded-lg p-4" style={{ backgroundColor: '#121212' }}>
        {renderChart()}
      </div>
    </div>
  );
}
