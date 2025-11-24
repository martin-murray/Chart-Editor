import { Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, LogOut, BookOpen, Send, Loader2, Download, BarChart3, Plus, Trash2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import logoImage from "@assets/IPO Intelligence@2x_1758060026530.png";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect, useRef, Component } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AiCopilotMessage } from "@shared/schema";
import { AICopilotChart } from "@/components/ai-copilot/chart";

// Error boundary for chart rendering
class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Chart rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center max-w-md">
            <AlertCircle className="h-16 w-16 mx-auto mb-4" style={{ color: '#FF6B6B', opacity: 0.8 }} />
            <p 
              className="text-lg font-semibold mb-2"
              style={{ fontFamily: 'Mulish, sans-serif', color: '#FF6B6B' }}
            >
              Could not render chart
            </p>
            <p 
              className="text-sm"
              style={{ fontFamily: 'Mulish, sans-serif', color: '#A0A0A0' }}
            >
              {this.state.error?.message || 'The chart configuration is invalid or contains unsupported data'}
            </p>
            <Button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4"
              style={{ backgroundColor: '#5AF5FA', color: '#000' }}
            >
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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

export default function AICopilot() {
  const [, setLocation] = useLocation();
  const [chatId, setChatId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [selectedChartId, setSelectedChartId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const deleteTimerRef = useRef<NodeJS.Timeout | null>(null);
  const deleteAllTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleChartTypeChange = (value: string) => {
    setLocation(value);
  };

  // Create chat session on mount
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/ai-copilot/session');
      return res.json();
    },
    onSuccess: (data) => {
      setChatId(data.id);
    },
  });

  useEffect(() => {
    createSessionMutation.mutate();
  }, []);

  // Get messages for current chat
  const { data: messages = [], refetch: refetchMessages } = useQuery<AiCopilotMessage[]>({
    queryKey: ['/api/ai-copilot/messages', chatId],
    enabled: !!chatId,
  });

  // Get all chart history across all sessions
  const { 
    data: allChartMessages = [], 
    refetch: refetchAllCharts,
    isError: chartHistoryError,
    error: chartHistoryErrorData
  } = useQuery<AiCopilotMessage[]>({
    queryKey: ['/api/ai-copilot/all-charts'],
  });

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async (msg: string) => {
      const res = await apiRequest('POST', '/api/ai-copilot/chat', { chatId, message: msg });
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      refetchMessages();
      refetchAllCharts(); // Also refresh the chart history
    },
  });

  const handleSend = () => {
    if (!message.trim() || !chatId) return;
    sendMessageMutation.mutate(message);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-select latest chart when new one is generated
  useEffect(() => {
    const latestChart = messages.slice().reverse().find(m => m.chartConfig);
    if (latestChart && !selectedChartId) {
      setSelectedChartId(latestChart.id);
    }
  }, [messages, selectedChartId]);

  // Use all chart messages across sessions instead of just current chat
  const chartMessages = allChartMessages;
  
  // Get selected chart from all chart messages
  const selectedChart = selectedChartId 
    ? allChartMessages.find(m => m.id === selectedChartId)
    : chartMessages[0]; // Most recent chart (since ordered by desc)

  // Handle new chat
  const handleNewChat = () => {
    setSelectedChartId(null);
    createSessionMutation.mutate();
  };

  // Delete individual chart message
  const deleteMessageMutation = useMutation({
    mutationFn: async ({ messageId, messageChatId }: { messageId: number; messageChatId: number }) => {
      await apiRequest('DELETE', `/api/ai-copilot/messages/${messageChatId}/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-copilot/all-charts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-copilot/messages', chatId] });
      setDeletingId(null);
      setConfirmDeleteId(null);
    },
  });

  // Delete all charts for the user
  const deleteAllChartsMutation = useMutation({
    mutationFn: async () => {
      // Delete all charts across all user sessions
      const deletePromises = allChartMessages.map(msg => 
        apiRequest('DELETE', `/api/ai-copilot/messages/${msg.chatId}/${msg.id}`)
      );
      await Promise.all(deletePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-copilot/all-charts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-copilot/messages', chatId] });
      setConfirmDeleteAll(false);
      setSelectedChartId(null);
    },
  });

  // Handle delete click (first click)
  const handleDeleteClick = (messageId: number) => {
    if (confirmDeleteId === messageId) {
      // Second click - execute deletion
      // Clear timer to prevent state update after unmount
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
        deleteTimerRef.current = null;
      }
      
      setDeletingId(messageId);
      
      // If this is the selected chart, clear selection
      if (selectedChartId === messageId) {
        setSelectedChartId(null);
      }
      
      setTimeout(() => {
        // Find the message to get its chatId
        const message = allChartMessages.find(m => m.id === messageId);
        if (message) {
          deleteMessageMutation.mutate({ messageId, messageChatId: message.chatId });
        }
      }, 300); // Wait for animation
    } else {
      // First click - show confirmation
      setConfirmDeleteId(messageId);
      
      // Clear any existing timer
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
      }
      
      // Auto-reset after 4 seconds
      deleteTimerRef.current = setTimeout(() => {
        setConfirmDeleteId(null);
      }, 4000);
    }
  };

  // Handle delete all click
  const handleDeleteAllClick = () => {
    if (confirmDeleteAll) {
      // Second click - execute deletion
      // Clear timer to prevent state update after unmount
      if (deleteAllTimerRef.current) {
        clearTimeout(deleteAllTimerRef.current);
        deleteAllTimerRef.current = null;
      }
      
      deleteAllChartsMutation.mutate();
    } else {
      // First click - show confirmation
      setConfirmDeleteAll(true);
      
      // Clear any existing timer
      if (deleteAllTimerRef.current) {
        clearTimeout(deleteAllTimerRef.current);
      }
      
      // Auto-reset after 4 seconds
      deleteAllTimerRef.current = setTimeout(() => {
        setConfirmDeleteAll(false);
      }, 4000);
    }
  };

  // Clear timer when confirmDeleteId changes (switching targets)
  useEffect(() => {
    if (confirmDeleteId === null && deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
  }, [confirmDeleteId]);

  // Clear timer when confirmDeleteAll changes
  useEffect(() => {
    if (!confirmDeleteAll && deleteAllTimerRef.current) {
      clearTimeout(deleteAllTimerRef.current);
      deleteAllTimerRef.current = null;
    }
  }, [confirmDeleteAll]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
      }
      if (deleteAllTimerRef.current) {
        clearTimeout(deleteAllTimerRef.current);
      }
    };
  }, []);

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
              <Select value="/ai-copilot" onValueChange={handleChartTypeChange}>
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
      <main className="container mx-auto px-4 py-6 max-w-[1800px]">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-120px)]">
          {/* Left Sidebar: AI Co-Pilot Chat */}
          <div className="lg:col-span-1 flex flex-col h-full overflow-hidden">
            {/* AI Co-Pilot Tools Section */}
            <Card className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#1C1C1C' }}>
              {/* Header */}
              <div className="p-4 border-b border-border">
                <h3 
                  className="text-lg font-semibold flex items-center gap-2"
                  style={{ fontFamily: 'Mulish, sans-serif', color: '#F7F7F7' }}
                >
                  <Sparkles className="h-5 w-5" style={{ color: '#FFA5FF' }} />
                  AI Co-Pilot
                </h3>
                <p 
                  className="text-xs mt-1"
                  style={{ fontFamily: 'Mulish, sans-serif', color: '#A0A0A0' }}
                >
                  Describe your chart and paste your data
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <Sparkles className="h-12 w-12 mx-auto mb-3" style={{ color: '#FFA5FF' }} />
                    <p className="text-sm" style={{ fontFamily: 'Mulish, sans-serif', color: '#A0A0A0' }}>
                      Describe your chart and paste data
                    </p>
                  </div>
                )}

                {messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[85%] rounded-lg p-2.5 text-sm ${
                        msg.role === 'user' 
                          ? 'bg-[#5AF5FA] text-black' 
                          : 'bg-[#2A2A2A] text-[#F7F7F7]'
                      }`}
                      style={{ fontFamily: 'Mulish, sans-serif' }}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      
                      {msg.chartConfig && (
                        <div className="mt-2 p-2 bg-black/20 rounded text-xs">
                          <p className="font-semibold mb-0.5">✓ Chart generated:</p>
                          <p>{msg.chartConfig.title}</p>
                        </div>
                      )}
                      
                      {msg.role === 'assistant' && !msg.chartConfig && msg.content.includes('unable to generate') && (
                        <div className="mt-2 p-2 bg-red-900/20 rounded text-xs border border-red-500/30">
                          <p className="text-red-400">⚠ Chart generation failed</p>
                          <p className="text-red-300 mt-1">Try providing more specific details or check your data format.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {sendMessageMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-[#2A2A2A] rounded-lg p-2.5">
                      <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#5AF5FA' }} />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 border-t border-border">
                <div className="flex gap-2">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your chart and paste your data..."
                    className="flex-1 resize-none bg-[#2A2A2A] border-border text-[#F7F7F7] text-sm"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    data-testid="input-message"
                  />

                  <Button
                    onClick={handleSend}
                    disabled={!message.trim() || sendMessageMutation.isPending || !chatId}
                    style={{ backgroundColor: '#5AF5FA', color: '#000' }}
                    data-testid="button-send-message"
                    className="h-9 w-9 p-0"
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Chart Display with History - Takes up 3/4 of the screen */}
          <div className="lg:col-span-3 flex flex-col gap-6 overflow-hidden">
            {/* Generated Chart */}
            <Card className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#1C1C1C' }}>
              <div className="p-4 border-b border-border">
                <h2 
                  className="text-2xl font-semibold"
                  style={{ fontFamily: 'Mulish, sans-serif', color: '#F7F7F7' }}
                >
                  Generated Chart
                </h2>
              </div>

              <div className="flex-1 p-6 overflow-auto">
                {chartHistoryError ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <AlertCircle className="h-20 w-20 mx-auto mb-4" style={{ color: '#FF6B6B', opacity: 0.8 }} />
                      <p 
                        className="text-lg font-semibold mb-2"
                        style={{ fontFamily: 'Mulish, sans-serif', color: '#FF6B6B' }}
                      >
                        Could not load chart history
                      </p>
                      <p 
                        className="text-sm"
                        style={{ fontFamily: 'Mulish, sans-serif', color: '#A0A0A0' }}
                      >
                        {chartHistoryErrorData instanceof Error ? chartHistoryErrorData.message : 'Failed to fetch chart data from server'}
                      </p>
                      <Button
                        onClick={() => refetchAllCharts()}
                        className="mt-4"
                        style={{ backgroundColor: '#5AF5FA', color: '#000' }}
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                ) : selectedChart?.chartConfig ? (
                  <div className="h-full">
                    <ErrorBoundary>
                      <AICopilotChart 
                        config={selectedChart.chartConfig} 
                      />
                    </ErrorBoundary>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="h-20 w-20 mx-auto mb-4" style={{ color: '#5AF5FA', opacity: 0.2 }} />
                      <p 
                        className="text-lg"
                        style={{ fontFamily: 'Mulish, sans-serif', color: '#A0A0A0' }}
                      >
                        Your chart will appear here
                      </p>
                      <p 
                        className="text-sm mt-2"
                        style={{ fontFamily: 'Mulish, sans-serif', color: '#707070' }}
                      >
                        Upload a CSV and describe the chart you want to create
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Chart History - Permanent below Generated Chart */}
            <Card className="h-64 flex flex-col overflow-hidden" style={{ backgroundColor: '#1C1C1C' }}>
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-2">
                  <h3 
                    className="text-lg font-semibold"
                    style={{ fontFamily: 'Mulish, sans-serif', color: '#F7F7F7' }}
                  >
                    Chart History
                  </h3>
                  <div className="flex items-center gap-2">
                    {chartMessages.length > 0 && (
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
                        data-testid="button-delete-all-charts"
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
                    <button
                      onClick={handleNewChat}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md hover:opacity-80 transition-opacity text-sm font-medium"
                      style={{ 
                        fontFamily: 'Mulish, sans-serif', 
                        backgroundColor: '#5AF5FA',
                        color: '#000000'
                      }}
                      data-testid="button-new-chat-history"
                    >
                      <Plus className="h-4 w-4" />
                      <span>New Chat</span>
                    </button>
                  </div>
                </div>
                <p 
                  className="text-xs"
                  style={{ fontFamily: 'Mulish, sans-serif', color: '#A0A0A0' }}
                >
                  {chartMessages.length} chart{chartMessages.length !== 1 ? 's' : ''} generated
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {chartMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3 className="h-10 w-10 mx-auto mb-2" style={{ color: '#5AF5FA', opacity: 0.3 }} />
                    <p 
                      className="text-sm"
                      style={{ fontFamily: 'Mulish, sans-serif', color: '#A0A0A0' }}
                    >
                      No charts yet
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {chartMessages.slice().reverse().map((msg) => (
                      <div
                        key={msg.id}
                        className={`relative rounded-lg border transition-all duration-300 ${
                          selectedChartId === msg.id 
                            ? 'border-[#5AF5FA] bg-[#5AF5FA]/10' 
                            : 'border-border hover:border-[#5AF5FA]/50 hover:bg-[#2A2A2A]'
                        } ${deletingId === msg.id ? 'opacity-0 -translate-x-full' : ''}`}
                        data-testid={`chart-history-card-${msg.id}`}
                      >
                        <button
                          onClick={() => setSelectedChartId(msg.id)}
                          className="w-full text-left p-2"
                        >
                          <div className="flex items-start gap-2">
                            <BarChart3 
                              className="h-4 w-4 mt-0.5 flex-shrink-0" 
                              style={{ color: selectedChartId === msg.id ? '#5AF5FA' : '#A0A0A0' }} 
                            />
                            <div className="flex-1 min-w-0">
                              <p 
                                className="text-sm font-medium truncate"
                                style={{ 
                                  fontFamily: 'Mulish, sans-serif', 
                                  color: selectedChartId === msg.id ? '#5AF5FA' : '#F7F7F7'
                                }}
                              >
                                {msg.chartConfig?.title || 'Untitled Chart'}
                              </p>
                              <p 
                                className="text-xs mt-0.5 capitalize"
                                style={{ 
                                  fontFamily: 'Mulish, sans-serif', 
                                  color: '#A0A0A0'
                                }}
                              >
                                {msg.chartConfig?.type} chart
                              </p>
                            </div>
                          </div>
                        </button>
                        
                        {/* Delete button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(msg.id);
                          }}
                          className="absolute top-1 right-1 hover:bg-transparent flex items-center justify-center"
                          style={{ 
                            width: confirmDeleteId === msg.id ? '95px' : '36px',
                            height: '32px',
                            transition: 'width 300ms',
                            overflow: 'hidden'
                          }}
                          data-testid={`button-delete-chart-${msg.id}`}
                        >
                          <Trash2 
                            className={`h-4 w-4 absolute transition-all duration-300 ${
                              confirmDeleteId === msg.id ? 'opacity-0 -translate-x-12' : 'opacity-100 translate-x-0'
                            }`}
                            style={{ 
                              color: confirmDeleteId === msg.id ? '#5AF5FA' : '#F7F7F7',
                              left: '8px'
                            }}
                            onMouseEnter={(e) => confirmDeleteId !== msg.id && (e.currentTarget.style.color = '#5AF5FA')}
                            onMouseLeave={(e) => confirmDeleteId !== msg.id && (e.currentTarget.style.color = '#F7F7F7')}
                          />
                          <span 
                            className={`text-sm whitespace-nowrap font-medium absolute transition-all duration-300 ${
                              confirmDeleteId === msg.id ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
                            }`}
                            style={{ 
                              color: '#5AF5FA',
                              left: '10px'
                            }}
                          >
                            Delete Now
                          </span>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
