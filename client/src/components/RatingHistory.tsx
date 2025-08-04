import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FixedSizeList as List } from 'react-window';
import { Star, User, Calendar, DollarSign, Clock, MessageSquare, Filter, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useChurchRatingHistory } from '@/hooks/useChurchRating';

interface RatingHistoryProps {
  churchId: number;
  churchName: string;
}

interface VisitRating {
  id: number;
  visitId: number;
  visitDate: string;
  missionOpennessRating: number;
  hospitalityRating: number;
  missionarySupportCount: number;
  offeringsAmount: number;
  churchMembers: number;
  calculatedStarRating: number;
  visitDurationMinutes?: number;
  notes?: string;
  createdAt: string;
  missionaryName: string;
  missionaryEmail: string;
  breakdown: {
    missionOpenness: number;
    hospitality: number;
    financial: number;
    missionarySupport: number;
  };
}

interface RatingHistoryData {
  churchId: number;
  churchName: string;
  ratings: VisitRating[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${sizeClass} ${
            i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
          }`}
        />
      ))}
      <span className="ml-1 text-xs font-medium text-gray-700">{rating}/5</span>
    </div>
  );
}

function RatingCard({ rating }: { rating: VisitRating }) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  const getRatingColor = (stars: number) => {
    if (stars >= 4.5) return 'bg-green-100 text-green-800';
    if (stars >= 3.5) return 'bg-yellow-100 text-yellow-800';
    if (stars >= 2.5) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getRatingLabel = (stars: number) => {
    if (stars >= 4.5) return 'Excelent';
    if (stars >= 3.5) return 'Bun';
    if (stars >= 2.5) return 'Mediu';
    return 'Slab';
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">{formatDate(rating.visitDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">{rating.missionaryName}</span>
            </div>
          </div>
          <Badge className={getRatingColor(rating.calculatedStarRating)}>
            {getRatingLabel(rating.calculatedStarRating)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Overall Rating */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="font-medium text-gray-900">Rating General</span>
          <StarDisplay rating={rating.calculatedStarRating} size="md" />
        </div>

        {/* Missionary Support Badge - Version 2.0 Separate Indicator */}
        {rating.missionarySupportCount > 0 && (
          <div className="flex justify-center mb-4">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <User className="w-3 h-3 mr-1" />
              Susține {rating.missionarySupportCount} misionari
            </Badge>
          </div>
        )}

        {/* Rating Breakdown - Version 2.0: Only visit-specific metrics */}
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-700 font-medium">Deschidere Misiune</span>
            <StarDisplay rating={rating.missionOpennessRating} />
          </div>
          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
            <span className="text-sm text-purple-700 font-medium">Ospitalitate</span>
            <StarDisplay rating={rating.hospitalityRating} />
          </div>
          {rating.offeringsAmount > 0 && (
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <span className="text-sm text-yellow-700 font-medium">Generozitate Financiară</span>
              <div className="text-right">
                <div className="text-sm font-medium">{formatCurrency(rating.offeringsAmount)}</div>
                <div className="text-xs text-yellow-600">Scor: {rating.breakdown?.financial?.toFixed(1) || 'N/A'}/5</div>
              </div>
            </div>
          )}
        </div>

        {/* Additional Details */}
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            <span>Membri: {rating.churchMembers}</span>
          </div>
          {rating.visitDurationMinutes && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Durată: {rating.visitDurationMinutes} min</span>
            </div>
          )}
        </div>

        {/* Notes */}
        {rating.notes && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-gray-700 mb-1">Note</p>
                <p className="text-sm text-gray-600">{rating.notes}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Virtualized wrapper component for react-window
interface VirtualizedRatingCardProps {
  index: number;
  style: React.CSSProperties;
  data: VisitRating[];
}

const VirtualizedRatingCard: React.FC<VirtualizedRatingCardProps> = ({ index, style, data }) => {
  const rating = data[index];
  return (
    <div style={style} className="px-1">
      <RatingCard rating={rating} />
    </div>
  );
};

export function RatingHistory({ churchId, churchName }: RatingHistoryProps) {
  const [sortBy, setSortBy] = useState<'date' | 'rating'>('date');
  const [filterRating, setFilterRating] = useState<string>('all');
  const [limit, setLimit] = useState(10);

  const { data, isLoading, error, refetch, isFetching } = useChurchRatingHistory(churchId, limit);

  const filteredAndSortedRatings = useMemo(() => {
    if (!data?.ratings) return [];

    let filtered = [...data.ratings]; // Create a shallow copy to avoid mutating original array

    // Filter by rating
    if (filterRating !== 'all') {
      const minRating = parseInt(filterRating);
      filtered = filtered.filter(rating => 
        rating.calculatedStarRating >= minRating && 
        rating.calculatedStarRating < minRating + 1
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime();
      } else {
        return b.calculatedStarRating - a.calculatedStarRating;
      }
    });

    return filtered;
  }, [data?.ratings, sortBy, filterRating]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Istoric Evaluări</CardTitle>
          <CardDescription>Se încarcă istoricul evaluărilor...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-32 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Istoric Evaluări</CardTitle>
          <CardDescription>Eroare la încărcarea istoricului</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">Nu s-a putut încărca istoricul evaluărilor</p>
            <Button onClick={() => refetch()} variant="outline">
              Încearcă din nou
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.ratings || data.ratings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Istoric Evaluări</CardTitle>
          <CardDescription>{churchName} - Nu există evaluări</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Star className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600 mb-2">Nu există evaluări pentru această biserică</p>
            <p className="text-sm text-gray-500">Evaluările vor apărea aici după ce vor fi create</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div>
              <CardTitle>Istoric Evaluări</CardTitle>
              <CardDescription>{churchName} - {data.ratings.length} evaluări</CardDescription>
            </div>
            {isFetching && !isLoading && (
              <div className="flex items-center gap-1 text-blue-600">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="text-xs">Actualizare...</span>
              </div>
            )}
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-9 w-9 p-0"
              title="Reîmprospătează datele"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            
            <Select value={sortBy} onValueChange={(value: 'date' | 'rating') => setSortBy(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">După dată</SelectItem>
                <SelectItem value="rating">După rating</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterRating} onValueChange={setFilterRating}>
              <SelectTrigger className="w-32">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate</SelectItem>
                <SelectItem value="5">5 stele</SelectItem>
                <SelectItem value="4">4 stele</SelectItem>
                <SelectItem value="3">3 stele</SelectItem>
                <SelectItem value="2">2 stele</SelectItem>
                <SelectItem value="1">1 stea</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Virtualized List for Performance */}
        {filteredAndSortedRatings.length > 0 ? (
          <div>
            <div className="h-96 mb-4"> {/* Fixed height container for virtualization */}
              <List
                height={384} // 24rem in pixels
                width="100%" // Required property for FixedSizeList
                itemCount={filteredAndSortedRatings.length}
                itemSize={200} // Approximate height of each RatingCard
                itemData={filteredAndSortedRatings}
              >
                {VirtualizedRatingCard}
              </List>
            </div>
            
            {/* Load More */}
            {data.pagination.hasMore && (
              <div className="text-center pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setLimit(prev => prev + 10)}
                  disabled={isFetching}
                  className="min-w-32"
                >
                  {isFetching ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Se încarcă...
                    </>
                  ) : (
                    'Încarcă mai multe'
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : data.ratings.length > 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Nu există evaluări care să corespundă filtrelor</p>
            <Button 
              variant="outline" 
              onClick={() => {
                setFilterRating('all');
                setSortBy('date');
              }}
              className="mt-2"
            >
              Resetează filtrele
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            <Star className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600 mb-2">Nu există evaluări pentru această biserică</p>
            <p className="text-sm text-gray-500">Evaluările vor apărea aici după ce vor fi create</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}