/**
 * Custom hook for optimized church rating data fetching
 * Uses batched API calls and intelligent caching
 */

import { useQuery } from '@tanstack/react-query';
import { batchRequestManager } from '@/lib/church-api-batch';

export interface UseChurchRatingOptions {
  includeHistory?: boolean;
  historyLimit?: number;
  enabled?: boolean;
}

export function useChurchRating(
  churchId: number,
  options: UseChurchRatingOptions = {}
) {
  const {
    includeHistory = false,
    historyLimit = 10,
    enabled = true
  } = options;

  return useQuery({
    queryKey: ['church-rating-optimized', churchId, includeHistory, historyLimit],
    queryFn: () => batchRequestManager.request(churchId, {
      includeStarRating: true,
      includeRatingHistory: includeHistory,
      ratingHistoryLimit: historyLimit
    }),
    enabled: !!churchId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    select: (data) => ({
      starRating: data.starRating,
      ratingHistory: data.ratingHistory,
      isLoading: false,
      isUpdating: false
    })
  });
}

/**
 * Hook specifically for rating history with optimized loading states
 */
export function useChurchRatingHistory(
  churchId: number,
  limit: number = 10
) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['church-rating-history-optimized', churchId, limit],
    queryFn: () => batchRequestManager.request(churchId, {
      includeRatingHistory: true,
      ratingHistoryLimit: limit
    }),
    enabled: !!churchId,
    staleTime: 2 * 60 * 1000, // 2 minutes for history
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    data: data?.ratingHistory,
    isLoading,
    error,
    refetch,
    isFetching
  };
}