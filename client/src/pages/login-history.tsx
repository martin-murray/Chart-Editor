import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import type { LoginAttempt } from '@shared/schema';

export default function LoginHistory() {
  const { data: attempts = [], isLoading } = useQuery<LoginAttempt[]>({
    queryKey: ['/api/login-attempts'],
  });

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-light tracking-wide mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
            Login Attempt History
          </h1>
          <p className="text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
            Track all login attempts to your account
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle style={{ fontFamily: 'var(--font-serif)' }}>Recent Login Attempts</CardTitle>
            <CardDescription style={{ fontFamily: 'var(--font-sans)' }}>
              Showing the last 100 login attempts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                Loading login attempts...
              </div>
            ) : attempts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                No login attempts recorded yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead style={{ fontFamily: 'var(--font-sans)' }}>Status</TableHead>
                      <TableHead style={{ fontFamily: 'var(--font-sans)' }}>Username</TableHead>
                      <TableHead style={{ fontFamily: 'var(--font-sans)' }}>IP Address</TableHead>
                      <TableHead style={{ fontFamily: 'var(--font-sans)' }}>User Agent</TableHead>
                      <TableHead style={{ fontFamily: 'var(--font-sans)' }}>Date & Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attempts.map((attempt) => (
                      <TableRow key={attempt.id} data-testid={`row-attempt-${attempt.id}`}>
                        <TableCell>
                          {attempt.success ? (
                            <Badge 
                              variant="outline" 
                              className="bg-green-500/10 text-green-400 border-green-500/20"
                              data-testid="badge-success"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Success
                            </Badge>
                          ) : (
                            <Badge 
                              variant="outline" 
                              className="bg-red-500/10 text-red-400 border-red-500/20"
                              data-testid="badge-failed"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell 
                          className="font-mono text-sm" 
                          style={{ fontFamily: 'var(--font-sans)' }}
                          data-testid={`text-username-${attempt.id}`}
                        >
                          {attempt.username}
                        </TableCell>
                        <TableCell 
                          className="font-mono text-sm text-muted-foreground"
                          data-testid={`text-ip-${attempt.id}`}
                        >
                          {attempt.ipAddress || 'N/A'}
                        </TableCell>
                        <TableCell 
                          className="text-sm text-muted-foreground max-w-md truncate" 
                          title={attempt.userAgent || 'N/A'}
                          data-testid={`text-useragent-${attempt.id}`}
                        >
                          {attempt.userAgent || 'N/A'}
                        </TableCell>
                        <TableCell 
                          className="text-sm" 
                          style={{ fontFamily: 'var(--font-sans)' }}
                          data-testid={`text-date-${attempt.id}`}
                        >
                          {format(new Date(attempt.attemptedAt), 'MMM dd, yyyy HH:mm:ss')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats */}
        {!isLoading && attempts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                  Total Attempts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-light" style={{ fontFamily: 'var(--font-serif)' }} data-testid="text-total-attempts">
                  {attempts.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                  Successful Logins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-light text-green-400" style={{ fontFamily: 'var(--font-serif)' }} data-testid="text-success-count">
                  {attempts.filter(a => a.success).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                  Failed Attempts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-light text-red-400" style={{ fontFamily: 'var(--font-serif)' }} data-testid="text-failed-count">
                  {attempts.filter(a => !a.success).length}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
