import { Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Upload, LogOut, ArrowLeft, BookOpen } from "lucide-react";
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

export default function AICopilot() {
  const [, setLocation] = useLocation();

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
              <a className="flex items-center gap-3 hover:opacity-80 transition-opacity" data-testid="link-home">
                <img src={logoImage} alt="Logo" className="h-10" />
              </a>
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
                <a 
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  data-testid="link-walkthrough"
                  style={{ fontFamily: 'var(--font-sans)', fontSize: '16px', color: '#f7f7f7' }}
                >
                  <BookOpen className="h-5 w-5 text-[#5AF5FA]" />
                  <span>Walkthrough</span>
                </a>
              </Link>

              {/* Logout Button */}
              <LogoutButton />
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Back Button */}
        <Link href="/">
          <Button
            variant="ghost"
            className="mb-6"
            data-testid="button-back-home"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        {/* Coming Soon Section */}
        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-8">
            <div 
              className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: '#50FFA520' }}
            >
              <Sparkles 
                className="h-12 w-12" 
                style={{ color: '#50FFA5' }}
              />
            </div>
          </div>

          <h1 
            className="text-5xl font-light mb-6"
            style={{ 
              fontFamily: 'Space Grotesk, sans-serif',
              color: '#50FFA5'
            }}
          >
            AI Co-Pilot
          </h1>

          <p 
            className="text-xl text-muted-foreground mb-8"
            style={{ fontFamily: 'Mulish, sans-serif' }}
          >
            Upload a CSV or simply prompt the AI Co-Pilot to create bespoke charts using your data. Automatically styled in Intropic brand colours, ready to export in high-resolution or embed directly into reports.
          </p>

          {/* Coming Soon Card */}
          <Card className="p-12 bg-gradient-to-br from-green-400/10 to-green-400/5 border-border">
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-3 text-2xl font-medium" style={{ fontFamily: 'Mulish, sans-serif', color: '#50FFA5' }}>
                <Sparkles className="h-6 w-6" />
                <span>Coming Soon</span>
              </div>
              
              <p className="text-muted-foreground" style={{ fontFamily: 'Mulish, sans-serif' }}>
                This feature is currently in development. Soon you'll be able to:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mt-8">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50">
                  <Upload className="h-5 w-5 text-[#50FFA5] mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1" style={{ fontFamily: 'Mulish, sans-serif' }}>Upload CSV Data</h3>
                    <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Mulish, sans-serif' }}>
                      Import your own datasets and let AI analyze them
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50">
                  <Sparkles className="h-5 w-5 text-[#50FFA5] mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1" style={{ fontFamily: 'Mulish, sans-serif' }}>AI-Powered Charts</h3>
                    <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Mulish, sans-serif' }}>
                      Generate custom visualizations with natural language prompts
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50">
                  <Sparkles className="h-5 w-5 text-[#50FFA5] mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1" style={{ fontFamily: 'Mulish, sans-serif' }}>Auto-Styling</h3>
                    <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Mulish, sans-serif' }}>
                      Charts automatically styled with Intropic brand colors
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50">
                  <Sparkles className="h-5 w-5 text-[#50FFA5] mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold mb-1" style={{ fontFamily: 'Mulish, sans-serif' }}>Export & Embed</h3>
                    <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Mulish, sans-serif' }}>
                      High-resolution exports ready for reports and presentations
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Button
                  style={{
                    backgroundColor: '#50FFA5',
                    color: '#000000',
                    fontFamily: 'Mulish, sans-serif',
                  }}
                  onClick={() => setLocation('/')}
                  data-testid="button-explore-other-tools"
                >
                  Explore Other Chart Tools
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
