import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Church, County, RccpRegion } from '@/types';
import { MagnifyingGlassIcon, ChevronRightIcon, ArrowLeftIcon, MapPinIcon, UserIcon } from '@heroicons/react/24/outline';
import ChurchDetailsPanel from '@/components/ChurchDetailsPanel';
import { cn, normalizeDiacritics } from '@/lib/utils';

export default function ListView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const queryClient = useQueryClient();

  // Check for pre-selected church from localStorage
  useEffect(() => {
    const selectedChurchId = localStorage.getItem('selectedChurchId');
    if (selectedChurchId) {
      // Fetch the specific church and set it as selected
      fetch(`/api/churches/${selectedChurchId}`)
        .then(res => res.json())
        .then(church => {
          setSelectedChurch(church);
          localStorage.removeItem('selectedChurchId'); // Clean up
        })
        .catch(error => {
          console.error('Failed to fetch selected church:', error);
          localStorage.removeItem('selectedChurchId');
        });
    }
  }, []);

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
        <div className="p-4">
          <div className="space-y-4">
            {filteredChurches.map((church: Church) => {
              return (
                <div 
                  key={church.id}
                  onClick={() => setSelectedChurch(church)}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {church.name}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                        <div className="flex items-center">
                          <MapPinIcon className="h-4 w-4 mr-1" />
                          {church.city}
                        </div>
                        {church.pastor && (
                          <div className="flex items-center">
                            <UserIcon className="h-4 w-4 mr-1" />
                            Pastor: {church.pastor}
                          </div>
                        )}
                      </div>
                    </div>
                    {church.memberCount && (
                      <div className="ml-4">
                        <span className="text-sm text-gray-500">
                          {church.memberCount} members
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {(isLoading || isSearching) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">
              {isSearching ? 'Searching...' : 'Loading churches...'}
            </p>
          </div>
        )}
        
        {error && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-red-500">Error loading churches: {error.message}</p>
          </div>
        )}
        
        {!isLoading && !error && filteredChurches.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No churches found</p>
          </div>
        )}
      </div>

      {/* Church Details Panel - Overlay */}
      {selectedChurch && (
        <ChurchDetailsPanel
          church={selectedChurch}
          onClose={() => setSelectedChurch(null)}
        />
      )}
    </div>
  );
}