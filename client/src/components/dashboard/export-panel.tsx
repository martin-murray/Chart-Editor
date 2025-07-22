import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileTextIcon, FileSpreadsheetIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type MarketSummary, type StockFilter } from "@/types/stock";

interface ExportPanelProps {
  summary?: MarketSummary;
  filter: StockFilter;
}

export function ExportPanel({ summary, filter }: ExportPanelProps) {
  const { toast } = useToast();

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams({
        changeThreshold: filter.changeThreshold.toString(),
        marketCap: filter.marketCap,
        indexFilter: filter.indexFilter,
        sortBy: filter.sortBy,
        sortOrder: filter.sortOrder,
      });

      const response = await fetch(`/api/export/csv?${params}`);
      
      if (!response.ok) {
        throw new Error("Failed to export CSV");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `market-movers-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Successful",
        description: "CSV file has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to export CSV file",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    toast({
      title: "Feature Coming Soon",
      description: "PDF export functionality will be available soon",
    });
  };

  return (
    <div className="space-y-6">
      {/* Export & Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Export & Analytics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="flex flex-col items-center p-4 h-auto"
              onClick={handleExportCSV}
            >
              <FileSpreadsheetIcon className="w-5 h-5 mb-2" />
              <span className="text-xs font-medium">Export CSV</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center p-4 h-auto"
              onClick={handleExportPDF}
            >
              <FileTextIcon className="w-5 h-5 mb-2" />
              <span className="text-xs font-medium">Export PDF</span>
            </Button>
          </div>

          <div className="pt-4 border-t space-y-3">
            <h4 className="text-sm font-semibold">Quick Stats</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Daily Volume:</span>
                <span className="font-medium">{summary?.avgVolume || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Market Volatility:</span>
                <span className={`font-medium ${
                  summary?.volatility === "High" ? "text-loser" :
                  summary?.volatility === "Moderate" ? "text-yellow-600" :
                  "text-gainer"
                }`}>
                  {summary?.volatility || "Unknown"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sector Leader:</span>
                <span className="font-medium">{summary?.sectorLeader || "N/A"}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
