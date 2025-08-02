import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Church, County, RccpRegion } from '@/types';
import { MagnifyingGlassIcon, ChevronRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import ChurchDetailsPanel from '@/components/ChurchDetailsPanel';
import { cn, normalizeDiacritics } from '@/lib/utils';

export default function ListView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const queryClient = useQueryClient();

  // Debounce search query to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch churches with search
  const { data: churches = [], isLoading, error } = useQuery<Church[]>({
    queryKey: ['/api/churches', debouncedSearchQuery],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedSearchQuery) params.set('search', debouncedSearchQuery);
      
      return fetch(`/api/churches?${params}`).then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      });
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  const getEngagementBadge = (level: string, lastVisit?: string) => {
    const badges = {
      high: { label: 'Actively Engaged', color: 'bg-green-100 text-green-800' },
      medium: { label: 'Partnership Established', color: 'bg-blue-100 text-blue-800' },
      low: { label: 'Initial Contact', color: 'bg-yellow-100 text-yellow-800' },
      new: { label: 'Not Contacted', color: 'bg-gray-100 text-gray-800' },
    };
    
    return badges[level as keyof typeof badges] || badges.new;
  };

  const formatLastVisit = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `Last visit: ${date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })}`;
  };

  const filteredChurches = churches.filter((church: Church) => {
    return church.isActive;
  });

  // Check if we're currently searching (user has typed but debounce hasn't fired yet)
  const isSearching = searchQuery !== debouncedSearchQuery;



  if (selectedChurch) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center p-4 border-b border-gray-200 bg-white">
          <button 
            onClick={() => setSelectedChurch(null)}
            className="mr-3 p-1 hover:bg-gray-100 rounded"
          >
            <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold">Church Details</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto pb-20">
          <ChurchDetailsPanel
            church={selectedChurch}
            onClose={() => setSelectedChurch(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Search Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search churches..."
              className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
      {/* Church List */}
      <div className="flex-1 overflow-y-auto pb-28">
        <div className="divide-y divide-gray-200">
          {filteredChurches.map((church: Church) => {
            const badge = getEngagementBadge(church.engagementLevel);
            
            return (
              <div 
                key={church.id}
                onClick={() => setSelectedChurch(church)}
                className="bg-white px-4 py-4 hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {church.name}
                        </h3>
                        <p className="text-gray-600 mb-1">
                          {church.city}, {church.counties?.name || church.county}
                        </p>
                        <p className="text-gray-500 text-sm mb-2">
                          {church.counties?.rccp_regions?.name || 'RCCP Region'}
                        </p>
                        {church.pastor && (
                          <p className="text-gray-700 text-sm mb-3">
                            Pastor: {church.pastor}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            badge.color
                          )}>
                            {badge.label}
                          </span>
                          
                          {church.engagementLevel === 'high' && (
                            <span className="text-xs text-gray-500">
                              {formatLastVisit(church.updatedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <ChevronRightIcon className="h-5 w-5 text-gray-400 ml-3 flex-shrink-0" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {(isLoading || isSearching) && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {isSearching ? 'Searching...' : 'Loading churches...'}
            </p>
          </div>
        )}
        
        {error && (
          <div className="text-center py-12">
            <p className="text-red-500">Error loading churches: {error.message}</p>
          </div>
        )}
        
        {!isLoading && !error && filteredChurches.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No churches found</p>
          </div>
        )}
      </div>

    </div>
  );
}