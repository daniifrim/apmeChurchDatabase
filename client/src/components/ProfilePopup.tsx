import { useAuth } from '@/hooks/useAuth';
import { useAuth as useAuthContext } from '@/contexts/AuthContext';
import { UserIcon, EnvelopeIcon, BuildingOfficeIcon, MapPinIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface ProfilePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfilePopup({ isOpen, onClose }: ProfilePopupProps) {
  const { user } = useAuth();
  const { signOut } = useAuthContext();

  if (!isOpen || !user) return null;

  const handleLogout = async () => {
    await signOut();
    onClose();
  };

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return (first + last).toUpperCase() || "U";
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-20 z-[9998]"
        onClick={onClose}
      />
      
      {/* Popup */}
      <div className="fixed top-16 right-4 z-[9999] bg-white rounded-lg shadow-xl border border-gray-200 w-80 max-w-sm">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-4">
            <Avatar className="w-12 h-12">
              <AvatarImage src={user?.profileImageUrl || ""} />
              <AvatarFallback className="text-sm">
                {getInitials(user?.firstName || null, user?.lastName || null)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-gray-900">
                {user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user.email
                }
              </h3>
              <p className="text-sm text-gray-600 capitalize">{user.role}</p>
            </div>
          </div>

          {/* Profile Info */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm">
              <EnvelopeIcon className="h-4 w-4 text-gray-400" />
              <span className="text-gray-700">{user.email}</span>
            </div>
            
            <div className="flex items-center space-x-2 text-sm">
              <BuildingOfficeIcon className="h-4 w-4 text-gray-400" />
              <span className="text-gray-700 capitalize">{user.role}</span>
            </div>
            
            <div className="flex items-center space-x-2 text-sm">
              <MapPinIcon className="h-4 w-4 text-gray-400" />
              <span className="text-gray-700">{user.region || 'Romania'}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}