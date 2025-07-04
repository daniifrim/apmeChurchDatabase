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
  ArrowLeft
} from "lucide-react";
import type { Church, Activity } from "@/types";

interface ChurchDetailsPanelProps {
  church: Church;
  onClose: () => void;
}

export default function ChurchDetailsPanel({ church, onClose }: ChurchDetailsPanelProps) {
  const [note, setNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/churches", church.id, "activities"],
    retry: false,
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

  const scheduleVisitMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/churches/${church.id}/visits`, {
        visitDate: new Date().toISOString(),
        purpose: "Scheduled visit",
        notes: "Visit scheduled from church details panel",
        followUpRequired: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/churches", church.id, "activities"] });
      toast({
        title: "Success",
        description: "Visit scheduled successfully",
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
        description: "Failed to schedule visit",
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
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "visit": return <Calendar className="h-4 w-4" />;
      case "call": return <Phone className="h-4 w-4" />;
      case "note": return <StickyNote className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const handleAddNote = () => {
    if (!note.trim()) return;
    addNoteMutation.mutate(note.trim());
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
          <h1 className="text-lg font-semibold text-gray-900 truncate mx-4">
            Church Details
          </h1>
          <button 
            onClick={() => scheduleVisitMutation.mutate()}
            disabled={scheduleVisitMutation.isPending}
            className="bg-[#2E5BBA] hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            Visit
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-6">
          {/* Church Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{church.name}</h2>
            <div className="flex items-center space-x-2 mb-3">
              <Badge
                className={`text-white px-3 py-1 ${getEngagementColor(church.engagementLevel)}`}
              >
                {getEngagementLabel(church.engagementLevel)}
              </Badge>
            </div>
            <div className="flex items-start space-x-2 text-gray-600">
              <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{church.address}, {church.city}, {church.county}</p>
            </div>
          </div>

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

          {/* Recent Activity */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            {activities.length === 0 ? (
              <p className="text-gray-500">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {activities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-b-0">
                    <div className="text-[#2E5BBA] mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{activity.title}</p>
                      {activity.description && (
                        <p className="text-gray-600 text-sm mt-1">{activity.description}</p>
                      )}
                      <p className="text-gray-500 text-sm mt-1">
                        {formatActivityDate(activity.activityDate)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
        </div>
      </div>
    </div>
  );
}