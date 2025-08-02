import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Star, 
  TrendingUp, 
  Award, 
  DollarSign, 
  Users, 
  Calendar,
  BarChart3,
  PieChart,
  MapPin
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ChurchStarRating } from './ChurchStarRating';

interface RatingStatistics {
  totalRatedChurches: number;
  averageRating: number;
  totalVisits: number;
  totalOfferings: number;
  ratingDistribution: { stars: number; count: number }[];
}

interface TopChurch {
  id: number;
  churchId: number;
  averageStars: number;
  totalVisits: number;
  visitsLast30Days: number;
  visitsLast90Days: number;
  avgMissionOpenness: number;
  avgHospitality: number;
  avgFinancialGenerosity: number;
  avgMissionarySupport: number;
  totalOfferingsCollected: number;
  avgOfferingsPerVisit: number;
  lastVisitDate: string;
  lastCalculated: string;
  churches: {
    id: number;
    name: string;
    city: string;
    county: string;
  };
}

interface RecentChurch extends TopChurch {}

export function RatingAnalytics() {
  const [topChurchesLimit, setTopChurchesLimit] = useState(10);

  // Fetch rating statistics
  const { data: statistics, isLoading: statsLoading } = useQuery<RatingStatistics>({
    queryKey: ['rating-statistics'],
    queryFn: async () => {
      const response = await fetch('/api/ratings/analytics?type=statistics');
      if (!response.ok) throw new Error('Failed to fetch statistics');
      const result = await response.json();
      return result.data;
    },
  });

  // Fetch top-rated churches
  const { data: topChurches, isLoading: topLoading } = useQuery<TopChurch[]>({
    queryKey: ['top-rated-churches', topChurchesLimit],
    queryFn: async () => {
      const response = await fetch(`/api/ratings/analytics?type=top-churches&limit=${topChurchesLimit}`);
      if (!response.ok) throw new Error('Failed to fetch top churches');
      const result = await response.json();
      return result.data;
    },
  });

  // Fetch recently active churches
  const { data: recentChurches, isLoading: recentLoading } = useQuery<RecentChurch[]>({
    queryKey: ['recent-active-churches'],
    queryFn: async () => {
      const response = await fetch('/api/ratings/analytics?type=recent&limit=10');
      if (!response.ok) throw new Error('Failed to fetch recent churches');
      const result = await response.json();
      return result.data;
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Statistics Overview Cards
  const StatisticsOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Biserici Evaluate</p>
              <p className="text-2xl font-bold text-gray-900">
                {statsLoading ? '...' : statistics?.totalRatedChurches || 0}
              </p>
            </div>
            <Award className="w-8 h-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rating Mediu</p>
              <p className="text-2xl font-bold text-gray-900">
                {statsLoading ? '...' : `${statistics?.averageRating?.toFixed(1) || 0}/5`}
              </p>
            </div>
            <Star className="w-8 h-8 text-yellow-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Vizite</p>
              <p className="text-2xl font-bold text-gray-900">
                {statsLoading ? '...' : statistics?.totalVisits || 0}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Ofrande</p>
              <p className="text-2xl font-bold text-gray-900">
                {statsLoading ? '...' : formatCurrency(statistics?.totalOfferings || 0)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Rating Distribution Chart
  const RatingDistribution = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Distribuția Ratingurilor
        </CardTitle>
        <CardDescription>Numărul de biserici pe fiecare nivel de rating</CardDescription>
      </CardHeader>
      <CardContent>
        {statsLoading ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-gray-500">Se încarcă...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {statistics?.ratingDistribution?.map(({ stars, count }) => (
              <div key={stars} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-16">
                  <span className="text-sm font-medium">{stars}</span>
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                  <div 
                    className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2"
                    style={{ 
                      width: `${(count / (statistics?.totalRatedChurches || 1)) * 100}%`,
                      minWidth: count > 0 ? '24px' : '0'
                    }}
                  >
                    {count > 0 && (
                      <span className="text-xs font-medium text-white">{count}</span>
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">
                  {((count / (statistics?.totalRatedChurches || 1)) * 100).toFixed(0)}%
                </span>
              </div>
            )) || []}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Top Churches List
  const TopChurchesList = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top Biserici Evaluate
            </CardTitle>
            <CardDescription>Bisericile cu cele mai mari ratinguri</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTopChurchesLimit(prev => Math.max(5, prev - 5))}
              disabled={topChurchesLimit <= 5}
            >
              Mai puține
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTopChurchesLimit(prev => prev + 5)}
              disabled={topChurchesLimit >= 50}
            >
              Mai multe
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {topLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {topChurches?.map((church, index) => (
              <div key={church.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{church.churches.name}</h4>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {church.churches.city}, {church.churches.county}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="font-bold text-lg">{church.averageStars}</span>
                      </div>
                      <p className="text-xs text-gray-500">{church.totalVisits} vizite</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
                    <span>Ultima vizită: {formatDate(church.lastVisitDate)}</span>
                    <span>Ofrande: {formatCurrency(church.totalOfferingsCollected)}</span>
                  </div>
                </div>
              </div>
            )) || []}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Recent Activity
  const RecentActivity = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Activitate Recentă
        </CardTitle>
        <CardDescription>Biserici evaluate în ultimele 30 de zile</CardDescription>
      </CardHeader>
      <CardContent>
        {recentLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse h-16 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        ) : recentChurches && recentChurches.length > 0 ? (
          <div className="space-y-3">
            {recentChurches.map((church) => (
              <div key={church.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{church.churches.name}</h4>
                  <p className="text-sm text-gray-600">{church.churches.city}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="font-medium">{church.averageStars}</span>
                  </div>
                  <p className="text-xs text-gray-500">{formatDate(church.lastVisitDate)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600">Nu există activitate recentă</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analiză Evaluări</h1>
          <p className="text-gray-600">Statistici și tendințe pentru evaluările bisericilor</p>
        </div>
      </div>

      <StatisticsOverview />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Prezentare Generală</TabsTrigger>
          <TabsTrigger value="top-churches">Top Biserici</TabsTrigger>
          <TabsTrigger value="recent">Activitate Recentă</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RatingDistribution />
            <RecentActivity />
          </div>
        </TabsContent>

        <TabsContent value="top-churches">
          <TopChurchesList />
        </TabsContent>

        <TabsContent value="recent">
          <RecentActivity />
        </TabsContent>
      </Tabs>
    </div>
  );
}