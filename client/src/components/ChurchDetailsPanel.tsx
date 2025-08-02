import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Calendar, 
  Edit, 
  Phone, 
  Mail, 
  Users, 
  MapPin, 
  Clock,
  StickyNote,
  X,
  ArrowLeft,
  Star,
  Plus
} from "lucide-react";
import { ChurchStarRating } from "./ChurchStarRating";
import { RatingHistory } from "./RatingHistory";
import { VisitRatingForm } from "./VisitRatingForm";
import VisitForm from "./VisitForm";
import type { Church, Activity } from "@/types";

interface ChurchDetailsPanelProps {
  church: Church;
  onClose: () => void;
}

export default function ChurchDetailsPanel({ church, onClose }: ChurchDetailsPanelProps) {
  const [note, setNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [selectedVisitForRating, setSelectedVisitForRating] = useState<number | null>(null);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'ratings' | 'history'>('details');
  const [editForm, setEditForm] = useState({
    name: church.name,
    address: church.address,
    city: church.city,
    county: church.county,
    pastor: church.pastor || "",
    phone: church.phone || "",
    email: church.email || "",
    memberCount: church.memberCount || "",
    foundedYear: church.foundedYear || "",
    engagementLevel: church.engagementLevel,
    notes: church.notes || ""
  });
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();



  const { data: filterOptions } = useQuery({
    queryKey: ['/api/filters'],
    queryFn: () => fetch('/api/filters').then(res => res.json()).then(data => data.data)
  });

  // Fetch church star rating
  const { data: churchRating, isLoading: ratingLoading } = useQuery({
    queryKey: ["church-star-rating", church.id],
    queryFn: () => apiRequest('GET', `/api/churches/${church.id}/star-rating`).then(res => res.json()),
    enabled: !!church.id,
  });

  // Fetch visits for rating buttons
  const { data: visits, isLoading: visitsLoading } = useQuery({
    queryKey: ["church-visits", church.id],
    queryFn: () => apiRequest('GET', `/api/churches/${church.id}/visits`).then(res => res.json()),
    enabled: !!church.id,
  });

  const addNoteMutation = useMutation({
    mutationFn: async (noteText: string) => {
      await apiRequest("POST", `/api/churches/${church.id}/activities`, {
        type: "note",
        title: "Note added",
        description: noteText,
        activityDate: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/churches", church.id, "activities"] });
      setNote("");
      setIsAddingNote(false);
      toast({
        title: "Success",
        description: "Note added successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive",
      });
    },
  });

  const updateChurchMutation = useMutation({
    mutationFn: async (formData: typeof editForm) => {
      const response = await apiRequest("PUT", `/api/churches/${church.id}`, {
        ...formData,
        memberCount: formData.memberCount ? parseInt(formData.memberCount.toString()) : null,
        foundedYear: formData.foundedYear ? parseInt(formData.foundedYear.toString()) : null,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/churches"] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Church details updated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to update church details",
        variant: "destructive",
      });
    },
  });

  const getEngagementColor = (level: string) => {
    switch (level) {
      case "high": return "bg-green-500";
      case "medium": return "bg-blue-500";
      case "low": return "bg-yellow-500";
      case "new": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  const getEngagementLabel = (level: string) => {
    switch (level) {
      case "high": return "Actively Engaged";
      case "medium": return "Partnership Established";
      case "low": return "Initial Contact";
      case "new": return "Not Contacted";
      default: return level;
    }
  };

  const formatActivityDate = (date: string) => {
    try {
      const parsedDate = new Date(date);
      // Check if the date is valid
      if (isNaN(parsedDate.getTime())) {
        return "Invalid date";
      }
      return parsedDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short", 
        day: "numeric",
      });
    } catch (error) {
      return "Invalid date";
    }
  };



  const handleAddNote = () => {
    if (!note.trim()) return;
    addNoteMutation.mutate(note.trim());
  };

  const openGoogleMaps = () => {
    const destination = `${church.address}, ${church.city}, ${church.county}`;
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    window.open(googleMapsUrl, '_blank');
  };

  const handleFormChange = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = () => {
    updateChurchMutation.mutate(editForm);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center md:justify-center">
      <div className="bg-white w-full h-full md:max-w-4xl md:h-auto md:rounded-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white flex-shrink-0">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </button>
          <div className="flex-1 mx-4">
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {isEditing ? "Edit Church" : church.name}
            </h1>

          </div>
          <div className="flex space-x-2">
            {!isEditing && (
              <>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm flex items-center space-x-1"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit</span>
                </button>
                <button 
                  onClick={() => setShowVisitForm(true)}
                  className="bg-[#2E5BBA] hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Log Visit
                </button>
              </>
            )}
            {isEditing && (
              <>
                <button 
                  onClick={handleSaveEdit}
                  disabled={updateChurchMutation.isPending}
                  className="bg-[#2E5BBA] hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm"
                >
                  {updateChurchMutation.isPending ? "Saving..." : "Save"}
                </button>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-28">
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'details'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('ratings')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'ratings'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Ratings
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              History
            </button>
          </div>
          {/* Church Header / Edit Form */}
          {!isEditing ? (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{church.name}</h2>
              <div className="flex items-center space-x-2 mb-3">
                <Badge
                  className={`text-white px-3 py-1 ${getEngagementColor(church.engagementLevel)}`}
                >
                  {getEngagementLabel(church.engagementLevel)}
                </Badge>
              </div>
              <div className="flex items-start space-x-2 text-gray-600 mb-2">
                <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <button 
                  onClick={openGoogleMaps}
                  className="text-sm text-left hover:text-[#2E5BBA] hover:underline transition-colors"
                >
                  {church.address}, {church.city}, {church.counties?.name || church.county}
                </button>
              </div>
              {church.counties?.rccp_regions && (
                <div className="text-sm text-gray-500">
                  RCCP Region: {church.counties.rccp_regions.name}
                </div>
              )}
            </div>
          ) : (
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Church Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => handleFormChange('address', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => handleFormChange('city', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
                <select
                  value={editForm.county}
                  onChange={(e) => handleFormChange('county', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
                >
                  <option value="">Select a county</option>
                  {filterOptions?.counties?.map((county: any) => (
                    <option key={county.id} value={county.name}>
                      {county.name} ({county.abbreviation})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Engagement Level</label>
                <select
                  value={editForm.engagementLevel}
                  onChange={(e) => handleFormChange('engagementLevel', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
                >
                  <option value="high">Actively Engaged</option>
                  <option value="medium">Partnership Established</option>
                  <option value="low">Initial Contact</option>
                  <option value="new">Not Contacted</option>
                </select>
              </div>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'details' && !isEditing ? (
            <>
              {/* Basic Information */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Pastor:</span>
                    <span className="font-medium text-gray-900">{church.pastor || "N/A"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Members:</span>
                    <span className="flex items-center font-medium text-gray-900">
                      <Users className="h-4 w-4 mr-2 text-gray-500" />
                      {church.memberCount || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Founded:</span>
                    <span className="font-medium text-gray-900">{church.foundedYear || "N/A"}</span>
                  </div>
                  {church.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="flex items-center font-medium text-gray-900">
                        <Phone className="h-4 w-4 mr-2 text-gray-500" />
                        <a href={`tel:${church.phone}`} className="text-blue-600 hover:text-blue-800">
                          {church.phone}
                        </a>
                      </span>
                    </div>
                  )}
                  {church.email && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="flex items-center font-medium text-gray-900">
                        <Mail className="h-4 w-4 mr-2 text-gray-500" />
                        <a href={`mailto:${church.email}`} className="text-blue-600 hover:text-blue-800">
                          {church.email}
                        </a>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes Section */}
              {church.notes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-gray-700">{church.notes}</p>
                </div>
              )}

              {/* Add Note Section */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Note</h3>
                {!isAddingNote ? (
                  <Button
                    onClick={() => setIsAddingNote(true)}
                    variant="outline"
                    className="w-full"
                  >
                    <StickyNote className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Enter your note here..."
                      rows={3}
                      className="w-full"
                    />
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleAddNote}
                        disabled={addNoteMutation.isPending || !note.trim()}
                        className="flex-1 bg-[#2E5BBA] hover:bg-blue-700"
                      >
                        {addNoteMutation.isPending ? "Adding..." : "Save Note"}
                      </Button>
                      <Button
                        onClick={() => {
                          setIsAddingNote(false);
                          setNote("");
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : activeTab === 'details' && isEditing ? (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Basic Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pastor</label>
                  <input
                    type="text"
                    value={editForm.pastor}
                    onChange={(e) => handleFormChange('pastor', e.target.value)}
                    placeholder="Pastor name"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => handleFormChange('phone', e.target.value)}
                      placeholder="Phone number"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => handleFormChange('email', e.target.value)}
                      placeholder="Email address"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Member Count</label>
                    <input
                      type="number"
                      value={editForm.memberCount}
                      onChange={(e) => handleFormChange('memberCount', e.target.value)}
                      placeholder="Number of members"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Founded Year</label>
                    <input
                      type="number"
                      value={editForm.foundedYear}
                      onChange={(e) => handleFormChange('foundedYear', e.target.value)}
                      placeholder="Year founded"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                    placeholder="Additional notes about the church"
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          ) : activeTab === 'ratings' && !isEditing ? (
            <div className="space-y-6">
              {/* Church Star Rating Display */}
              {ratingLoading ? (
                <div className="animate-pulse">
                  <div className="h-48 bg-gray-200 rounded-lg"></div>
                </div>
              ) : (
                <ChurchStarRating
                  churchId={church.id}
                  churchName={church.name}
                  averageStars={churchRating?.data?.averageStars || 0}
                  totalVisits={churchRating?.data?.totalVisits || 0}
                  visitsLast30Days={churchRating?.data?.visitsLast30Days}
                  visitsLast90Days={churchRating?.data?.visitsLast90Days}
                  ratingBreakdown={churchRating?.data?.ratingBreakdown}
                  financialSummary={churchRating?.data?.financialSummary}
                  lastVisitDate={churchRating?.data?.lastVisitDate}
                  showDetails={true}
                />
              )}

              {/* Unrated Visits */}
              {visits?.data && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Unrated Visits</h3>
                  <div className="space-y-2">
                    {visits.data
                      .filter((visit: any) => !visit.isRated)
                      .map((visit: any) => (
                        <div key={visit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">
                              {new Date(visit.visitDate).toLocaleDateString('ro-RO')}
                            </p>
                            <p className="text-sm text-gray-600">{visit.purpose || 'No purpose specified'}</p>
                          </div>
                          <Button
                            onClick={() => {
                              setSelectedVisitForRating(visit.id);
                              setShowRatingForm(true);
                            }}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Star className="w-4 h-4 mr-1" />
                            Rate Visit
                          </Button>
                        </div>
                      ))}
                    {visits.data.filter((visit: any) => !visit.isRated).length === 0 && (
                      <p className="text-gray-500 text-center py-4">All visits have been rated</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'history' && !isEditing ? (
            <RatingHistory churchId={church.id} churchName={church.name} />
          ) : null}
        </div>

        {/* Rating Form Modal */}
        {showRatingForm && selectedVisitForRating && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <VisitRatingForm
                visitId={selectedVisitForRating}
                churchName={church.name}
                onSuccess={() => {
                  setShowRatingForm(false);
                  setSelectedVisitForRating(null);
                  queryClient.invalidateQueries({ queryKey: ["church-star-rating", church.id] });
                  queryClient.invalidateQueries({ queryKey: ["church-visits", church.id] });
                  toast({
                    title: "Success",
                    description: "Visit rating saved successfully",
                  });
                }}
                onCancel={() => {
                  setShowRatingForm(false);
                  setSelectedVisitForRating(null);
                }}
              />
            </div>
          </div>
        )}

        {/* Visit Form Modal */}
        {showVisitForm && (
          <VisitForm
            church={church}
            onClose={() => setShowVisitForm(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["church-visits", church.id] });
              queryClient.invalidateQueries({ queryKey: ["/api/churches"] });
            }}
          />
        )}
      </div>
    </div>
  );
}