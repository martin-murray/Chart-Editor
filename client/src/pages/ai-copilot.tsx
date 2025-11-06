import { Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Upload, LogOut, BookOpen, Send, Loader2, FileText, Download, BarChart3, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import logoImage from "@assets/IPO Intelligence@2x_1758060026530.png";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AiCopilotMessage } from "@shared/schema";
import { AICopilotChart } from "@/components/ai-copilot/chart";

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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedChartId, setSelectedChartId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Get messages
  const { data: messages = [], refetch: refetchMessages } = useQuery<AiCopilotMessage[]>({
    queryKey: ['/api/ai-copilot/messages', chatId],
    enabled: !!chatId,
  });

  // Upload CSV
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chatId', chatId!.toString());

      const response = await fetch('/api/ai-copilot/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      setUploadedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
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
    },
  });

  const handleSend = () => {
    if (!message.trim() || !chatId) return;
    sendMessageMutation.mutate(message);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setUploadedFile(file);
    }
  };

  const handleUpload = () => {
    if (uploadedFile && chatId) {
      uploadMutation.mutate(uploadedFile);
    }
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

  // Get all messages with charts
  const chartMessages = messages.filter(m => m.chartConfig);
  
  // Get selected chart
  const selectedChart = selectedChartId 
    ? messages.find(m => m.id === selectedChartId)
    : chartMessages[chartMessages.length - 1];

  // Handle new chat
  const handleNewChat = () => {
    setSelectedChartId(null);
    createSessionMutation.mutate();
  };

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
          {/* Left Sidebar: Chart History + AI Co-Pilot Tools */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            {/* Chart History Section */}
            <Card className="flex flex-col" style={{ backgroundColor: '#1C1C1C', maxHeight: '40%' }}>
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-2">
                  <h3 
                    className="text-lg font-semibold"
                    style={{ fontFamily: 'Mulish, sans-serif', color: '#F7F7F7' }}
                  >
                    Chart History
                  </h3>
                  <button
                    onClick={handleNewChat}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md hover:opacity-80 transition-opacity text-sm font-medium"
                    style={{ 
                      fontFamily: 'Mulish, sans-serif', 
                      backgroundColor: '#5AF5FA',
                      color: '#000000'
                    }}
                    data-testid="button-new-chat"
                  >
                    <Plus className="h-4 w-4" />
                    <span>New Chat</span>
                  </button>
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
                  chartMessages.slice().reverse().map((msg) => (
                    <button
                      key={msg.id}
                      onClick={() => setSelectedChartId(msg.id)}
                      className={`w-full text-left p-2 rounded-lg border transition-all ${
                        selectedChartId === msg.id 
                          ? 'border-[#5AF5FA] bg-[#5AF5FA]/10' 
                          : 'border-border hover:border-[#5AF5FA]/50 hover:bg-[#2A2A2A]'
                      }`}
                      data-testid={`button-chart-history-${msg.id}`}
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
                  ))
                )}
              </div>
            </Card>

            {/* AI Co-Pilot Tools Section */}
            <Card className="flex-1 flex flex-col" style={{ backgroundColor: '#1C1C1C' }}>
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
                  Upload CSV & describe your chart
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <Sparkles className="h-12 w-12 mx-auto mb-3" style={{ color: '#FFA5FF' }} />
                    <p className="text-sm" style={{ fontFamily: 'Mulish, sans-serif', color: '#A0A0A0' }}>
                      Upload a CSV or ask a question
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
                      <p className="whitespace-pre-wrap">{msg.content.replace(/```json[\s\S]*?```/g, '')}</p>
                      
                      {msg.chartConfig && (
                        <div className="mt-2 p-2 bg-black/20 rounded text-xs">
                          <p className="font-semibold mb-0.5">Chart generated:</p>
                          <p>{msg.chartConfig.title}</p>
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
                {uploadedFile && (
                  <div className="mb-2 flex items-center gap-2 p-2 bg-[#2A2A2A] rounded">
                    <FileText className="h-4 w-4 text-[#5AF5FA]" />
                    <span className="flex-1 text-xs truncate" style={{ color: '#F7F7F7' }}>{uploadedFile.name}</span>
                    <Button
                      size="sm"
                      onClick={handleUpload}
                      disabled={uploadMutation.isPending}
                      style={{ backgroundColor: '#5AF5FA', color: '#000' }}
                    >
                      {uploadMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    </Button>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-csv-file"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-upload-csv"
                    className="h-9 w-9"
                  >
                    <Upload className="h-4 w-4" />
                  </Button>

                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ask me to create a chart..."
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

          {/* Main Chart Display - Takes up 3/4 of the screen */}
          <div className="lg:col-span-3">
            <Card className="h-full flex flex-col" style={{ backgroundColor: '#1C1C1C' }}>
              <div className="p-4 border-b border-border">
                <h2 
                  className="text-2xl font-semibold"
                  style={{ fontFamily: 'Mulish, sans-serif', color: '#F7F7F7' }}
                >
                  Generated Chart
                </h2>
              </div>

              <div className="flex-1 p-6 overflow-auto">
                {selectedChart?.chartConfig ? (
                  <AICopilotChart 
                    config={selectedChart.chartConfig} 
                  />
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
          </div>
        </div>
      </main>
    </div>
  );
}
