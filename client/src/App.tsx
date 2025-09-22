import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import ChartMaker from "@/pages/chartmaker";
import PublishingAnalytics from "@/pages/publishing-analytics";

function Router() {
  return (
    <Switch>
      <Route path="/" component={ChartMaker} />
      <Route path="/publishing/analytics" component={PublishingAnalytics} />
      <Route component={ChartMaker} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
