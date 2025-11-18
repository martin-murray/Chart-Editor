import { Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Sparkles, LogOut, Globe, MessageSquare, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import logoImage from "@assets/IPO Intelligence@2x_1758060026530.png";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export default function Home() {
  const [, setLocation] = useLocation();

  const pathwayCards = [
    {
      id: 'price-chart',
      title: 'Price Chart',
      description: 'Single-ticker charts — look up almost any global stock and add your own editable annotations to bring your data to life. Perfect for quick visual analysis and storytelling.',
      icon: BarChart3,
      destination: '/price-chart',
      buttonText: 'Open Price Chart',
      iconColor: '#5AF5FA', // Cyan/Blue
      titleColor: '#5AF5FA', // Cyan/Blue
    },
    {
      id: 'comparison-chart',
      title: 'Comparison Chart',
      description: 'Compare multiple tickers or ETFs side-by-side to uncover performance trends, correlations, and outliers. Create dynamic visuals that highlight relative strength and movement across markets.',
      icon: TrendingUp,
      destination: '/comparison-chart',
      buttonText: 'Open Comparison Chart',
      iconColor: '#FAFF50', // Yellow
      titleColor: '#FAFF50', // Yellow
    },
    {
      id: 'ai-copilot',
      title: 'AI Co-Pilot',
      description: 'Upload a CSV or simply prompt the AI Co-Pilot to create bespoke charts using your data. Automatically styled in Intropic brand colours, ready to export in high-resolution or embed directly into reports.',
      icon: Sparkles,
      destination: '/ai-copilot',
      buttonText: 'Open AI Co-Pilot',
      iconColor: '#FFA5FF', // Pink
      titleColor: '#50FFA5', // Green
    },
  ];

  const handleChartTypeChange = (value: string) => {
    setLocation(value);
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
              <Select onValueChange={handleChartTypeChange}>
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
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 
            className="text-5xl font-light mb-4 text-foreground"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Welcome to Chart Editor
          </h1>
          <p 
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
            style={{ fontFamily: 'Mulish, sans-serif' }}
          >
            Choose your pathway to start creating professional, data-driven charts
          </p>
        </div>

        {/* Pathway Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {pathwayCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <Card
                key={card.id}
                className="group relative overflow-hidden border-border hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
                style={{ backgroundColor: '#1C1C1C' }}
                onClick={() => setLocation(card.destination)}
                data-testid={`card-${card.id}`}
              >
                {/* Gradient border on hover */}
                <div
                  className="absolute inset-0 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                  style={{
                    background: 'linear-gradient(90deg, #5AF5FA 0%, #FFA5FF 100%)',
                    padding: '1px',
                    borderRadius: '4px',
                  }}
                >
                  <div 
                    className="w-full h-full rounded" 
                    style={{ 
                      backgroundColor: '#1C1C1C',
                      borderRadius: '4px'
                    }} 
                  />
                </div>

                <div className="relative p-8 flex flex-col h-full min-h-[320px]">
                  {/* Icon */}
                  <div className="mb-6">
                    <div 
                      className="w-16 h-16 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${card.iconColor}20` }}
                    >
                      <IconComponent 
                        className="h-8 w-8" 
                        style={{ color: card.iconColor }}
                      />
                    </div>
                  </div>

                  {/* Title */}
                  <h2 
                    className="text-2xl font-semibold mb-4"
                    style={{ 
                      fontFamily: 'Mulish, sans-serif',
                      color: '#F7F7F7'
                    }}
                  >
                    {card.title}
                  </h2>

                  {/* Description */}
                  <p 
                    className="mb-6 flex-grow"
                    style={{ 
                      fontFamily: 'Mulish, sans-serif',
                      fontSize: '15px',
                      lineHeight: '1.6',
                      color: '#F7F7F7'
                    }}
                  >
                    {card.description}
                  </p>

                  {/* CTA Button */}
                  <Button
                    className="w-full font-medium"
                    style={{
                      backgroundColor: '#5AF5FA',
                      color: '#000000',
                      fontFamily: 'Mulish, sans-serif',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(card.destination);
                    }}
                    data-testid={`button-${card.id}`}
                  >
                    {card.buttonText}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Additional Links Section */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-8">
            <Link href="/walkthrough">
              <span 
                className="flex items-center gap-2 text-[#5AF5FA] hover:opacity-80 transition-opacity cursor-pointer"
                data-testid="link-walkthrough-bottom"
              >
                <BookOpen className="h-5 w-5" />
                <span style={{ fontFamily: 'Mulish, sans-serif' }}>View Product Walkthrough</span>
              </span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
