import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { type StockFilter } from "@/types/stock";

interface FilterPanelProps {
  filter: StockFilter;
  onFilterChange: (filter: StockFilter) => void;
  lastUpdated?: string;
}

export function FilterPanel({ filter, onFilterChange, lastUpdated }: FilterPanelProps) {
  const updateFilter = (key: keyof StockFilter, value: any) => {
    onFilterChange({ ...filter, [key]: value });
  };

  return (
    <Card className="overflow-visible">
      <CardHeader>
        <CardTitle>Filters & Settings</CardTitle>
      </CardHeader>
      <CardContent className="overflow-visible">
        {/* Ticker Search removed - now in MarketMoversTabs */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="changeThreshold">% Change Threshold</Label>
            <Select
              value={filter.changeThreshold.toString()}
              onValueChange={(value) => updateFilter("changeThreshold", parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">≥ 1%</SelectItem>
                <SelectItem value="2">≥ 2%</SelectItem>
                <SelectItem value="3">≥ 3%</SelectItem>
                <SelectItem value="5">≥ 5%</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="marketCap">Market Cap</Label>
            <Select
              value={filter.marketCap}
              onValueChange={(value) => updateFilter("marketCap", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2B">≥ $2B</SelectItem>
                <SelectItem value="5B">≥ $5B</SelectItem>
                <SelectItem value="10B">≥ $10B</SelectItem>
                <SelectItem value="50B">≥ $50B</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="indexFilter">Index Filter</Label>
            <Select
              value={filter.indexFilter}
              onValueChange={(value) => updateFilter("indexFilter", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Indices (146)</SelectItem>
                <SelectItem value="russell1000">Russell 1000 (146)</SelectItem>
                <SelectItem value="sp500">S&P 500 (31)</SelectItem>
                <SelectItem value="nasdaq100">NASDAQ 100 (11)</SelectItem>
              </SelectContent>
            </Select>
          </div>


        </div>
      </CardContent>
    </Card>
  );
}
