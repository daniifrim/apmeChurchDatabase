import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { X, Calendar, Users, FileText, Star, DollarSign, ChevronDown, ChevronUp, Clock, Search, MapPin } from "lucide-react";
import type { Church } from "@/types";
import { normalizeDiacritics } from "@/lib/utils";

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

  const [churchSearchQuery, setChurchSearchQuery] = useState("");
  const [showChurchDropdown, setShowChurchDropdown] = useState(false);
  const [selectedChurch, setSelectedChurch] = useState<Church | undefined>(church);

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

  // Fetch churches for the dropdown
  const { data: churches = [] } = useQuery({
    queryKey: ['/api/churches'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/churches');
      return response.json();
    },
  });

  // Filter churches based on search query
  const filteredChurches = useMemo(() => {
    if (!churchSearchQuery) return churches.slice(0, 10); // Show first 10 churches by default
    
    const normalizedQuery = normalizeDiacritics(churchSearchQuery.toLowerCase());
    return churches.filter((ch: Church) => {
      // Add null safety checks for all string properties
      const name = ch.name?.toLowerCase() || '';
      const city = ch.city?.toLowerCase() || '';
      const county = ch.county?.toLowerCase() || '';
      
      return normalizeDiacritics(name).includes(normalizedQuery) ||
             normalizeDiacritics(city).includes(normalizedQuery) ||
             normalizeDiacritics(county).includes(normalizedQuery);
    }).slice(0, 10);
  }, [churches, churchSearchQuery]);

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

  const handleChurchSelect = (selectedChurch: Church) => {
    setSelectedChurch(selectedChurch);
    setFormData(prev => ({ ...prev, churchId: selectedChurch.id.toString() }));
    setChurchSearchQuery(selectedChurch.name || '');
    setShowChurchDropdown(false);
  };

  // Calculate real-time star rating preview using Version 2.0 dynamic weighting
  const calculatePreviewRating = () => {
    if (ratingData.missionOpennessRating === 0 || ratingData.hospitalityRating === 0) {
      return null;
    }

    const attendees = parseInt(formData.attendeesCount) || 1;
    const offeringsAmount = parseFloat(ratingData.offeringsAmount as string) || 0;
    
    // Base weights for Version 2.0
    const baseWeights = {
      missionOpenness: 0.40,
      hospitality: 0.30,
      financial: 0.30,
    };

    let financialScore = 0;
    let finalWeights = { ...baseWeights };

    const isFinancialApplicable = offeringsAmount && offeringsAmount > 0;

    if (isFinancialApplicable) {
      // Calculate financial score based on per-attendee ratio
      const perAttendeeRatio = attendees > 0 ? offeringsAmount / attendees : 0;
      
      if (perAttendeeRatio >= 100) financialScore = 5;
      else if (perAttendeeRatio >= 50) financialScore = 4;
      else if (perAttendeeRatio >= 25) financialScore = 3;
      else if (perAttendeeRatio >= 10) financialScore = 2;
      else financialScore = 1;
    } else {
      // Dynamic weight redistribution when no offering is made
      const financialWeight = finalWeights.financial;
      finalWeights.financial = 0; // Remove financial weight
      // Distribute the unused weight proportionally (55%/45% split)
      finalWeights.missionOpenness += financialWeight * 0.55;
      finalWeights.hospitality += financialWeight * 0.45;
    }

    // Version 2.0 weighted calculation (missionary support is NOT part of rating)
    const weightedScore = (
      ratingData.missionOpennessRating * finalWeights.missionOpenness +
      ratingData.hospitalityRating * finalWeights.hospitality +
      financialScore * finalWeights.financial
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
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="h-4 w-4 inline mr-2" />
                Select Church
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={selectedChurch ? (selectedChurch.name || '') : churchSearchQuery}
                  onChange={(e) => {
                    setChurchSearchQuery(e.target.value);
                    setShowChurchDropdown(true);
                    if (!e.target.value) {
                      setSelectedChurch(undefined);
                      setFormData(prev => ({ ...prev, churchId: '' }));
                    }
                  }}
                  onFocus={() => setShowChurchDropdown(true)}
                  placeholder="Search for a church..."
                  className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
                  required
                />
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                
                {/* Church Dropdown */}
                {showChurchDropdown && filteredChurches.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredChurches.map((ch: Church) => (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => handleChurchSelect(ch)}
                        className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-gray-50"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{ch.name || 'Unnamed Church'}</span>
                          <span className="text-sm text-gray-500">{ch.city || 'Unknown City'}, {ch.county || 'Unknown County'}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {/* No results message */}
                {showChurchDropdown && churchSearchQuery && filteredChurches.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                    <span className="text-gray-500 text-sm">No churches found matching "{churchSearchQuery}"</span>
                  </div>
                )}
              </div>
              
              {/* Close dropdown when clicking outside */}
              {showChurchDropdown && (
                <div 
                  className="fixed inset-0 z-5" 
                  onClick={() => setShowChurchDropdown(false)}
                />
              )}
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
                <strong>Version 2.0 Rating System:</strong> Rate this specific visit experience. Missionary support is tracked separately as a church-level attribute.
              </div>

              {/* Real-time Rating Preview */}
              {previewRating && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-blue-700">Visit Rating:</span>
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
                    {ratingData.missionarySupportCount > 0 && (
                      <div className="bg-blue-100 px-2 py-1 rounded-full">
                        <span className="text-xs font-medium text-blue-800">
                          Susține {ratingData.missionarySupportCount} misionari
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-blue-600 mt-2">
                    Version 2.0: Missionary support displayed separately as church attribute
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