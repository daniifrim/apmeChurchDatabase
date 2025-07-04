import { MapIcon, ListBulletIcon, ChartBarIcon, UserIcon } from '@heroicons/react/24/outline';
import { MapIcon as MapIconSolid, ListBulletIcon as ListIconSolid, ChartBarIcon as ChartIconSolid, UserIcon as UserIconSolid } from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';

interface BottomNavigationProps {
  activeTab: 'map' | 'list' | 'analytics' | 'profile';
  onTabChange: (tab: 'map' | 'list' | 'analytics' | 'profile') => void;
}

export default function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const tabs = [
    { 
      id: 'map' as const, 
      label: 'Map', 
      icon: MapIcon, 
      iconSolid: MapIconSolid 
    },
    { 
      id: 'list' as const, 
      label: 'List', 
      icon: ListBulletIcon, 
      iconSolid: ListIconSolid 
    },
    { 
      id: 'analytics' as const, 
      label: 'Analytics', 
      icon: ChartBarIcon, 
      iconSolid: ChartIconSolid 
    },
    { 
      id: 'profile' as const, 
      label: 'Profile', 
      icon: UserIcon, 
      iconSolid: UserIconSolid 
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-pb">
      <div className="flex justify-around items-center h-16 px-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = isActive ? tab.iconSolid : tab.icon;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center space-y-1 py-2 px-3 rounded-lg transition-colors",
                isActive 
                  ? "text-[#2E5BBA]" 
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}