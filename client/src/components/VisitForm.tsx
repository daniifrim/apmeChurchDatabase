import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { X, Calendar, Users, FileText, Star, DollarSign, ChevronDown, ChevronUp, Clock } from "lucide-react";
import type { Church } from "@/types";

interface VisitFormProps {
  church?: Church;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function VisitForm({ church, onClose, onSuccess }: VisitFormProps) {
  const [formData, setFormData] = useState({
    churchId: church?.id || "",
    visitDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    notes: "",
    attendeesCount: "",
  });

  const [showRating, setShowRating] = useState(false);
  const [ratingData, setRatingData] = useState({
    missionOpennessRating: 0,
    hospitalityRating: 0,
    missionarySupportCount: 0,
    offeringsAmount: "",
    churchMembers: "",
    visitDurationMinutes: "",
    ratingNotes: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Romanian rating descriptions with options
  const missionOpennessOptions = [
    { value: 0, label: "Selectează o opțiune...", description: "" },
    { value: 1, label: "1 - Resistent", description: "Resistent la lucrarea de misiune, nu este interesat de outreach" },
    { value: 2, label: "2 - Interes minim", description: "Interes minim, doar cooperare de bază" },
    { value: 3, label: "3 - Interes moderat", description: "Interes moderat, conștientizare de misiune" },
    { value: 4, label: "4 - Interes activ", description: "Interes activ în lucrarea de misiune, cooperare bună" },
    { value: 5, label: "5 - Foarte orientat", description: "Foarte orientat spre misiune, proactiv în evanghelizare" }
  ];

  const hospitalityOptions = [
    { value: 0, label: "Selectează o opțiune...", description: "" },
    { value: 1, label: "1 - Neospitalier", description: "Neospitalier, necooperant, mediu ostil" },
    { value: 2, label: "2 - Ospitalitate minimală", description: "Ospitalitate minimală, doar curtoazie de bază" },
    { value: 3, label: "3 - Ospitalitate standard", description: "Ospitalitate standard, îndeplinește așteptările de bază" },
    { value: 4, label: "4 - Atmosferă primitoare", description: "Atmosferă primitoare, cooperare bună" },
    { value: 5, label: "5 - Ospitalitate excepțională", description: "Ospitalitate excepțională, depășește așteptările" }
  ];

  const createVisitMutation = useMutation({
    mutationFn: async (visitData: any) => {
      const payload: any = {
        visitDate: visitData.visitDate,
        notes: visitData.notes || undefined,
        attendeesCount: visitData.attendeesCount ? parseInt(visitData.attendeesCount) : undefined,
      };

      // Add rating data if provided
      if (visitData.rating && visitData.rating.missionOpennessRating > 0 && visitData.rating.hospitalityRating > 0) {
        payload.rating = {
          missionOpennessRating: visitData.rating.missionOpennessRating,
          hospitalityRating: visitData.rating.hospitalityRating,
          missionarySupportCount: visitData.rating.missionarySupportCount || 0,
          offeringsAmount: parseFloat(visitData.rating.offeringsAmount) || 0,
          churchMembers: parseInt(visitData.rating.churchMembers) || 1,
          attendeesCount: parseInt(visitData.attendeesCount) || 1, // Use visit attendees count
          visitDurationMinutes: visitData.rating.visitDurationMinutes ? parseInt(visitData.rating.visitDurationMinutes) : undefined,
          notes: visitData.rating.ratingNotes || undefined,
        };
      }

      const response = await apiRequest("POST", `/api/churches/${visitData.churchId}/visits`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["church-visits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/churches"] });
      toast({
        title: "Success",
        description: "Visit logged successfully",
      });
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Please log in again",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to log visit",
          variant: "destructive",
        });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.churchId) {
      toast({
        title: "Error",
        description: "Please select a church",
        variant: "destructive",
      });
      return;
    }

    // Validate rating data if rating section is shown
    if (showRating && (ratingData.missionOpennessRating > 0 || ratingData.hospitalityRating > 0)) {
      if (ratingData.missionOpennessRating === 0 || ratingData.hospitalityRating === 0) {
        toast({
          title: "Error",
          description: "Please provide both mission openness and hospitality ratings",
          variant: "destructive",
        });
        return;
      }
    }

    const submitData = {
      ...formData,
      rating: showRating ? ratingData : undefined,
    };

    createVisitMutation.mutate(submitData);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRatingChange = (field: string, value: string | number) => {
    setRatingData(prev => ({ ...prev, [field]: value }));
  };

  // Calculate real-time star rating preview
  const calculatePreviewRating = () => {
    if (ratingData.missionOpennessRating === 0 || ratingData.hospitalityRating === 0) {
      return null;
    }

    const attendees = parseInt(formData.attendeesCount) || 1;
    const offeringsAmount = parseFloat(ratingData.offeringsAmount as string) || 0;
    
    // Calculate financial score based on per-attendee ratio
    const perAttendeeRatio = attendees > 0 ? offeringsAmount / attendees : 0;
    
    let financialScore = 1;
    if (perAttendeeRatio >= 100) financialScore = 5;
    else if (perAttendeeRatio >= 50) financialScore = 4;
    else if (perAttendeeRatio >= 25) financialScore = 3;
    else if (perAttendeeRatio >= 10) financialScore = 2;
    
    // Missionary support bonus (0.5 points per missionary, max 2 points)
    const missionaryBonus = Math.min(ratingData.missionarySupportCount * 0.5, 2);
    
    // Weighted calculation (mission openness 35%, hospitality 25%, financial 25%, missionary bonus 15%)
    const weightedScore = (
      ratingData.missionOpennessRating * 0.35 +
      ratingData.hospitalityRating * 0.25 +
      financialScore * 0.25 +
      missionaryBonus * 0.15
    );
    
    return Math.round(Math.min(Math.max(weightedScore, 1), 5));
  };

  const previewRating = calculatePreviewRating();

  // Dropdown Rating Component 
  const DropdownRating = ({ value, onChange, label, options }: {
    value: number;
    onChange: (value: number) => void;
    label: string;
    options: { value: number; label: string; description: string }[];
  }) => {
    const selectedOption = options.find(opt => opt.value === value);

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <select
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent bg-white"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {selectedOption && selectedOption.description && selectedOption.value > 0 && (
          <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded mt-1">
            {selectedOption.description}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Log Church Visit</h2>
            {church && (
              <p className="text-sm text-gray-600 mt-1">{church.name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Church Selection (if no church provided) */}
          {!church && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Church ID
              </label>
              <input
                type="number"
                value={formData.churchId}
                onChange={(e) => handleInputChange('churchId', e.target.value)}
                placeholder="Enter church ID"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
                required
              />
            </div>
          )}

          {/* Visit Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-2" />
              Visit Date
            </label>
            <input
              type="date"
              value={formData.visitDate}
              onChange={(e) => handleInputChange('visitDate', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
              required
            />
          </div>


          {/* Attendees Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="h-4 w-4 inline mr-2" />
              Number of Attendees (Optional)
            </label>
            <input
              type="number"
              value={formData.attendeesCount}
              onChange={(e) => handleInputChange('attendeesCount', e.target.value)}
              placeholder="How many people attended?"
              min="0"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="h-4 w-4 inline mr-2" />
              Visit Notes
            </label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Describe what happened during the visit, key discussions, outcomes, etc."
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
            />
          </div>

          {/* Rating Section Toggle */}
          <div className="border-t pt-4">
            <button
              type="button"
              onClick={() => setShowRating(!showRating)}
              className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-500 mr-2" />
                <span className="font-medium text-gray-700">Add Church Rating (Optional)</span>
              </div>
              {showRating ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>

          {/* Rating Section */}
          {showRating && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                Rate the church using Romanian-specific criteria. All rating fields are optional.
              </div>

              {/* Real-time Rating Preview */}
              {previewRating && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-blue-700">Calculated Rating:</span>
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= previewRating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-sm font-medium text-blue-700">
                        {previewRating}/5 stars
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Mission Openness Rating */}
              <DropdownRating
                value={ratingData.missionOpennessRating}
                onChange={(value) => handleRatingChange('missionOpennessRating', value)}
                label="Deschidere generală pentru misiune"
                options={missionOpennessOptions}
              />

              {/* Hospitality Rating */}
              <DropdownRating
                value={ratingData.hospitalityRating}
                onChange={(value) => handleRatingChange('hospitalityRating', value)}
                label="Ospitalitate"
                options={hospitalityOptions}
              />

              {/* Financial and Member Data */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <DollarSign className="h-4 w-4 inline mr-2" />
                    Suma ofrandelor (RON)
                  </label>
                  <input
                    type="number"
                    value={ratingData.offeringsAmount}
                    onChange={(e) => handleRatingChange('offeringsAmount', e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
                  />
                </div>


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Misionari susținuți
                  </label>
                  <input
                    type="number"
                    value={ratingData.missionarySupportCount}
                    onChange={(e) => handleRatingChange('missionarySupportCount', parseInt(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Visit Duration Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="h-4 w-4 inline mr-2" />
                  Durata vizitei (minute) - opțional
                </label>
                <input
                  type="number"
                  value={ratingData.visitDurationMinutes}
                  onChange={(e) => handleRatingChange('visitDurationMinutes', e.target.value)}
                  placeholder="60"
                  min="1"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note pentru evaluare - opțional
                </label>
                <Textarea
                  value={ratingData.ratingNotes}
                  onChange={(e) => handleRatingChange('ratingNotes', e.target.value)}
                  placeholder="Observații suplimentare despre evaluare..."
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
                />
              </div>
            </div>
          )}


          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="submit"
              disabled={createVisitMutation.isPending}
              className="flex-1 bg-[#2E5BBA] hover:bg-blue-700"
            >
              {createVisitMutation.isPending ? "Logging Visit..." : "Log Visit"}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}