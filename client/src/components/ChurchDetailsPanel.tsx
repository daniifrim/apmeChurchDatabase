import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  History,
  X
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
      case "high": return "bg-growth-green";
      case "medium": return "bg-warm-orange";
      case "low": return "bg-yellow-500";
      case "new": return "bg-ministry-blue";
      default: return "bg-gray-500";
    }
  };

  const getEngagementLabel = (level: string) => {
    switch (level) {
      case "high": return "High Engagement";
      case "medium": return "Medium Engagement";
      case "low": return "Low Engagement";
      case "new": return "New Church";
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
      case "visit": return <Calendar className="h-3 w-3" />;
      case "call": return <Phone className="h-3 w-3" />;
      case "note": return <StickyNote className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const handleAddNote = () => {
    if (!note.trim()) return;
    addNoteMutation.mutate(note.trim());
  };

  return (
    <div className="bg-white border-t border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h2 className="text-xl font-semibold text-dark-blue-grey">{church.name}</h2>
            <Badge
              className={`text-white ${getEngagementColor(church.engagementLevel)}`}
            >
              {getEngagementLabel(church.engagementLevel)}
            </Badge>
          </div>
          <div className="flex items-center space-x-2 text-gray-500">
            <MapPin className="h-4 w-4" />
            <p>{church.address}, {church.city}, {church.county}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => scheduleVisitMutation.mutate()}
            disabled={scheduleVisitMutation.isPending}
            className="bg-ministry-blue hover:bg-blue-700"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Visit
          </Button>
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Pastor:</span>
              <span>{church.pastor || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Members:</span>
              <span className="flex items-center">
                <Users className="h-3 w-3 mr-1" />
                {church.memberCount || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Founded:</span>
              <span>{church.foundedYear || "N/A"}</span>
            </div>
            {church.phone && (
              <div className="flex justify-between">
                <span className="text-gray-500">Phone:</span>
                <span className="flex items-center">
                  <Phone className="h-3 w-3 mr-1" />
                  {church.phone}
                </span>
              </div>
            )}
            {church.email && (
              <div className="flex justify-between">
                <span className="text-gray-500">Email:</span>
                <span className="flex items-center">
                  <Mail className="h-3 w-3 mr-1" />
                  {church.email}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-sm text-gray-500">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {activities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="text-ministry-blue mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="text-sm flex-1">
                      <p className="text-dark-blue-grey font-medium">{activity.title}</p>
                      {activity.description && (
                        <p className="text-gray-600 text-xs mt-1">{activity.description}</p>
                      )}
                      <p className="text-gray-500 text-xs mt-1">
                        {formatActivityDate(activity.activityDate)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes & Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Notes & Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {church.notes && (
              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                {church.notes}
              </div>
            )}
            
            {isAddingNote ? (
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a note..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="text-sm"
                />
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={handleAddNote}
                    disabled={!note.trim() || addNoteMutation.isPending}
                    className="bg-ministry-blue hover:bg-blue-700"
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsAddingNote(false);
                      setNote("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setIsAddingNote(true)}
                >
                  <StickyNote className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <History className="h-4 w-4 mr-2" />
                  View Full History
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
