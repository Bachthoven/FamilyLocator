import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/useTheme";
import { NotificationManager } from "@/components/NotificationToast";
import Landing from "@/pages/Landing";
import AuthPage from "@/pages/auth-page";
import Home from "@/pages/Home";
import Family from "@/pages/Family";
import Places from "@/pages/Places";
import History from "./pages/History";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

function Router() {
  const { user, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/auth" component={AuthPage} />
      {user && (
        <>
          <Route path="/home" component={Home} />
          <Route path="/family" component={Family} />
          <Route path="/places" component={Places} />
          <Route path="/history" component={History} />
          <Route path="/settings" component={Settings} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <NotificationManager>
              <Toaster />
              <Router />
            </NotificationManager>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
