import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ResizablePanel } from '@/components/ui/resizable';
import { Bot, Send, X, Sparkles, FileText, TrendingUp, Loader2 } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface CopilotAction {
  type: 'overlay:indicator' | 'overlay:custom' | 'timeframe:change' | 'annotation:add' | 'timeseries:replace';
  payload: any;
}

interface CopilotPanelProps {
  symbol: string;
  timeframe: string;
  isOpen: boolean;
  onClose: () => void;
  onApplyOverlay?: (overlay: any) => void;
  onApplyTimeSeries?: (data: any[]) => void;
  onChangeTimeframe?: (timeframe: string) => void;
  onAddAnnotation?: (annotation: any) => void;
  isMobile?: boolean;
}

export function CopilotPanel({
  symbol,
  timeframe,
  isOpen,
  onClose,
  onApplyOverlay,
  onApplyTimeSeries,
  onChangeTimeframe,
  onAddAnnotation,
  isMobile = false
}: CopilotPanelProps) {
  const { toast } = useToast();
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create chat session
  const createSession = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/ai-copilot/session');
      return res.json();
    },
    onSuccess: (data) => {
      setChatId(data.id);
      setMessages([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start AI copilot session",
        variant: "destructive"
      });
    }
  });

  // Fetch messages
  const { data: messagesData } = useQuery({
    queryKey: ['/api/ai-copilot/messages', chatId],
    enabled: !!chatId && isOpen,
    refetchInterval: 2000,
  });

  useEffect(() => {
    if (messagesData) {
      setMessages(messagesData);
    }
  }, [messagesData]);

  // Send message
  const sendMessage = useMutation({
    mutationFn: async (msg: string) => {
      const enrichedMessage = `
        Stock: ${symbol}
        Current timeframe: ${timeframe}
        User request: ${msg}
        
        Context: The user is editing a price chart and wants assistance with overlays, metrics, or time series data.
        Please provide specific, actionable suggestions for chart modifications.
        If suggesting overlays, specify the exact parameters needed.
        If the user provides data, help parse and validate it for chart display.
      `;
      
      const res = await apiRequest('POST', '/api/ai-copilot/chat', { 
        chatId, 
        message: enrichedMessage
      });
      return res.json();
    },
    onSuccess: (response) => {
      setInput('');
      queryClient.invalidateQueries({ queryKey: ['/api/ai-copilot/messages', chatId] });
      
      // Process AI response for chart actions
      if (response.chartConfig) {
        processAIResponse(response.chartConfig);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  });

  // Process AI suggestions - convert to standard action format
  const processAIResponse = (config: any) => {
    try {
      // Map config types to action types
      if (config.type === 'overlay') {
        if (onApplyOverlay) {
          onApplyOverlay({
            indicatorId: config.indicatorId || 'custom',
            label: config.title || 'Custom Overlay',
            params: config.params || {},
            ...config
          });
        }
      } else if (config.type === 'timeseries' && config.data) {
        // Validate and apply time series data
        const validatedData = validateTimeSeries(config.data);
        if (validatedData && onApplyTimeSeries) {
          onApplyTimeSeries(validatedData);
        }
      } else if (config.type === 'timeframe' && config.value) {
        if (onChangeTimeframe) {
          onChangeTimeframe(config.value);
        }
      } else if (config.type === 'annotation') {
        if (onAddAnnotation) {
          onAddAnnotation({
            type: config.annotationType || 'text',
            text: config.text || '',
            timestamp: config.timestamp || Date.now(),
            price: config.price || 0,
            ...config
          });
        }
      }
    } catch (error) {
      console.error('Error processing AI response:', error);
      toast({
        title: "Error",
        description: "Failed to apply AI suggestion",
        variant: "destructive"
      });
    }
  };

  // Validate time series data
  const validateTimeSeries = (data: any[]): any[] | null => {
    try {
      return data.map(item => ({
        timestamp: new Date(item.timestamp || item.date).getTime(),
        value: parseFloat(item.value || item.price || item.close),
        label: item.label || ''
      })).filter(item => !isNaN(item.timestamp) && !isNaN(item.value));
    } catch (error) {
      toast({
        title: "Invalid Data",
        description: "Could not parse the provided data",
        variant: "destructive"
      });
      return null;
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      sendMessage.mutate(`I have uploaded data:\n${content}\n\nPlease help me add this as an overlay on the chart.`);
    };
    reader.readAsText(file);
  };

  // Initialize session when panel opens
  useEffect(() => {
    if (isOpen && !chatId) {
      createSession.mutate();
    }
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !chatId || sendMessage.isPending) return;
    sendMessage.mutate(input);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const panelContent = (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#1C1C1C' }}>
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" style={{ color: '#5AF5FA' }} />
          <h3 className="font-semibold text-[#F7F7F7]">AI Chart Assistant</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
          data-testid="button-close-copilot"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Context Bar */}
      <div className="px-4 py-2 bg-[#121212] border-b border-border">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {symbol}
          </span>
          <span>•</span>
          <span>{timeframe}</span>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 mx-auto mb-3" style={{ color: '#5AF5FA', opacity: 0.3 }} />
              <p className="text-sm text-muted-foreground mb-4">
                Hi! I can help you with:
              </p>
              <div className="text-xs text-muted-foreground space-y-2">
                <div>📊 Adding overlays and indicators</div>
                <div>📈 Analyzing custom time series data</div>
                <div>📝 Creating annotations</div>
                <div>⏰ Adjusting timeframes</div>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div 
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[85%] rounded-lg p-3 text-sm ${
                  msg.role === 'user' 
                    ? 'bg-[#5AF5FA] text-black' 
                    : 'bg-[#2A2A2A] text-[#F7F7F7]'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                
                {msg.chartConfig && (
                  <div className="mt-2 p-2 bg-black/20 rounded text-xs">
                    <p className="font-semibold mb-1">✓ Action available</p>
                    <p>{msg.chartConfig.title || 'Chart modification ready'}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-border">
        <div className="space-y-3">
          {/* File Upload Button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.json"
              className="hidden"
              onChange={handleFileUpload}
              data-testid="input-file-upload"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="w-full text-xs"
              disabled={!chatId || sendMessage.isPending}
            >
              <FileText className="h-3 w-3 mr-2" />
              Upload Data (CSV/JSON)
            </Button>
          </div>

          {/* Message Input */}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about overlays, data, or metrics..."
              className="flex-1 text-sm"
              disabled={!chatId || sendMessage.isPending}
              data-testid="input-copilot-message"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || !chatId || sendMessage.isPending}
              className="h-9 w-9 p-0"
              style={{ backgroundColor: '#5AF5FA', color: '#000' }}
              data-testid="button-send-copilot"
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Mobile: use Sheet
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="p-0 w-[85vw] sm:w-[400px]">
          {panelContent}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: use ResizablePanel (will be wrapped by parent)
  if (!isOpen) return null;
  
  return (
    <ResizablePanel 
      defaultSize={30} 
      minSize={25} 
      maxSize={40}
      className="border-l border-border"
    >
      {panelContent}
    </ResizablePanel>
  );
}