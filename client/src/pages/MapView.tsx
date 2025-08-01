import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import InteractiveMap from '@/components/InteractiveMap';
import ChurchDetailsPanel from '@/components/ChurchDetailsPanel';
import ChurchForm from '@/components/ChurchForm';
import ChurchPopup from '@/components/ChurchPopup';
import ProfilePopup from '@/components/ProfilePopup';
import { useAuth } from '@/hooks/useAuth';
import { Church } from '@/types';
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon, MapPinIcon } from '@heroicons/react/24/outline';

export default function MapView() {
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [isAddingChurch, setIsAddingChurch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountyId, setSelectedCountyId] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [selectedEngagementLevel, setSelectedEngagementLevel] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [popupChurch, setPopupChurch] = useState<Church | null>(null);
  const [showProfilePopup, setShowProfilePopup] = useState(false);

  // Fetch filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['/api/filters'],
    queryFn: () => fetch('/api/filters').then(res => res.json()).then(data => data.data)
  });

  // Get user info for profile
  const { user } = useAuth();

  const { data: churches = [] } = useQuery<Church[]>({
    queryKey: ['/api/churches', searchQuery, selectedCountyId, selectedRegionId, selectedEngagementLevel],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCountyId) params.set('countyId', selectedCountyId);
      if (selectedRegionId) params.set('regionId', selectedRegionId);
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

  const handleChurchEdit = (church: Church) => {
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

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return (first + last).toUpperCase() || "U";
  };

  return (
    <div className="h-full w-full relative">
      {/* Map Container with proper bounds */}
      <div className="h-full w-full relative overflow-hidden">
        {/* Search Bar - Floating at Top */}
        <div className="absolute top-4 left-4 right-4 z-20">
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-white rounded-lg shadow-lg">
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
            
            {/* Profile Avatar Button */}
            <button
              onClick={() => setShowProfilePopup(true)}
              className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-200 hover:shadow-xl transition-shadow"
            >
              <div className="w-8 h-8 bg-[#2E5BBA] rounded-full flex items-center justify-center text-white text-sm font-medium">
                {getInitials(user?.firstName || null, user?.lastName || null)}
              </div>
            </button>
          </div>
        </div>

        {/* Map - constrained to container */}
        <div className="absolute inset-0 z-10">
          <InteractiveMap
            searchQuery={searchQuery}
            selectedCountyId={selectedCountyId}
            selectedRegionId={selectedRegionId}
            selectedEngagementLevel={selectedEngagementLevel}
            selectedChurch={selectedChurch}
            onChurchSelect={handleChurchSelect}
            onChurchEdit={handleChurchEdit}
            onChurchPopup={setPopupChurch}
            userLocation={userLocation}
          />
        </div>

        {/* Permanent Legend - Bottom Left */}
        <div className="absolute bottom-4 left-4 z-20 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Engagement Levels</h3>
          <div className="space-y-2">
            {engagementLevels.map((item) => (
              <div key={item.level} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                <span className="text-xs text-gray-700">{item.label}</span>
              </div>
            ))}
          </div>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-xl p-4 pb-28 max-h-[80vh] overflow-y-auto">
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
              
              {/* Region Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by RCCP Region</label>
                <select
                  value={selectedRegionId}
                  onChange={(e) => {
                    setSelectedRegionId(e.target.value);
                    setSelectedCountyId(''); // Clear county when region changes
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
                >
                  <option value="">All Regions</option>
                  {filterOptions?.regions?.map((region: any) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* County Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by County</label>
                <select
                  value={selectedCountyId}
                  onChange={(e) => setSelectedCountyId(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
                >
                  <option value="">All Counties</option>
                  {filterOptions?.counties
                    ?.filter((county: any) => !selectedRegionId || county.rccpRegionId.toString() === selectedRegionId)
                    ?.map((county: any) => (
                    <option key={county.id} value={county.id}>
                      {county.name} ({county.abbreviation})
                    </option>
                  ))}
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
                  setSelectedCountyId('');
                  setSelectedRegionId('');
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

      {/* Church Popup - Rendered at top level for highest z-index */}
      {popupChurch && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-20 z-[9998]"
            onClick={() => setPopupChurch(null)}
          />
          {/* Popup */}
          <ChurchPopup
            church={popupChurch}
            onClose={() => setPopupChurch(null)}
            onEdit={() => {
              handleChurchEdit(popupChurch);
              setPopupChurch(null);
            }}
            onViewDetails={() => {
              handleChurchSelect(popupChurch);
              setPopupChurch(null);
            }}
          />
        </>
      )}

      {/* Profile Popup */}
      <ProfilePopup 
        isOpen={showProfilePopup} 
        onClose={() => setShowProfilePopup(false)} 
      />
    </div>
  );
}