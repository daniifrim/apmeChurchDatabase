import { useAuth } from '@/hooks/useAuth';
import { useAuth as useAuthContext } from '@/contexts/AuthContext';
import { UserIcon, EnvelopeIcon, BuildingOfficeIcon, MapPinIcon, CogIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

export default function ProfileView() {
  const { user } = useAuth();
  const { signOut } = useAuthContext();

  const handleLogout = async () => {
    await signOut();
  };

  const profileSections = [
    {
      title: 'Account Information',
      items: [
        {
          icon: UserIcon,
          label: 'Name',
          value: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Not provided' : 'Loading...',
        },
        {
          icon: EnvelopeIcon,
          label: 'Email',
          value: user?.email || 'Not provided',
        },
        {
          icon: BuildingOfficeIcon,
          label: 'Role',
          value: user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Not assigned',
        },
        {
          icon: MapPinIcon,
          label: 'Region',
          value: user?.region || 'Not assigned',
        },
      ],
    },
  ];

  const actionItems = [
    {
      icon: CogIcon,
      label: 'Settings',
      action: () => console.log('Settings'),
      color: 'text-gray-600',
    },
    {
      icon: ArrowRightOnRectangleIcon,
      label: 'Sign Out',
      action: handleLogout,
      color: 'text-red-600',
    },
  ];

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 overflow-y-auto pb-28">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Profile Avatar Section */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="text-center">
            <div className="w-20 h-20 bg-[#2E5BBA] rounded-full flex items-center justify-center mx-auto mb-4">
              {user.profileImageUrl ? (
                <img 
                  src={user.profileImageUrl} 
                  alt="Profile" 
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <span className="text-white text-2xl font-semibold">
                  {user.firstName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </span>
              )}
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              {user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user.email
              }
            </h2>
            
            <p className="text-gray-600 capitalize">
              {user.role} • {user.region}
            </p>
          </div>
        </div>

        {/* Profile Information */}
        {profileSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
            </div>
            
            <div className="divide-y divide-gray-200">
              {section.items.map((item, itemIndex) => (
                <div key={itemIndex} className="p-4 flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <item.icon className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700">{item.label}</p>
                    <p className="text-sm text-gray-900">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Statistics Card */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Activity</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">5</p>
              <p className="text-sm text-gray-600">Churches Added</p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">12</p>
              <p className="text-sm text-gray-600">Visits Logged</p>
            </div>
          </div>
        </div>

        {/* Action Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="divide-y divide-gray-200">
            {actionItems.map((item, index) => (
              <button
                key={index}
                onClick={item.action}
                className="w-full p-4 flex items-center space-x-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className={`text-sm font-medium ${item.color}`}>{item.label}</p>
                </div>
                <div className="flex-shrink-0">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* App Information */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">About</h3>
          
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Version</span>
              <span>1.0.0</span>
            </div>
            
            <div className="flex justify-between">
              <span>Last Updated</span>
              <span>July 2025</span>
            </div>
            
            <div className="flex justify-between">
              <span>Organization</span>
              <span>APME Romania</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}