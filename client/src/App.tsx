import { useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/LoginPage";
import MapView from "@/pages/MapView";
import ListView from "@/pages/ListView";
import AnalyticsView from "@/pages/AnalyticsView";
import ProfileView from "@/pages/ProfileView";
import BottomNavigation from "@/components/BottomNavigation";

function MobileApp() {
  const [activeTab, setActiveTab] = useState<'map' | 'list' | 'analytics' | 'profile'>('map');
  const [, setLocation] = useLocation();

  const handleTabChange = (tab: 'map' | 'list' | 'analytics' | 'profile') => {
    setActiveTab(tab);
    setLocation(`/${tab === 'map' ? '' : tab}`);
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="flex-1 overflow-hidden">
        <Switch>
          <Route path="/">
            <MapView />
          </Route>
          <Route path="/list">
            <ListView />
          </Route>
          <Route path="/analytics">
            <AnalyticsView />
          </Route>
          <Route path="/profile">
            <ProfileView />
          </Route>
          <Route component={NotFound} />
        </Switch>
      </div>
      
      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
      />
    </div>
  );
}

function Router() {
  const { user, loading } = useAuth();
  const isAuthenticated = !!user;

  return (
    <Switch>
      {loading ? (
        <Route path="/" component={() => <div className="flex items-center justify-center h-screen">Loading...</div>} />
      ) : !isAuthenticated ? (
        <Route path="/" component={LoginPage} />
      ) : (
        <>
          <Route path="/" component={MobileApp} />
          <Route path="/list" component={MobileApp} />
          <Route path="/analytics" component={MobileApp} />
          <Route path="/profile" component={MobileApp} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
