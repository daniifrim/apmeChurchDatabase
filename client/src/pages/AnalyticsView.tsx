import { useQuery } from '@tanstack/react-query';
import { ChartBarIcon, MapPinIcon, UsersIcon, CalendarIcon } from '@heroicons/react/24/outline';

interface AnalyticsData {
  totalChurches: number;
  activeChurches: number;
  pendingVisits: number;
  newThisMonth: number;
  engagementBreakdown: Array<{
    level: string;
    count: number;
  }>;
}

export default function AnalyticsView() {
  const { data: analytics } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics'],
    queryFn: () => fetch('/api/analytics').then(res => res.json())
  });

  if (!analytics) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const engagementLevels = [
    { level: 'high', label: 'Actively Engaged', color: 'bg-green-500' },
    { level: 'medium', label: 'Partnership Established', color: 'bg-blue-500' },
    { level: 'low', label: 'Initial Contact', color: 'bg-yellow-500' },
    { level: 'new', label: 'Not Contacted', color: 'bg-gray-500' },
  ];

  const getEngagementData = () => {
    return engagementLevels.map(level => {
      const data = analytics.engagementBreakdown.find(item => item.level === level.level);
      return {
        ...level,
        count: data?.count || 0
      };
    });
  };

  const statCards = [
    {
      title: 'Total Churches',
      value: analytics.totalChurches,
      icon: MapPinIcon,
      color: 'bg-blue-500',
    },
    {
      title: 'Active Churches',
      value: analytics.activeChurches,
      icon: ChartBarIcon,
      color: 'bg-green-500',
    },
    {
      title: 'Pending Visits',
      value: analytics.pendingVisits,
      icon: CalendarIcon,
      color: 'bg-orange-500',
    },
    {
      title: 'New This Month',
      value: analytics.newThisMonth,
      icon: UsersIcon,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="h-full bg-gray-50 overflow-y-auto pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-xl font-semibold text-gray-900">Analytics</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {statCards.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Engagement Breakdown */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Engagement Levels</h2>
          
          <div className="space-y-4">
            {getEngagementData().map((item) => {
              const percentage = analytics.totalChurches > 0 
                ? Math.round((item.count / analytics.totalChurches) * 100) 
                : 0;
              
              return (
                <div key={item.level} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                      <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-semibold">{item.count}</span> ({percentage}%)
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${item.color}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Activity */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Overview</h2>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">Churches Added</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.newThisMonth}</p>
              </div>
              <div className="text-green-600">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">Visits Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.pendingVisits}</p>
              </div>
              <div className="text-blue-600">
                <CalendarIcon className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Regional Distribution */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Regional Distribution</h2>
          
          <div className="space-y-3">
            {['Bucharest', 'Cluj', 'Timiș', 'Iași', 'Brașov'].map((county, index) => {
              const count = Math.floor(Math.random() * 3) + 1; // Mock data for demo
              const percentage = Math.round((count / analytics.totalChurches) * 100);
              
              return (
                <div key={county} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{county}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 bg-blue-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-8">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}