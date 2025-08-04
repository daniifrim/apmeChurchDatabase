import React from 'react';
import { Star, TrendingUp, Users, DollarSign, Calendar, Heart, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useChurchRating } from '@/hooks/useChurchRating';

interface ChurchStarRatingProps {
  churchId: number;
  churchName: string;
  averageStars: number;
  missionarySupportCount?: number; // Separate church-level attribute
  totalVisits: number;
  visitsLast30Days?: number;
  visitsLast90Days?: number;
  ratingBreakdown?: {
    missionOpenness: number;
    hospitality: number;
    financialGenerosity: number;
    // missionarySupport removed from breakdown
  };
  financialSummary?: {
    totalOfferingsCollected: number;
    avgOfferingsPerVisit: number;
  };
  lastVisitDate?: Date | string;
  showDetails?: boolean;
  compact?: boolean;
  isLoading?: boolean;
  isUpdating?: boolean;
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

  const ariaLabel = `Rating ${rating.toFixed(1)} din ${maxStars} stele`;

  return (
    <div 
      className="flex items-center gap-1" 
      role="img" 
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      {/* Full stars */}
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star 
          key={`full-${i}`} 
          className={`${sizeClasses[size]} text-yellow-400 fill-current`}
          aria-hidden="true"
        />
      ))}
      
      {/* Half star */}
      {hasHalfStar && (
        <div className="relative" aria-hidden="true">
          <Star className={`${sizeClasses[size]} text-gray-300`} />
          <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
            <Star className={`${sizeClasses[size]} text-yellow-400 fill-current`} />
          </div>
        </div>
      )}
      
      {/* Empty stars */}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star 
          key={`empty-${i}`} 
          className={`${sizeClasses[size]} text-gray-300`}
          aria-hidden="true"
        />
      ))}
      
      {showNumber && (
        <span className={`ml-1 font-medium text-gray-700 ${textSizeClasses[size]}`} aria-hidden="true">
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
  };
}

function RatingBreakdown({ breakdown }: RatingBreakdownProps) {
  const categories = [
    {
      key: 'missionOpenness',
      label: 'Deschidere Misiune',
      value: breakdown.missionOpenness,
      icon: TrendingUp,
      color: 'bg-green-100 text-green-800'
    },
    {
      key: 'hospitality',
      label: 'Ospitalitate',
      value: breakdown.hospitality,
      icon: Heart,
      color: 'bg-purple-100 text-purple-800'
    },
    {
      key: 'financialGenerosity',
      label: 'Generozitate Financiară',
      value: breakdown.financialGenerosity,
      icon: DollarSign,
      color: 'bg-yellow-100 text-yellow-800'
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-3" role="list" aria-label="Detalii evaluare pe categorii">
      {categories.map(({ key, label, value, icon: Icon, color }) => (
        <div 
          key={key} 
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          role="listitem"
        >
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-gray-600" aria-hidden="true" />
            <span className="text-sm font-medium text-gray-700">{label}</span>
          </div>
          <Badge 
            variant="secondary" 
            className={`text-sm ${color}`}
            aria-label={`${label}: ${value.toFixed(1)} puncte`}
          >
            {value.toFixed(1)}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function LoadingSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-white border rounded-lg animate-pulse">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-3 h-3 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div>
            <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
        <div className="h-3 bg-gray-200 rounded w-20"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-36 animate-pulse"></div>
          </div>
          <div className="text-right">
            <div className="flex gap-1 mb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
            <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="text-center">
              <div className="h-6 bg-gray-200 rounded w-8 mx-auto mb-1 animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-16 mx-auto animate-pulse"></div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function UpdatingOverlay() {
  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
      <div className="flex items-center gap-2 text-blue-600">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm font-medium">Se actualizează...</span>
      </div>
    </div>
  );
}

export function ChurchStarRating({
  churchId,
  churchName,
  averageStars,
  missionarySupportCount,
  totalVisits,
  visitsLast30Days,
  visitsLast90Days,
  ratingBreakdown,
  financialSummary,
  lastVisitDate,
  showDetails = false,
  compact = false,
  isLoading = false,
  isUpdating = false
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

  // Show loading skeleton while data is loading
  if (isLoading) {
    return <LoadingSkeleton compact={compact} />;
  }

  if (compact) {
    return (
      <div 
        className="flex items-center justify-between p-3 bg-white border rounded-lg"
        role="article"
        aria-labelledby={`church-${churchId}-title`}
      >
        <div className="flex items-center gap-3">
          <StarDisplay rating={averageStars} size="sm" />
          <div>
            <p 
              id={`church-${churchId}-title`}
              className="font-medium text-sm text-gray-900"
            >
              {churchName}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-500" aria-label={`${totalVisits} vizite înregistrate`}>
                {totalVisits} vizite
              </p>
              {missionarySupportCount !== undefined && missionarySupportCount > 0 && (
                <Badge 
                  variant="outline" 
                  className="text-xs bg-blue-50 text-blue-700 border-blue-200 px-1 py-0"
                  aria-label={`Susține ${missionarySupportCount} misionari`}
                >
                  <Users className="w-2 h-2 mr-1" aria-hidden="true" />
                  {missionarySupportCount}
                </Badge>
              )}
            </div>
          </div>
        </div>
        {lastVisitDate && (
          <p className="text-xs text-gray-500" aria-label={`Ultima vizită: ${formatDate(lastVisitDate)}`}>
            {formatDate(lastVisitDate)}
          </p>
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
    <Card role="article" aria-labelledby={`church-${churchId}-title`} className="relative">
      {isUpdating && <UpdatingOverlay />}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle id={`church-${churchId}-title`} className="text-lg">{churchName}</CardTitle>
            <CardDescription>Evaluare generală a bisericii</CardDescription>
            
            {/* Missionary Support Badge - Version 2.0 Separate Indicator */}
            {missionarySupportCount !== undefined && missionarySupportCount > 0 && (
              <div className="mt-2">
                <Badge 
                  variant="outline" 
                  className="bg-blue-50 text-blue-700 border-blue-200"
                  aria-label={`Această biserică susține ${missionarySupportCount} misionari`}
                >
                  <Users className="w-3 h-3 mr-1" aria-hidden="true" />
                  Susține {missionarySupportCount} misionari
                </Badge>
              </div>
            )}
          </div>
          <div className="text-right">
            <StarDisplay rating={averageStars} size="lg" />
            <p className="text-xs text-gray-500 mt-1" aria-label={`Total ${totalVisits} vizite înregistrate`}>
              {totalVisits} vizite
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Visit Statistics */}
        <div 
          className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg" 
          role="region" 
          aria-label="Statistici vizite"
        >
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900" aria-label={`${totalVisits} total vizite`}>
              {totalVisits}
            </p>
            <p className="text-xs text-gray-600" aria-hidden="true">Total vizite</p>
          </div>
          {visitsLast30Days !== undefined && (
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900" aria-label={`${visitsLast30Days} vizite în ultimele 30 de zile`}>
                {visitsLast30Days}
              </p>
              <p className="text-xs text-gray-600" aria-hidden="true">Ultimele 30 zile</p>
            </div>
          )}
          {visitsLast90Days !== undefined && (
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900" aria-label={`${visitsLast90Days} vizite în ultimele 90 de zile`}>
                {visitsLast90Days}
              </p>
              <p className="text-xs text-gray-600" aria-hidden="true">Ultimele 90 zile</p>
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
          <div role="region" aria-labelledby="financial-summary-heading">
            <h4 id="financial-summary-heading" className="text-sm font-medium text-gray-900 mb-3">
              Rezumat Financiar
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <p 
                  className="text-sm font-medium text-green-800"
                  aria-label={`Total ofrande colectate: ${formatCurrency(financialSummary.totalOfferingsCollected)}`}
                >
                  {formatCurrency(financialSummary.totalOfferingsCollected)}
                </p>
                <p className="text-xs text-green-600" aria-hidden="true">Total ofrande</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p 
                  className="text-sm font-medium text-blue-800"
                  aria-label={`Media ofrande pe vizită: ${formatCurrency(financialSummary.avgOfferingsPerVisit)}`}
                >
                  {formatCurrency(financialSummary.avgOfferingsPerVisit)}
                </p>
                <p className="text-xs text-blue-600" aria-hidden="true">Medie per vizită</p>
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