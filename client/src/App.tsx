import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ChartMaker from "@/pages/chartmaker";
import PublishingAnalytics from "@/pages/publishing-analytics";
import Login from "@/pages/login";

function ProtectedRoute({ component: Component, path }: { component: () => JSX.Element; path: string }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }
  
  return <Component />;
}

function Router() {
  const { isAuthenticated } = useAuth();
  
  return (
    <Switch>
      <Route path="/login">
        {isAuthenticated ? <Redirect to="/" /> : <Login />}
      </Route>
      <Route path="/">
        <ProtectedRoute component={ChartMaker} path="/" />
      </Route>
      <Route path="/publishing/analytics">
        <ProtectedRoute component={PublishingAnalytics} path="/publishing/analytics" />
      </Route>
      <Route>
        <ProtectedRoute component={ChartMaker} path="/" />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
