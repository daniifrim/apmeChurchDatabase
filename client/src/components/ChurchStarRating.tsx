import React from 'react';
import { Star, TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface ChurchStarRatingProps {
  churchId: number;
  churchName: string;
  averageStars: number;
  totalVisits: number;
  visitsLast30Days?: number;
  visitsLast90Days?: number;
  ratingBreakdown?: {
    missionOpenness: number;
    hospitality: number;
    financialGenerosity: number;
    missionarySupport: number;
  };
  financialSummary?: {
    totalOfferingsCollected: number;
    avgOfferingsPerVisit: number;
  };
  lastVisitDate?: Date | string;
  showDetails?: boolean;
  compact?: boolean;
}

interface StarDisplayProps {
  rating: number;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;
}

function StarDisplay({ rating, maxStars = 5, size = 'md', showNumber = true }: StarDisplayProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = maxStars - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-1">
      {/* Full stars */}
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star key={`full-${i}`} className={`${sizeClasses[size]} text-yellow-400 fill-current`} />
      ))}
      
      {/* Half star */}
      {hasHalfStar && (
        <div className="relative">
          <Star className={`${sizeClasses[size]} text-gray-300`} />
          <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
            <Star className={`${sizeClasses[size]} text-yellow-400 fill-current`} />
          </div>
        </div>
      )}
      
      {/* Empty stars */}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star key={`empty-${i}`} className={`${sizeClasses[size]} text-gray-300`} />
      ))}
      
      {showNumber && (
        <span className={`ml-1 font-medium text-gray-700 ${textSizeClasses[size]}`}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

interface RatingBreakdownProps {
  breakdown: {
    missionOpenness: number;
    hospitality: number;
    financialGenerosity: number;
    missionarySupport: number;
  };
}

function RatingBreakdown({ breakdown }: RatingBreakdownProps) {
  const categories = [
    {
      key: 'missionarySupport',
      label: 'Susținere Misionari',
      value: breakdown.missionarySupport,
      icon: Users,
      color: 'bg-blue-100 text-blue-800'
    },
    {
      key: 'missionOpenness',
      label: 'Deschidere Misiune',
      value: breakdown.missionOpenness,
      icon: TrendingUp,
      color: 'bg-green-100 text-green-800'
    },
    {
      key: 'financialGenerosity',
      label: 'Generozitate Financiară',
      value: breakdown.financialGenerosity,
      icon: DollarSign,
      color: 'bg-yellow-100 text-yellow-800'
    },
    {
      key: 'hospitality',
      label: 'Ospitalitate',
      value: breakdown.hospitality,
      icon: Calendar,
      color: 'bg-purple-100 text-purple-800'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {categories.map(({ key, label, value, icon: Icon, color }) => (
        <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-gray-600" />
            <span className="text-xs font-medium text-gray-700">{label}</span>
          </div>
          <Badge variant="secondary" className={`text-xs ${color}`}>
            {value.toFixed(1)}
          </Badge>
        </div>
      ))}
    </div>
  );
}

export function ChurchStarRating({
  churchId,
  churchName,
  averageStars,
  totalVisits,
  visitsLast30Days,
  visitsLast90Days,
  ratingBreakdown,
  financialSummary,
  lastVisitDate,
  showDetails = false,
  compact = false
}: ChurchStarRatingProps) {
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Niciodată';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
        <div className="flex items-center gap-3">
          <StarDisplay rating={averageStars} size="sm" />
          <div>
            <p className="font-medium text-sm text-gray-900">{churchName}</p>
            <p className="text-xs text-gray-500">{totalVisits} vizite</p>
          </div>
        </div>
        {lastVisitDate && (
          <p className="text-xs text-gray-500">{formatDate(lastVisitDate)}</p>
        )}
      </div>
    );
  }

  if (averageStars === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{churchName}</CardTitle>
          <CardDescription>Nu există evaluări disponibile</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-gray-500">
            <div className="text-center">
              <Star className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Această biserică nu a fost încă evaluată</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{churchName}</CardTitle>
            <CardDescription>Evaluare generală a bisericii</CardDescription>
          </div>
          <div className="text-right">
            <StarDisplay rating={averageStars} size="lg" />
            <p className="text-xs text-gray-500 mt-1">{totalVisits} vizite</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Visit Statistics */}
        <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">{totalVisits}</p>
            <p className="text-xs text-gray-600">Total vizite</p>
          </div>
          {visitsLast30Days !== undefined && (
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">{visitsLast30Days}</p>
              <p className="text-xs text-gray-600">Ultimele 30 zile</p>
            </div>
          )}
          {visitsLast90Days !== undefined && (
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">{visitsLast90Days}</p>
              <p className="text-xs text-gray-600">Ultimele 90 zile</p>
            </div>
          )}
        </div>

        {/* Rating Breakdown */}
        {showDetails && ratingBreakdown && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Detalii Evaluare</h4>
            <RatingBreakdown breakdown={ratingBreakdown} />
          </div>
        )}

        {/* Financial Summary */}
        {showDetails && financialSummary && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Rezumat Financiar</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm font-medium text-green-800">
                  {formatCurrency(financialSummary.totalOfferingsCollected)}
                </p>
                <p className="text-xs text-green-600">Total ofrande</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-800">
                  {formatCurrency(financialSummary.avgOfferingsPerVisit)}
                </p>
                <p className="text-xs text-blue-600">Medie per vizită</p>
              </div>
            </div>
          </div>
        )}

        {/* Last Visit */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-gray-600">Ultima vizită:</span>
          <span className="text-sm font-medium text-gray-900">{formatDate(lastVisitDate)}</span>
        </div>
      </CardContent>
    </Card>
  );
}