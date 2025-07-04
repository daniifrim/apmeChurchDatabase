import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import InteractiveMap from '@/components/InteractiveMap';
import ChurchDetailsPanel from '@/components/ChurchDetailsPanel';
import ChurchForm from '@/components/ChurchForm';
import { Church } from '@/types';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function MapView() {
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [isAddingChurch, setIsAddingChurch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('');
  const [selectedEngagementLevel, setSelectedEngagementLevel] = useState('');
  const [showFilters, setShowFilters] = useState(false);

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

  const handleCloseForm = () => {
    setIsAddingChurch(false);
  };

  const filteredChurches = churches.filter((church: Church) => church.isActive);
  const displayedCount = filteredChurches.length;
  const totalCount = churches.length;

  const engagementLevels = [
    { level: 'high', label: 'Actively Engaged', color: 'bg-green-500' },
    { level: 'medium', label: 'Partnership Established', color: 'bg-gray-400' },
    { level: 'low', label: 'Initial Contact', color: 'bg-yellow-500' },
    { level: 'new', label: 'Not Contacted', color: 'bg-green-600' },
    { level: 'inactive', label: 'Not Interested', color: 'bg-red-500' },
  ];

  return (
    <div className="h-full flex flex-col relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">Church Map</h1>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">admin</span>
          <div className="w-8 h-8 bg-[#2E5BBA] rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-semibold">A</span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <InteractiveMap
          searchQuery={searchQuery}
          selectedCounty={selectedCounty}
          selectedEngagementLevel={selectedEngagementLevel}
          selectedChurch={selectedChurch}
          onChurchSelect={handleChurchSelect}
        />

        {/* Location Button */}
        <button className="absolute top-4 right-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-200">
          <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
          </div>
        </button>

        {/* Home Button */}
        <button className="absolute top-20 right-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-200">
          <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
        </button>
      </div>

      {/* Bottom Panel */}
      <div className="bg-white border-t border-gray-200 p-4 pb-20">
        {/* Church Count */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-600">Showing {displayedCount} of {totalCount} churches</span>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 mb-4">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex-1 bg-[#2E5BBA] text-white py-3 px-4 rounded-lg font-medium"
          >
            Filters
          </button>
          <button 
            onClick={() => setIsAddingChurch(true)}
            className="flex-1 bg-[#228B22] text-white py-3 px-4 rounded-lg font-medium"
          >
            Add Church
          </button>
        </div>

        {/* Engagement Levels Legend */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">Engagement Levels</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {engagementLevels.map((item, index) => (
              <div key={item.level} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                <span className="text-gray-700">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

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

      {/* Filters Panel */}
      {showFilters && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-xl p-6 pb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button 
                onClick={() => setShowFilters(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search churches..."
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">County</label>
                <select
                  value={selectedCounty}
                  onChange={(e) => setSelectedCounty(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                >
                  <option value="">All Counties</option>
                  <option value="Bucharest">Bucharest</option>
                  <option value="Cluj">Cluj</option>
                  <option value="Timiș">Timiș</option>
                  <option value="Iași">Iași</option>
                  <option value="Brașov">Brașov</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Engagement Level</label>
                <select
                  value={selectedEngagementLevel}
                  onChange={(e) => setSelectedEngagementLevel(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                >
                  <option value="">All Levels</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="new">New</option>
                </select>
              </div>
            </div>
            
            <button 
              onClick={() => setShowFilters(false)}
              className="w-full mt-6 bg-[#2E5BBA] text-white py-3 rounded-lg font-medium"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}