import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import InteractiveMap from '@/components/InteractiveMap';
import ChurchDetailsPanel from '@/components/ChurchDetailsPanel';
import ChurchForm from '@/components/ChurchForm';
import { Church } from '@/types';
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon, MapPinIcon } from '@heroicons/react/24/outline';

export default function MapView() {
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [isAddingChurch, setIsAddingChurch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('');
  const [selectedEngagementLevel, setSelectedEngagementLevel] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const { data: churches = [] } = useQuery<Church[]>({
    queryKey: ['/api/churches', searchQuery, selectedCounty, selectedEngagementLevel],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCounty) params.set('county', selectedCounty);
      if (selectedEngagementLevel) params.set('engagementLevel', selectedEngagementLevel);
      
      return fetch(`/api/churches?${params}`).then(res => res.json());
    }
  });

  const handleChurchSelect = (church: Church) => {
    setSelectedChurch(church);
  };

  const handleChurchSaved = (church: Church) => {
    setIsAddingChurch(false);
    setSelectedChurch(church);
  };

  const handleLocationClick = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setIsLocating(false);
        // The map will center on user location via the InteractiveMap component
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            alert('Location access denied. Please enable location permissions.');
            break;
          case error.POSITION_UNAVAILABLE:
            alert('Location information is unavailable.');
            break;
          case error.TIMEOUT:
            alert('Location request timed out.');
            break;
          default:
            alert('An unknown error occurred while getting location.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const handleCloseForm = () => {
    setIsAddingChurch(false);
  };

  const filteredChurches = churches.filter((church: Church) => church.isActive);
  const displayedCount = filteredChurches.length;
  const totalCount = churches.length;

  const engagementLevels = [
    { level: 'high', label: 'Actively Engaged', color: 'bg-green-500' },
    { level: 'medium', label: 'Partnership Established', color: 'bg-blue-500' },
    { level: 'low', label: 'Initial Contact', color: 'bg-yellow-500' },
    { level: 'new', label: 'Not Contacted', color: 'bg-gray-500' },
  ];

  return (
    <div className="h-full w-full relative">
      {/* Map Container with proper bounds */}
      <div className="h-full w-full relative overflow-hidden">
        {/* Search Bar - Floating at Top */}
        <div className="absolute top-4 left-4 right-4 z-20">
          <div className="bg-white rounded-lg shadow-lg">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search churches..."
                className="w-full pl-12 pr-4 py-3 border-0 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#2E5BBA]"
              />
            </div>
          </div>
        </div>

        {/* Map - constrained to container */}
        <div className="absolute inset-0 z-10">
          <InteractiveMap
            searchQuery={searchQuery}
            selectedCounty={selectedCounty}
            selectedEngagementLevel={selectedEngagementLevel}
            selectedChurch={selectedChurch}
            onChurchSelect={handleChurchSelect}
            userLocation={userLocation}
          />
        </div>

        {/* Floating Action Buttons - Bottom Right of map */}
        <div className="absolute bottom-4 right-4 z-20 flex flex-col space-y-3">
          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-14 h-14 bg-white hover:bg-gray-50 rounded-full shadow-lg flex items-center justify-center border border-gray-200 transition-all duration-200"
          >
            <AdjustmentsHorizontalIcon className="h-6 w-6 text-gray-700" />
          </button>
          
          {/* Location Button */}
          <button
            onClick={handleLocationClick}
            disabled={isLocating}
            className="w-14 h-14 bg-[#2E5BBA] hover:bg-blue-700 disabled:opacity-50 rounded-full shadow-lg flex items-center justify-center transition-all duration-200"
          >
            {isLocating ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <MapPinIcon className="h-6 w-6 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Filter Panel - Slide up from bottom */}
      {showFilters && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-end">
          <div className="bg-white w-full rounded-t-xl p-4 pb-8 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Filters & Legend</h2>
              <button 
                onClick={() => setShowFilters(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <span className="text-gray-500 text-xl">✕</span>
              </button>
            </div>

            {/* Church Count */}
            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700 font-medium">
                Showing {displayedCount} of {totalCount} churches
              </span>
            </div>
            
            <div className="space-y-6">
              {/* Search Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Churches</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Church name, pastor, address..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
                  />
                </div>
              </div>
              
              {/* County Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by County</label>
                <select
                  value={selectedCounty}
                  onChange={(e) => setSelectedCounty(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
                >
                  <option value="">All Counties</option>
                  <option value="Bucharest">Bucharest</option>
                  <option value="Cluj">Cluj</option>
                  <option value="Timiș">Timiș</option>
                  <option value="Iași">Iași</option>
                  <option value="Brașov">Brașov</option>
                </select>
              </div>
              
              {/* Engagement Level Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Engagement</label>
                <select
                  value={selectedEngagementLevel}
                  onChange={(e) => setSelectedEngagementLevel(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
                >
                  <option value="">All Engagement Levels</option>
                  <option value="high">Actively Engaged</option>
                  <option value="medium">Partnership Established</option>
                  <option value="low">Initial Contact</option>
                  <option value="new">Not Contacted</option>
                </select>
              </div>

              {/* Engagement Levels Legend */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Map Legend</h3>
                <div className="space-y-3">
                  {engagementLevels.map((item) => (
                    <div key={item.level} className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full ${item.color}`}></div>
                      <span className="text-gray-700">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Apply Button */}
            <div className="mt-6 flex space-x-3">
              <button 
                onClick={() => setShowFilters(false)}
                className="flex-1 bg-[#2E5BBA] hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors duration-200"
              >
                Apply Filters
              </button>
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCounty('');
                  setSelectedEngagementLevel('');
                }}
                className="px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-medium transition-colors duration-200"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Church Details Panel */}
      {selectedChurch && !isAddingChurch && (
        <ChurchDetailsPanel
          church={selectedChurch}
          onClose={() => setSelectedChurch(null)}
        />
      )}

      {/* Add Church Form */}
      {isAddingChurch && (
        <ChurchForm
          onSave={handleChurchSaved}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}