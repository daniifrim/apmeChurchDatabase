import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { X, Calendar, Users, FileText, Star, MapPin, Clock, DollarSign, Edit, Trash2, Save } from "lucide-react";

interface Visit {
  id: number;
  visitDate: string;
  notes?: string;
  attendeesCount?: number;
  isRated: boolean;
  churchName: string;
  churchAddress: string;
  churchCity: string;
  visitedBy: string;
  createdAt: string;
}

interface VisitRating {
  id: number;
  missionOpennessRating: number;
  hospitalityRating: number;
  missionarySupportCount?: number;
  offeringsAmount?: number;
  churchMembers?: number;
  visitDurationMinutes?: number;
  notes?: string;
  starRating: number;
  financialScore: number;
  missionaryBonus: number;
}

interface VisitDetailsModalProps {
  visitId: number;
  onClose: () => void;
  onUpdate?: () => void; // Callback for when visit is updated/deleted
}

export default function VisitDetailsModal({ visitId, onClose, onUpdate }: VisitDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'rating'>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState({
    visitDate: '',
    notes: '',
    attendeesCount: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch visit details
  const { data: visit, isLoading: visitLoading } = useQuery({
    queryKey: [`/api/visits/${visitId}`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/visits/${visitId}`);
      return response.json();
    },
  });

  // Fetch visit rating if available
  const { data: rating, isLoading: ratingLoading } = useQuery({
    queryKey: [`/api/visits/${visitId}/rating`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/visits/${visitId}/rating`);
      return response.json();
    },
    enabled: visit?.isRated === true,
  });

  const isLoading = visitLoading || (visit?.isRated && ratingLoading);

  // Initialize edit form when visit data is loaded
  useEffect(() => {
    if (visit && !isEditing) {
      setEditForm({
        visitDate: visit.visitDate ? visit.visitDate.split('T')[0] : '', // Convert to YYYY-MM-DD format
        notes: visit.notes || '',
        attendeesCount: visit.attendeesCount?.toString() || ''
      });
    }
  }, [visit, isEditing]);

  // Update visit mutation
  const updateVisitMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const response = await apiRequest('PUT', `/api/visits/${visitId}`, updatedData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/visits/${visitId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/visits'] });
      toast({
        title: "Success",
        description: "Visit updated successfully",
      });
      setIsEditing(false);
      onUpdate?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update visit",
        variant: "destructive",
      });
    },
  });

  // Delete visit mutation
  const deleteVisitMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', `/api/visits/${visitId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/visits'] });
      toast({
        title: "Success",
        description: "Visit deleted successfully",
      });
      onUpdate?.();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete visit",
        variant: "destructive",
      });
    },
  });

  const handleEditSubmit = () => {
    const updatedData = {
      visitDate: editForm.visitDate,
      notes: editForm.notes || undefined,
      attendeesCount: editForm.attendeesCount ? parseInt(editForm.attendeesCount) : undefined,
    };
    updateVisitMutation.mutate(updatedData);
  };

  const handleDelete = () => {
    deleteVisitMutation.mutate();
  };

  const startEdit = () => {
    setEditForm({
      visitDate: visit?.visitDate ? visit.visitDate.split('T')[0] : '',
      notes: visit?.notes || '',
      attendeesCount: visit?.attendeesCount?.toString() || ''
    });
    setIsEditing(true);
  };

  const formatDate = (dateString: string | null | undefined) => {
    try {
      if (!dateString) return "Date not available";
      
      const date = new Date(dateString);
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }
      
      return date.toLocaleDateString('ro-RO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  const getRatingDescription = (rating: number, type: 'mission' | 'hospitality') => {
    const missionDescriptions = [
      "Resistent la lucrarea de misiune",
      "Interes minim pentru misiune", 
      "Interes moderat pentru misiune",
      "Interes activ în lucrarea de misiune",
      "Foarte orientat spre misiune"
    ];
    
    const hospitalityDescriptions = [
      "Neospitalier, mediu ostil",
      "Ospitalitate minimală",
      "Ospitalitate standard", 
      "Atmosferă primitoare",
      "Ospitalitate excepțională"
    ];
    
    const descriptions = type === 'mission' ? missionDescriptions : hospitalityDescriptions;
    return descriptions[rating - 1] || "Nespecificat";
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full p-8">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full p-8 text-center">
          <div className="text-red-600 mb-4">
            <FileText className="h-12 w-12 mx-auto mb-2" />
            <h3 className="text-lg font-semibold">Visit Not Found</h3>
            <p className="text-gray-600">The requested visit could not be loaded.</p>
          </div>
          <Button onClick={onClose} variant="outline">Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Visit' : 'Visit Details'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">{visit.churchName}</p>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing && !visit.isRated && (
              <>
                <Button
                  onClick={startEdit}
                  variant="outline"
                  size="sm"
                  className="flex items-center"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </>
            )}
            {isEditing && (
              <>
                <Button
                  onClick={handleEditSubmit}
                  disabled={updateVisitMutation.isPending}
                  size="sm"
                  className="flex items-center bg-[#2E5BBA] hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-1" />
                  {updateVisitMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  onClick={() => setIsEditing(false)}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'details'
                ? 'border-b-2 border-[#2E5BBA] text-[#2E5BBA]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            Visit Details
          </button>
          {visit.isRated && (
            <button
              onClick={() => setActiveTab('rating')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'rating'
                  ? 'border-b-2 border-[#2E5BBA] text-[#2E5BBA]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Star className="h-4 w-4 inline mr-2" />
              Rating Details
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {isEditing ? (
                /* Edit Form */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="h-4 w-4 inline mr-2" />
                      Visit Date
                    </label>
                    <input
                      type="date"
                      value={editForm.visitDate}
                      onChange={(e) => setEditForm(prev => ({ ...prev, visitDate: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Users className="h-4 w-4 inline mr-2" />
                      Number of Attendees (Optional)
                    </label>
                    <input
                      type="number"
                      value={editForm.attendeesCount}
                      onChange={(e) => setEditForm(prev => ({ ...prev, attendeesCount: e.target.value }))}
                      placeholder="How many people attended?"
                      min="0"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FileText className="h-4 w-4 inline mr-2" />
                      Visit Notes
                    </label>
                    <Textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Describe what happened during the visit, key discussions, outcomes, etc."
                      rows={4}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
                    />
                  </div>
                </div>
              ) : (
                /* View Mode */
                <>
                  {/* Basic Visit Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <Calendar className="h-4 w-4 mr-2" />
                        Visit Date
                      </div>
                      <div className="text-lg font-medium text-gray-900">
                        {formatDate(visit.visitDate)}
                      </div>
                    </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center text-sm text-gray-600 mb-1">
                    <MapPin className="h-4 w-4 mr-2" />
                    Location
                  </div>
                  <div className="text-lg font-medium text-gray-900">
                    {visit.churchCity || visit.churchName || 'Unknown Location'}
                  </div>
                  {visit.churchAddress && (
                    <div className="text-sm text-gray-600">
                      {visit.churchAddress}
                    </div>
                  )}
                  {!visit.churchCity && !visit.churchAddress && (
                    <div className="text-sm text-gray-500 italic">
                      Location information not available
                    </div>
                  )}
                </div>

                {visit.attendeesCount && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <Users className="h-4 w-4 mr-2" />
                      Attendees
                    </div>
                    <div className="text-lg font-medium text-gray-900">
                      {visit.attendeesCount} people
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center text-sm text-gray-600 mb-1">
                    <Star className="h-4 w-4 mr-2" />
                    Rating Status
                  </div>
                  <div className="flex items-center">
                    {visit.isRated ? (
                      <>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Rated
                        </span>
                        {rating && (
                          <div className="flex items-center ml-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= rating.starRating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="ml-1 text-sm font-medium text-gray-700">
                              {rating.starRating}/5
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Not Rated
                      </span>
                    )}
                  </div>
                </div>
              </div>

                  {/* Visit Notes */}
                  {visit.notes && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Visit Notes</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-gray-700 whitespace-pre-wrap">{visit.notes}</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Metadata */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Visit Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Logged by:</span>
                    <span className="ml-2 text-gray-900">{visit.visitedBy}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Created:</span>
                    <span className="ml-2 text-gray-900">{formatDate(visit.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rating' && rating && (
            <div className="space-y-6">
              {/* Overall Rating */}
              <div className="text-center bg-blue-50 p-6 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-8 h-8 ${
                        star <= rating.starRating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-2xl font-bold text-blue-700 mb-1">
                  {rating.starRating}/5 Stars
                </div>
                <div className="text-sm text-blue-600">Overall Church Rating</div>
              </div>

              {/* Rating Components */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Star className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="font-medium text-gray-900">Mission Openness</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {rating.missionOpennessRating}/5
                  </div>
                  <div className="text-sm text-gray-600">
                    {getRatingDescription(rating.missionOpennessRating, 'mission')}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Star className="h-5 w-5 text-green-600 mr-2" />
                    <span className="font-medium text-gray-900">Hospitality</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {rating.hospitalityRating}/5
                  </div>
                  <div className="text-sm text-gray-600">
                    {getRatingDescription(rating.hospitalityRating, 'hospitality')}
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {rating.offeringsAmount !== undefined && rating.offeringsAmount > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <DollarSign className="h-5 w-5 text-purple-600 mr-2" />
                      <span className="font-medium text-gray-900">Offerings</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {rating.offeringsAmount} RON
                    </div>
                    <div className="text-sm text-gray-600">
                      Financial Score: {rating.financialScore}/5
                    </div>
                  </div>
                )}

                {rating.missionarySupportCount !== undefined && rating.missionarySupportCount > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Users className="h-5 w-5 text-orange-600 mr-2" />
                      <span className="font-medium text-gray-900">Missionaries</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {rating.missionarySupportCount}
                    </div>
                    <div className="text-sm text-gray-600">
                      Bonus: +{rating.missionaryBonus} stars
                    </div>
                  </div>
                )}

                {rating.visitDurationMinutes && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Clock className="h-5 w-5 text-indigo-600 mr-2" />
                      <span className="font-medium text-gray-900">Duration</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {rating.visitDurationMinutes} min
                    </div>
                  </div>
                )}
              </div>

              {/* Rating Notes */}
              {rating.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Rating Notes</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">{rating.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6">
          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Visit</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this visit? This action cannot be undone.
              {visit.isRated && (
                <span className="block mt-2 text-red-600 font-medium">
                  Note: This visit has been rated and may affect church statistics.
                </span>
              )}
            </p>
            <div className="flex space-x-3">
              <Button
                onClick={handleDelete}
                disabled={deleteVisitMutation.isPending}
                variant="destructive"
                className="flex-1"
              >
                {deleteVisitMutation.isPending ? 'Deleting...' : 'Delete Visit'}
              </Button>
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}