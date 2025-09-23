import { useState } from "react";
import { Search, Globe, Building2, DollarSign, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { searchSuffix, getAllSuffixes, type SuffixInfo } from "@/data/suffix-mappings";
import { cn } from "@/lib/utils";

interface SuffixSearchModalProps {
  children: React.ReactNode;
}

export function SuffixSearchModal({ children }: SuffixSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<SuffixInfo | null>(null);
  const [noResults, setNoResults] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const allSuffixes = getAllSuffixes();

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setNoResults(false);

    if (!query.trim()) {
      setSearchResult(null);
      return;
    }

    const result = searchSuffix(query);
    if (result) {
      setSearchResult(result);
    } else {
      setSearchResult(null);
      setNoResults(true);
    }
  };

  const handleSuffixClick = (suffix: string) => {
    const cleanSuffix = suffix.replace('.', '');
    setSearchQuery(cleanSuffix);
    handleSearch(cleanSuffix);
  };

  const handleClear = () => {
    setSearchQuery("");
    setSearchResult(null);
    setNoResults(false);
  };

  const popularSuffixes = ['.UW', '.UN', '.L', '.T', '.HK', '.MC', '.PA', '.SE', '.TO', '.AX'];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Globe className="h-5 w-5 text-blue-500" />
            Stock Ticker Suffix Guide
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Section */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter a suffix (e.g., UW, SE, MC)..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-12"
                data-testid="input-suffix-search"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  data-testid="button-clear-search"
                >
                  ×
                </Button>
              )}
            </div>

            {/* Popular Suffixes */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Popular suffixes:</p>
              <div className="flex flex-wrap gap-2">
                {popularSuffixes.map((suffix) => (
                  <Badge
                    key={suffix}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => handleSuffixClick(suffix)}
                    data-testid={`badge-suffix-${suffix.replace('.', '')}`}
                  >
                    {suffix}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Search Results */}
          {searchResult && (
            <Card className="border-l-4 border-l-blue-500" data-testid="card-search-result">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="font-mono text-blue-600 dark:text-blue-400">
                    {searchResult.suffix}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span>{searchResult.country}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Exchange</p>
                      <p className="text-sm text-muted-foreground">{searchResult.exchange}</p>
                      <p className="text-xs text-muted-foreground mt-1">{searchResult.fullExchangeName}</p>
                    </div>
                  </div>
                  
                  {searchResult.currency && (
                    <div className="flex items-start gap-3">
                      <DollarSign className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-sm">Currency</p>
                        <p className="text-sm text-muted-foreground">{searchResult.currency}</p>
                      </div>
                    </div>
                  )}
                </div>

                {searchResult.notes && (
                  <div className="flex items-start gap-3 pt-2 border-t">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Notes</p>
                      <p className="text-sm text-muted-foreground">{searchResult.notes}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* No Results */}
          {noResults && (
            <Card className="border-l-4 border-l-yellow-500" data-testid="card-no-results">
              <CardContent className="py-6">
                <div className="text-center space-y-2">
                  <p className="font-medium">No suffix found</p>
                  <p className="text-sm text-muted-foreground">
                    Sorry, we don't have information for "{searchQuery}" in our database.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Try searching for suffixes like UW, SE, MC, PA, L, T, HK, etc.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Help Section */}
          {!searchQuery && (
            <Card className="bg-muted/50" data-testid="card-help-section">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">How to Use</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm">
                    <strong>Search:</strong> Enter any Bloomberg-style ticker suffix (with or without the dot)
                  </p>
                  <p className="text-sm">
                    <strong>Examples:</strong> UW, .SE, MC, PA, L, T, HK
                  </p>
                  <p className="text-sm">
                    <strong>Coverage:</strong> {allSuffixes.length} suffixes covering major global exchanges
                  </p>
                </div>
                
                <Separator className="my-3" />
                
                <div>
                  <p className="text-xs text-muted-foreground">
                    This tool helps you understand Bloomberg terminal ticker suffix notation 
                    for stocks listed on different exchanges worldwide.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}