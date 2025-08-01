import { useState } from 'react';
import { ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';

export default function VisitsView() {
  const [searchQuery, setSearchQuery] = useState('');

  // Placeholder visits data
  const placeholderVisits = [
    {
      id: '1',
      churchName: 'Biserica Penticostală Maranata',
      date: '2025-07-28',
      location: 'București, Sector 1',
      type: 'Pastoral Visit',
    },
    {
      id: '2',
      churchName: 'Biserica Penticostală Emanuel',
      date: '2025-07-25',
      location: 'Cluj-Napoca',
      type: 'Follow-up',
    },
    {
      id: '3',
      churchName: 'Biserica Penticostală Betania',
      date: '2025-07-20',
      location: 'Timișoara',
      type: 'Initial Contact',
    },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-xl font-semibold text-gray-900">Visits</h1>
      </div>

      {/* Search Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search visits..."
            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-28">
        <div className="p-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClockIcon className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Visits Coming Soon</h3>
            <p className="text-gray-600 mb-6">
              This page will display all your church visits and interactions.
            </p>
            
            {/* Placeholder visits list */}
            <div className="text-left max-w-md mx-auto">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Visits Preview:</h4>
              <div className="space-y-3">
                {placeholderVisits.map((visit) => (
                  <div key={visit.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{visit.churchName}</p>
                      <p className="text-xs text-gray-600">{visit.type} • {visit.date}</p>
                      <p className="text-xs text-gray-500 flex items-center mt-1">
                        <MapPinIcon className="h-3 w-3 mr-1" />
                        {visit.location}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}