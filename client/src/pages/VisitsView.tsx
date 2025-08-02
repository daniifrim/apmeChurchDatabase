import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ClockIcon, MapPinIcon, PlusIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import VisitForm from '@/components/VisitForm';
import { normalizeDiacritics } from '@/lib/utils';

export default function VisitsView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showVisitForm, setShowVisitForm] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all visits across all churches
  const { data: visits, isLoading, error } = useQuery({
    queryKey: ['/api/visits'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/visits');
      return response.json();
    },
  });

  const filteredVisits = visits?.filter((visit: any) => {
    const searchTerm = normalizeDiacritics(searchQuery);
    return (
      normalizeDiacritics(visit.churchName).includes(searchTerm) ||
      normalizeDiacritics(visit.purpose || '').includes(searchTerm) ||
      normalizeDiacritics(visit.notes || '').includes(searchTerm)
    );
  }) || [];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Visits</h1>
        <Button
          onClick={() => setShowVisitForm(true)}
          className="bg-[#2E5BBA] hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Log Visit
        </Button>
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
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <div className="animate-pulse">
                <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3 mx-auto"></div>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClockIcon className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Visits</h3>
              <p className="text-gray-600">
                Failed to load visits. Please try again later.
              </p>
            </div>
          ) : filteredVisits.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClockIcon className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Visits Yet</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery ? 'No visits match your search.' : 'Start logging your church visits to see them here.'}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => setShowVisitForm(true)}
                  className="bg-[#2E5BBA] hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Log Your First Visit
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVisits.map((visit: any) => (
                <div key={visit.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {visit.churchName}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {new Date(visit.visitDate).toLocaleDateString('ro-RO')}
                        </div>
                        {visit.purpose && (
                          <div className="flex items-center">
                            <UserIcon className="h-4 w-4 mr-1" />
                            {visit.purpose}
                          </div>
                        )}
                        {visit.attendeesCount && (
                          <div className="flex items-center">
                            <UserIcon className="h-4 w-4 mr-1" />
                            {visit.attendeesCount} attendees
                          </div>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-gray-500 mb-3">
                        <MapPinIcon className="h-4 w-4 mr-1" />
                        {visit.churchAddress}, {visit.churchCity}
                      </div>
                      {visit.notes && (
                        <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-lg">
                          {visit.notes}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex flex-col items-end space-y-2">
                      {visit.followUpRequired && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Follow-up Required
                        </span>
                      )}
                      {visit.isRated ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Rated
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Not Rated
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Visit Form Modal */}
      {showVisitForm && (
        <VisitForm
          onClose={() => setShowVisitForm(false)}
          onSuccess={() => {
            // Refresh the visits list
            queryClient.invalidateQueries({ queryKey: ['/api/visits'] });
          }}
        />
      )}
    </div>
  );
}