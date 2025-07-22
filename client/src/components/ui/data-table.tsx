import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: keyof T;
  header: string;
  cell?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  sortBy?: keyof T;
  sortOrder?: "asc" | "desc";
  onSort?: (key: keyof T) => void;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  sortBy,
  sortOrder,
  onSort,
  className
}: DataTableProps<T>) {
  return (
    <div className={cn("rounded-md border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={String(column.key)} className="whitespace-nowrap">
                {column.sortable && onSort ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-medium"
                    onClick={() => onSort(column.key)}
                  >
                    {column.header}
                    {sortBy === column.key && (
                      sortOrder === "asc" ? (
                        <ArrowUpIcon className="ml-1 h-3 w-3" />
                      ) : (
                        <ArrowDownIcon className="ml-1 h-3 w-3" />
                      )
                    )}
                  </Button>
                ) : (
                  column.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                No data available
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => (
              <TableRow key={index} className="hover:bg-muted/50">
                {columns.map((column) => (
                  <TableCell key={String(column.key)} className="whitespace-nowrap">
                    {column.cell ? column.cell(row[column.key], row) : String(row[column.key])}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function StockSymbolCell({ symbol, name }: { symbol: string; name: string }) {
  return (
    <div>
      <div className="font-medium text-foreground">{symbol}</div>
      <div className="text-sm text-muted-foreground truncate max-w-[200px]">{name}</div>
    </div>
  );
}

export function PercentChangeCell({ value }: { value: string }) {
  const numValue = parseFloat(value);
  const isPositive = numValue > 0;
  const isNegative = numValue < 0;
  
  return (
    <Badge
      variant="secondary"
      className={cn(
        "font-semibold",
        isPositive && "bg-gainer/10 text-gainer border-gainer/20",
        isNegative && "bg-loser/10 text-loser border-loser/20"
      )}
    >
      {isPositive ? "+" : ""}{value}%
    </Badge>
  );
}

export function PriceChangeCell({ value }: { value: string }) {
  const numValue = parseFloat(value);
  const isPositive = numValue > 0;
  const isNegative = numValue < 0;
  
  return (
    <span className={cn(
      "font-medium",
      isPositive && "text-gainer",
      isNegative && "text-loser",
      !isPositive && !isNegative && "text-muted-foreground"
    )}>
      {isPositive ? "+" : ""}${value}
    </span>
  );
}

export function IndexBadges({ indices }: { indices: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {indices.slice(0, 2).map((index) => (
        <Badge key={index} variant="outline" className="text-xs">
          {index}
        </Badge>
      ))}
      {indices.length > 2 && (
        <Badge variant="outline" className="text-xs">
          +{indices.length - 2}
        </Badge>
      )}
    </div>
  );
}
