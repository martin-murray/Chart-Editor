import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type SlackAlert } from "@/types/stock";

export function SlackPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery<SlackAlert[]>({
    queryKey: ["/api/slack/alerts"],
  });

  const testAlertMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/slack/test-alert"),
    onSuccess: () => {
      toast({
        title: "Test Alert Sent",
        description: "Successfully sent test alert to Slack channel",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/slack/alerts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send Alert",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "morning":
      case "afternoon":
        return "🔔";
      case "test":
        return "🧪";
      default:
        return "📊";
    }
  };

  return (
    <div className="space-y-6">
      {/* Slack Integration Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-950 rounded-lg">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.042 15.165a2.528 2.528 0 0 0 2.5 2.5c1.61 0 2.929-1.46 2.929-3.25v-3.25h-2.929a2.532 2.532 0 0 0-2.5 2.5 2.528 2.528 0 0 0 0 .5zm2.5-12.165a2.528 2.528 0 0 0-2.5 2.5v2.5h2.5a2.528 2.528 0 0 0 2.5-2.5 2.528 2.528 0 0 0-2.5-2.5zm12.928 5.5a2.528 2.528 0 0 0-2.5-2.5h-2.5v2.5a2.528 2.528 0 0 0 2.5 2.5c1.61 0 2.929-1.46 2.929-3.25 0-.83-.329-1.58-.929-2.25z"/>
              </svg>
            </div>
            <div>
              <CardTitle>Slack Integration</CardTitle>
              <p className="text-sm text-muted-foreground">Auto-posted alerts to #research-team</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Connected to Research Team
              </span>
            </div>
            <Button variant="ghost" size="sm" className="text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100">
              Configure
            </Button>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Alert Schedule</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="text-sm font-medium">Morning Alert</div>
                  <div className="text-xs text-muted-foreground">Top 10 Movers at 10:00 AM EST</div>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-xs text-green-600 dark:text-green-400">Active</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="text-sm font-medium">Afternoon Alert</div>
                  <div className="text-xs text-muted-foreground">Top 10 Movers at 3:00 PM EST</div>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-xs text-green-600 dark:text-green-400">Active</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button
              onClick={() => testAlertMutation.mutate()}
              disabled={testAlertMutation.isPending}
              className="w-full"
            >
              {testAlertMutation.isPending ? "Sending..." : "Send Test Alert"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse p-3 bg-muted rounded-lg">
                  <div className="h-4 bg-muted-foreground/20 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-muted-foreground/20 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No alerts sent yet
            </p>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="text-lg mt-1">{getAlertIcon(alert.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-sm font-medium">{alert.title}</div>
                      <Badge
                        variant={alert.status === "sent" ? "secondary" : "destructive"}
                        className="text-xs"
                      >
                        {alert.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">{alert.description}</div>
                    <div className="text-xs text-muted-foreground">{formatTime(alert.sentAt)}</div>
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="w-full mt-4 text-muted-foreground hover:text-foreground">
                View all alerts →
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
