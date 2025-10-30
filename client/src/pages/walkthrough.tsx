import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Search, 
  TrendingUp, 
  Globe, 
  Download, 
  PenTool, 
  BarChart3, 
  ArrowLeft,
  Calendar,
  MousePointer2,
  Layers,
  Type,
  Ruler,
  Minus
} from "lucide-react";
import logoImage from "@assets/IPO Intelligence@2x_1758060026530.png";
import { SuffixSearchModal } from "@/components/suffix-search-modal";

export default function Walkthrough() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center min-h-16 py-2">
            <div className="flex items-center">
              <img 
                src={logoImage} 
                alt="Intropic Chart Studio" 
                className="w-[240px] h-auto max-[600px]:w-[180px]"
              />
            </div>
            <Link href="/">
              <Button variant="outline" className="flex items-center gap-2" data-testid="button-back-to-app">
                <ArrowLeft className="h-4 w-4" />
                Back to App
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          {/* Introduction */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-light" style={{ fontFamily: 'Space Grotesk' }}>
              Welcome to Intropic Chart Studio
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A powerful tool for tracking and analyzing stock prices across global markets. 
              This guide will help you get started with all the features.
            </p>
          </div>

          {/* Feature Sections */}
          <div className="space-y-6">
            {/* Global Search */}
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Search className="h-6 w-6 text-[#5AF5FA]" />
                </div>
                <div className="flex-1 space-y-3">
                  <h2 className="text-2xl font-semibold">Global Stock Search</h2>
                  <p className="text-muted-foreground">
                    Search for stocks, ETFs, and indices from 69 global exchanges using Bloomberg-style ticker suffixes.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground ml-4">
                    <li className="flex items-start gap-2">
                      <span className="text-[#5AF5FA] mt-1">•</span>
                      <span>Type any company name or ticker symbol in the search bar</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#5AF5FA] mt-1">•</span>
                      <span>Results are color-coded: <span className="text-[#FAFF50]">Yellow</span> for indices, <span className="text-[#FFA5FF]">Pink</span> for ETFs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#5AF5FA] mt-1">•</span>
                      <span>Use ticker suffixes to specify exchanges (e.g., AAPL:US for NASDAQ, 7203:JP for Toyota)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#5AF5FA] mt-1">•</span>
                      <span>Recent searches are saved for quick access</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Suffix Guide */}
            <SuffixSearchModal>
              <Card 
                className="p-6 walkthrough-card cursor-pointer transition-all" 
                data-testid="card-suffix-guide"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Globe className="h-6 w-6 text-[#FAFF50]" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <h2 className="text-2xl font-semibold">Ticker Suffix Guide</h2>
                    <p className="text-muted-foreground">
                      Access a comprehensive guide to Bloomberg-style ticker suffixes for global exchanges.
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-4">
                      <li className="flex items-start gap-2">
                        <span className="text-[#5AF5FA] mt-1">•</span>
                        <span>Click this card to open the Suffix Guide</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#5AF5FA] mt-1">•</span>
                        <span>Search by country, exchange name, or suffix code</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#5AF5FA] mt-1">•</span>
                        <span>View market hours and holiday information for each exchange</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </Card>
            </SuffixSearchModal>

            {/* Price Charts */}
            <Card 
              className="p-6 walkthrough-card cursor-pointer transition-all" 
              onClick={() => setLocation('/')}
              data-testid="card-price-charts"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-[#5AF5FA]" />
                </div>
                <div className="flex-1 space-y-3">
                  <h2 className="text-2xl font-semibold">Interactive Price Charts</h2>
                  <p className="text-muted-foreground">
                    View detailed price charts with multiple timeframes and real-time data.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground ml-4">
                    <li className="flex items-start gap-2">
                      <span className="text-[#5AF5FA] mt-1">•</span>
                      <span>Select from 9 timeframes: 1D, 5D, 2W, 1M, 3M, 1Y, 3Y, 5Y, or Custom date range</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#5AF5FA] mt-1">•</span>
                      <span>Hover over the chart to see detailed price and time information</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#5AF5FA] mt-1">•</span>
                      <span>Charts automatically adapt to mobile and desktop screen sizes</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Comparison Charts */}
            <Card 
              className="p-6 walkthrough-card cursor-pointer transition-all" 
              onClick={() => setLocation('/?action=compare')}
              data-testid="card-comparison"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <BarChart3 className="h-6 w-6 text-[#5AF5FA]" />
                </div>
                <div className="flex-1 space-y-3">
                  <h2 className="text-2xl font-semibold">Stock Comparison</h2>
                  <p className="text-muted-foreground">
                    Compare up to 12 stocks and indices side-by-side with percentage-based performance tracking.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground ml-4">
                    <li className="flex items-start gap-2">
                      <span className="text-[#5AF5FA] mt-1">•</span>
                      <span>Click the "Compare" tab on any price chart</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#5AF5FA] mt-1">•</span>
                      <span>Add multiple stocks using the search bar</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#5AF5FA] mt-1">•</span>
                      <span>All comparisons are normalized to percentage changes for fair comparison</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#5AF5FA] mt-1">•</span>
                      <span>Mix stocks and indices from different global markets</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Annotation Tools */}
            <Card 
              className="p-6 walkthrough-card cursor-pointer transition-all" 
              onClick={() => setLocation('/')}
              data-testid="card-annotations"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <PenTool className="h-6 w-6 text-[#5AF5FA]" />
                </div>
                <div className="flex-1 space-y-3">
                  <h2 className="text-2xl font-semibold">Chart Annotations</h2>
                  <p className="text-muted-foreground">
                    Mark up your charts with three powerful annotation tools.
                  </p>
                  <div className="space-y-4 mt-4">
                    <div className="flex items-start gap-3">
                      <Minus className="h-5 w-5 text-[#FAFF50] mt-1 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-[#FAFF50]">Vertical Line</h3>
                        <p className="text-sm text-muted-foreground">
                          Mark specific dates or events on your chart. Click once to place a vertical line with a text label.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Ruler className="h-5 w-5 text-[#22C55E] mt-1 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-[#22C55E]">Measure Tool</h3>
                        <p className="text-sm text-muted-foreground">
                          Calculate percentage change between two points. Click start and end points to see price difference, percentage change, and time span.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Minus className="h-5 w-5 text-[#AA99FF] mt-1 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-[#AA99FF]">Horizontal Line</h3>
                        <p className="text-sm text-muted-foreground">
                          Mark support/resistance levels. Click to place a horizontal price line with a custom label.
                        </p>
                      </div>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground ml-4 mt-4">
                    <li className="flex items-start gap-2">
                      <span className="text-[#5AF5FA] mt-1">•</span>
                      <span>Color-coded cursors show which tool is active</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#5AF5FA] mt-1">•</span>
                      <span>Annotations are automatically saved per ticker (toggle off to use globally)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#5AF5FA] mt-1">•</span>
                      <span>Delete individual annotations or clear all at once</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#5AF5FA] mt-1">•</span>
                      <span>Drag annotation text boxes to reposition them</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Export Features */}
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Download className="h-6 w-6 text-[#5AF5FA]" />
                </div>
                <div className="flex-1 space-y-3">
                  <h2 className="text-2xl font-semibold">Export & Share</h2>
                  <p className="text-muted-foreground">
                    Save your charts and annotations for presentations or reports.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground ml-4">
                    <li className="flex items-start gap-2">
                      <span className="text-[#5AF5FA] mt-1">•</span>
                      <span>Export charts as PNG images with all annotations included</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#5AF5FA] mt-1">•</span>
                      <span>Download stock data as Excel spreadsheets</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#5AF5FA] mt-1">•</span>
                      <span>Export comparison charts showing multiple stocks</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>

          {/* Call to Action */}
          <div className="text-center pt-8 pb-4">
            <Link href="/">
              <Button size="lg" className="bg-[#5AF5FA] hover:bg-[#5AF5FA]/90 text-black" data-testid="button-get-started">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
