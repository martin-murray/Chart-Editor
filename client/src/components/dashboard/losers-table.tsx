import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DataTable, StockSymbolCell, PercentChangeCell, PriceChangeCell, IndexBadges } from "@/components/ui/data-table";
import { type Stock, type StockFilter } from "@/types/stock";

interface LosersTableProps {
  losers: Stock[];
  filter: StockFilter;
  onFilterChange: (filter: StockFilter) => void;
  isLoading?: boolean;
}

export function LosersTable({ losers, filter, onFilterChange, isLoading }: LosersTableProps) {
  const handleSort = (key: keyof Stock) => {
    const newOrder = filter.sortBy === key && filter.sortOrder === "desc" ? "asc" : "desc";
    onFilterChange({
      ...filter,
      sortBy: key as any,
      sortOrder: newOrder,
    });
  };

  const columns = [
    {
      key: "symbol" as keyof Stock,
      header: "Stock",
      cell: (value: string, row: Stock) => <StockSymbolCell symbol={value} name={row.name} />,
      sortable: true,
    },
    {
      key: "price" as keyof Stock,
      header: "Price",
      cell: (value: string) => `$${value}`,
      sortable: true,
    },
    {
      key: "change" as keyof Stock,
      header: "Change",
      cell: (value: string) => <PriceChangeCell value={value} />,
      sortable: true,
    },
    {
      key: "percentChange" as keyof Stock,
      header: "% Change",
      cell: (value: string) => <PercentChangeCell value={value} />,
      sortable: true,
    },
    {
      key: "marketCap" as keyof Stock,
      header: "Market Cap",
      sortable: true,
    },
    {
      key: "indices" as keyof Stock,
      header: "Index",
      cell: (value: string[]) => <IndexBadges indices={value} />,
    },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="bg-[#FFA5FF] border-b">
          <CardTitle className="text-[#121212]">Top Losers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="bg-[#FFA5FF] border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="text-[#121212]">Top Losers</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#121212]/70">Sort by:</span>
            <Select
              value={filter.sortBy}
              onValueChange={(value) => onFilterChange({ ...filter, sortBy: value as any })}
            >
              <SelectTrigger className="w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentChange">% Change</SelectItem>
                <SelectItem value="marketCapValue">Market Cap</SelectItem>
                <SelectItem value="volume">Volume</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          data={losers}
          columns={columns}
          sortBy={filter.sortBy}
          sortOrder={filter.sortOrder}
          onSort={handleSort}
        />
        {losers.length > 10 && (
          <div className="mt-4 pt-4 border-t">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              View all losers →
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
