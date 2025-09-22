import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, MapPin, Users, Clock, Wifi, CalendarDays } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

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
  leftAt: string | null;
  duration: number | null;
  returnVisits: number;
  sessionId: string;
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
  const [dateFilter, setDateFilter] = useState("all");

  const { data: summary, isLoading: summaryLoading } = useQuery<AnalyticsSummary>({
    queryKey: ["/api/analytics/summary", dateFilter],
  });

  const { data: visitors, isLoading: visitorsLoading } = useQuery<VisitorRecord[]>({
    queryKey: ["/api/analytics/visitors", dateFilter],
  });

  const { data: locations } = useQuery<VisitorRecord[]>({
    queryKey: ["/api/analytics/locations", dateFilter],
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

        {/* Date Filter */}
        <div className="flex justify-center">
          <Card className="w-80">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <Select value={dateFilter} onValueChange={setDateFilter} data-testid="select-date-filter">
                    <SelectTrigger>
                      <SelectValue placeholder="Select time period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="7days">Last 7 Days</SelectItem>
                      <SelectItem value="30days">Last 30 Days</SelectItem>
                      <SelectItem value="90days">Last 90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
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

        {/* Detailed Visitor List */}
        <Card data-testid="card-detailed-visitor-list">
          <CardHeader>
            <CardTitle>Detailed Visitor Information</CardTitle>
            <CardDescription>Complete visitor data with session details and return visits</CardDescription>
          </CardHeader>
          <CardContent>
            {visitorsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Province/State</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Returns</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visitors?.map((visitor) => (
                      <TableRow key={visitor.id} data-testid={`row-detailed-visitor-${visitor.id}`}>
                        <TableCell className="font-mono text-sm">
                          <div className="flex flex-col space-y-1">
                            <span>{visitor.ipAddress}</span>
                            {visitor.isp && (
                              <span className="text-xs text-muted-foreground">{visitor.isp}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col space-y-1">
                            <span className="text-sm font-medium">
                              {format(new Date(visitor.visitedAt), 'MMM dd, yyyy')}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(visitor.visitedAt), 'HH:mm:ss')}
                            </span>
                            {visitor.timezone && (
                              <span className="text-xs text-muted-foreground">{visitor.timezone}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">
                              {visitor.duration ? 
                                `${Math.floor(visitor.duration / 60)}m ${visitor.duration % 60}s` : 
                                'Active'
                              }
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Globe className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">
                              {visitor.country || 'Unknown'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {visitor.region || 'Unknown'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">
                                {visitor.city || 'Unknown'}
                              </span>
                            </div>
                            {visitor.latitude && visitor.longitude && (
                              <span className="text-xs text-muted-foreground font-mono">
                                {parseFloat(visitor.latitude).toFixed(3)}, {parseFloat(visitor.longitude).toFixed(3)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="text-xs">
                              {visitor.returnVisits || 1}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {(visitor.returnVisits || 1) === 1 ? 'First visit' : 'Return visitor'}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No visitor data available for the selected time period
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