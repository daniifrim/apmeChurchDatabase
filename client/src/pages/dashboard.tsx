import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import AppHeader from "@/components/AppHeader";
import Sidebar from "@/components/Sidebar";
import InteractiveMap from "@/components/InteractiveMap";
import ChurchDetailsPanel from "@/components/ChurchDetailsPanel";
import ChurchForm from "@/components/ChurchForm";
import type { Church } from "@/types";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [isAddingChurch, setIsAddingChurch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCounty, setSelectedCounty] = useState("");
  const [selectedEngagementLevel, setSelectedEngagementLevel] = useState("");

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleChurchSelect = (church: Church) => {
    setSelectedChurch(church);
    setIsAddingChurch(false);
  };

  const handleAddChurch = () => {
    setIsAddingChurch(true);
    setSelectedChurch(null);
  };

  const handleChurchSaved = (church: Church) => {
    setSelectedChurch(church);
    setIsAddingChurch(false);
  };

  const handleCloseForm = () => {
    setIsAddingChurch(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppHeader />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile/Tablet: Sidebar takes full width on small screens */}
        <div className="w-full md:w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          <Sidebar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCounty={selectedCounty}
            onCountyChange={setSelectedCounty}
            selectedEngagementLevel={selectedEngagementLevel}
            onEngagementLevelChange={setSelectedEngagementLevel}
            onChurchSelect={handleChurchSelect}
            onAddChurch={handleAddChurch}
            selectedChurchId={selectedChurch?.id}
          />
        </div>
        
        {/* Map container - hidden on mobile when sidebar is shown */}
        <div className="hidden md:flex flex-1 flex-col">
          <div className="flex-1 relative">
            <InteractiveMap
              searchQuery={searchQuery}
              selectedCounty={selectedCounty}
              selectedEngagementLevel={selectedEngagementLevel}
              selectedChurch={selectedChurch}
              onChurchSelect={handleChurchSelect}
            />
          </div>
          
          {selectedChurch && !isAddingChurch && (
            <ChurchDetailsPanel
              church={selectedChurch}
              onClose={() => setSelectedChurch(null)}
            />
          )}
          
          {isAddingChurch && (
            <ChurchForm
              onSave={handleChurchSaved}
              onClose={handleCloseForm}
            />
          )}
        </div>
      </div>
    </div>
  );
}
