import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { X, Calendar, Users, Target, FileText } from "lucide-react";
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
    purpose: "",
    notes: "",
    attendeesCount: "",
    followUpRequired: false,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createVisitMutation = useMutation({
    mutationFn: async (visitData: any) => {
      const response = await apiRequest("POST", `/api/churches/${visitData.churchId}/visits`, {
        visitDate: visitData.visitDate,
        purpose: visitData.purpose || undefined,
        notes: visitData.notes || undefined,
        attendeesCount: visitData.attendeesCount ? parseInt(visitData.attendeesCount) : undefined,
        followUpRequired: visitData.followUpRequired,
      });
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
    createVisitMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
                <Target className="h-4 w-4 inline mr-2" />
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

          {/* Purpose */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Target className="h-4 w-4 inline mr-2" />
              Purpose of Visit
            </label>
            <select
              value={formData.purpose}
              onChange={(e) => handleInputChange('purpose', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E5BBA] focus:border-transparent"
            >
              <option value="">Select purpose...</option>
              <option value="Pastoral Visit">Pastoral Visit</option>
              <option value="Initial Contact">Initial Contact</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Support Visit">Support Visit</option>
              <option value="Training">Training</option>
              <option value="Conference">Conference</option>
              <option value="Emergency">Emergency</option>
              <option value="Other">Other</option>
            </select>
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

          {/* Follow-up Required */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="followUpRequired"
              checked={formData.followUpRequired}
              onChange={(e) => handleInputChange('followUpRequired', e.target.checked)}
              className="h-4 w-4 text-[#2E5BBA] focus:ring-[#2E5BBA] border-gray-300 rounded"
            />
            <label htmlFor="followUpRequired" className="text-sm font-medium text-gray-700">
              Follow-up required
            </label>
          </div>

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