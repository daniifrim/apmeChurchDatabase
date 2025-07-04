import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus } from "lucide-react";
import type { Church } from "@/types";

interface SidebarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCounty: string;
  onCountyChange: (county: string) => void;
  selectedEngagementLevel: string;
  onEngagementLevelChange: (level: string) => void;
  onChurchSelect: (church: Church) => void;
  onAddChurch: () => void;
  selectedChurchId?: number;
}

const COUNTIES = [
  "Bucharest",
  "Cluj",
  "Timiș",
  "Constanța",
  "Iași",
  "Brașov",
  "Galați",
  "Craiova",
  "Ploiești",
  "Oradea"
];

const ENGAGEMENT_LEVELS = [
  { value: "high", label: "High", color: "bg-growth-green" },
  { value: "medium", label: "Medium", color: "bg-warm-orange" },
  { value: "low", label: "Low", color: "bg-yellow-500" },
  { value: "new", label: "New", color: "bg-ministry-blue" },
];

export default function Sidebar({
  searchQuery,
  onSearchChange,
  selectedCounty,
  onCountyChange,
  selectedEngagementLevel,
  onEngagementLevelChange,
  onChurchSelect,
  onAddChurch,
  selectedChurchId,
}: SidebarProps) {
  const { data: churches = [], isLoading: churchesLoading } = useQuery<Church[]>({
    queryKey: ["/api/churches", searchQuery, selectedCounty, selectedEngagementLevel],
    retry: false,
  });

  const { data: analytics } = useQuery<{
    totalChurches: number;
    activeChurches: number;
    pendingVisits: number;
    newThisMonth: number;
    engagementBreakdown: { level: string; count: number }[];
  }>({
    queryKey: ["/api/analytics"],
    retry: false,
  });

  const getEngagementColor = (level: string) => {
    const engagement = ENGAGEMENT_LEVELS.find(e => e.value === level);
    return engagement?.color || "bg-gray-500";
  };

  const getEngagementLabel = (level: string) => {
    const engagement = ENGAGEMENT_LEVELS.find(e => e.value === level);
    return engagement?.label || level;
  };

  const formatLastActivity = (updatedAt: string) => {
    const date = new Date(updatedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "1 day ago";
    if (diffDays <= 7) return `${diffDays} days ago`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  return (
    <div className="w-full h-full bg-white flex flex-col overflow-hidden">
      {/* Search and Filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search churches..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex space-x-2">
            <Select value={selectedCounty || "all-counties"} onValueChange={(value) => onCountyChange(value === "all-counties" ? "" : value)}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="All Counties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-counties">All Counties</SelectItem>
                {COUNTIES.map(county => (
                  <SelectItem key={county} value={county.toLowerCase()}>
                    {county}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedEngagementLevel || "all-levels"} onValueChange={(value) => onEngagementLevelChange(value === "all-levels" ? "" : value)}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-levels">All Levels</SelectItem>
                {ENGAGEMENT_LEVELS.map(level => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-dark-blue-grey mb-3">Quick Stats</h3>
        {analytics ? (
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3 text-center">
              <div className="text-2xl font-bold text-ministry-blue">
                {analytics.totalChurches}
              </div>
              <div className="text-xs text-gray-500">Total Churches</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-2xl font-bold text-growth-green">
                {analytics.activeChurches}
              </div>
              <div className="text-xs text-gray-500">Active</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-2xl font-bold text-warm-orange">
                {analytics.pendingVisits}
              </div>
              <div className="text-xs text-gray-500">Pending Visits</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-2xl font-bold text-earth-brown">
                {analytics.newThisMonth}
              </div>
              <div className="text-xs text-gray-500">New This Month</div>
            </Card>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="loading-spinner"></div>
          </div>
        )}
      </div>

      {/* Church List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-dark-blue-grey">Churches</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddChurch}
              className="text-ministry-blue hover:text-blue-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add New
            </Button>
          </div>
          
          {churchesLoading ? (
            <div className="flex justify-center py-8">
              <div className="loading-spinner"></div>
            </div>
          ) : churches.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No churches found</p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {churches.map((church) => (
                <Card
                  key={church.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedChurchId === church.id ? 'ring-2 ring-ministry-blue' : ''
                  }`}
                  onClick={() => onChurchSelect(church)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-dark-blue-grey text-sm truncate">
                          {church.name}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {church.address}, {church.city}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge
                            variant="secondary"
                            className={`text-white text-xs ${getEngagementColor(church.engagementLevel)}`}
                          >
                            {getEngagementLabel(church.engagementLevel)}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {formatLastActivity(church.updatedAt)}
                          </span>
                        </div>
                      </div>
                      <div 
                        className={`w-3 h-3 rounded-full ml-2 flex-shrink-0 ${getEngagementColor(church.engagementLevel)}`}
                      ></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
