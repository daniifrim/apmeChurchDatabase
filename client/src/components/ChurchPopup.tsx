import { X, MapPin, Phone, Edit, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Church } from "@/types";

interface ChurchPopupProps {
  church: Church;
  onClose: () => void;
  onEdit: () => void;
  onViewDetails: () => void;
}

export default function ChurchPopup({ church, onClose, onEdit, onViewDetails }: ChurchPopupProps) {
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
      default: return "Unknown";
    }
  };

  const openDirections = () => {
    const destination = `${church.address}, ${church.city}, ${church.county}`;
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    window.open(googleMapsUrl, '_blank');
  };

  const callPastor = () => {
    if (church.phone) {
      window.location.href = `tel:${church.phone}`;
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-[10000] max-w-sm mx-auto animate-in slide-in-from-bottom-3 duration-300">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {church.name}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <Badge className={`text-white text-xs px-2 py-1 ${getEngagementColor(church.engagementLevel)}`}>
                {getEngagementLabel(church.engagementLevel)}
              </Badge>
              {church.memberCount && (
                <span className="text-sm text-gray-500">
                  {church.memberCount} members
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Address */}
      <div className="px-4 py-2">
        <div className="flex items-start space-x-2 text-gray-600">
          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span className="text-sm">
            {church.address}, {church.city}, {church.county}
          </span>
        </div>
        {church.pastor && (
          <div className="mt-2 text-sm text-gray-600">
            Pastor: {church.pastor}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex space-x-2">
          <button
            onClick={openDirections}
            className="flex-1 bg-[#2E5BBA] hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center space-x-2 transition-colors"
          >
            <Navigation className="h-4 w-4" />
            <span>Directions</span>
          </button>
          
          <button
            onClick={onEdit}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center space-x-2 transition-colors"
          >
            <Edit className="h-4 w-4" />
            <span>Edit</span>
          </button>
          
          {church.phone && (
            <button
              onClick={callPastor}
              className="bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center space-x-2 transition-colors"
            >
              <Phone className="h-4 w-4" />
              <span>Call</span>
            </button>
          )}
        </div>
      </div>

      {/* View Details Link */}
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
        <button
          onClick={onViewDetails}
          className="text-sm text-[#2E5BBA] hover:text-blue-700 font-medium"
        >
          View full details →
        </button>
      </div>
    </div>
  );
}