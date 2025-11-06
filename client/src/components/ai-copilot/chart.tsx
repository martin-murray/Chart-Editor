import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
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
    if (!chartRef.current) return;

    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#1C1C1C',
        scale: 2,
      });

      const link = document.createElement('a');
      link.download = `${config.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const renderChart = () => {
    const commonProps = {
      data: config.data,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };

    switch (config.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3A3A3A" />
              <XAxis dataKey={config.xKey} stroke="#F7F7F7" style={{ fontFamily: 'Mulish, sans-serif' }} />
              <YAxis stroke="#F7F7F7" style={{ fontFamily: 'Mulish, sans-serif' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#2A2A2A', border: '1px solid #3A3A3A', color: '#F7F7F7' }}
                labelStyle={{ fontFamily: 'Mulish, sans-serif' }}
              />
              <Legend wrapperStyle={{ fontFamily: 'Mulish, sans-serif', color: '#F7F7F7' }} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="#3A3A3A" />
              <XAxis dataKey={config.xKey} stroke="#F7F7F7" style={{ fontFamily: 'Mulish, sans-serif' }} />
              <YAxis stroke="#F7F7F7" style={{ fontFamily: 'Mulish, sans-serif' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#2A2A2A', border: '1px solid #3A3A3A', color: '#F7F7F7' }}
                labelStyle={{ fontFamily: 'Mulish, sans-serif' }}
              />
              <Legend wrapperStyle={{ fontFamily: 'Mulish, sans-serif', color: '#F7F7F7' }} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="#3A3A3A" />
              <XAxis dataKey={config.xKey} stroke="#F7F7F7" style={{ fontFamily: 'Mulish, sans-serif' }} />
              <YAxis stroke="#F7F7F7" style={{ fontFamily: 'Mulish, sans-serif' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#2A2A2A', border: '1px solid #3A3A3A', color: '#F7F7F7' }}
                labelStyle={{ fontFamily: 'Mulish, sans-serif' }}
              />
              <Legend wrapperStyle={{ fontFamily: 'Mulish, sans-serif', color: '#F7F7F7' }} />
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
                label
              >
                {config.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={config.colors[index % config.colors.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#2A2A2A', border: '1px solid #3A3A3A', color: '#F7F7F7' }}
                labelStyle={{ fontFamily: 'Mulish, sans-serif' }}
              />
              <Legend wrapperStyle={{ fontFamily: 'Mulish, sans-serif', color: '#F7F7F7' }} />
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

      <div className="bg-[#0A0A0A] rounded-lg p-4">
        {renderChart()}
      </div>
    </div>
  );
}
