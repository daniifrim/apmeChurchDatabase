import { MapIcon, ListBulletIcon, ChartBarIcon, ClockIcon } from '@heroicons/react/24/outline';
import { MapIcon as MapIconSolid, ListBulletIcon as ListIconSolid, ChartBarIcon as ChartIconSolid, ClockIcon as ClockIconSolid } from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';

interface BottomNavigationProps {
  activeTab: 'map' | 'list' | 'visits' | 'analytics';
  onTabChange: (tab: 'map' | 'list' | 'visits' | 'analytics') => void;
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
      id: 'visits' as const, 
      label: 'Visits', 
      icon: ClockIcon, 
      iconSolid: ClockIconSolid 
    },
    { 
      id: 'analytics' as const, 
      label: 'Analytics', 
      icon: ChartBarIcon, 
      iconSolid: ChartIconSolid 
    },
  ];

  return (
    <div className="bg-white border-t border-gray-200 flex-shrink-0 z-50">
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