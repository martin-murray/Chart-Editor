import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Globe, MapPin, Users, Clock, Wifi } from "lucide-react";
import { format } from "date-fns";

interface VisitorRecord {
  id: number;
  ipAddress: string;
  userAgent: string;
  country: string;
  region: string;
  city: string;
  latitude: string;
  longitude: string;
  timezone: string;
  isp: string;
  org: string;
  visitedAt: string;
  path: string;
}

interface AnalyticsSummary {
  totalVisitors: number;
  uniqueVisitors: number;
  recentVisitors: number;
  topCountries: Array<{ country: string; count: number }>;
  topCities: Array<{ city: string; country: string; count: number }>;
}

export default function Analytics() {
  const { data: summary, isLoading: summaryLoading } = useQuery<AnalyticsSummary>({
    queryKey: ["/api/analytics/summary"],
  });

  const { data: visitors, isLoading: visitorsLoading } = useQuery<VisitorRecord[]>({
    queryKey: ["/api/analytics/visitors"],
  });

  const { data: locations } = useQuery<VisitorRecord[]>({
    queryKey: ["/api/analytics/locations"],
  });

  if (summaryLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Visitor Analytics
            </h1>
            <p className="text-muted-foreground mt-2">
              Real-time visitor tracking and geolocation insights
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </CardHeader>
              </Card>
            ))}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Visitor Analytics
          </h1>
          <p className="text-muted-foreground mt-2">
            Real-time visitor tracking and geolocation insights
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card data-testid="card-total-visitors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalVisitors || 0}</div>
              <p className="text-xs text-muted-foreground">All time visits</p>
            </CardContent>
          </Card>

          <Card data-testid="card-unique-visitors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.uniqueVisitors || 0}</div>
              <p className="text-xs text-muted-foreground">Unique IP addresses</p>
            </CardContent>
          </Card>

          <Card data-testid="card-recent-visitors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Visitors</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.recentVisitors || 0}</div>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>

          <Card data-testid="card-geolocations">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Geolocations</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{locations?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Mapped locations</p>
            </CardContent>
          </Card>
        </div>

        {/* Top Countries & Cities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card data-testid="card-top-countries">
            <CardHeader>
              <CardTitle>Top Countries</CardTitle>
              <CardDescription>Countries with most visitors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summary?.topCountries?.map((country, index) => (
                  <div key={country.country} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge variant="secondary">{index + 1}</Badge>
                      <span className="font-medium">{country.country}</span>
                    </div>
                    <span className="text-muted-foreground">{country.count} visits</span>
                  </div>
                )) || (
                  <p className="text-muted-foreground text-sm">No country data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-top-cities">
            <CardHeader>
              <CardTitle>Top Cities</CardTitle>
              <CardDescription>Cities with most visitors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summary?.topCities?.map((city, index) => (
                  <div key={`${city.city}-${city.country}`} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge variant="secondary">{index + 1}</Badge>
                      <div>
                        <span className="font-medium">{city.city}</span>
                        <span className="text-muted-foreground text-sm ml-2">
                          {city.country}
                        </span>
                      </div>
                    </div>
                    <span className="text-muted-foreground">{city.count} visits</span>
                  </div>
                )) || (
                  <p className="text-muted-foreground text-sm">No city data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Visitor List */}
        <Card data-testid="card-visitor-list">
          <CardHeader>
            <CardTitle>Recent Visitors</CardTitle>
            <CardDescription>IP addresses and their geolocations</CardDescription>
          </CardHeader>
          <CardContent>
            {visitorsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>ISP</TableHead>
                      <TableHead>Visit Time</TableHead>
                      <TableHead>Path</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visitors?.map((visitor) => (
                      <TableRow key={visitor.id} data-testid={`row-visitor-${visitor.id}`}>
                        <TableCell className="font-mono text-sm">
                          {visitor.ipAddress}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col space-y-1">
                            {visitor.city && visitor.country ? (
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">
                                  {visitor.city}, {visitor.region && `${visitor.region}, `}{visitor.country}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">Unknown location</span>
                            )}
                            {visitor.latitude && visitor.longitude && (
                              <span className="text-xs text-muted-foreground font-mono">
                                {parseFloat(visitor.latitude).toFixed(4)}, {parseFloat(visitor.longitude).toFixed(4)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col space-y-1">
                            {visitor.isp && (
                              <div className="flex items-center space-x-1">
                                <Wifi className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{visitor.isp}</span>
                              </div>
                            )}
                            {visitor.org && visitor.org !== visitor.isp && (
                              <span className="text-xs text-muted-foreground">{visitor.org}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {format(new Date(visitor.visitedAt), 'MMM dd, yyyy HH:mm')}
                          </span>
                          {visitor.timezone && (
                            <div className="text-xs text-muted-foreground">{visitor.timezone}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-secondary px-2 py-1 rounded">
                            {visitor.path}
                          </code>
                        </TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No visitor data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}